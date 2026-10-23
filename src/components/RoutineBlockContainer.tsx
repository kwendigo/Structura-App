/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Folder,
  MoreHorizontal,
  Copy,
  Edit3,
  Trash2,
  Plus,
  RotateCw,
  Clock,
} from 'lucide-react';
import { RoutineBlock, Task } from '../types';
import { useLiftedDrag } from '../hooks/useLiftedDrag';
import { parseTimeToMinutes, minutesToTimeString } from '../utils/scheduleLogic';

interface RoutineBlockContainerProps {
  block: RoutineBlock;
  tasks: Task[];
  children: React.ReactNode;
  use24Hour?: boolean;
  accentColor?: string;
  onCopyBlock: (block: RoutineBlock) => void;
  onEditBlock: (block: RoutineBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onAddTaskToBlock: (blockId: string) => void;
  onMoveBlock?: (blockId: string, deltaMinutes: number) => void;
}

export const RoutineBlockContainer: React.FC<RoutineBlockContainerProps> = ({
  block,
  tasks,
  children,
  use24Hour = true,
  accentColor = '#007AFF',
  onCopyBlock,
  onEditBlock,
  onDeleteBlock,
  onAddTaskToBlock,
  onMoveBlock,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isLifted, setIsLifted] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [liveSnappedDelta, setLiveSnappedDelta] = useState(0);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const justDraggedRef = useRef(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const startClientYRef = useRef<number | null>(null);
  const liveSnappedDeltaRef = useRef(0);

  const firstTask = tasks[0];
  const firstTaskStartM = firstTask ? parseTimeToMinutes(firstTask.startTime) : 540;
  const hex = block.color.startsWith('#') ? block.color : accentColor;

  const handleTitleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartPos.current = { y: clientY };
    startClientYRef.current = clientY;
    isDraggingRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      setIsLifted(true);
      isDraggingRef.current = true;
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(25);
      }
    }, 220);
  };

  const handleTitleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartPos.current || isDraggingRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    if (Math.abs(clientY - touchStartPos.current.y) > 6 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleTitleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (!isDraggingRef.current) {
      touchStartPos.current = null;
    }
  };

  useLiftedDrag({
    active: isLifted,
    elementRef: blockRef,
    startClientYRef,
    onMove: (deltaY) => {
      setDragOffsetY(deltaY);
      const deltaM = Math.round(deltaY / 1.6);
      const snappedDelta = Math.round(deltaM / 5) * 5;
      liveSnappedDeltaRef.current = snappedDelta;
      setLiveSnappedDelta(snappedDelta);
    },
    onEnd: () => {
      if (onMoveBlock && liveSnappedDeltaRef.current !== 0) {
        onMoveBlock(block.id, liveSnappedDeltaRef.current);
      }
      setIsLifted(false);
      setDragOffsetY(0);
      setLiveSnappedDelta(0);
      liveSnappedDeltaRef.current = 0;
      isDraggingRef.current = false;
      touchStartPos.current = null;
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
    },
  });

  const handleTitleClick = () => {
    if (!isDraggingRef.current && !justDraggedRef.current) {
      onEditBlock(block);
    }
  };

  const previewFirstStartM = Math.max(0, Math.min(1440 - 15, firstTaskStartM + liveSnappedDelta));
  const previewTimeStr = minutesToTimeString(previewFirstStartM, use24Hour);
  const areTasksFolded = isLifted;

  return (
    <div
      ref={blockRef}
      style={{
        transform: isLifted ? `translateY(${dragOffsetY}px)` : undefined,
        backgroundColor: `${hex}0c`,
        touchAction: isLifted ? 'none' : undefined,
      }}
      className={`relative my-3 rounded-3xl p-2.5 transition-all select-none group/block ring-1 ring-black/5 dark:ring-white/5 ${
        isLifted
          ? 'z-40 shadow-2xl scale-[1.02] ring-2 ring-black/10 dark:ring-white/10 bg-white/95 dark:bg-zinc-900/95 cursor-grabbing'
          : ''
      }`}
    >
      {isLifted && (
        <div className="absolute -left-1 top-2 z-50 px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl shadow-2xl flex items-center gap-1.5 font-bold text-xs pointer-events-none animate-in fade-in zoom-95">
          <Clock className="w-3.5 h-3.5" style={{ color: hex }} />
          <span>{block.name}: {previewTimeStr}</span>
          <span className="text-[10px] font-normal opacity-70">
            ({liveSnappedDelta >= 0 ? `+${liveSnappedDelta}m` : `${liveSnappedDelta}m`})
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-2 px-1 pt-0.5">
        <div
          onTouchStart={handleTitleTouchStart}
          onTouchMove={handleTitleTouchMove}
          onTouchEnd={handleTitleTouchEnd}
          onMouseDown={handleTitleTouchStart}
          onMouseMove={handleTitleTouchMove}
          onMouseUp={handleTitleTouchEnd}
          onClick={handleTitleClick}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl shadow-2xs transition-transform active:scale-95 cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: `${hex}22`,
            color: hex,
          }}
          title="Press & hold to drag block · Click to edit details"
        >
          <Folder className="w-3.5 h-3.5" style={{ color: hex }} />
          <span className="text-[11px] font-bold tracking-wider uppercase">
            {block.name}
          </span>
          <span className="whitespace-nowrap text-[10px] opacity-75 font-medium lowercase">
            · {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
          {block.days && block.days.length > 1 && (
            <span
              title={`Repeats on ${block.days.join(', ').toUpperCase()}`}
              className="flex items-center opacity-80"
            >
              <RotateCw className="w-3 h-3 stroke-[2.2]" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddTaskToBlock(block.id);
            }}
            aria-label={`Add task to ${block.name}`}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: hex }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add task</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label={`Options for ${block.name}`}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showMenu && (
        <div
          className="absolute right-4 top-10 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-1.5 min-w-[190px] animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onCopyBlock(block);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Duplicate block</span>
          </button>

          <button
            onClick={() => {
              onEditBlock(block);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit block details</span>
          </button>

          <button
            onClick={() => {
              if (confirm(`Delete routine block "${block.name}"? Tasks inside will remain on the timeline.`)) {
                onDeleteBlock(block.id);
              }
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete block</span>
          </button>
        </div>
      )}

      {!areTasksFolded && (
        <div className="space-y-0.5 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
};
