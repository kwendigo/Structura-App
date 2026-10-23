/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../types';

export interface EncryptedTaskBackup {
  iv: string;
  ciphertext: string;
}

export interface CloudTaskBackup {
  payload: EncryptedTaskBackup;
  updatedAt: string;
}

export function isValidCloudSyncKey(recoveryKey: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(recoveryKey);
}

export function generateCloudSyncKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return encodeBase64Url(bytes);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function getEncryptionKey(recoveryKey: string): Promise<CryptoKey> {
  if (!isValidCloudSyncKey(recoveryKey)) {
    throw new Error('Enter a valid 43-character cloud recovery key.');
  }
  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(decodeBase64Url(recoveryKey)),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptTasks(
  tasks: Task[],
  recoveryKey: string
): Promise<EncryptedTaskBackup> {
  const key = await getEncryptionKey(recoveryKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(tasks));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext)
  );
  return {
    iv: encodeBase64Url(iv),
    ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
  };
}

export async function decryptTasks(
  payload: EncryptedTaskBackup,
  recoveryKey: string
): Promise<Task[]> {
  const key = await getEncryptionKey(recoveryKey);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(decodeBase64Url(payload.iv)) },
    key,
    toArrayBuffer(decodeBase64Url(payload.ciphertext))
  );
  const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext));
  if (
    !Array.isArray(parsed) ||
    parsed.some((task) =>
      typeof task !== 'object' ||
      task === null ||
      typeof task.id !== 'string' ||
      typeof task.title !== 'string' ||
      typeof task.startTime !== 'string' ||
      typeof task.durationMinutes !== 'number' ||
      !Array.isArray(task.days) ||
      !Array.isArray(task.subtasks)
    )
  ) {
    throw new Error('The cloud backup does not contain a valid task list.');
  }
  return parsed as Task[];
}

async function cloudSyncRequest(
  recoveryKey: string,
  action: 'get' | 'put',
  payload?: EncryptedTaskBackup
): Promise<Response> {
  return fetch('/api/cloud-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cloud-Sync-Key': recoveryKey,
    },
    body: JSON.stringify({ action, payload }),
  });
}

export async function fetchCloudTaskBackup(recoveryKey: string): Promise<CloudTaskBackup | null> {
  const response = await cloudSyncRequest(recoveryKey, 'get');
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof result === 'object' && result !== null && 'error' in result
      ? String(result.error)
      : `Cloud restore failed (${response.status}).`;
    throw new Error(message);
  }
  if (
    typeof result !== 'object' ||
    result === null ||
    !('payload' in result) ||
    result.payload === null
  ) {
    return null;
  }
  if (
    typeof result.payload !== 'object' ||
    result.payload === null ||
    !('iv' in result.payload) ||
    typeof result.payload.iv !== 'string' ||
    !('ciphertext' in result.payload) ||
    typeof result.payload.ciphertext !== 'string' ||
    !('updatedAt' in result) ||
    typeof result.updatedAt !== 'string'
  ) {
    throw new Error('The cloud service returned an invalid backup.');
  }
  return {
    payload: {
      iv: result.payload.iv,
      ciphertext: result.payload.ciphertext,
    },
    updatedAt: result.updatedAt,
  };
}

export async function uploadCloudTaskBackup(
  recoveryKey: string,
  tasks: Task[]
): Promise<string> {
  const payload = await encryptTasks(tasks, recoveryKey);
  const response = await cloudSyncRequest(recoveryKey, 'put', payload);
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof result === 'object' && result !== null && 'error' in result
      ? String(result.error)
      : `Cloud backup failed (${response.status}).`;
    throw new Error(message);
  }
  if (
    typeof result !== 'object' ||
    result === null ||
    !('updatedAt' in result) ||
    typeof result.updatedAt !== 'string'
  ) {
    throw new Error('The cloud service did not confirm the backup.');
  }
  return result.updatedAt;
}
