import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { env } from 'node:process';

type VercelRequest = IncomingMessage & { body?: unknown };
interface EncryptedBackupPayload {
  iv: string;
  ciphertext: string;
}
interface CloudSyncRequest {
  action?: 'get' | 'put';
  payload?: EncryptedBackupPayload;
}

const RECOVERY_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const IV_PATTERN = /^[A-Za-z0-9_-]{16}$/;
const CIPHERTEXT_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_CIPHERTEXT_LENGTH = 2_800_000;

function respond(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function parseBody(body: unknown): CloudSyncRequest | null {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  return body as CloudSyncRequest;
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

function getRecoveryKey(req: VercelRequest): string | null {
  const key = req.headers['x-cloud-sync-key'];
  return typeof key === 'string' && RECOVERY_KEY_PATTERN.test(key) ? key : null;
}

function getKvCredentials(): { url: string; token: string } | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

function getStorageKey(recoveryKey: string): string {
  const digest = createHash('sha256').update(recoveryKey).digest('hex');
  return `structura:encrypted-tasks:${digest}`;
}

async function kvRequest(
  credentials: { url: string; token: string },
  command: 'get' | 'set',
  key: string,
  value?: string
): Promise<unknown> {
  const response = await fetch(
    command === 'get'
      ? `${credentials.url}/get/${encodeURIComponent(key)}`
      : credentials.url,
    {
      method: command === 'get' ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        ...(value !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: value !== undefined ? JSON.stringify(['SET', key, value]) : undefined,
      signal: AbortSignal.timeout(10_000),
    }
  );
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || typeof result !== 'object' || result === null || !('result' in result)) {
    throw new Error('Vercel KV request failed.');
  }
  return result.result;
}

function isValidPayload(value: unknown): value is EncryptedBackupPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const payload = value as Partial<EncryptedBackupPayload>;
  return typeof payload.iv === 'string' &&
    IV_PATTERN.test(payload.iv) &&
    typeof payload.ciphertext === 'string' &&
    payload.ciphertext.length <= MAX_CIPHERTEXT_LENGTH &&
    payload.ciphertext.length > 0 &&
    CIPHERTEXT_PATTERN.test(payload.ciphertext);
}

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    respond(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!hasSameOrigin(req)) {
    respond(res, 403, { error: 'Requests must come from this app origin.' });
    return;
  }

  const recoveryKey = getRecoveryKey(req);
  if (!recoveryKey) {
    respond(res, 401, { error: 'A valid cloud recovery key is required.' });
    return;
  }
  const credentials = getKvCredentials();
  if (!credentials) {
    respond(res, 503, { error: 'Vercel KV is not configured. Add KV_REST_API_URL and KV_REST_API_TOKEN.' });
    return;
  }

  const storageKey = getStorageKey(recoveryKey);
  try {
    const body = parseBody(req.body);
    if (!body || (body.action !== 'get' && body.action !== 'put')) {
      respond(res, 400, { error: 'A valid cloud sync action is required.' });
      return;
    }

    if (body.action === 'get') {
      const value = await kvRequest(credentials, 'get', storageKey);
      if (typeof value !== 'string') {
        respond(res, 200, { payload: null });
        return;
      }
      const stored: unknown = JSON.parse(value);
      if (
        typeof stored !== 'object' ||
        stored === null ||
        !('payload' in stored) ||
        !isValidPayload(stored.payload) ||
        !('updatedAt' in stored) ||
        typeof stored.updatedAt !== 'string'
      ) {
        respond(res, 500, { error: 'The stored cloud backup is invalid.' });
        return;
      }
      respond(res, 200, stored as { payload: EncryptedBackupPayload; updatedAt: string });
      return;
    }

    if (!isValidPayload(body.payload)) {
      respond(res, 400, { error: 'A valid encrypted task backup is required.' });
      return;
    }
    const stored = {
      payload: body.payload,
      updatedAt: new Date().toISOString(),
    };
    await kvRequest(credentials, 'set', storageKey, JSON.stringify(stored));
    respond(res, 200, { updatedAt: stored.updatedAt });
  } catch (error) {
    console.error('Cloud task sync failed', error);
    respond(res, 502, { error: 'Cloud sync failed. Please try again.' });
  }
}
