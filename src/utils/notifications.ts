/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
    // Fall through to page-level constructor
  }

  try {
    new Notification(title, options);
  } catch {
    // Constructor unavailable on some mobile browsers
  }
}
