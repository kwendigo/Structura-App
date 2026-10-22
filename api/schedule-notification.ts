import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from 'node:process';

type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

interface TaskPayload {
  title: string;
  startTime: string;
  days: Weekday[];
  isReminder?: boolean;
}

interface ScheduleRequest {
  task?: TaskPayload;
  targetedWeekday?: Weekday;
  subscriptionId?: string;
  timeZone?: string;
  previousNotificationId?: string;
  notificationId?: string;
}

type VercelRequest = IncomingMessage & { body?: unknown };

const WEEKDAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
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

function getDateParts(date: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function localTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date | null {
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = desiredAsUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = getDateParts(new Date(timestamp), timeZone);
    const representedAsUtc = Date.UTC(
      Number(local.year),
      Number(local.month) - 1,
      Number(local.day),
      Number(local.hour),
      Number(local.minute),
      Number(local.second)
    );
    timestamp += desiredAsUtc - representedAsUtc;
  }

  const result = new Date(timestamp);
  const local = getDateParts(result, timeZone);
  if (
    Number(local.year) !== year ||
    Number(local.month) !== month ||
    Number(local.day) !== day ||
    Number(local.hour) !== hour ||
    Number(local.minute) !== minute
  ) {
    return null;
  }
  return result;
}

function getNextOccurrence(
  weekday: Weekday,
  startTime: string,
  timeZone: string,
  now = new Date()
): Date | null {
  const [hour, minute] = startTime.split(':').map(Number);
  const localNow = getDateParts(now, timeZone);
  const baseDate = new Date(Date.UTC(
    Number(localNow.year),
    Number(localNow.month) - 1,
    Number(localNow.day)
  ));

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateDate = new Date(baseDate);
    candidateDate.setUTCDate(baseDate.getUTCDate() + offset);
    if (WEEKDAYS[candidateDate.getUTCDay()] !== weekday) continue;

    const candidate = localTimeToUtc(
      candidateDate.getUTCFullYear(),
      candidateDate.getUTCMonth() + 1,
      candidateDate.getUTCDate(),
      hour,
      minute,
      timeZone
    );
    if (candidate && candidate.getTime() > now.getTime() + 60_000) return candidate;
  }
  return null;
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
  const apiKey = env.ONESIGNAL_REST_API_KEY;
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
  if (!hasSameOrigin(req)) {
    respond(res, 403, { error: 'Requests must come from this app origin.' });
    return;
  }
  if (!env.ONESIGNAL_APP_ID || !env.ONESIGNAL_REST_API_KEY) {
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
  const weekday = body.targetedWeekday;
  if (
    !task ||
    typeof task.title !== 'string' ||
    task.title.trim().length === 0 ||
    task.title.length > 120 ||
    typeof task.startTime !== 'string' ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.startTime) ||
    !Array.isArray(task.days) ||
    task.days.length === 0 ||
    task.days.some((day) => typeof day !== 'string' || !WEEKDAYS.includes(day as Weekday)) ||
    typeof weekday !== 'string' ||
    !WEEKDAYS.includes(weekday as Weekday) ||
    !task.days.includes(weekday as Weekday) ||
    typeof body.subscriptionId !== 'string' ||
    !UUID_PATTERN.test(body.subscriptionId) ||
    typeof body.timeZone !== 'string' ||
    body.timeZone.length > 100 ||
    (body.previousNotificationId !== undefined &&
      (typeof body.previousNotificationId !== 'string' || !UUID_PATTERN.test(body.previousNotificationId)))
  ) {
    respond(res, 400, { error: 'The task, weekday, subscription, or time zone is invalid.' });
    return;
  }

  let scheduledAt: Date | null;
  try {
    scheduledAt = getNextOccurrence(weekday as Weekday, task.startTime, body.timeZone);
  } catch {
    respond(res, 400, { error: 'The time zone is invalid.' });
    return;
  }
  if (!scheduledAt) {
    respond(res, 400, { error: 'No valid upcoming local time was found for this weekday.' });
    return;
  }

  try {
    const response = await callOneSignal('/notifications', 'POST', {
      app_id: env.ONESIGNAL_APP_ID,
      include_subscription_ids: [body.subscriptionId],
      target_channel: 'push',
      headings: { en: task.title.trim() },
      contents: { en: task.isReminder ? `Reminder at ${task.startTime}` : `Starting at ${task.startTime}` },
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
