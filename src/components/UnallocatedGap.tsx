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
  onQuickAdd: (startTime: string, duration: number) => void;
}

export const UnallocatedGap: React.FC<UnallocatedGapProps> = ({
  startTime,
  endTime,
  durationMinutes,
  realTimeMinutes,
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
  const connectorHeight = durationMinutes <= 15
    ? 12
    : durationMinutes < 50
    ? 24
    : Math.max(56, durationMinutes * 1.5);

  return (
    <div
      data-timeline-gap={durationMinutes}
      className="relative flex items-center px-1 select-none group"
      style={{ height: `${connectorHeight}px` }}
    >
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

      <div aria-hidden="true" className="ml-1 w-14 flex-shrink-0" />

      <div className="flex-1 ml-3 pr-0.5 flex items-center">
        {durationMinutes >= 50 && (
          <div
            onClick={() => onQuickAdd(startTime, Math.min(60, durationMinutes))}
            className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-slate-400/90 dark:text-zinc-500/90 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
          >
            <span className="italic font-normal">~ {breakMessage}</span>
            <span className="text-[11px] font-normal opacity-75">
              ({formatDuration(durationMinutes)})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
