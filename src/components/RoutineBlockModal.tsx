/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Folder, Check, RotateCw, CheckSquare } from 'lucide-react';
import { RoutineBlock, DayOfWeek, Task } from '../types';
import { APPLE_PALETTE } from '../utils/storage';
import { DAYS_OF_WEEK } from '../utils/scheduleLogic';

interface RoutineBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBlock: (blockData: Omit<RoutineBlock, 'id'>, existingId?: string, assignedTaskIds?: string[]) => void;
  editingBlock: RoutineBlock | null;
  currentDay: DayOfWeek;
  allTasks: Task[];
}

export const RoutineBlockModal: React.FC<RoutineBlockModalProps> = ({
  isOpen,
  onClose,
  onSaveBlock,
  editingBlock,
  currentDay,
  allTasks,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#007AFF');
  const [customHex, setCustomHex] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([currentDay]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

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
      const preAssigned = allTasks.filter((t) => t.blockId === editingBlock.id).map((t) => t.id);
      setSelectedTaskIds(preAssigned);
    } else {
      setName('');
      setColor('#FF9500');
      setCustomHex('');
      setSelectedDays([currentDay]);
      setSelectedTaskIds([]);
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

  const handleToggleTaskSelection = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
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
      },
      editingBlock ? editingBlock.id : undefined,
      selectedTaskIds
    );
    onClose();
  };

  // Filter tasks for current day or general library
  const dayTasks = allTasks.filter((t) => t.days.some((d) => selectedDays.includes(d)));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-stone-100 dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
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
              className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
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
                      ? 'scale-110 ring-2 ring-offset-2 ring-blue-500'
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
              <RotateCw className="w-3.5 h-3.5 text-blue-500" />
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
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pre-existing tasks selector for this block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400 dark:text-zinc-500">
                Include Pre-existing Tasks ({selectedTaskIds.length} selected)
              </span>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-zinc-700/50 max-h-40 overflow-y-auto">
              {dayTasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No tasks found for selected days.
                </div>
              ) : (
                dayTasks.map((t) => {
                  const isChecked = selectedTaskIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTaskSelection(t.id)}
                      className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-700/40 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-zinc-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {t.startTime}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-2xl shadow-md active:scale-98 transition-all"
            >
              {editingBlock ? 'Save Block' : 'Create Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
