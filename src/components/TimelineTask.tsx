/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
  MoreVertical,
  Copy,
  Edit2,
  Trash2,
  GripVertical,
  RotateCw,
  Target,
  Clock,
  Bell,
} from 'lucide-react';
import { Task } from '../types';
import { IconRenderer } from './IconRenderer';
import { useLiftedDrag } from '../hooks/useLiftedDrag';
import {
  calculateEndTime,
  calculateTaskProgress,
  getProportionalNodeHeight,
  formatDuration,
  parseTimeToMinutes,
  minutesToTimeString,
  formatRemainingClock,
} from '../utils/scheduleLogic';

interface TimelineTaskProps {
  task: Task;
  currentTimeMinutes: number;
  use24Hour: boolean;
  isFirst: boolean;
  isLast: boolean;
  isOverlappingPrev?: boolean;
  prevTaskColor?: string;
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
  use24Hour,
  isFirst,
  isLast,
  isOverlappingPrev = false,
  prevTaskColor,
  accentColor = '#007AFF',
  onToggleComplete,
  onToggleSubtask,
  onEditTask,
  onDeleteTask,
  onCopyTask,
  onOpenFocus,
  onUpdateTaskTime,
}) => {
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const [isLifted, setIsLifted] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [liveSnappedStartM, setLiveSnappedStartM] = useState<number | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ y: number; startM: number } | null>(null);
  const isDraggingRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startClientYRef = useRef<number | null>(null);
  const liveSnappedStartMRef = useRef<number | null>(null);

  const isReminder = task.isReminder || task.durationMinutes === 0;

  useEffect(() => {
    if (!showMenu) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !menuRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [showMenu]);

  const endTime = isReminder ? task.startTime : calculateEndTime(task.startTime, task.durationMinutes);
  const nodeHeight = isReminder ? 56 : getProportionalNodeHeight(task.durationMinutes);
  const progress = calculateTaskProgress(task.startTime, isReminder ? 5 : task.durationMinutes, currentTimeMinutes);

  const isCompleted = task.completed;
  const isPast = progress.isPast || (isCompleted && parseTimeToMinutes(task.startTime) < currentTimeMinutes);
  const isActive = progress.isActive && !isCompleted;

  const isRepeating = task.days && task.days.length > 1;

  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((st) => st.completed).length;

  const handleGestureStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('h3')) {
      return;
    }

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startM = parseTimeToMinutes(task.startTime);
    touchStartPos.current = { y: clientY, startM };
    startClientYRef.current = clientY;
    isDraggingRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      setIsLifted(true);
      isDraggingRef.current = true;
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
      setDragOffsetY(deltaY);
      const deltaMinutes = Math.round(deltaY / 1.6);
      const rawMinutes = Math.max(0, Math.min(1440 - (isReminder ? 0 : task.durationMinutes), touchStartPos.current.startM + deltaMinutes));
      const snappedMinutes = Math.round(rawMinutes / 5) * 5;
      liveSnappedStartMRef.current = snappedMinutes;
      setLiveSnappedStartM(snappedMinutes);
    },
    onEnd: () => {
      if (liveSnappedStartMRef.current !== null && onUpdateTaskTime) {
        onUpdateTaskTime(task.id, minutesToTimeString(liveSnappedStartMRef.current, true));
      }
      setIsLifted(false);
      setDragOffsetY(0);
      setLiveSnappedStartM(null);
      liveSnappedStartMRef.current = null;
      isDraggingRef.current = false;
      touchStartPos.current = null;
    },
  });

  const effectiveStartM = liveSnappedStartM !== null ? liveSnappedStartM : parseTimeToMinutes(task.startTime);
  const displayedStartTime = minutesToTimeString(effectiveStartM, use24Hour);
  const displayedEndTime = minutesToTimeString(effectiveStartM + task.durationMinutes, use24Hour);

  return (
    <div
      ref={cardRef}
      style={{
        transform: isLifted ? `translateY(${dragOffsetY}px)` : undefined,
        touchAction: isLifted ? 'none' : undefined,
      }}
      className={`relative flex items-start pl-1.5 pr-2 py-1 select-none group transition-all rounded-2xl ${
        isLifted
          ? 'z-40 shadow-2xl scale-[1.02] bg-white/95 dark:bg-zinc-800/95 ring-1 ring-black/10 dark:ring-white/10 cursor-grabbing'
          : ''
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
        className="w-14 flex-shrink-0 text-right pr-2.5 flex flex-col justify-between"
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
      </div>

      <div
        className={`relative w-9 flex-shrink-0 flex flex-col items-center self-stretch ${
          isOverlappingPrev ? '-mt-5' : ''
        }`}
        style={{ minHeight: `${Math.max(52, nodeHeight)}px` }}
      >
        {!isFirst && !isOverlappingPrev && (
          <div
            className="w-[2.5px] h-3 -mt-1 flex-shrink-0 transition-colors"
            style={{
              background:
                prevTaskColor && prevTaskColor !== task.color && (isPast || isActive)
                  ? `linear-gradient(180deg, ${prevTaskColor} 0%, ${task.color} 100%)`
                  : isPast || isActive
                  ? prevTaskColor || task.color
                  : '#e2e8f0',
              opacity: isPast ? 0.95 : 0.75,
            }}
          />
        )}

        <div
          className={`relative w-8.5 rounded-full flex flex-col items-center justify-center overflow-hidden transition-all shadow-xs flex-shrink-0 ${
            isActive ? 'bg-slate-100 dark:bg-zinc-800' : ''
          } ${
            isOverlappingPrev
              ? 'ring-2 ring-white dark:ring-zinc-900 shadow-md backdrop-blur-xs'
              : ''
          }`}
          style={{
            height: isReminder ? '36px' : `${Math.max(52, nodeHeight)}px`,
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
            {isReminder ? (
              <Bell className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <IconRenderer name={task.icon} className="w-5 h-5 stroke-[2.2] drop-shadow-2xs" />
            )}
          </div>

          {isActive && !isReminder && (
            <div className="absolute bottom-1 z-10 w-full flex flex-col items-center">
              <span className="text-[8px] font-bold tracking-tight text-white px-1 py-0.2 rounded-full bg-black/40 shadow-xs leading-none">
                {progress.remainingMinutes}m
              </span>
            </div>
          )}
        </div>

        {!isLast && (
          <div
            className="w-[2.5px] flex-1 min-h-[16px] transition-colors"
            style={{
              backgroundColor: isPast ? task.color : '#e2e8f0',
              opacity: isPast ? 0.95 : 0.7,
            }}
          />
        )}
      </div>

      <div className="flex-1 ml-3 pr-1 pt-0.5 min-w-0">
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-400 dark:text-zinc-500 font-medium tracking-tight">
          {isActive ? (
            <span className="font-semibold" style={{ color: accentColor }}>
              {formatRemainingClock(progress.remainingMinutes)}
            </span>
          ) : isReminder ? (
            <span className="font-semibold" style={{ color: task.color }}>Reminder at {displayedStartTime}</span>
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

          {isPast && (
            <span className="text-[10px] font-normal text-slate-400 dark:text-zinc-500">
              · Past Activity
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5 mt-1">
          <h3
            onClick={() => onEditTask(task)}
            title="Click to edit task"
            className={`text-sm md:text-base font-semibold leading-snug cursor-pointer transition-colors break-words hover:opacity-80 ${
              isCompleted
                ? 'line-through text-slate-400 dark:text-zinc-500 font-normal'
                : 'text-slate-800 dark:text-zinc-100'
            }`}
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

        <div
          title="Drag to move freely across timeline"
          className="p-1 text-slate-300 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-300 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="w-4 h-4 stroke-[2]" />
        </div>

        <div className="relative">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="Task options"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              ref={menuRef}
              className="absolute right-0 top-6 z-30 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {onOpenFocus && isActive && !isReminder && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenFocus(task);
                  }}
                    style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:brightness-95 rounded-xl transition-colors text-left font-semibold"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Start Focus Session</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onEditTask(task);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700/60 rounded-xl transition-colors text-left"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit activity</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onCopyTask(task);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700/60 rounded-xl transition-colors text-left"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Duplicate in front of current task</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onDeleteTask(task.id);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete activity</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
