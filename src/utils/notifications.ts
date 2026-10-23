/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayOfWeek, Task } from '../types';

interface OneSignalSdk {
  init: (options: {
    appId: string;
    serviceWorkerPath: string;
    serviceWorkerParam: { scope: string };
  }) => Promise<void>;
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void>;
  };
  User: {
    PushSubscription: {
      id: string | null;
      optedIn: boolean;
      optIn: () => Promise<void>;
    };
  };
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalSdk) => void>;
  }
}

let oneSignalPromise: Promise<OneSignalSdk> | null = null;

export function initializeOneSignal(): Promise<OneSignalSdk> {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    return Promise.reject(new Error('VITE_ONESIGNAL_APP_ID is not configured.'));
  }
  if (oneSignalPromise) return oneSignalPromise;

  oneSignalPromise = new Promise<OneSignalSdk>((resolve, reject) => {
    const deferred = window.OneSignalDeferred ??= [];
    deferred.push(async (oneSignal) => {
      try {
        await oneSignal.init({
          appId,
          serviceWorkerPath: 'push/OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/push/' },
        });
        resolve(oneSignal);
      } catch (error) {
        oneSignalPromise = null;
        reject(error);
      }
    });

    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.onerror = () => {
      oneSignalPromise = null;
      reject(new Error('Could not load the OneSignal Web SDK.'));
    };
    document.head.appendChild(script);
  });

  return oneSignalPromise;
}

export async function getOneSignalSubscriptionId(): Promise<string> {
  const oneSignal = await initializeOneSignal();
  if (!oneSignal.Notifications.permission) {
    await oneSignal.Notifications.requestPermission();
  }
  if (!oneSignal.Notifications.permission) {
    throw new Error('Enable push notifications to schedule task reminders.');
  }

  const subscription = oneSignal.User.PushSubscription;
  if (!subscription.optedIn) await subscription.optIn();
  if (!subscription.id) {
    throw new Error('OneSignal has not created a device subscription yet. Try again shortly.');
  }
  return subscription.id;
}

export function getNextScheduledAt(task: Pick<Task, 'days' | 'startTime' | 'scheduledDate'>): string {
  const [hours, minutes] = task.startTime.split(':').map(Number);
  if (task.scheduledDate) {
    const candidate = new Date(`${task.scheduledDate}T${task.startTime}:00`);
    if (Number.isNaN(candidate.getTime())) throw new Error('The one-off task date or time is invalid.');
    if (candidate.getTime() <= Date.now()) throw new Error('The one-off task time has already passed.');
    return candidate.toISOString();
  }
  if (task.days.length === 0) throw new Error('Select at least one day for this task.');

  const now = new Date();
  const weekdays: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    if (!task.days.includes(weekdays[candidate.getDay()])) continue;
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate.getTime() > now.getTime()) return candidate.toISOString();
  }
  throw new Error('Could not determine the next scheduled task time.');
}

export interface ScheduleNotificationResult {
  notificationId: string;
  warning?: string;
}

export async function scheduleTaskNotification(
  task: Pick<Task, 'title' | 'startTime' | 'isReminder'>,
  scheduledAt: string,
  subscriptionId: string,
  apiSecret: string,
  previousNotificationId?: string
): Promise<ScheduleNotificationResult> {
  if (!apiSecret.trim()) {
    throw new Error('Set the scheduler secret in Settings before scheduling task notifications.');
  }

  const response = await fetch('/api/schedule-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Scheduler-Secret': apiSecret,
    },
    body: JSON.stringify({
      task: {
        title: task.title,
        startTime: task.startTime,
        isReminder: task.isReminder,
      },
      scheduledAt,
      subscriptionId,
      previousNotificationId,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Notification scheduling failed (${response.status}).`);
  }
  if (typeof result.notificationId !== 'string') {
    throw new Error('OneSignal did not return a scheduled notification ID.');
  }
  return result;
}

export async function cancelTaskNotification(notificationId: string, apiSecret: string): Promise<void> {
  if (!apiSecret.trim()) {
    throw new Error('Set the scheduler secret in Settings before cancelling task notifications.');
  }

  const response = await fetch('/api/schedule-notification', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-Scheduler-Secret': apiSecret,
    },
    body: JSON.stringify({ notificationId }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Notification cancellation failed (${response.status}).`);
  }
}
