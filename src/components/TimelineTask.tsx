/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
  RotateCw,
  Target,
  Clock,
} from 'lucide-react';
import { Task } from '../types';
import { IconRenderer } from './IconRenderer';
import { useLiftedDrag } from '../hooks/useLiftedDrag';
import {
  calculateEndTime,
  calculateTaskProgress,
  formatDuration,
  parseTimeToMinutes,
  minutesToTimeString,
  formatRemainingClock,
} from '../utils/scheduleLogic';

interface TimelineTaskProps {
  task: Task;
  currentTimeMinutes: number;
  realTimeMinutes?: number;
  use24Hour: boolean;
  isFirst: boolean;
  isLast: boolean;
  isOverlappingPrev?: boolean;
  accentColor?: string;
  onToggleComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onCopyTask: (task: Task) => void;
  onOpenFocus?: (task: Task) => void;
  onUpdateTaskTime?: (taskId: string, newStartTime: string) => void;
}

export const TimelineTask: React.FC<TimelineTaskProps> = ({
  task,
  currentTimeMinutes,
  realTimeMinutes = currentTimeMinutes,
  use24Hour,
  isFirst,
  isLast,
  isOverlappingPrev = false,
  accentColor = '#007AFF',
  onToggleComplete,
  onToggleSubtask,
  onEditTask,
  onOpenFocus,
  onUpdateTaskTime,
}) => {
  const [subtasksOpen, setSubtasksOpen] = useState(true);

  const [isLifted, setIsLifted] = useState(false);
  const [liveSnappedStartM, setLiveSnappedStartM] = useState<number | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ y: number; startM: number } | null>(null);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startClientYRef = useRef<number | null>(null);
  const liveSnappedStartMRef = useRef<number | null>(null);
  const pendingDragOffsetYRef = useRef(0);
  const dragFrameRef = useRef<number | null>(null);

  const isReminder = task.isReminder || task.durationMinutes === 0;

  const endTime = isReminder ? task.startTime : calculateEndTime(task.startTime, task.durationMinutes);
  const nodeHeight = isReminder
    ? 56
    : Math.min(240, 56 + Math.max(0, task.durationMinutes - 5) * 1.2);
  const progress = calculateTaskProgress(task.startTime, isReminder ? 5 : task.durationMinutes, currentTimeMinutes);

  const isCompleted = task.completed;
  const isPast = progress.isPast || (isCompleted && parseTimeToMinutes(task.startTime) < currentTimeMinutes);
  const isActive = progress.isActive && !isCompleted;

  const isRepeating = task.days && task.days.length > 1;

  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((st) => st.completed).length;
  const startMinutes = parseTimeToMinutes(task.startTime);
  const taskEndMinutes = startMinutes + (isReminder ? 0 : task.durationMinutes);
  const currentTimeInTask = !isReminder &&
    realTimeMinutes >= startMinutes &&
    realTimeMinutes < taskEndMinutes;
  const currentTaskProgress = task.durationMinutes > 0
    ? (realTimeMinutes - startMinutes) / task.durationMinutes
    : 0;
  const bubbleTopOffset = isOverlappingPrev ? -20 : isFirst ? 0 : 8;
  const hourlyMarkers: number[] = [];
  if (!isReminder && task.durationMinutes > 60) {
    for (let hour = Math.floor(startMinutes / 60) * 60 + 60; hour < taskEndMinutes; hour += 60) {
      hourlyMarkers.push(hour);
    }
  }

  const handleGestureStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('[data-block-drag-handle]')) {
      return;
    }

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startM = parseTimeToMinutes(task.startTime);
    touchStartPos.current = { y: clientY, startM };
    startClientYRef.current = clientY;
    isDraggingRef.current = false;
    didDragRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      setIsLifted(true);
      isDraggingRef.current = true;
      didDragRef.current = true;
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(25);
      }
    }, 220);
  };

  const handleGestureMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartPos.current || isDraggingRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    if (Math.abs(clientY - touchStartPos.current.y) > 8 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleGestureEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (!isDraggingRef.current) {
      touchStartPos.current = null;
    }
  };

  useLiftedDrag({
    active: isLifted,
    elementRef: cardRef,
    startClientYRef,
    onMove: (deltaY) => {
      if (!touchStartPos.current) return;
      pendingDragOffsetYRef.current = deltaY;
      if (dragFrameRef.current === null) {
        dragFrameRef.current = window.requestAnimationFrame(() => {
          dragFrameRef.current = null;
          if (cardRef.current) {
            cardRef.current.style.transform = `translateY(${pendingDragOffsetYRef.current}px)`;
          }
        });
      }
      const deltaMinutes = Math.round(deltaY / 1.6);
      const rawMinutes = Math.max(0, Math.min(1440 - (isReminder ? 0 : task.durationMinutes), touchStartPos.current.startM + deltaMinutes));
      const snappedMinutes = Math.round(rawMinutes / 10) * 10;
      if (liveSnappedStartMRef.current !== snappedMinutes) {
        liveSnappedStartMRef.current = snappedMinutes;
        setLiveSnappedStartM(snappedMinutes);
      }
    },
    onEnd: () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      if (cardRef.current) {
        cardRef.current.style.transform = '';
      }
      if (liveSnappedStartMRef.current !== null && onUpdateTaskTime) {
        onUpdateTaskTime(task.id, minutesToTimeString(liveSnappedStartMRef.current, true));
      }
      setIsLifted(false);
      setLiveSnappedStartM(null);
      liveSnappedStartMRef.current = null;
      pendingDragOffsetYRef.current = 0;
      isDraggingRef.current = false;
      touchStartPos.current = null;
      window.setTimeout(() => {
        didDragRef.current = false;
      }, 250);
    },
  });

  const effectiveStartM = liveSnappedStartM !== null ? liveSnappedStartM : parseTimeToMinutes(task.startTime);
  const displayedStartTime = minutesToTimeString(effectiveStartM, use24Hour);
  const displayedEndTime = minutesToTimeString(effectiveStartM + task.durationMinutes, use24Hour);

  return (
    <div
      ref={cardRef}
      style={{
        touchAction: isLifted ? 'none' : undefined,
        transition: isLifted ? 'none' : undefined,
      }}
      onClick={(event) => {
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        const target = event.target;
        if (target instanceof Element && target.closest('button, input, textarea, select, a')) return;
        onEditTask(task);
      }}
      className={`relative flex items-start px-1 py-1 select-none group transition-all rounded-2xl ${
        isLifted
          ? 'z-40 shadow-2xl scale-[1.02] bg-white/95 dark:bg-zinc-800/95 ring-1 ring-black/10 dark:ring-white/10 cursor-grabbing'
          : 'cursor-pointer'
      }`}
      onTouchStart={handleGestureStart}
      onTouchMove={handleGestureMove}
      onTouchEnd={handleGestureEnd}
      onMouseDown={handleGestureStart}
      onMouseMove={handleGestureMove}
      onMouseUp={handleGestureEnd}
    >
      {isLifted && (
        <div className="absolute -left-1 top-2 z-50 px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl shadow-2xl flex items-center gap-1.5 font-bold text-xs pointer-events-none animate-in fade-in zoom-in-95">
          <Clock className="w-3.5 h-3.5" style={{ color: accentColor }} />
          <span>{displayedStartTime} {!isReminder && `– ${displayedEndTime}`}</span>
          {isReminder && <span className="text-[10px] font-semibold opacity-75">(Reminder)</span>}
        </div>
      )}

      <div
        className="relative w-10 flex-shrink-0 text-right pr-0.5 flex flex-col justify-between"
        style={{ minHeight: `${Math.max(52, nodeHeight)}px` }}
      >
        <div className="flex flex-col items-end">
          <span
            className={`timeline-timestamp text-xs font-semibold tabular-nums tracking-tight transition-colors ${
              isLifted
                ? 'font-black scale-105'
                : isActive
                ? 'font-bold'
                : isPast
                ? 'text-slate-500 dark:text-zinc-400 font-medium'
                : 'text-slate-700 dark:text-zinc-300'
            }`}
            style={{
              color: isLifted || isActive ? accentColor : undefined,
            }}
          >
            {displayedStartTime}
          </span>
        </div>

        {!isReminder && (
          <span className="timeline-timestamp-end text-[11px] tabular-nums font-normal text-slate-400 dark:text-zinc-500">
            {displayedEndTime}
          </span>
        )}
        {hourlyMarkers.map((hour) => (
          <span
            key={hour}
            className="timeline-hour-marker absolute right-0 z-20 -translate-y-1/2 whitespace-nowrap bg-white/90 dark:bg-zinc-950/90"
            style={{ top: `${bubbleTopOffset + ((hour - startMinutes) / task.durationMinutes) * nodeHeight}px` }}
          >
            {minutesToTimeString(hour, use24Hour)}
          </span>
        ))}
        {currentTimeInTask && (
          <span
            aria-label={`Current time ${minutesToTimeString(realTimeMinutes, true)}`}
            className="timeline-current-time absolute right-0 z-30 -translate-y-1/2 whitespace-nowrap rounded-sm bg-white px-0.5 font-bold text-black shadow-sm dark:bg-zinc-950 dark:text-white"
            style={{ top: `${bubbleTopOffset + currentTaskProgress * nodeHeight}px` }}
          >
            {minutesToTimeString(realTimeMinutes, true)}
          </span>
        )}
      </div>

      <div
        className={`relative ml-1 w-14 flex-shrink-0 flex flex-col items-center self-stretch ${
          isOverlappingPrev ? '-mt-5' : ''
        }`}
        style={{ minHeight: `${Math.max(52, nodeHeight)}px` }}
      >
        <div
          data-timeline-bubble
          data-task-color={task.color}
          data-block-drag-handle
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData('text/plain', task.id);
            event.dataTransfer.effectAllowed = 'move';
          }}
          className={`relative w-12 min-h-14 rounded-full flex items-center justify-center overflow-visible transition-all shadow-xs flex-shrink-0 p-3 ${
            isActive ? 'bg-slate-100 dark:bg-zinc-800' : ''
          } ${
            isOverlappingPrev
              ? 'ring-2 ring-white dark:ring-zinc-900 shadow-md backdrop-blur-xs'
              : ''
          }`}
          style={{
            height: `${Math.max(56, nodeHeight)}px`,
            backgroundColor: isPast ? task.color : isActive ? undefined : `${task.color}18`,
          }}
        >
          {isActive && !isReminder && (
            <div
              className="absolute top-0 left-0 w-full transition-[height] duration-700 ease-out"
              style={{
                height: `${progress.progressPercent}%`,
                background: `linear-gradient(180deg, ${task.color}aa 0%, ${task.color} 100%)`,
              }}
            />
          )}

          <div
            className={`relative z-10 flex items-center justify-center transition-colors ${
              isPast || (isActive && progress.progressPercent > 45) ? 'text-white' : ''
            }`}
            style={{
              color: isPast || (isActive && progress.progressPercent > 45) ? '#ffffff' : task.color,
            }}
          >
            <IconRenderer
              name={task.icon}
              strokeWidth={2.5}
              className={`w-6 h-6 stroke-[2.5] drop-shadow-2xs transition-opacity ${task.completed ? 'opacity-60' : 'opacity-100'}`}
            />
          </div>

        </div>

      </div>

      <div className="flex-1 ml-3 pr-0.5 min-w-0 self-center">
        <div className="timeline-task-metadata flex items-center flex-wrap gap-x-2 gap-y-0 text-[11px] text-slate-400 dark:text-zinc-500 tracking-tight">
          {isActive ? (
            <span style={{ fontWeight: 400 }}>
              {formatRemainingClock(progress.remainingMinutes)}
            </span>
          ) : isReminder ? (
            <span>{displayedStartTime}</span>
          ) : (
            <>
              <span>
                {displayedStartTime} – {displayedEndTime}
              </span>
              <span className="text-slate-400 dark:text-zinc-500">
                ({formatDuration(task.durationMinutes)})
              </span>
            </>
          )}

          {isRepeating && (
            <span
              title={`Repeats on ${task.days.join(', ').toUpperCase()}`}
              className="flex items-center gap-0.5 text-[10px]"
              style={{ color: task.color }}
            >
              <RotateCw className="w-2.5 h-2.5" />
            </span>
          )}

        </div>

        <div className="flex items-center justify-between gap-1.5 mt-0.5">
          <h3
            onClick={() => onEditTask(task)}
            title="Click to edit task"
            className={`timeline-task-title text-xs leading-tight transition-colors break-words ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-zinc-500 font-normal'
                : 'text-slate-800 dark:text-zinc-100'
            }`}
            style={{ fontWeight: isCompleted ? 400 : 700 }}
          >
            {task.title}
          </h3>

          {onOpenFocus && isActive && !isReminder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFocus(task);
              }}
              aria-label={`Focus on ${task.title}`}
              style={{
                backgroundColor: `${accentColor}18`,
                color: accentColor,
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all active:scale-95 shadow-2xs hover:brightness-95"
            >
              <Target className="w-3 h-3 stroke-[2.5]" />
              <span>Focus</span>
            </button>
          )}
        </div>

        {totalSubtasks > 0 && !isReminder && (
          <div className="mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSubtasksOpen(!subtasksOpen);
              }}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
            >
              {subtasksOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span className="font-medium text-[11px]">
                {completedSubtasks}/{totalSubtasks} subtasks
              </span>
            </button>

            {subtasksOpen && (
              <div className="mt-1.5 space-y-1 pl-1">
                {task.subtasks.map((st) => (
                  <div
                    key={st.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSubtask(task.id, st.id);
                    }}
                    className="flex items-center gap-2 group/st cursor-pointer py-0.5"
                  >
                    <button
                      type="button"
                      aria-label={`Toggle ${st.title}`}
                      className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: st.completed ? accentColor : 'transparent',
                        borderColor: st.completed ? accentColor : '#94a3b8',
                      }}
                    >
                      {st.completed && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </button>
                    <span
                      className={`text-xs ${
                        st.completed
                          ? 'line-through text-slate-400 dark:text-zinc-500'
                          : 'text-slate-600 dark:text-zinc-300'
                      }`}
                    >
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 pl-1.5 pt-0.5 self-start flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task.id);
          }}
          aria-label={`Mark '${task.title}' as ${isCompleted ? 'incomplete' : 'complete'}`}
          className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all active:scale-90"
          style={{
            backgroundColor: isCompleted ? accentColor : 'transparent',
            borderColor: isCompleted ? accentColor : '#cbd5e1',
          }}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
        </button>
      </div>
    </div>
  );
};
