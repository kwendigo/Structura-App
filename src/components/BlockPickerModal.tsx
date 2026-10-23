/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Folder, Plus, ChevronRight, Check } from 'lucide-react';
import { RoutineBlock, Task, DayOfWeek } from '../types';

interface BlockPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: RoutineBlock[];
  tasks: Task[];
  currentDay: DayOfWeek;
  accentColor?: string;
  onSelectExistingBlock: (block: RoutineBlock) => void;
  onCreateNewBlock: () => void;
}

export const BlockPickerModal: React.FC<BlockPickerModalProps> = ({
  isOpen,
  onClose,
  blocks,
  accentColor = '#007AFF',
  onSelectExistingBlock,
  onCreateNewBlock,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 pt-12 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-stone-100 dark:bg-zinc-900 rounded-[36px] shadow-2xl p-5 border border-white/20 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
              <Folder className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Routine Blocks
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-stone-200 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-stone-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onCreateNewBlock();
            }}
            style={{ backgroundColor: accentColor }}
            className="w-full py-3 px-4 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-md active:scale-98 transition-all hover:brightness-110"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create New Routine Block</span>
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">
              Existing Blocks ({blocks.length})
            </span>

            <div className="bg-white dark:bg-zinc-800/90 rounded-3xl shadow-sm divide-y divide-slate-100 dark:divide-zinc-700/50 overflow-hidden max-h-60 overflow-y-auto">
              {blocks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No routine blocks created yet.
                </div>
              ) : (
                blocks.map((blk) => (
                  <div
                    key={blk.id}
                    onClick={() => {
                      onClose();
                      onSelectExistingBlock(blk);
                    }}
                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: blk.color }}
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                        {blk.name}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
