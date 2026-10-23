/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Settings,
  Copy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DayOfWeek } from '../types';
import { getWeekDays } from '../utils/scheduleLogic';

interface HeaderProps {
  currentDay: DayOfWeek;
  currentDate: Date;
  onSelectDay: (day: DayOfWeek) => void;
  onSelectDate: (date: Date) => void;
  onOpenSettings: () => void;
  onOpenCalendar: () => void;
  onCopyWholeDay: (sourceDay: DayOfWeek) => void;
  onPasteWholeDay: (targetDay: DayOfWeek) => void;
  hasClipboard: boolean;
  clipboardSourceDay: DayOfWeek | null;
  simulatedTimeText: string | null;
  accentColor?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentDay,
  currentDate,
  onSelectDay,
  onSelectDate,
  onOpenSettings,
  onOpenCalendar,
  onCopyWholeDay,
  onPasteWholeDay,
  hasClipboard,
  clipboardSourceDay,
  simulatedTimeText,
  accentColor = '#007AFF',
}) => {
  const [dayMenuDay, setDayMenuDay] = useState<DayOfWeek | null>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const weekTouchStart = useRef<{ x: number; y: number } | null>(null);
  const ignoreDayClick = useRef(false);

  const weekDays = getWeekDays(currentDate);

  const dayAndMonth = `${currentDate.getDate()} ${currentDate.toLocaleDateString('en-US', { month: 'long' })}`;
  const year = currentDate.getFullYear();

  const today = new Date();
  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const handleShiftWeek = (deltaDays: number) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + deltaDays);
    onSelectDate(nextDate);
  };

  const handleWeekTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      weekTouchStart.current = null;
      return;
    }
    weekTouchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  };

  const handleWeekTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = weekTouchStart.current;
    weekTouchStart.current = null;
    if (!start || event.changedTouches.length !== 1) return;

    const deltaX = event.changedTouches[0].clientX - start.x;
    const deltaY = event.changedTouches[0].clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    ignoreDayClick.current = true;
    window.setTimeout(() => {
      ignoreDayClick.current = false;
    }, 300);
    handleShiftWeek(deltaX < 0 ? 7 : -7);
  };

  const handleDayTouchStart = (day: DayOfWeek) => {
    longPressTimeout.current = setTimeout(() => {
      setDayMenuDay(day);
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(25);
      }
    }, 500);
  };

  const handleDayTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  return (
    <header className="sticky top-0 z-[100] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pt-3 pb-2 px-3 border-b border-slate-100 dark:border-zinc-800/60 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCalendar}
            aria-label="Open full month calendar"
            className="header-date-title flex items-center gap-1.5 text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 group transition-colors"
          >
            <span>
              {dayAndMonth}{' '}
              <span className="font-semibold" style={{ color: accentColor }}>
                {year}
              </span>
            </span>
            <span className="text-slate-400 group-hover:text-blue-500 text-lg transition-transform group-hover:translate-x-0.5">
              ›
            </span>
          </button>

          {simulatedTimeText && (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full ml-1">
              {simulatedTimeText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasClipboard && (
            <button
              onClick={() => onPasteWholeDay(currentDay)}
              className="text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 px-2.5 py-1.5 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1 mr-1"
              aria-label="Paste copied tasks to current day"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Paste ({clipboardSourceDay?.toUpperCase()})</span>
            </button>
          )}

          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded-full p-0.5 mr-1">
            <button
              type="button"
              onClick={() => handleShiftWeek(-7)}
              aria-label="Previous week"
              className="p-1 rounded-full text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleShiftWeek(7)}
              aria-label="Next week"
              className="p-1 rounded-full text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="grid grid-cols-7 gap-1 text-center py-1 touch-pan-y"
        onTouchStart={handleWeekTouchStart}
        onTouchEnd={handleWeekTouchEnd}
        onTouchCancel={() => {
          weekTouchStart.current = null;
        }}
      >
        {weekDays.map(({ key, short, dayNumber, date }) => {
          const isSelected = currentDay === key;
          const isCurrentDay = isToday(date);

          return (
            <React.Fragment key={key}>
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  if (ignoreDayClick.current) {
                    ignoreDayClick.current = false;
                    return;
                  }
                  onSelectDay(key);
                  onSelectDate(date);
                }}
                onTouchStart={() => handleDayTouchStart(key)}
                onTouchEnd={handleDayTouchEnd}
                onMouseDown={() => handleDayTouchStart(key)}
                onMouseUp={handleDayTouchEnd}
                onMouseLeave={handleDayTouchEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDayMenuDay(key);
                }}
                aria-label={`${short} ${dayNumber}${isCurrentDay ? ' (today)' : ''} - hold for options`}
                aria-pressed={isSelected}
                className="w-full flex flex-col items-center gap-1 group py-1 transition-all active:scale-95"
              >
                <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 group-hover:text-slate-700">
                  {short}
                </span>

                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                    isSelected
                      ? 'text-white font-bold shadow-xs scale-105'
                      : isCurrentDay
                        ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white font-bold'
                        : 'text-slate-800 dark:text-zinc-300 font-semibold group-hover:bg-slate-100 dark:group-hover:bg-zinc-800'
                  } ${isSelected && isCurrentDay ? 'ring-2 ring-offset-2 ring-slate-300 dark:ring-zinc-600 ring-offset-white dark:ring-offset-zinc-950' : ''}`}
                  style={{
                    backgroundColor: isSelected ? accentColor : undefined,
                  }}
                >
                  {dayNumber}
                </div>
              </button>

              {dayMenuDay === key && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-14 z-30 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 p-2 min-w-[210px] animate-in fade-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase text-slate-400 dark:text-zinc-500">
                    {short} {dayNumber} Options
                  </div>

                  <button
                    onClick={() => {
                      onCopyWholeDay(key);
                      setDayMenuDay(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-500" />
                    <span>Copy tasks for whole day</span>
                  </button>

                  {hasClipboard && (
                    <button
                      onClick={() => {
                        onPasteWholeDay(key);
                        setDayMenuDay(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Paste copied schedule here</span>
                    </button>
                  )}

                  <div className="h-[1px] bg-slate-100 dark:bg-zinc-800 my-1" />

                  <button
                    onClick={() => setDayMenuDay(null)}
                    className="w-full text-center py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            </React.Fragment>
          );
        })}
      </div>
    </header>
  );
};
