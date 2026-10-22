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

const DAY_ORDER: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function getNextTargetWeekday(task: Pick<Task, 'days' | 'startTime'>): DayOfWeek {
  if (task.days.length === 0) throw new Error('Select at least one day for this task.');

  const now = new Date();
  const startMinutes = Number(task.startTime.slice(0, 2)) * 60 + Number(task.startTime.slice(3, 5));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const candidates = task.days.map((day) => {
    const dayOffset = (DAY_ORDER.indexOf(day) - now.getDay() + 7) % 7;
    return {
      day,
      daysUntil: dayOffset === 0 && startMinutes <= nowMinutes ? 7 : dayOffset,
    };
  });

  candidates.sort((a, b) => a.daysUntil - b.daysUntil);
  return candidates[0].day;
}

export interface ScheduleNotificationResult {
  notificationId: string;
  warning?: string;
}

export async function scheduleTaskNotification(
  task: Pick<Task, 'title' | 'startTime' | 'days' | 'isReminder'>,
  targetedWeekday: DayOfWeek,
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
      task,
      targetedWeekday,
      subscriptionId,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function sendDeviceNotification(title: string, body?: string, tag?: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;

  const options: NotificationOptions = { body, tag };
  try {
    const registration = 'serviceWorker' in navigator
      ? await navigator.serviceWorker.getRegistration()
      : undefined;
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // Focus notifications can fall back to the active page.
  }

  try {
    new Notification(title, options);
  } catch {
    // Some mobile browsers only allow notifications through a service worker.
  }
}
