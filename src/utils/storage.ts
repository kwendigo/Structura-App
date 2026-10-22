/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, RoutineBlock, AppSettings, TaskTemplate } from '../types';

export const RECORDED_TASKS_LIBRARY: string[] = [
  'Wake up & sunlight exposure',
  'Morning hydration (500ml water)',
  '5-minute hamstring & spine stretch',
  'Make the bed & open blinds',
  'Morning espresso & intention setting',
  'Mindfulness meditation (10 min)',
  'Cold shower & grooming',
  'Write morning pages / journal',
  'Take daily vitamins & electrolytes',
  'Review top 3 priorities for today',
  'Morning dog walk around the park',
  'Healthy breakfast & herbal tea',
  'Quick desk reset & air room',
  'Check transit & weather report',
  'Breathwork session (Box breathing)',
  'Deep Work: Project Planning & Architecture',
  'Code custom components & hooks',
  'Refactor API client & state management',
  'Pull request reviews & feedback',
  'Team standup & sync meeting',
  'Sprint backlog grooming',
  'Debug runtime memory leak',
  'Write end-to-end unit tests',
  'Documentation update & API specs',
  'Database schema migration & index audit',
  'Design system audit & token review',
  'Quarterly OKR review & roadmap',
  'Client progress demo & feedback sync',
  'Triage GitHub issues & bug tickets',
  'Deploy production release build',
  '5k outdoor run & tempo intervals',
  'Full body strength training (Gym)',
  'Core & abs bodyweight workout',
  'Yoga vinyasa flow session',
  'HIIT cardio workout (20 min)',
  'Read 1 chapter of Design Systems',
  'Read 30 pages of non-fiction book',
  'Listen to tech & business podcast',
  'Language practice: French vocabulary (15 min)',
  'Prep high-protein breakfast scramble',
  'Healthy lunch & fresh salad',
  'Afternoon green tea & almonds',
  'Cook balanced dinner from scratch',
  'Tidy workspace desk & wipe surfaces',
  'Water house plants & check soil',
  'Laundry: Wash, dry & fold clothes',
  'Clean kitchen counters & wash dishes',
  'Dinner & relax with family',
  'Evening walk around neighborhood',
  'Review completed tasks of the day',
  'Write 3 highlights & gratitude log',
];

export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
  { title: 'Hydration & Light Stretch', color: '#FF9500', icon: 'sunrise', durationMinutes: 20 },
  { title: 'Morning Espresso & Planning', color: '#FF9500', icon: 'coffee', durationMinutes: 30 },
  { title: 'High-Impact Project Architecture', color: '#007AFF', icon: 'laptop', durationMinutes: 90 },
  { title: 'Lunch & Fresh Air Walk', color: '#34C759', icon: 'utensils', durationMinutes: 45 },
  { title: 'Deep Reading & Journaling', color: '#5856D6', icon: 'book', durationMinutes: 40 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  use24Hour: true,
  quickDurations: [15, 30, 45, 60, 90], // 15m, 30m, 45m, 1h, 1.5h
  rememberedTasks: RECORDED_TASKS_LIBRARY,
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

export const DEFAULT_BLOCKS: RoutineBlock[] = [
  {
    id: 'block-morning',
    name: 'Morning Routine',
    color: '#FF9500',
    day: 'mon',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  },
  {
    id: 'block-work',
    name: 'Focus Sprint',
    color: '#007AFF',
    day: 'mon',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  },
  {
    id: 'block-evening',
    name: 'Evening Wind Down',
    color: '#5856D6',
    day: 'mon',
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  },
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Hydration & Light Stretch',
    startTime: '07:00',
    durationMinutes: 20,
    icon: 'sunrise',
    color: '#FF9500',
    completed: true,
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    blockId: 'block-morning',
    subtasks: [
      { id: 'st-1', title: 'Drink 500ml water', completed: true },
      { id: 'st-2', title: '5-minute hamstring stretch', completed: true },
    ],
  },
  {
    id: 'task-2',
    title: 'Morning Espresso & Planning',
    startTime: '07:30',
    durationMinutes: 30,
    icon: 'coffee',
    color: '#FF9500',
    completed: true,
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    blockId: 'block-morning',
    subtasks: [
      { id: 'st-3', title: 'Review today goals', completed: true },
      { id: 'st-4', title: 'Prep workspace desk', completed: true },
    ],
  },
  {
    id: 'task-3',
    title: 'High-Impact Project Architecture',
    startTime: '09:00',
    durationMinutes: 90,
    icon: 'laptop',
    color: '#007AFF',
    completed: false,
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    blockId: 'block-work',
    subtasks: [
      { id: 'st-5', title: 'Review UI layout spec', completed: true },
      { id: 'st-6', title: 'Code custom timeline components', completed: false },
      { id: 'st-7', title: 'Verify responsive viewport', completed: false },
    ],
  },
  {
    id: 'task-4',
    title: 'Lunch & Fresh Air Walk',
    startTime: '12:00',
    durationMinutes: 45,
    icon: 'utensils',
    color: '#34C759',
    completed: false,
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    blockId: null,
    subtasks: [],
  },
  {
    id: 'task-5',
    title: 'Deep Reading & Journaling',
    startTime: '20:30',
    durationMinutes: 40,
    icon: 'book',
    color: '#5856D6',
    completed: false,
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    blockId: 'block-evening',
    subtasks: [
      { id: 'st-8', title: 'Read 1 chapter of Design Systems', completed: false },
      { id: 'st-9', title: 'Write 3 highlights of the day', completed: false },
    ],
  },
];

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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
      const templates = parsed.taskTemplates && parsed.taskTemplates.length > 0
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
