/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Check,
  Flame,
  Coffee,
  ListTodo,
  FileText,
  Timer,
  Layers,
} from 'lucide-react';
import { Task } from '../types';
import { IconRenderer } from './IconRenderer';
import {
  formatDuration,
  calculateEndTime,
  parseTimeToMinutes,
  calculatePomodoroPlan,
} from '../utils/scheduleLogic';
import { sendDeviceNotification, requestNotificationPermission } from '../utils/notifications';

interface FocusModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentTimeMinutes: number;
  accentColor?: string;
  onToggleComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

export const FocusModeModal: React.FC<FocusModeModalProps> = ({
  isOpen,
  onClose,
  task,
  accentColor = '#007AFF',
  onToggleComplete,
  onToggleSubtask,
}) => {
  const [focusMode, setFocusMode] = useState<'standard' | 'pomodoro'>('standard');
  const [breakMinutes, setBreakMinutes] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<'intervals' | 'subtasks' | 'notes'>('intervals');
  const [pomodoroNotificationsActive, setPomodoroNotificationsActive] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<'to_pomodoro' | 'to_standard' | null>(null);

  const [nowSec, setNowSec] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  });

  useEffect(() => {
    if (!isOpen) return;
    setFocusMode('standard');
    setPomodoroNotificationsActive(false);
    setConfirmModal(null);

    const initialDate = new Date();
    const initialSec = initialDate.getHours() * 3600 + initialDate.getMinutes() * 60 + initialDate.getSeconds();
    setNowSec(initialSec);

    const interval = setInterval(() => {
      const d = new Date();
      setNowSec(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, task?.id]);

  const pomodoroIntervals = useMemo(() => {
    if (!task) return [];
    return calculatePomodoroPlan(task.startTime, task.durationMinutes, breakMinutes);
  }, [task, breakMinutes]);

  const prevNowSecRef = useRef<number | null>(null);
  useEffect(() => {
    const prevSec = prevNowSecRef.current;
    prevNowSecRef.current = isOpen ? nowSec : null;
    if (!isOpen || focusMode !== 'pomodoro' || !pomodoroNotificationsActive || prevSec === null || nowSec <= prevSec || !task) return;

    const finished = pomodoroIntervals.find((inv) => {
      const endSec = inv.endMinutes * 60;
      return prevSec < endSec && nowSec >= endSec;
    });
    if (!finished) return;

    if (finished.type === 'work') {
      sendDeviceNotification(
        task.title,
        `Your ${finished.durationMinutes} work session is over, time for a break!`,
        `pomo-work-${task.id}-${finished.id}`
      );
    } else {
      sendDeviceNotification(
        task.title,
        `Your ${finished.durationMinutes} break is over, work starts now!`,
        `pomo-break-${task.id}-${finished.id}`
      );
    }
  }, [nowSec, isOpen, focusMode, pomodoroNotificationsActive, pomodoroIntervals, task]);

  if (!isOpen || !task) return null;

  const taskStartSec = parseTimeToMinutes(task.startTime) * 60;
  const taskTotalSec = task.durationMinutes * 60;
  const taskEndSec = taskStartSec + taskTotalSec;

  const taskRemainingSec = Math.max(0, taskEndSec - nowSec);

  const currentMinutesFromMidnight = nowSec / 60;
  const activePomodoroInterval = pomodoroIntervals.find(
    (inv) => currentMinutesFromMidnight >= inv.startMinutes && currentMinutesFromMidnight < inv.endMinutes
  ) || (nowSec < taskStartSec ? pomodoroIntervals[0] : pomodoroIntervals[pomodoroIntervals.length - 1]);

  const intervalRemainingSec = activePomodoroInterval
    ? Math.max(0, activePomodoroInterval.endMinutes * 60 - nowSec)
    : 0;

  const formatSecondsCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const elapsedSec = Math.max(0, Math.min(taskTotalSec, nowSec - taskStartSec));
  const progressPercent = taskTotalSec > 0
    ? Math.min(100, Math.max(0, (elapsedSec / taskTotalSec) * 100))
    : 100;

  const endTimeStr = calculateEndTime(task.startTime, task.durationMinutes);
  const isUnderHour = task.durationMinutes < 60;

  const handleTabClick = (mode: 'standard' | 'pomodoro') => {
    if (mode === 'pomodoro' && focusMode === 'standard') {
      setConfirmModal('to_pomodoro');
    } else if (mode === 'standard' && focusMode === 'pomodoro') {
      setConfirmModal('to_standard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md h-full sm:h-auto sm:max-h-[94vh] bg-gradient-to-b from-stone-100 via-stone-50 to-stone-100 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-950 rounded-none sm:rounded-[36px] shadow-2xl overflow-y-auto flex flex-col justify-between p-5 sm:p-6 relative border border-white/20 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="w-12 h-1 bg-stone-300 dark:bg-zinc-700 rounded-full mx-auto" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close focus mode"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-600 dark:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center mt-1 mb-2">
          <div className="bg-black/5 dark:bg-white/10 p-1 rounded-full flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleTabClick('standard')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                focusMode === 'standard'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
              }`}
            >
              Task Focus
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('pomodoro')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                focusMode === 'pomodoro'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
              }`}
            >
              <Timer className="w-3 h-3 text-rose-500" />
              <span>Pomodoro {pomodoroNotificationsActive ? '🔔' : ''}</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-1 pb-3">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
            {formatSecondsCountdown(focusMode === 'pomodoro' ? intervalRemainingSec : taskRemainingSec)}
          </h2>
          <div className="flex flex-col items-center mt-1">
            <span className="text-xs font-bold tracking-widest text-slate-400 dark:text-zinc-500 uppercase">
              {focusMode === 'pomodoro' && activePomodoroInterval
                ? `${activePomodoroInterval.title.toUpperCase()} · REMAINING`
                : 'REMAINING'}
            </span>
            {focusMode === 'pomodoro' && (
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium mt-0.5">
                Total task: {formatSecondsCountdown(taskRemainingSec)} remaining
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div className="relative w-28 h-52 rounded-[56px] ring-4 ring-white/80 dark:ring-white/10 shadow-2xl overflow-hidden flex flex-col items-center justify-center bg-stone-200/70 dark:bg-zinc-800/80">
            {/* Top-to-bottom fill with subtle gradient */}
            <div
              className="absolute top-0 left-0 w-full transition-[height] duration-1000 ease-linear"
              style={{
                height: `${progressPercent}%`,
                background: `linear-gradient(180deg, ${task.color}88 0%, ${task.color} 100%)`,
                opacity: 0.95,
              }}
            />

            <div
              className="absolute inset-0 pointer-events-none rounded-[56px]"
              style={{
                boxShadow: `inset 0 0 24px ${task.color}50`,
              }}
            />

            <div className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white drop-shadow-md">
              <IconRenderer name={task.icon} className="w-10 h-10 stroke-[2.2]" />
            </div>

            <div className="absolute bottom-3 z-10 text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-white/80 dark:bg-black/60 px-2 py-0.5 rounded-full shadow-2xs">
              {Math.round(progressPercent)}% elapsed
            </div>
          </div>

          {focusMode === 'pomodoro' && (
            <div className="mt-4 flex flex-col items-center animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-2xl">
                <span className="text-[10px] font-semibold uppercase text-slate-400 px-1.5">Break:</span>
                {isUnderHour ? (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-white dark:bg-zinc-800 rounded-xl text-slate-800 dark:text-white shadow-xs">
                    5 min (fixed for &lt;1h tasks)
                  </span>
                ) : (
                  <>
                    {[5, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setBreakMinutes(mins)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-xl transition-all ${
                          breakMinutes === mins
                            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="bg-white/90 dark:bg-zinc-800/90 rounded-2xl p-3.5 shadow-sm flex items-center justify-between border border-black/5 dark:border-white/5">
            <div className="min-w-0 pr-2">
              <div className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
                {task.startTime} – {endTimeStr} ({formatDuration(task.durationMinutes)})
              </div>
              <h3
                className={`text-base font-bold mt-0.5 truncate ${
                  task.completed
                    ? 'line-through text-slate-400 dark:text-zinc-500'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {task.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => onToggleComplete(task.id)}
              aria-label="Toggle complete"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                task.completed
                  ? 'text-white shadow-xs'
                  : 'border-2 border-slate-300 dark:border-zinc-600 hover:border-blue-500'
              }`}
              style={{
                backgroundColor: task.completed ? accentColor : undefined,
              }}
            >
              {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
            </button>
          </div>

          <div className="bg-white/70 dark:bg-zinc-800/70 rounded-2xl p-1 shadow-2xs flex items-center justify-around text-xs font-semibold">
            {focusMode === 'pomodoro' && (
              <button
                type="button"
                onClick={() => setActiveTab('intervals')}
                className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'intervals'
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-zinc-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Intervals ({pomodoroIntervals.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('subtasks')}
              className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1 transition-colors ${
                activeTab === 'subtasks' || (focusMode !== 'pomodoro' && activeTab === 'intervals')
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1 transition-colors ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
          </div>

          <div className="bg-white/50 dark:bg-zinc-800/50 rounded-2xl p-3 min-h-[90px] max-h-36 overflow-y-auto text-xs">
            {focusMode === 'pomodoro' && activeTab === 'intervals' && (
              <div className="space-y-1.5">
                {pomodoroIntervals.map((inv) => {
                  const isCurrent = activePomodoroInterval?.id === inv.id;
                  const isDone = currentMinutesFromMidnight >= inv.endMinutes;

                  return (
                    <div
                      key={inv.id}
                      className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                        isCurrent
                          ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 font-semibold'
                          : isDone
                          ? 'opacity-50 line-through'
                          : 'bg-white/80 dark:bg-zinc-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {inv.type === 'work' ? (
                          <Flame className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Coffee className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span className="text-slate-800 dark:text-zinc-200">{inv.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                        <span>{inv.startTime} – {inv.endTime}</span>
                        <span className="font-bold text-slate-700 dark:text-zinc-300">({inv.durationMinutes}m)</span>
                        {isCurrent && (
                          <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Now
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(activeTab === 'subtasks' || (focusMode !== 'pomodoro' && activeTab === 'intervals')) && (
              <div className="space-y-1.5">
                {task.subtasks.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No subtasks defined for this activity.</p>
                ) : (
                  task.subtasks.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => onToggleSubtask(task.id, st.id)}
                      className="flex items-center gap-2 cursor-pointer py-0.5 group"
                    >
                      <button
                        type="button"
                        aria-label={`Toggle ${st.title}`}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                          st.completed ? 'text-white' : 'border-2 border-slate-300 dark:border-zinc-600'
                        }`}
                        style={{
                          backgroundColor: st.completed ? accentColor : undefined,
                        }}
                      >
                        {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                      <span
                        className={`text-xs ${
                          st.completed
                            ? 'line-through text-slate-400 dark:text-zinc-500'
                            : 'text-slate-700 dark:text-zinc-200'
                        }`}
                      >
                        {st.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div>
                {task.notes ? (
                  <p className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {task.notes}
                  </p>
                ) : (
                  <p className="text-slate-400 text-center py-4">No notes for this activity.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Pomodoro switches */}
        {confirmModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 max-w-xs w-full shadow-2xl text-center space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {confirmModal === 'to_pomodoro'
                  ? 'Are you sure you want to start the pomodoro timer?'
                  : 'Are you sure you want to return to normal focus?'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {confirmModal === 'to_pomodoro'
                  ? 'This will enable interval work and break notifications for this task.'
                  : 'Choosing YES will turn off notifications for this task specifically.'}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal === 'to_pomodoro') {
                      requestNotificationPermission();
                      setFocusMode('pomodoro');
                      setPomodoroNotificationsActive(true);
                    } else {
                      // Choosing YES turns off notifications for this task specifically and returns to normal focus
                      setFocusMode('standard');
                      setPomodoroNotificationsActive(false);
                    }
                    setConfirmModal(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-2xl text-xs font-semibold active:scale-95 transition-all shadow-sm"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal === 'to_standard') {
                      // Choosing NO keeps pomodoro active
                    }
                    setConfirmModal(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-2xl text-xs font-semibold active:scale-95 transition-all"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
