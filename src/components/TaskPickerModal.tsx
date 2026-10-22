/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles, Clock } from 'lucide-react';
import { Task, DayOfWeek, TaskTemplate } from '../types';
import { IconRenderer } from './IconRenderer';
import { formatDuration } from '../utils/scheduleLogic';

interface TaskPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTaskTemplate: (template: TaskTemplate) => void;
  taskTemplates: TaskTemplate[];
  existingTasks: Task[];
  currentDay: DayOfWeek;
  accentColor?: string;
}

export const TaskPickerModal: React.FC<TaskPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTaskTemplate,
  taskTemplates,
  existingTasks,
  accentColor = '#007AFF',
}) => {
  const [query, setQuery] = useState('');

  // Clear query whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build unique template map
  const templateMap = new Map<string, TaskTemplate>();

  existingTasks.forEach((t) => {
    const key = t.title.toLowerCase();
    if (!templateMap.has(key)) {
      templateMap.set(key, {
        title: t.title,
        color: t.color,
        icon: t.icon,
        durationMinutes: t.durationMinutes,
      });
    }
  });

  taskTemplates.forEach((tt) => {
    const key = tt.title.toLowerCase();
    if (!templateMap.has(key)) {
      templateMap.set(key, tt);
    }
  });

  const allTemplates = Array.from(templateMap.values());

  const filteredTemplates = allTemplates.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 pt-10 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-stone-100 dark:bg-zinc-900 rounded-[36px] shadow-2xl p-5 border border-white/20 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full bg-stone-200 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-stone-300 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 bg-white dark:bg-zinc-800 rounded-full px-4 py-2.5 flex items-center gap-3 shadow-inner ring-1 ring-black/5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  onSelectTaskTemplate({
                    title: query.trim(),
                    color: accentColor,
                    icon: 'sparkles',
                    durationMinutes: 30,
                  });
                }
              }}
              placeholder="e.g. draw at 21:50 for 30 min..."
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1 pt-1">
            Suggestions & Saved Tasks
          </h4>

          <div className="bg-white dark:bg-zinc-800/90 rounded-3xl shadow-sm divide-y divide-slate-100 dark:divide-zinc-700/50 overflow-hidden">
            {filteredTemplates.length === 0 ? (
              <div
                onClick={() => {
                  if (query.trim()) {
                    onSelectTaskTemplate({
                      title: query.trim(),
                      color: accentColor,
                      icon: 'sparkles',
                      durationMinutes: 30,
                    });
                  }
                }}
                className="p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors"
              >
                <p className="text-xs font-semibold text-slate-800 dark:text-white">
                  Create new task: "{query || 'New Activity'}"
                </p>
                <span className="text-[10px] text-blue-500 mt-0.5 block">Tap to configure details</span>
              </div>
            ) : (
              filteredTemplates.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectTaskTemplate(item)}
                  className="px-4 py-3 flex items-center gap-3.5 hover:bg-slate-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs"
                    style={{ backgroundColor: item.color }}
                  >
                    <IconRenderer name={item.icon} className="w-5 h-5 stroke-[2]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 block">
                      Duration: {formatDuration(item.durationMinutes)}
                    </span>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h5>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
