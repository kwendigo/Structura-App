/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayOfWeek, Task } from '../types';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  tasks: Task[];
  accentColor?: string;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  tasks,
  accentColor = '#007AFF',
}) => {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  if (!isOpen) return null;

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long' });

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const firstDaySundayBased = firstDayOfMonth.getDay();
  const startOffset = firstDaySundayBased === 0 ? 6 : firstDaySundayBased - 1;

  const dayKeys: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return (
    <div className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-3 pt-12 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl p-5 border border-slate-100 dark:border-zinc-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {monthName} <span className="text-slate-400 font-semibold">{viewYear}</span>
            </h3>
            <div className="flex items-center gap-0.5 ml-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day} className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-2.5 gap-x-1 text-center">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const thisDate = new Date(viewYear, viewMonth, dayNum);
            const isSelected =
              thisDate.getDate() === selectedDate.getDate() &&
              thisDate.getMonth() === selectedDate.getMonth() &&
              thisDate.getFullYear() === selectedDate.getFullYear();

            const jsDay = thisDate.getDay();
            const dayKeyIndex = jsDay === 0 ? 6 : jsDay - 1;
            const dayOfWeekKey = dayKeys[dayKeyIndex];

            const dayTasks = tasks.filter((t) => t.days.includes(dayOfWeekKey));
            const hasTasks = dayTasks.length > 0;

            return (
              <button
                key={`day-${dayNum}`}
                type="button"
                onClick={() => {
                  onSelectDate(thisDate);
                  onClose();
                }}
                className="h-11 flex flex-col items-center justify-center relative rounded-full group transition-all"
              >
                <div
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? 'text-white shadow-sm scale-105'
                      : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                  style={isSelected ? { backgroundColor: accentColor } : undefined}
                >
                  {dayNum}
                </div>

                {hasTasks && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {dayTasks.slice(0, 3).map((t, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full opacity-80"
                        style={{ backgroundColor: isSelected ? accentColor : t.color }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-center">
          <button
            type="button"
            onClick={() => {
              onSelectDate(new Date());
              onClose();
            }}
            className="text-xs font-semibold hover:underline"
            style={{ color: accentColor }}
          >
            Jump to Today
          </button>
        </div>
      </div>
    </div>
  );
};
