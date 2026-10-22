/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DayOfWeek, Task, TimelineItem, RoutineBlock } from '../types';

export const DAYS_OF_WEEK: { key: DayOfWeek; short: string; label: string }[] = [
  { key: 'mon', short: 'Mon', label: 'Monday' },
  { key: 'tue', short: 'Tue', label: 'Tuesday' },
  { key: 'wed', short: 'Wed', label: 'Wednesday' },
  { key: 'thu', short: 'Thu', label: 'Thursday' },
  { key: 'fri', short: 'Fri', label: 'Friday' },
  { key: 'sat', short: 'Sat', label: 'Saturday' },
  { key: 'sun', short: 'Sun', label: 'Sunday' },
];

export function getWeekDays(referenceDate: Date = new Date()): { key: DayOfWeek; short: string; dayNumber: number; date: Date }[] {
  // Start week with Monday
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const keys: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const shorts = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return keys.map((key, index) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + index);
    return {
      key,
      short: shorts[index],
      dayNumber: cur.getDate(),
      date: cur,
    };
  });
}

export function formatDayMonthYear(d: Date): string {
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function filterBlocksForDay(blocks: RoutineBlock[], day: DayOfWeek): RoutineBlock[] {
  return blocks.filter((b) => (b.days && b.days.length > 0 ? b.days.includes(day) : b.day === day));
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

export function minutesToTimeString(minutes: number, is24h: boolean = true): string {
  const norm = Math.max(0, Math.min(24 * 60 - 1, minutes));
  const h = Math.floor(norm / 60);
  const m = norm % 60;

  if (is24h) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startM = parseTimeToMinutes(startTime);
  const endM = (startM + durationMinutes) % (24 * 60);
  return minutesToTimeString(endM, true);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

export function sortTasksByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const diff = parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return a.durationMinutes - b.durationMinutes;
  });
}

export function filterTasksForDay(tasks: Task[], day: DayOfWeek): Task[] {
  return tasks.filter((t) => t.days.includes(day));
}

/**
 * Calculates timeline layout with unallocated time gaps (dashed line sections).
 * Minimum gap duration to display is typically >= 10 mins.
 */
export function buildTimelineWithGaps(tasks: Task[], minGapThreshold: number = 10): TimelineItem[] {
  const sorted = sortTasksByTime(tasks);
  const timeline: TimelineItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const currentStartM = parseTimeToMinutes(current.startTime);
    const currentEndStr = calculateEndTime(current.startTime, current.durationMinutes);
    const currentEndM = currentStartM + current.durationMinutes;

    timeline.push({
      type: 'task',
      task: current,
      endTime: currentEndStr,
    });

    // Check gap to next task
    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      const nextStartM = parseTimeToMinutes(next.startTime);
      const gapDuration = nextStartM - currentEndM;

      if (gapDuration >= minGapThreshold) {
        timeline.push({
          type: 'gap',
          id: `gap-${current.id}-${next.id}`,
          startTime: currentEndStr,
          endTime: next.startTime,
          durationMinutes: gapDuration,
        });
      }
    }
  }

  return timeline;
}

export interface TaskProgressStatus {
  isActive: boolean;
  isPast: boolean;
  isFuture: boolean;
  progressPercent: number; // 0 to 100
  remainingMinutes: number;
  elapsedMinutes: number;
}

export function calculateTaskProgress(
  startTime: string,
  durationMinutes: number,
  nowMinutes: number
): TaskProgressStatus {
  const startM = parseTimeToMinutes(startTime);
  const endM = startM + durationMinutes;

  if (nowMinutes < startM) {
    return {
      isActive: false,
      isPast: false,
      isFuture: true,
      progressPercent: 0,
      remainingMinutes: durationMinutes,
      elapsedMinutes: 0,
    };
  }

  if (nowMinutes >= endM) {
    return {
      isActive: false,
      isPast: true,
      isFuture: false,
      progressPercent: 100,
      remainingMinutes: 0,
      elapsedMinutes: durationMinutes,
    };
  }

  const elapsed = Math.max(0, nowMinutes - startM);
  const remaining = Math.max(0, endM - nowMinutes);
  const progress = durationMinutes > 0 ? Math.min(100, Math.round((elapsed / durationMinutes) * 100)) : 100;

  return {
    isActive: true,
    isPast: false,
    isFuture: false,
    progressPercent: progress,
    remainingMinutes: remaining,
    elapsedMinutes: elapsed,
  };
}

/**
 * Calculates physical height proportional to task duration.
 * e.g. 15m -> ~64px, 30m -> ~80px, 60m -> ~120px, 120m -> ~180px
 */
export function getProportionalNodeHeight(durationMinutes: number): number {
  const clamped = Math.max(10, Math.min(240, durationMinutes));
  return Math.round(56 + Math.sqrt(clamped) * 7.5);
}

/**
 * Copies tasks from sourceDay to targetDay.
 */
export function duplicateDaySchedule(
  allTasks: Task[],
  allBlocks: RoutineBlock[],
  sourceDay: DayOfWeek,
  targetDay: DayOfWeek
): { tasks: Task[]; blocks: RoutineBlock[] } {
  if (sourceDay === targetDay) {
    return { tasks: allTasks, blocks: allBlocks };
  }

  const sourceBlocks = allBlocks.filter((b) => b.day === sourceDay);
  const blockIdMap = new Map<string, string>();
  const newBlocks: RoutineBlock[] = [...allBlocks.filter((b) => b.day !== targetDay)];

  for (const block of sourceBlocks) {
    const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    blockIdMap.set(block.id, newBlockId);
    newBlocks.push({
      ...block,
      id: newBlockId,
      day: targetDay,
    });
  }

  const nonTargetTasks = allTasks.map((task) => {
    if (task.days.includes(targetDay)) {
      return {
        ...task,
        days: task.days.filter((d) => d !== targetDay),
      };
    }
    return task;
  }).filter((t) => t.days.length > 0);

  const sourceTasks = allTasks.filter((t) => t.days.includes(sourceDay));
  const clonedTasks: Task[] = sourceTasks.map((t) => {
    const newBlockId = t.blockId ? blockIdMap.get(t.blockId) || null : null;
    return {
      ...t,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      days: [targetDay],
      completed: false,
      scheduledNotificationId: undefined,
      blockId: newBlockId,
      subtasks: t.subtasks.map((st) => ({
        ...st,
        id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        completed: false,
      })),
    };
  });

  return {
    tasks: [...nonTargetTasks, ...clonedTasks],
    blocks: newBlocks,
  };
}

/**
 * Duplicate a single block and all its assigned tasks to target day.
 */
export function duplicateBlockSchedule(
  allTasks: Task[],
  allBlocks: RoutineBlock[],
  sourceBlockId: string,
  targetDay: DayOfWeek
): { tasks: Task[]; blocks: RoutineBlock[] } {
  const sourceBlock = allBlocks.find((b) => b.id === sourceBlockId);
  if (!sourceBlock) return { tasks: allTasks, blocks: allBlocks };

  const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newBlock: RoutineBlock = {
    ...sourceBlock,
    id: newBlockId,
    day: targetDay,
  };

  const tasksInBlock = allTasks.filter((t) => t.blockId === sourceBlockId);
  const clonedTasks: Task[] = tasksInBlock.map((t) => ({
    ...t,
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    days: [targetDay],
    completed: false,
    scheduledNotificationId: undefined,
    blockId: newBlockId,
    subtasks: t.subtasks.map((st) => ({
      ...st,
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      completed: false,
    })),
  }));

  return {
    tasks: [...allTasks, ...clonedTasks],
    blocks: [...allBlocks, newBlock],
  };
}

export interface TaskClashInfo {
  taskId: string;
  clashingWithTaskIds: string[];
  clashingTaskTitles: string[];
  overlapMinutes: number;
}

/**
 * Checks for time collisions / overlaps among tasks on a given day.
 */
export function detectAllClashes(tasks: Task[]): Map<string, TaskClashInfo> {
  const clashMap = new Map<string, TaskClashInfo>();
  const sorted = sortTasksByTime(tasks);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const cStart = parseTimeToMinutes(current.startTime);
    const cEnd = cStart + current.durationMinutes;

    for (let j = i + 1; j < sorted.length; j++) {
      const other = sorted[j];
      const oStart = parseTimeToMinutes(other.startTime);
      const oEnd = oStart + other.durationMinutes;

      if (cStart < oEnd && oStart < cEnd) {
        const overlapStart = Math.max(cStart, oStart);
        const overlapEnd = Math.min(cEnd, oEnd);
        const overlap = overlapEnd - overlapStart;

        const curInfo = clashMap.get(current.id) || {
          taskId: current.id,
          clashingWithTaskIds: [],
          clashingTaskTitles: [],
          overlapMinutes: 0,
        };
        curInfo.clashingWithTaskIds.push(other.id);
        curInfo.clashingTaskTitles.push(other.title);
        curInfo.overlapMinutes = Math.max(curInfo.overlapMinutes, overlap);
        clashMap.set(current.id, curInfo);

        const otherInfo = clashMap.get(other.id) || {
          taskId: other.id,
          clashingWithTaskIds: [],
          clashingTaskTitles: [],
          overlapMinutes: 0,
        };
        otherInfo.clashingWithTaskIds.push(current.id);
        otherInfo.clashingTaskTitles.push(current.title);
        otherInfo.overlapMinutes = Math.max(otherInfo.overlapMinutes, overlap);
        clashMap.set(other.id, otherInfo);
      }
    }
  }

  return clashMap;
}

export function validateTaskMove(
  movingTaskId: string,
  newStartTime: string,
  newDuration: number,
  targetBlockId: string | null,
  dayTasks: Task[]
): { hasClash: boolean; clashingTasks: Task[]; message?: string } {
  const mStart = parseTimeToMinutes(newStartTime);
  const mEnd = mStart + newDuration;

  const otherTasks = dayTasks.filter((t) => t.id !== movingTaskId);
  const clashingTasks: Task[] = [];

  for (const other of otherTasks) {
    const oStart = parseTimeToMinutes(other.startTime);
    const oEnd = oStart + other.durationMinutes;

    if (mStart < oEnd && oStart < mEnd) {
      clashingTasks.push(other);
    }
  }

  if (clashingTasks.length > 0) {
    const clashNames = clashingTasks.map((t) => `"${t.title}" (${t.startTime})`).join(', ');
    return {
      hasClash: true,
      clashingTasks,
      message: `Time conflict! Overlaps with ${clashNames}`,
    };
  }

  return { hasClash: false, clashingTasks: [] };
}

export interface PomodoroInterval {
  id: string;
  type: 'work' | 'break';
  title: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

export function calculatePomodoroPlan(
  startTime: string,
  durationMinutes: number,
  breakMinutes: number = 5
): PomodoroInterval[] {
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15) return [];

  const intervals: PomodoroInterval[] = [];
  const startM = parseTimeToMinutes(startTime);
  const actualBreak = durationMinutes < 60 ? 5 : Math.max(5, Math.min(15, breakMinutes));
  const workCount = Math.max(2, Math.ceil((durationMinutes - actualBreak * 2) / (25 + actualBreak)));
  let breakCount = workCount;
  let workDuration = (durationMinutes - breakCount * actualBreak) / workCount;

  if (workDuration < 5) {
    breakCount--;
    workDuration = (durationMinutes - breakCount * actualBreak) / workCount;
  }

  let cursor = startM;
  for (let index = 0; index < workCount; index++) {
    const workEnd = cursor + workDuration;
    intervals.push({
      id: `work-${index + 1}`,
      type: 'work',
      title: `Focus Sprint ${index + 1}`,
      startTime: formatPomodoroTime(cursor),
      endTime: formatPomodoroTime(workEnd),
      startMinutes: cursor,
      endMinutes: workEnd,
      durationMinutes: workDuration,
    });
    cursor = workEnd;

    if (index < breakCount) {
      const breakEnd = cursor + actualBreak;
      intervals.push({
        id: `break-${index + 1}`,
        type: 'break',
        title: `${actualBreak}m Rest Break`,
        startTime: formatPomodoroTime(cursor),
        endTime: formatPomodoroTime(breakEnd),
        startMinutes: cursor,
        endMinutes: breakEnd,
        durationMinutes: actualBreak,
      });
      cursor = breakEnd;
    }
  }

  return intervals;
}

function formatPomodoroTime(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  return seconds === 0 ? time : `${time}:${String(seconds).padStart(2, '0')}`;
}

export function formatRemainingClock(remainingMinutes: number): string {
  const clamped = Math.max(0, remainingMinutes);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h}:${String(m).padStart(2, '0')} remaining`;
}
