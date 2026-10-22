/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { formatDuration } from '../utils/scheduleLogic';

interface UnallocatedGapProps {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  prevTaskColor?: string;
  isPast?: boolean;
  onQuickAdd: (startTime: string, duration: number) => void;
}

export const UnallocatedGap: React.FC<UnallocatedGapProps> = ({
  startTime,
  endTime,
  durationMinutes,
  prevTaskColor,
  isPast,
  onQuickAdd,
}) => {
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
      <div className="w-14 flex-shrink-0 text-right pr-2.5">
        <span className="text-[11px] font-normal text-slate-400/80 dark:text-zinc-500/80 tabular-nums">
          {startTime}
        </span>
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

      <div className="flex-1 ml-3 pr-1 flex items-center justify-between">
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
