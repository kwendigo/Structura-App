/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  Clock,
  Check,
  Palette,
  MoreHorizontal,
  Copy,
  RotateCw,
  Target,
  Bookmark,
  Bell,
} from 'lucide-react';
import { Task, Subtask, DayOfWeek, TaskTemplate } from '../types';
import { DAYS_OF_WEEK, formatDateKey, formatDuration, calculateEndTime } from '../utils/scheduleLogic';
import { APPLE_PALETTE } from '../utils/storage';
import { AVAILABLE_ICONS, ICON_CATEGORIES, IconRenderer, isFontAwesomeIcon } from './IconRenderer';

const formatDurationOption = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  return `${Number((minutes / 60).toFixed(2))}h`;
};

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (taskData: Omit<Task, 'id'>, existingId?: string) => void;
  onDuplicateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  editingTask: Task | null;
  currentDay: DayOfWeek;
  currentDate: Date;
  taskTemplates: TaskTemplate[];
  quickDurations: number[];
  initialTemplate?: TaskTemplate | null;
  initialStartTime?: string;
  initialDuration?: number;
  accentColor?: string;
  uniformTaskColorEnabled?: boolean;
  uniformTaskColor?: string;
  savedCustomHexes?: string[];
  onSaveCustomHex?: (hex: string) => void;
  onDeleteCustomHex?: (hex: string) => void;
  onOpenFocus?: (task: Task) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  onDuplicateTask,
  onDeleteTask,
  editingTask,
  currentDay,
  currentDate,
  taskTemplates,
  quickDurations,
  initialTemplate,
  initialStartTime,
  initialDuration,
  accentColor = '#007AFF',
  uniformTaskColorEnabled = false,
  uniformTaskColor = '#007AFF',
  savedCustomHexes = [],
  onSaveCustomHex,
  onDeleteCustomHex,
  onOpenFocus,
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isReminder, setIsReminder] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [durationIndicator, setDurationIndicator] = useState<{ left: number; width: number } | null>(null);
  const [icon, setIcon] = useState('laptop');
  const [color, setColor] = useState('#007AFF');
  const [customHex, setCustomHex] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([currentDay]);
  const [repeatTask, setRepeatTask] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconCategory, setIconCategory] = useState<string>('All');
  const [iconSearch, setIconSearch] = useState<string>('');

  // Long press (2 seconds) state for custom hex deletion
  const [showHexDeleteMode, setShowHexDeleteMode] = useState(false);
  const [hexToDelete, setHexToDelete] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconGridRef = useRef<HTMLDivElement | null>(null);
  const hoursWheelRef = useRef<HTMLDivElement | null>(null);
  const minutesWheelRef = useRef<HTMLDivElement | null>(null);
  const durationTrackRef = useRef<HTMLDivElement | null>(null);
  const durationSlotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setShowActionsMenu(false);
    if (editingTask) {
      setTitle(editingTask.title);
      setStartTime(editingTask.startTime);
      setDurationMinutes(editingTask.durationMinutes);
      setIsReminder(editingTask.isReminder || editingTask.durationMinutes === 0);
      setIcon(editingTask.icon);
      setColor(uniformTaskColorEnabled ? uniformTaskColor : editingTask.color);
      setSelectedDays(editingTask.days);
      setRepeatTask(!editingTask.scheduledDate);
      setSubtasks(editingTask.subtasks || []);
      setNotes(editingTask.notes || '');
      setIsCompleted(editingTask.completed);
      setCustomHex(editingTask.color);
    } else if (initialTemplate) {
      setTitle(initialTemplate.title);
      setStartTime(initialStartTime || '09:00');
      setDurationMinutes(initialTemplate.durationMinutes || 30);
      setIsReminder(initialTemplate.isReminder || initialTemplate.durationMinutes === 0);
      setIcon(initialTemplate.icon || 'laptop');
      setColor(uniformTaskColorEnabled ? uniformTaskColor : initialTemplate.color || accentColor);
      setCustomHex(initialTemplate.color || accentColor);
      setSelectedDays([currentDay]);
      setRepeatTask(false);
      setSubtasks([]);
      setNotes('');
      setIsCompleted(false);
    } else {
      setTitle('');
      setStartTime(initialStartTime || '09:00');
      setDurationMinutes(initialDuration || 30);
      setIsReminder(initialDuration === 0);
      setIcon('laptop');
      setColor(uniformTaskColorEnabled ? uniformTaskColor : accentColor);
      setCustomHex(uniformTaskColorEnabled ? uniformTaskColor : accentColor);
      setSelectedDays([currentDay]);
      setRepeatTask(false);
      setSubtasks([]);
      setNotes('');
      setIsCompleted(false);
    }
    setShowColorPicker(false);
    setShowIconPicker(false);
    setShowHexDeleteMode(false);
    setHexToDelete(null);
    setShowCustomTimePicker(false);
  }, [editingTask, initialTemplate, isOpen, currentDay, initialStartTime, initialDuration, uniformTaskColorEnabled, uniformTaskColor, accentColor]);

  useEffect(() => () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);

  useEffect(() => {
    if (!showCustomTimePicker) return;
    requestAnimationFrame(() => {
      if (hoursWheelRef.current) hoursWheelRef.current.scrollTop = customHours * 40;
      if (minutesWheelRef.current) minutesWheelRef.current.scrollTop = customMinutes * 40;
    });
  }, [showCustomTimePicker]);

  useEffect(() => {
    if (iconGridRef.current) iconGridRef.current.scrollTop = 0;
  }, [iconCategory]);

  useLayoutEffect(() => {
    const track = durationTrackRef.current;
    const segmentIndex = isReminder ? 0 : quickDurations.indexOf(durationMinutes) + 1;
    const selectedSlot = segmentIndex >= 0 ? durationSlotRefs.current[segmentIndex] : null;
    if (!track || !selectedSlot) {
      setDurationIndicator(null);
      return;
    }

    const updateIndicator = () => {
      const trackRect = track.getBoundingClientRect();
      const slotRect = selectedSlot.getBoundingClientRect();
      const margin = 2;
      setDurationIndicator({
        left: slotRect.left - trackRect.left + margin,
        width: Math.max(0, slotRect.width - margin * 2),
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(track);
    return () => observer.disconnect();
  }, [durationMinutes, isReminder, isOpen, quickDurations]);

  if (!isOpen) return null;

  const activeTaskColor = uniformTaskColorEnabled ? uniformTaskColor : color;
  const endTime = isReminder ? startTime : calculateEndTime(startTime, durationMinutes);
  const presetDurationIndex = quickDurations.indexOf(durationMinutes);

  const handleOpenCustomTimePicker = () => {
    setCustomHours(Math.floor(durationMinutes / 60));
    setCustomMinutes(durationMinutes % 60);
    setShowCustomTimePicker(true);
  };

  const handleApplyCustomDuration = () => {
    const customDuration = customHours * 60 + customMinutes;
    if (customDuration < 1) return;
    setDurationMinutes(customDuration);
    setIsReminder(false);
    setShowCustomTimePicker(false);
  };

  const handleToggleDay = (day: DayOfWeek) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleIconCategorySelect = (category: string) => {
    setIconCategory(category);
    if (iconGridRef.current) iconGridRef.current.scrollTop = 0;
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleColorPick = (hex: string) => {
    if (uniformTaskColorEnabled) return;
    setColor(hex);
    setCustomHex(hex);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uniformTaskColorEnabled) return;
    const val = e.target.value;
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setColor(val);
    }
  };

  const handleCustomHexPressStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setShowHexDeleteMode(true);
      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    }, 2000);
  };

  const handleCustomHexPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleConfirmDeleteHex = () => {
    if (!hexToDelete || !onDeleteCustomHex) return;
    onDeleteCustomHex(hexToDelete);
    setHexToDelete(null);
    setShowHexDeleteMode(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveTask(
      {
        title: title.trim(),
        startTime,
        durationMinutes: isReminder ? 0 : durationMinutes,
        isReminder,
        icon,
        color: activeTaskColor,
        completed: isCompleted,
        days: repeatTask ? selectedDays : [currentDay],
        scheduledDate: repeatTask ? undefined : formatDateKey(currentDate),
        subtasks,
        blockId: editingTask?.blockId || null,
        notes: notes.trim(),
      },
      editingTask ? editingTask.id : undefined
    );
    onClose();
  };

  return (
    <>
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-stone-100 dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[94vh] flex flex-col"
        style={{ '--accent-color': accentColor } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center text-slate-700 dark:text-zinc-200 shadow-2xs hover:bg-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              {editingTask ? 'Task Details' : 'New Activity'}
            </span>
            {editingTask && onOpenFocus && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFocus(editingTask);
                }}
                style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold hover:brightness-95 active:scale-95 transition-all shadow-2xs"
              >
                <Target className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Focus</span>
              </button>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActionsMenu((visible) => !visible)}
              aria-label="Task options"
              aria-haspopup="menu"
              aria-expanded={showActionsMenu}
              className="w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center text-slate-700 dark:text-zinc-200 shadow-2xs hover:bg-white transition-all active:scale-95"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showActionsMenu && editingTask && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-2 min-w-40 rounded-xl bg-white dark:bg-zinc-800 p-1 shadow-xl ring-1 ring-black/10 dark:ring-white/10"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowActionsMenu(false);
                    onDuplicateTask(editingTask);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-700"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-zinc-700" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowActionsMenu(false);
                    onDeleteTask(editingTask.id);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30"
                  style={{ color: '#FF3B30' }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 pb-6 space-y-4 flex-1">
          <div className="bg-stone-200/60 dark:bg-zinc-800/60 rounded-3xl p-4 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {/* Requirement 5: Big bubble background changes to selected color, tiny palette button stays neutral grey */}
              <div
                className="w-16 h-28 rounded-full flex flex-col items-center justify-center shadow-md ring-2 ring-white/60 dark:ring-white/10 transition-colors"
                style={{
                  backgroundColor: isCompleted ? '#8E8E93' : activeTaskColor,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  title="Change icon"
                  className="text-white hover:scale-110 active:scale-95 transition-transform"
                >
                  <IconRenderer name={icon} strokeWidth={2.5} className="w-8 h-8 stroke-[2.5]" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Change color"
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-white/90 dark:bg-zinc-800 shadow-md flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:scale-110 active:scale-95 transition-all"
              >
                <Palette className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 mb-1">
                {isReminder ? `${startTime} (Reminder)` : `${startTime} – ${endTime} (${formatDuration(durationMinutes)})`}
              </div>

              <input
                type="text"
                required
                placeholder="Task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full text-lg md:text-xl font-bold bg-transparent border-b border-slate-300 dark:border-zinc-700 pb-1 focus:outline-none focus:border-[var(--accent-color)] ${
                  isCompleted ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-900 dark:text-white'
                }`}
              />

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCompleted(!isCompleted)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${
                    isCompleted ? 'text-white' : 'border border-slate-400 dark:border-zinc-600'
                  }`}
                  style={isCompleted ? { backgroundColor: accentColor } : undefined}
                >
                  {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {isCompleted ? 'Completed' : 'Mark complete'}
                </span>
              </div>
            </div>
          </div>

          {(showColorPicker || showIconPicker) && (
            <div className="bg-white dark:bg-zinc-800/90 rounded-2xl p-3 shadow-xs space-y-3 animate-in fade-in duration-150">
              {showColorPicker && (
                <div className={uniformTaskColorEnabled ? 'opacity-50 pointer-events-none' : ''}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                      Choose Task Color {uniformTaskColorEnabled && '(Uniform color enabled in Settings)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fill,1.75rem)] gap-2.5 mb-2.5">
                    {APPLE_PALETTE.map((pal) => (
                      <button
                        key={pal.hex}
                        type="button"
                        onClick={() => handleColorPick(pal.hex)}
                        aria-label={pal.name}
                        className={`w-7 h-7 rounded-full transition-transform active:scale-90 active:opacity-60 ${
                          color.toLowerCase() === pal.hex.toLowerCase()
                            ? 'scale-110 ring-2 ring-offset-2 ring-[var(--accent-color)]'
                            : ''
                        }`}
                        style={{ backgroundColor: pal.hex }}
                      />
                    ))}

                    {savedCustomHexes.map((hex) => {
                      const isSel = color.toLowerCase() === hex.toLowerCase();
                      return (
                        <div
                          key={hex}
                          className={`relative w-7 h-7 ${showHexDeleteMode ? 'hex-delete-wobble' : ''}`}
                          onPointerDown={handleCustomHexPressStart}
                          onPointerUp={handleCustomHexPressEnd}
                          onPointerLeave={handleCustomHexPressEnd}
                          onPointerCancel={handleCustomHexPressEnd}
                          onContextMenu={(event) => event.preventDefault()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (!showHexDeleteMode) handleColorPick(hex);
                            }}
                            aria-label={`Choose color ${hex}`}
                            className={`w-7 h-7 rounded-full transition-transform active:scale-90 active:opacity-60 ${
                              isSel ? 'scale-110 ring-2 ring-offset-2 ring-[var(--accent-color)]' : ''
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                          {showHexDeleteMode && onDeleteCustomHex && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHexToDelete(hex);
                              }}
                              aria-label={`Delete saved color ${hex}`}
                              className="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-black/35 text-white shadow-sm transition-opacity hover:bg-black/50 active:opacity-60"
                            >
                              <X className="w-4 h-4 stroke-[3]" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {showHexDeleteMode && (
                    <button
                      type="button"
                      onClick={() => setShowHexDeleteMode(false)}
                      className="mb-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-zinc-700 dark:text-zinc-200"
                    >
                      Done editing colors
                    </button>
                  )}

                  <div className="flex items-center gap-2 text-xs pt-1 border-t border-slate-100 dark:border-zinc-700/50">
                    <span className="text-slate-400">Hex:</span>
                    <input
                      type="text"
                      placeholder="#007AFF"
                      value={customHex}
                      onChange={handleCustomHexChange}
                      maxLength={7}
                      className="w-24 px-2.5 py-1 font-mono rounded-lg bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-white uppercase"
                    />
                    {onSaveCustomHex && /^#[0-9A-Fa-f]{6}$/.test(customHex) && !savedCustomHexes.includes(customHex) && (
                      <button
                        type="button"
                        onClick={() => onSaveCustomHex(customHex)}
                        className="px-2.5 py-1 bg-slate-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Bookmark className="w-3 h-3" />
                        <span>Save Hex</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {showHexDeleteMode
                      ? 'Tap the centered cross to remove a saved color.'
                      : 'Hold any custom saved color for 2 seconds to edit.'}
                  </span>
                </div>
              )}

              {showIconPicker && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                      Pick Icon ({AVAILABLE_ICONS.length})
                    </span>
                    <input
                      type="text"
                      placeholder="Search icons..."
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="px-2 py-0.5 text-xs rounded-lg bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-white w-28 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                    {ICON_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleIconCategorySelect(cat)}
                        className={`px-2 py-0.5 rounded-full whitespace-nowrap font-medium transition-colors ${
                          iconCategory === cat
                            ? 'bg-[var(--accent-color)] text-white'
                            : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div ref={iconGridRef} className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1 bg-stone-50/50 dark:bg-zinc-900/50 rounded-xl">
                    {AVAILABLE_ICONS.filter((item) => {
                      const matchesCat = iconCategory === 'All' || item.category === iconCategory;
                      const matchesSearch =
                        !iconSearch ||
                        item.name.toLowerCase().includes(iconSearch.toLowerCase()) ||
                        item.id.toLowerCase().includes(iconSearch.toLowerCase()) ||
                        item.category.toLowerCase().includes(iconSearch.toLowerCase());
                      return matchesCat && matchesSearch;
                    }).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        title={item.name}
                        onClick={() => {
                          setIcon(item.id);
                          setShowIconPicker(false);
                        }}
                        className={`${isFontAwesomeIcon(item.icon) ? 'p-0' : 'p-2'} rounded-xl flex flex-col items-center justify-center transition-all ${
                          icon === item.id
                            ? 'bg-[var(--accent-color)] text-white scale-105 shadow-sm'
                            : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-200/80 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <IconRenderer name={item.id} strokeWidth={2.5} className="w-4.5 h-4.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-zinc-800/80 rounded-2xl p-3 shadow-2xs divide-y divide-slate-100 dark:divide-zinc-700/60 text-xs">
            <div className="py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <Clock className="w-4 h-4" style={{ color: accentColor }} />
                <span className="font-medium">{isReminder ? 'Reminder Time' : 'Time'}</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="px-2.5 py-1 bg-stone-100 dark:bg-zinc-700 font-semibold rounded-xl text-slate-800 dark:text-white"
                />
                {!isReminder && (
                  <>
                    <span className="text-slate-400">to</span>
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">{endTime}</span>
                  </>
                )}
              </div>
            </div>

            <div className="py-2.5">
              <div className="flex items-center justify-between mb-1.5 text-slate-500 dark:text-zinc-400">
                <span>Duration ({isReminder ? 'Reminder' : `${durationMinutes}m`})</span>
                <span className="text-[10px]">Presets & reminder</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-stone-100 dark:bg-zinc-700/80 p-1">
                <div
                  ref={durationTrackRef}
                  className="relative flex min-w-0 flex-1 items-stretch rounded-xl bg-black/[0.035] p-0.5 dark:bg-black/15"
                >
                  {durationIndicator && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0.5 rounded-[10px] shadow-sm transition-[left,width] duration-200 ease-out"
                      style={{
                        left: durationIndicator.left,
                        width: durationIndicator.width,
                        backgroundColor: activeTaskColor,
                      }}
                    />
                  )}
                  <button
                    type="button"
                    aria-label="Set as reminder"
                    aria-pressed={isReminder}
                    ref={(element) => { durationSlotRefs.current[0] = element; }}
                    onClick={() => {
                      setIsReminder(true);
                      setDurationMinutes(0);
                    }}
                    className={`relative z-10 flex h-9 min-w-0 flex-1 items-center justify-center text-center rounded-[10px] transition-colors ${
                      isReminder ? 'text-white' : 'text-slate-500 dark:text-zinc-300'
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                  {quickDurations.map((mins, index) => {
                    const isSelected = !isReminder && durationMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        aria-pressed={isSelected}
                        ref={(element) => { durationSlotRefs.current[index + 1] = element; }}
                        onClick={() => {
                          setDurationMinutes(mins);
                          setIsReminder(false);
                        }}
                        className={`relative z-10 flex h-9 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-[10px] px-1.5 text-center text-[11px] font-semibold transition-colors ${
                          isSelected ? 'text-white' : 'text-slate-600 dark:text-zinc-300'
                        }`}
                      >
                        {formatDurationOption(mins)}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-label="Choose custom duration"
                  onClick={handleOpenCustomTimePicker}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-black/5 active:scale-95 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  <MoreHorizontal className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div className="py-2.5">
              <div className="flex items-center justify-between text-slate-600 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  <span className="font-medium">Repeat Task?</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={repeatTask}
                  onClick={() => setRepeatTask((previous) => !previous)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    repeatTask ? 'bg-[var(--accent-color)]' : 'bg-slate-300 dark:bg-zinc-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      repeatTask ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              {repeatTask && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS_OF_WEEK.map(({ key, short }) => {
                      const isSelected = selectedDays.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleToggleDay(key)}
                          className={`py-1 text-center rounded-xl text-[11px] font-medium transition-colors ${
                            isSelected
                              ? 'bg-[var(--accent-color)] text-white font-semibold'
                              : 'bg-stone-100 dark:bg-zinc-700 text-slate-500'
                          }`}
                        >
                          {short}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400 dark:text-zinc-500">
                    A reminder is scheduled for the next upcoming selected day at this start time.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800/80 rounded-2xl p-3 shadow-2xs space-y-3">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1.5">
                Subtasks
              </span>

              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 dark:border-zinc-700/60"
                >
                  <span className="text-xs text-slate-700 dark:text-zinc-200 truncate">
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    aria-label={`Remove ${st.title}`}
                    className="text-4 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Add Subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-stone-100 dark:bg-zinc-700 rounded-xl focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-2.5 py-1.5 bg-[var(--accent-color)] text-white rounded-xl text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="pt-1">
              <label htmlFor="notes-textarea" className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                Notes
              </label>
              <textarea
                id="notes-textarea"
                rows={2}
                placeholder="Add notes, meeting links or phone numbers..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 text-xs bg-stone-100 dark:bg-zinc-700/80 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] resize-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[var(--accent-color)] hover:brightness-90 text-white font-semibold text-sm rounded-2xl shadow-md active:scale-98 transition-all"
            >
              {editingTask ? 'Save Task' : 'Add to Day Schedule'}
            </button>
          </div>
        </form>
      </div>
      {showCustomTimePicker && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowCustomTimePicker(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-duration-title"
            className="w-full max-w-xs rounded-3xl bg-stone-100 p-5 shadow-2xl dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="custom-duration-title" className="text-center text-sm font-bold text-slate-800 dark:text-white">
              Custom duration
            </h2>
            <div className="relative mt-4 grid grid-cols-2 gap-4">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-stone-200/80 dark:bg-zinc-800" />
              <div>
                <span className="mb-1 block text-center text-[10px] font-semibold uppercase text-slate-400">Hours</span>
                <div
                  ref={hoursWheelRef}
                  role="listbox"
                  aria-label="Hours"
                  className="relative h-40 snap-y snap-mandatory overflow-y-auto overscroll-contain py-[60px] text-center [scrollbar-width:none]"
                  onScroll={(event) => setCustomHours(Math.min(23, Math.max(0, Math.round(event.currentTarget.scrollTop / 40))))}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <button
                      key={hour}
                      type="button"
                      role="option"
                      aria-selected={customHours === hour}
                      onClick={() => {
                        setCustomHours(hour);
                        if (hoursWheelRef.current) hoursWheelRef.current.scrollTo({ top: hour * 40, behavior: 'smooth' });
                      }}
                      className={`relative z-10 block h-10 w-full snap-center text-lg transition-all ${
                        customHours === hour ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500'
                      }`}
                    >
                      {hour.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
                <span className="mt-1 block text-center text-[10px] text-slate-400">hr</span>
              </div>
              <div>
                <span className="mb-1 block text-center text-[10px] font-semibold uppercase text-slate-400">Minutes</span>
                <div
                  ref={minutesWheelRef}
                  role="listbox"
                  aria-label="Minutes"
                  className="relative h-40 snap-y snap-mandatory overflow-y-auto overscroll-contain py-[60px] text-center [scrollbar-width:none]"
                  onScroll={(event) => setCustomMinutes(Math.min(59, Math.max(0, Math.round(event.currentTarget.scrollTop / 40))))}
                >
                  {Array.from({ length: 60 }, (_, minute) => (
                    <button
                      key={minute}
                      type="button"
                      role="option"
                      aria-selected={customMinutes === minute}
                      onClick={() => {
                        setCustomMinutes(minute);
                        if (minutesWheelRef.current) minutesWheelRef.current.scrollTo({ top: minute * 40, behavior: 'smooth' });
                      }}
                      className={`relative z-10 block h-10 w-full snap-center text-lg transition-all ${
                        customMinutes === minute ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-400 dark:text-zinc-500'
                      }`}
                    >
                      {minute.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
                <span className="mt-1 block text-center text-[10px] text-slate-400">min</span>
              </div>
            </div>
            {customHours === 0 && customMinutes === 0 && (
              <p className="mt-3 text-center text-xs text-rose-500">Duration must be at least one minute.</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCustomTimePicker(false)}
                className="flex-1 rounded-xl bg-stone-200 py-2.5 text-xs font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDuration}
                disabled={customHours === 0 && customMinutes === 0}
                className="flex-1 rounded-xl py-2.5 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: accentColor }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    {hexToDelete && onDeleteCustomHex && createPortal(
      <div
        className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={() => setHexToDelete(null)}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-hex-title"
          aria-describedby="delete-hex-description"
          className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="delete-hex-title" className="text-base font-semibold text-slate-900 dark:text-white">
            Delete saved colour?
          </h2>
          <p id="delete-hex-description" className="mt-2 text-sm text-slate-600 dark:text-zinc-300">
            Are you sure you want to delete this saved hex colour?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setHexToDelete(null)}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteHex}
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};
