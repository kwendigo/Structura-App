import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from 'node:process';

interface TaskPayload {
  title: string;
  startTime: string;
  isReminder?: boolean;
}

interface ScheduleRequest {
  task?: TaskPayload;
  scheduledAt?: string;
  subscriptionId?: string;
  previousNotificationId?: string;
  notificationId?: string;
}

type VercelRequest = IncomingMessage & { body?: unknown };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function respond(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBody(body: unknown): ScheduleRequest | null {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return isObject(body) ? body as ScheduleRequest : null;
}

function hasSameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;

  const forwardedProtocol = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProtocol === 'string'
    ? forwardedProtocol.split(',')[0].trim()
    : 'https';
  return origin === `${protocol}://${host}`;
}

function hasValidSchedulerSecret(req: VercelRequest): boolean {
  const expected = env.ONESIGNAL_SCHEDULER_SECRET;
  const suppliedHeader = req.headers['x-scheduler-secret'];
  const authorization = req.headers.authorization;
  const bearerSecret = typeof authorization === 'string'
    ? /^Bearer (.+)$/i.exec(authorization)?.[1]
    : undefined;
  const suppliedSecret = typeof suppliedHeader === 'string' ? suppliedHeader : bearerSecret;
  if (!expected || !suppliedSecret || suppliedSecret.length > 1024) return false;

  const expectedHash = createHash('sha256').update(expected).digest();
  const suppliedHash = createHash('sha256').update(suppliedSecret).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

function hasValidBearerSchedulerSecret(req: VercelRequest): boolean {
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !/^Bearer .+$/i.test(authorization)) return false;
  return hasValidSchedulerSecret(req);
}

function formatOneSignalUtc(date: Date): string {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} GMT+0000`;
}

async function callOneSignal(
  path: string,
  method: 'POST' | 'DELETE',
  body?: Record<string, unknown>
): Promise<Response> {
  const appId = env.ONESIGNAL_APP_ID;
  const apiKey = env.ONESIGNAL_REST_API_KEY || env.ONESIGNAL_API_KEY;
  if (!appId || !apiKey) {
    throw new Error('OneSignal server configuration is missing.');
  }

  const url = new URL(`https://api.onesignal.com${path}`);
  if (method === 'DELETE') url.searchParams.set('app_id', appId);

  return fetch(url, {
    method,
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
}

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    respond(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!hasSameOrigin(req) && !hasValidBearerSchedulerSecret(req)) {
    respond(res, 403, { error: 'Requests must come from this app origin.' });
    return;
  }
  if (!env.ONESIGNAL_SCHEDULER_SECRET) {
    respond(res, 503, { error: 'The scheduler authentication secret is not configured.' });
    return;
  }
  if (!hasValidSchedulerSecret(req)) {
    respond(res, 401, { error: 'A valid scheduler secret is required.' });
    return;
  }
  if (!env.ONESIGNAL_APP_ID || !(env.ONESIGNAL_REST_API_KEY || env.ONESIGNAL_API_KEY)) {
    respond(res, 503, { error: 'OneSignal server environment variables are not configured.' });
    return;
  }

  const body = parseBody(req.body);
  if (!body) {
    respond(res, 400, { error: 'A valid JSON request body is required.' });
    return;
  }

  if (req.method === 'DELETE') {
    if (typeof body.notificationId !== 'string' || !UUID_PATTERN.test(body.notificationId)) {
      respond(res, 400, { error: 'A valid scheduled notification ID is required.' });
      return;
    }

    try {
      const response = await callOneSignal(
        `/notifications/${encodeURIComponent(body.notificationId)}`,
        'DELETE'
      );
      if (!response.ok) {
        respond(res, 502, { error: 'OneSignal could not cancel this scheduled notification.' });
        return;
      }
      respond(res, 200, { cancelled: true });
    } catch (error) {
      console.error('OneSignal cancellation failed', error);
      respond(res, 502, { error: 'OneSignal cancellation failed. Please try again.' });
    }
    return;
  }

  const task = body.task;
  if (
    !task ||
    typeof task.title !== 'string' ||
    task.title.trim().length === 0 ||
    task.title.length > 120 ||
    typeof task.startTime !== 'string' ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.startTime) ||
    typeof body.scheduledAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body.scheduledAt) ||
    typeof body.subscriptionId !== 'string' ||
    !UUID_PATTERN.test(body.subscriptionId) ||
    (body.previousNotificationId !== undefined &&
      (typeof body.previousNotificationId !== 'string' || !UUID_PATTERN.test(body.previousNotificationId)))
  ) {
    respond(res, 400, { error: 'The task, scheduled time, or subscription is invalid.' });
    return;
  }

  const scheduledAt = new Date(body.scheduledAt);
  if (
    !Number.isFinite(scheduledAt.getTime()) ||
    scheduledAt.toISOString() !== body.scheduledAt ||
    scheduledAt.getTime() <= Date.now()
  ) {
    respond(res, 400, { error: 'The scheduled task time must be in the future.' });
    return;
  }

  try {
    const response = await callOneSignal('/notifications', 'POST', {
      app_id: env.ONESIGNAL_APP_ID,
      include_subscription_ids: [body.subscriptionId],
      target_channel: 'push',
      headings: { en: task.title.trim() },
      contents: { en: task.title.trim() },
      send_after: formatOneSignalUtc(scheduledAt),
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok || !isObject(result) || typeof result.id !== 'string') {
      console.error('OneSignal rejected a scheduled notification', response.status);
      respond(res, 502, { error: 'OneSignal could not schedule this task notification.' });
      return;
    }

    let warning: string | undefined;
    if (body.previousNotificationId) {
      try {
        const cancelResponse = await callOneSignal(
          `/notifications/${encodeURIComponent(body.previousNotificationId)}`,
          'DELETE'
        );
        if (!cancelResponse.ok) {
          warning = 'The new notification was scheduled, but the previous schedule could not be cancelled.';
        }
      } catch (error) {
        console.error('Previous OneSignal notification cancellation failed', error);
        warning = 'The new notification was scheduled, but the previous schedule could not be cancelled.';
      }
    }

    respond(res, 200, { notificationId: result.id, warning });
  } catch (error) {
    console.error('OneSignal scheduling failed', error);
    respond(res, 502, { error: 'OneSignal scheduling failed. Please try again.' });
  }
}
