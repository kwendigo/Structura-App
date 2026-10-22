/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, RoutineBlock, AppSettings, TaskTemplate } from '../types';

export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [];

export const DEFAULT_SETTINGS: AppSettings = {
  use24Hour: true,
  quickDurations: [15, 30, 45, 60, 90], // 15m, 30m, 45m, 1h, 1.5h
  rememberedTasks: [],
  taskTemplates: DEFAULT_TASK_TEMPLATES,
  savedCustomHexes: [],
  simulatedTimeEnabled: false,
  simulatedTimeMinutes: 520,
  accentColor: '#007AFF',
  uniformTaskColorEnabled: false,
  uniformTaskColor: '#007AFF',
  notificationsEnabled: true,
  reminderMinutesBefore: 5,
  soundEnabled: true,
  iCloudSyncEnabled: true,
  widgetType: 'both',
};

export const DEFAULT_BLOCKS: RoutineBlock[] = [];

export const DEFAULT_TASKS: Task[] = [];

const STORAGE_KEYS = {
  TASKS: 'structura_tasks_v2',
  BLOCKS: 'structura_blocks_v2',
  SETTINGS: 'structura_settings_v2',
};

export function loadStoredTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load tasks from localStorage', e);
  }
  return DEFAULT_TASKS;
}

export function saveStoredTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.warn('Failed to save tasks to localStorage', e);
  }
}

export function loadStoredBlocks(): RoutineBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOCKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load blocks from localStorage', e);
  }
  return DEFAULT_BLOCKS;
}

export function saveStoredBlocks(blocks: RoutineBlock[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(blocks));
  } catch (e) {
    console.warn('Failed to save blocks to localStorage', e);
  }
}

export function loadStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      const templates = Array.isArray(parsed.taskTemplates)
        ? parsed.taskTemplates
        : DEFAULT_TASK_TEMPLATES;
      const quickDurations = parsed.quickDurations && parsed.quickDurations.length > 0
        ? parsed.quickDurations
        : [15, 30, 45, 60, 90];
      return { ...DEFAULT_SETTINGS, ...parsed, taskTemplates: templates, quickDurations };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage', e);
  }
}

export const APPLE_PALETTE = [
  { name: 'Blue', hex: '#007AFF' },
  { name: 'Indigo', hex: '#5856D6' },
  { name: 'Purple', hex: '#AF52DE' },
  { name: 'Pink', hex: '#FF2D55' },
  { name: 'Red', hex: '#FF3B30' },
  { name: 'Orange', hex: '#FF9500' },
  { name: 'Yellow', hex: '#FFCC00' },
  { name: 'Green', hex: '#34C759' },
  { name: 'Mint', hex: '#00C7BE' },
  { name: 'Teal', hex: '#30B0C7' },
  { name: 'Cyan', hex: '#32ADE6' },
  { name: 'Gray', hex: '#8E8E93' },
];
