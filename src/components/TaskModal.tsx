/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Clock,
  Check,
  Folder,
  Palette,
  MoreHorizontal,
  RotateCw,
  Target,
  Bookmark,
} from 'lucide-react';
import { Task, Subtask, DayOfWeek, RoutineBlock, TaskTemplate } from '../types';
import { DAYS_OF_WEEK, formatDuration, calculateEndTime } from '../utils/scheduleLogic';
import { APPLE_PALETTE } from '../utils/storage';
import { AVAILABLE_ICONS, IconRenderer } from './IconRenderer';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (taskData: Omit<Task, 'id'>, existingId?: string) => void;
  editingTask: Task | null;
  currentDay: DayOfWeek;
  taskTemplates: TaskTemplate[];
  quickDurations: number[];
  blocks: RoutineBlock[];
  initialTemplate?: TaskTemplate | null;
  initialStartTime?: string;
  initialDuration?: number;
  initialBlockId?: string | null;
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
  editingTask,
  currentDay,
  taskTemplates,
  quickDurations,
  blocks,
  initialTemplate,
  initialStartTime,
  initialDuration,
  initialBlockId,
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
  const [icon, setIcon] = useState('laptop');
  const [color, setColor] = useState('#007AFF');
  const [customHex, setCustomHex] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([currentDay]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconCategory, setIconCategory] = useState<string>('All');
  const [iconSearch, setIconSearch] = useState<string>('');

  // Long press (2 seconds) state for custom hex deletion
  const [showHexDeleteMode, setShowHexDeleteMode] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setStartTime(editingTask.startTime);
      setDurationMinutes(editingTask.durationMinutes);
      setIsReminder(editingTask.isReminder || editingTask.durationMinutes === 0);
      setIcon(editingTask.icon);
      setColor(uniformTaskColorEnabled ? uniformTaskColor : editingTask.color);
      setSelectedDays(editingTask.days);
      setSubtasks(editingTask.subtasks || []);
      setSelectedBlockId(editingTask.blockId || null);
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
      setSubtasks([]);
      setSelectedBlockId(initialBlockId || null);
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
      setSubtasks([]);
      setSelectedBlockId(initialBlockId || null);
      setNotes('');
      setIsCompleted(false);
    }
    setShowColorPicker(false);
    setShowIconPicker(false);
    setShowHexDeleteMode(false);
  }, [editingTask, initialTemplate, isOpen, currentDay, initialStartTime, initialDuration, initialBlockId, uniformTaskColorEnabled, uniformTaskColor, accentColor]);

  if (!isOpen) return null;

  const activeTaskColor = uniformTaskColorEnabled ? uniformTaskColor : color;
  const endTime = isReminder ? startTime : calculateEndTime(startTime, durationMinutes);

  const handleToggleDay = (day: DayOfWeek) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
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

  const handleCustomHexTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowHexDeleteMode(true);
      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    }, 2000); // 2 seconds hold
  };

  const handleCustomHexTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
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
        days: selectedDays,
        subtasks,
        blockId: selectedBlockId,
        notes: notes.trim(),
      },
      editingTask ? editingTask.id : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
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

          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            aria-label="Color options"
            className="w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center text-slate-700 dark:text-zinc-200 shadow-2xs hover:bg-white transition-all active:scale-95"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
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
                  <IconRenderer name={icon} className="w-8 h-8 stroke-[2.2]" />
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

                  <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                    {APPLE_PALETTE.map((pal) => (
                      <button
                        key={pal.hex}
                        type="button"
                        onClick={() => handleColorPick(pal.hex)}
                        aria-label={pal.name}
                        className={`w-7 h-7 rounded-full transition-transform active:scale-90 ${
                          color.toLowerCase() === pal.hex.toLowerCase()
                            ? 'scale-110 ring-2 ring-offset-2 ring-[var(--accent-color)]'
                            : ''
                        }`}
                        style={{ backgroundColor: pal.hex }}
                      />
                    ))}

                    {/* Saved Custom Hexes with long press 2s delete feature */}
                    {savedCustomHexes.map((hex) => {
                      const isSel = color.toLowerCase() === hex.toLowerCase();
                      return (
                        <div
                          key={hex}
                          className="relative group/hex"
                          onMouseDown={handleCustomHexTouchStart}
                          onMouseUp={handleCustomHexTouchEnd}
                          onTouchStart={handleCustomHexTouchStart}
                          onTouchEnd={handleCustomHexTouchEnd}
                        >
                          <button
                            type="button"
                            onClick={() => handleColorPick(hex)}
                            className={`w-7 h-7 rounded-full transition-transform active:scale-90 ${
                              isSel ? 'scale-110 ring-2 ring-offset-2 ring-[var(--accent-color)]' : ''
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                          {showHexDeleteMode && onDeleteCustomHex && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCustomHex(hex);
                              }}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] font-bold shadow-md hover:scale-110"
                              title="Delete custom color"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

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
                    Hold any custom saved color for 2 seconds to delete.
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
                    {['All', 'Routine', 'Work', 'Study', 'Fitness', 'Food', 'Social', 'Leisure', 'Travel', 'Home', 'Mindfulness'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setIconCategory(cat)}
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

                  <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1 bg-stone-50/50 dark:bg-zinc-900/50 rounded-xl">
                    {AVAILABLE_ICONS.filter((item) => {
                      const matchesCat = iconCategory === 'All' || item.category === iconCategory;
                      const matchesSearch =
                        !iconSearch ||
                        item.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
                        item.id.toLowerCase().includes(iconSearch.toLowerCase());
                      return matchesCat && matchesSearch;
                    }).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        onClick={() => {
                          setIcon(item.id);
                          setShowIconPicker(false);
                        }}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                          icon === item.id
                            ? 'bg-[var(--accent-color)] text-white scale-105 shadow-sm'
                            : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-200/80 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <item.icon className="w-4.5 h-4.5" />
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
                <span className="text-[10px]">Presets & Reminder:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {quickDurations.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setDurationMinutes(mins);
                      setIsReminder(false);
                    }}
                    className={`py-1.5 px-3 rounded-xl font-medium transition-all ${
                      !isReminder && durationMinutes === mins
                        ? 'bg-[var(--accent-color)] text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-stone-200'
                    }`}
                  >
                    {formatDuration(mins)}
                  </button>
                ))}

                {/* Reminder option */}
                <button
                  type="button"
                  onClick={() => {
                    setIsReminder(true);
                    setDurationMinutes(0);
                  }}
                  className={`py-1.5 px-3 rounded-xl font-semibold transition-all flex items-center gap-1 ${
                    isReminder
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-zinc-700 text-amber-600 dark:text-amber-400 hover:bg-stone-200'
                  }`}
                >
                  <span>Reminder</span>
                </button>
              </div>
            </div>

            <div className="py-2.5">
              <div className="flex items-center justify-between mb-1.5 text-slate-600 dark:text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium">Routine Block</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedBlockId(null)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                    selectedBlockId === null
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-stone-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  None (Free task)
                </button>
                {blocks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBlockId(b.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                      selectedBlockId === b.id ? 'ring-2 ring-[var(--accent-color)] font-bold' : ''
                    }`}
                    style={{
                      backgroundColor: `${b.color}20`,
                      color: b.color,
                    }}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="py-2.5">
              <div className="flex items-center gap-2 mb-2 text-slate-600 dark:text-zinc-300">
                <RotateCw className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium">Repeat</span>
              </div>
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
    </div>
  );
};
