/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatDuration, minutesToTimeString, parseTimeToMinutes } from '../utils/scheduleLogic';

interface UnallocatedGapProps {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  realTimeMinutes?: number;
  prevTaskColor?: string;
  isPast?: boolean;
  onQuickAdd: (startTime: string, duration: number) => void;
}

export const UnallocatedGap: React.FC<UnallocatedGapProps> = ({
  startTime,
  endTime,
  durationMinutes,
  realTimeMinutes,
  prevTaskColor,
  isPast,
  onQuickAdd,
}) => {
  const gapStartMinutes = parseTimeToMinutes(startTime);
  const gapEndMinutes = parseTimeToMinutes(endTime);
  const currentTimeInGap = realTimeMinutes !== undefined &&
    realTimeMinutes >= gapStartMinutes &&
    realTimeMinutes < gapEndMinutes;
  const currentTimeProgress = durationMinutes > 0
    ? ((realTimeMinutes ?? gapStartMinutes) - gapStartMinutes) / durationMinutes
    : 0;
  const breakMessage =
    durationMinutes >= 180
      ? 'A well-deserved break.'
      : durationMinutes >= 90
      ? 'Interval over. What’s next?'
      : durationMinutes >= 45
      ? 'Free time · Rest or recharge'
      : 'Short break';

  return (
    <div className="relative flex items-center py-2.5 pl-1.5 pr-2 select-none group">
      <div className="relative w-10 flex-shrink-0 self-stretch text-right pr-0.5">
        <span className="timeline-timestamp text-[11px] font-normal text-slate-400/80 dark:text-zinc-500/80 tabular-nums">
          {startTime}
        </span>
        {currentTimeInGap && realTimeMinutes !== undefined && (
          <span
            aria-label={`Current time ${minutesToTimeString(realTimeMinutes, true)}`}
            className="timeline-current-time absolute right-0 z-30 -translate-y-1/2 whitespace-nowrap rounded-sm bg-white px-0.5 font-bold text-black shadow-sm dark:bg-zinc-950 dark:text-white"
            style={{ top: `${currentTimeProgress * 100}%` }}
          >
            {minutesToTimeString(realTimeMinutes, true)}
          </span>
        )}
      </div>

      <div className="w-9 flex-shrink-0 flex flex-col items-center justify-center self-stretch py-1">
        <div
          className="w-[2px] h-8 border-l-[2px] border-dashed transition-colors"
          style={{
            borderColor: isPast ? (prevTaskColor || '#cbd5e1') : '#e2e8f0',
            opacity: isPast ? 0.7 : 0.5,
          }}
        />
      </div>

      <div className="flex-1 ml-1 pr-0.5 flex items-center justify-between">
        <div
          onClick={() => onQuickAdd(startTime, Math.min(60, durationMinutes))}
          className="cursor-pointer py-1 inline-flex items-center gap-1.5 text-xs text-slate-400/90 dark:text-zinc-500/90 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
        >
          <span className="italic font-normal">~ {breakMessage}</span>
          <span className="text-[11px] font-normal opacity-75">
            ({formatDuration(durationMinutes)})
          </span>
        </div>
      </div>
    </div>
  );
};
