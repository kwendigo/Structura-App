/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Folder, Check, RotateCw, Clock } from 'lucide-react';
import { RoutineBlock, DayOfWeek, Task } from '../types';
import { APPLE_PALETTE } from '../utils/storage';
import { DAYS_OF_WEEK, parseTimeToMinutes, sortTasksByTime } from '../utils/scheduleLogic';

interface RoutineBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBlock: (blockData: Omit<RoutineBlock, 'id'>, existingId?: string) => void;
  editingBlock: RoutineBlock | null;
  currentDay: DayOfWeek;
  allTasks: Task[];
  accentColor?: string;
}

export const RoutineBlockModal: React.FC<RoutineBlockModalProps> = ({
  isOpen,
  onClose,
  onSaveBlock,
  editingBlock,
  currentDay,
  allTasks,
  accentColor = '#007AFF',
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#007AFF');
  const [customHex, setCustomHex] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([currentDay]);
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(60);

  useEffect(() => {
    if (editingBlock) {
      setName(editingBlock.name);
      setColor(editingBlock.color);
      setCustomHex(editingBlock.color);
      setSelectedDays(
        editingBlock.days && editingBlock.days.length > 0
          ? editingBlock.days
          : [editingBlock.day]
      );
      const existingTasks = sortTasksByTime(allTasks.filter((task) => task.blockId === editingBlock.id));
      const startTime = editingBlock.startTime || existingTasks[0]?.startTime || '09:00';
      const startMinutes = parseTimeToMinutes(startTime);
      const inferredDuration = Math.max(
        60,
        ...existingTasks.map((task) =>
          parseTimeToMinutes(task.startTime) + (task.isReminder ? 0 : task.durationMinutes) - startMinutes
        )
      );
      setStartTime(startTime);
      setDurationMinutes(editingBlock.durationMinutes || inferredDuration);
    } else {
      setName('');
      setColor('#FF9500');
      setCustomHex('');
      setSelectedDays([currentDay]);
      setStartTime('09:00');
      setDurationMinutes(60);
    }
  }, [editingBlock, isOpen, currentDay, allTasks]);

  if (!isOpen) return null;

  const handleToggleDay = (d: DayOfWeek) => {
    if (selectedDays.includes(d)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((k) => k !== d));
      }
    } else {
      setSelectedDays([...selectedDays, d]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveBlock(
      {
        name: name.trim(),
        color,
        day: selectedDays[0] || currentDay,
        days: selectedDays,
        startTime,
        durationMinutes,
      },
      editingBlock ? editingBlock.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-stone-100 dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{ '--accent-color': accentColor } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5" style={{ color }} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {editingBlock ? 'Edit Routine Block' : 'Create Routine Block'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-zinc-700/80 hover:bg-slate-300 flex items-center justify-center text-slate-700 dark:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 dark:text-zinc-500 mb-1.5">
              Block Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Morning Routine, Deep Work, Wind Down"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] shadow-xs"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-slate-400 dark:text-zinc-500 mb-2">
              Block Background & Accent Color
            </span>
            <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
              {APPLE_PALETTE.map((pal) => (
                <button
                  key={pal.hex}
                  type="button"
                  onClick={() => {
                    setColor(pal.hex);
                    setCustomHex(pal.hex);
                  }}
                  aria-label={pal.name}
                  className={`w-7 h-7 rounded-full transition-transform active:scale-90 flex items-center justify-center ${
                    color.toLowerCase() === pal.hex.toLowerCase()
                      ? 'scale-110 ring-2 ring-offset-2 ring-[var(--accent-color)]'
                      : ''
                  }`}
                  style={{ backgroundColor: pal.hex }}
                >
                  {color.toLowerCase() === pal.hex.toLowerCase() && (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="text-xs font-semibold uppercase text-slate-400 dark:text-zinc-500">
                Block Time & Duration
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="block text-[11px] text-slate-500 dark:text-zinc-400">Start time</span>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[11px] text-slate-500 dark:text-zinc-400">Duration (minutes)</span>
                <input
                  type="number"
                  required
                  min={10}
                  max={1440}
                  step={10}
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm"
                />
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <RotateCw className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="text-xs font-semibold uppercase text-slate-400 dark:text-zinc-500">
                Repeat Routine Block On
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map(({ key, short }) => {
                const isSelected = selectedDays.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleDay(key)}
                    className={`py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-color)] text-white font-semibold'
                        : 'bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[var(--accent-color)] hover:brightness-90 text-white font-semibold text-sm rounded-2xl shadow-md active:scale-98 transition-all"
            >
              {editingBlock ? 'Save Block' : 'Create Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
