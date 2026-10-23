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
  weekSwipeOffset: number;
  weekSwipeAnimating: boolean;
  dateTransitionKey: number;
  dateTransitionParts: { day: boolean; month: boolean; year: boolean };
  onSelectDay: (day: DayOfWeek) => void;
  onSelectDate: (date: Date) => void;
  onWeekSwipeOffset: (offset: number) => void;
  onWeekSwipe: (direction: -1 | 1, width: number) => void;
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
  weekSwipeOffset,
  weekSwipeAnimating,
  dateTransitionKey,
  dateTransitionParts,
  onSelectDay,
  onSelectDate,
  onWeekSwipeOffset,
  onWeekSwipe,
  onOpenSettings,
  onOpenCalendar,
  onCopyWholeDay,
  onPasteWholeDay,
  hasClipboard,
  clipboardSourceDay,
  simulatedTimeText,
  accentColor = '#007AFF',
}) => {
  const [dayMenuDate, setDayMenuDate] = useState<Date | null>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const weekPointerStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
    width: number;
    dragging: boolean;
  } | null>(null);
  const ignoreDayClick = useRef(false);

  const weekOffsets = [-1, 0, 1] as const;
  const weekSets = weekOffsets.map((weekOffset) => {
    const weekDate = new Date(currentDate);
    weekDate.setDate(weekDate.getDate() + weekOffset * 7);
    return { weekOffset, days: getWeekDays(weekDate) };
  });

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

  const handleWeekPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || weekSwipeAnimating) return;
    const target = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('[data-weekday-button]')
      : null;
    if (!target) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    weekPointerStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width: bounds.width,
      dragging: false,
    };
    target.setPointerCapture(event.pointerId);
  };

  const handleWeekPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = weekPointerStart.current;
    if (!start || event.pointerId !== start.pointerId) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (!start.dragging && Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return;
    if (!start.dragging && Math.abs(deltaY) >= Math.abs(deltaX)) {
      weekPointerStart.current = null;
      return;
    }
    start.dragging = true;
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    event.preventDefault();
    onWeekSwipeOffset(deltaX);
  };

  const finishWeekPointer = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = weekPointerStart.current;
    if (!start || event.pointerId !== start.pointerId) return;
    weekPointerStart.current = null;
    if (!start.dragging) return;

    const deltaX = event.clientX - start.x;
    const threshold = Math.max(40, start.width * 0.18);
    if (!cancelled && Math.abs(deltaX) >= threshold) {
      ignoreDayClick.current = true;
      window.setTimeout(() => {
        ignoreDayClick.current = false;
      }, 300);
      onWeekSwipe(deltaX < 0 ? -1 : 1, start.width);
      return;
    }
    onWeekSwipeOffset(0);
  };

  const handleDayTouchStart = (date: Date) => {
    longPressTimeout.current = setTimeout(() => {
      setDayMenuDate(date);
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
    <header className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pt-2 pb-1 px-3 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCalendar}
            aria-label="Open full month calendar"
            className="header-date-title flex items-center gap-1.5 text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 group transition-colors"
          >
            <span className="date-header-parts">
              <span
                key={`day-${dateTransitionKey}`}
                className={`date-part-box${dateTransitionParts.day ? ' date-flip-in' : ''}`}
              >
                {currentDate.getDate()}
              </span>
              <span
                key={`month-${dateTransitionKey}`}
                className={`date-part-box${dateTransitionParts.month ? ' date-flip-in' : ''}`}
              >
                {currentDate.toLocaleDateString('en-US', { month: 'long' })}
              </span>
              <span
                key={`year-${dateTransitionKey}`}
                className={`date-part-box font-semibold${dateTransitionParts.year ? ' date-flip-in' : ''}`}
                style={{ color: accentColor }}
              >
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
        className="mx-2 overflow-hidden touch-pan-y"
        onPointerDown={handleWeekPointerDown}
        onPointerMove={handleWeekPointerMove}
        onPointerUp={(event) => finishWeekPointer(event)}
        onPointerCancel={(event) => finishWeekPointer(event, true)}
      >
        <div
          className={`flex w-full text-center py-0 ${
            weekSwipeAnimating ? 'pointer-events-none transition-transform duration-[220ms] ease-out' : ''
          }`}
          style={{ transform: `translateX(calc(-100% - 32px + ${weekSwipeOffset}px))` }}
        >
          {weekSets.map(({ weekOffset, days }, index) => (
            <React.Fragment key={weekOffset}>
              <div
                className="grid w-full shrink-0 grid-cols-7 gap-0"
                aria-hidden={weekOffset !== 0}
                inert={weekOffset !== 0}
              >
                {days.map(({ key, short, dayNumber, date }) => {
                  const isSelected =
                    currentDate.getFullYear() === date.getFullYear() &&
                    currentDate.getMonth() === date.getMonth() &&
                    currentDate.getDate() === date.getDate();
                  const isCurrentDay = isToday(date);

                  return (
                    <div key={date.toISOString()} className="relative flex flex-col items-center overflow-visible">
                      <button
                        type="button"
                        data-weekday-button
                        onClick={() => {
                          if (ignoreDayClick.current || weekSwipeAnimating) {
                            ignoreDayClick.current = false;
                            return;
                          }
                          onSelectDay(key);
                          onSelectDate(date);
                        }}
                        onTouchStart={() => handleDayTouchStart(date)}
                        onTouchEnd={handleDayTouchEnd}
                        onMouseDown={() => handleDayTouchStart(date)}
                        onMouseUp={handleDayTouchEnd}
                        onMouseLeave={handleDayTouchEnd}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setDayMenuDate(date);
                        }}
                        aria-label={`${short} ${dayNumber}${isCurrentDay ? ' (today)' : ''} - hold for options`}
                        aria-pressed={isSelected}
                        className="w-full flex flex-col items-center gap-0 group py-0.5 transition-all active:scale-95"
                      >
                        <span className="relative -top-0.5 text-[8px] font-medium text-slate-400 dark:text-zinc-500 group-hover:text-slate-700">
                          {short}
                        </span>

                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-bold transition-all ${
                            isSelected
                              ? 'text-white font-bold shadow-xs scale-105'
                              : isCurrentDay
                                ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white font-bold'
                                : 'text-slate-800 dark:text-zinc-300 font-semibold group-hover:bg-slate-100 dark:group-hover:bg-zinc-800'
                          } ${isSelected && isCurrentDay ? 'border-2 border-slate-300 dark:border-zinc-600' : ''}`}
                          style={{ backgroundColor: isSelected ? accentColor : undefined }}
                        >
                          {dayNumber}
                        </div>
                      </button>

                      {dayMenuDate?.toDateString() === date.toDateString() && (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 top-14 z-30 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 p-2 min-w-[210px] animate-in fade-in zoom-in-95"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="px-3 py-1 text-[11px] font-semibold uppercase text-slate-400 dark:text-zinc-500">
                            {short} {dayNumber} Options
                          </div>

                          <button
                            onClick={() => {
                              onCopyWholeDay(key);
                              setDayMenuDate(null);
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
                                setDayMenuDate(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Paste copied schedule here</span>
                            </button>
                          )}

                          <div className="h-[1px] bg-slate-100 dark:bg-zinc-800 my-1" />

                          <button
                            onClick={() => setDayMenuDate(null)}
                            className="w-full text-center py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {index < weekSets.length - 1 && (
                <div
                  aria-hidden="true"
                  className="week-cycle-separator mx-4 w-0 shrink-0 self-stretch border-l border-dashed border-slate-300 dark:border-zinc-700"
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </header>
  );
};
