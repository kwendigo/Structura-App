/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RoutineBlock {
  id: string;
  name: string; // e.g. "Morning Routine", "Deep Work Block", "Evening Wind Down"
  color: string; // Hex color or palette key
  day: DayOfWeek; // Primary day or first assigned
  days?: DayOfWeek[]; // Repeating days (Mon, Tue, etc.)
  startTime?: string;
  durationMinutes?: number;
  order?: number;
}

export interface Task {
  id: string;
  title: string;
  startTime: string; // "HH:MM" 24-hour format e.g. "08:30"
  durationMinutes: number; // e.g. 30, 45, 60, 0 for reminder
  isReminder?: boolean; // If true, acts as a timestamp reminder without duration
  icon: string; // Lucide icon identifier e.g. "sun", "coffee", "dumbbell", "book", "code"
  color: string; // Hex code e.g. "#007AFF"
  completed: boolean;
  days: DayOfWeek[]; // Repeating days (or single day)
  subtasks: Subtask[];
  blockId?: string | null; // Optional reference to RoutineBlock
  notes?: string;
  completedAt?: string; // ISO string if completed earlier
  scheduledNotificationId?: string;
}

export interface TaskTemplate {
  title: string;
  color: string;
  icon: string;
  durationMinutes: number;
  isReminder?: boolean;
}

export interface UnallocatedGap {
  id: string;
  type: 'gap';
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface ClashingWarningItem {
  id: string;
  type: 'clash_warning';
  taskA: Task;
  taskB: Task;
  message: string;
}

export interface ScheduledTaskItem {
  type: 'task';
  task: Task;
  endTime: string;
}

export type TimelineItem = ScheduledTaskItem | UnallocatedGap | ClashingWarningItem;

export interface AppSettings {
  use24Hour: boolean;
  quickDurations: number[]; // e.g. [15, 30, 45, 60, 90]
  rememberedTasks: string[]; // Suggested tasks history
  taskTemplates?: TaskTemplate[]; // Remembered templates with color & icon
  savedCustomHexes?: string[]; // Saved custom hex codes
  simulatedTimeEnabled: boolean;
  simulatedTimeMinutes: number; // Minutes from midnight (e.g. 540 = 09:00)
  accentColor?: string; // App-wide theme accent e.g. "#007AFF"
  uniformTaskColorEnabled?: boolean;
  uniformTaskColor?: string;
  notificationsEnabled?: boolean;
  notificationApiSecret?: string;
  reminderMinutesBefore?: number;
  soundEnabled?: boolean;
  iCloudSyncEnabled?: boolean;
  cloudSyncKey?: string;
  cloudSyncLastBackupAt?: string;
  widgetType?: 'next_up' | 'timeline' | 'both';
}
