/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Trash2,
  RotateCcw,
  Check,
  Sparkles,
  Palette,
  ChevronRight,
  ChevronLeft,
  Bell,
  Cloud,
  LayoutGrid,
  Star,
  Search,
  ExternalLink,
  Clock,
  Plus,
  Copy,
} from 'lucide-react';
import { AppSettings } from '../types';
import { minutesToTimeString, formatDuration } from '../utils/scheduleLogic';
import { APPLE_PALETTE, RECORDED_TASKS_LIBRARY, saveStoredSettings } from '../utils/storage';
import { generateCloudSyncKey } from '../utils/cloudSync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  cloudSyncStatus: 'disabled' | 'setup' | 'syncing' | 'active' | 'error';
  cloudSyncError: string | null;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetDefaultSchedule: () => void;
}

type SettingsSection = 'main' | 'customisation' | 'recorded_tasks' | 'notifications' | 'widgets' | 'icloud';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  cloudSyncStatus,
  cloudSyncError,
  onUpdateSettings,
  onResetDefaultSchedule,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');
  const [newSuggestion, setNewSuggestion] = useState('');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskCategory, setTaskCategory] = useState<string>('All');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [newPresetVal, setNewPresetVal] = useState<string>('');
  const [secretSaved, setSecretSaved] = useState(false);
  const [secretSaveFailed, setSecretSaveFailed] = useState(false);
  const [cloudKeyMessage, setCloudKeyMessage] = useState<string | null>(null);
  const secretWriteSucceededRef = useRef(false);

  const currentAccent = settings.accentColor || '#007AFF';
  const uniformEnabled = settings.uniformTaskColorEnabled || false;
  const uniformColor = settings.uniformTaskColor || currentAccent;
  const [customHex, setCustomHex] = useState(currentAccent);
  const [customUniformHex, setCustomUniformHex] = useState(uniformColor);

  useEffect(() => {
    setActiveSection('main');
    setSecretSaved(false);
    setSecretSaveFailed(false);
    secretWriteSucceededRef.current = false;
  }, [isOpen]);

  if (!isOpen) return null;

  const recordedList = Array.isArray(settings.rememberedTasks)
    ? settings.rememberedTasks
    : RECORDED_TASKS_LIBRARY;

  const filteredTasks = recordedList.filter((task) => {
    const matchesSearch = task.toLowerCase().includes(taskSearchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (taskCategory === 'All') return true;
    if (taskCategory === 'Morning' && (task.includes('Morning') || task.includes('Wake') || task.includes('bed') || task.includes('vitamins') || task.includes('Sunlight'))) return true;
    if (taskCategory === 'Work' && (task.includes('Work') || task.includes('Code') || task.includes('Team') || task.includes('Sprint') || task.includes('Review') || task.includes('Bug') || task.includes('Deploy'))) return true;
    if (taskCategory === 'Fitness' && (task.includes('run') || task.includes('workout') || task.includes('Gym') || task.includes('Yoga') || task.includes('walk') || task.includes('stretch'))) return true;
    if (taskCategory === 'Learning' && (task.includes('Read') || task.includes('podcast') || task.includes('French') || task.includes('notes') || task.includes('Guitar'))) return true;
    if (taskCategory === 'Evening' && (task.includes('Evening') || task.includes('Dinner') || task.includes('Sleep') || task.includes('Screen') || task.includes('Skincare'))) return true;
    return true;
  });

  const handleRemoveTaskMemory = (taskToRemove: string) => {
    const updated = recordedList.filter((t) => t !== taskToRemove);
    onUpdateSettings({ ...settings, rememberedTasks: updated });
  };

  const handleAddTaskMemory = () => {
    if (!newSuggestion.trim()) return;
    if (recordedList.includes(newSuggestion.trim())) {
      setNewSuggestion('');
      return;
    }
    const updated = [newSuggestion.trim(), ...recordedList];
    onUpdateSettings({ ...settings, rememberedTasks: updated });
    setNewSuggestion('');
  };

  const handleClearAllMemory = () => {
    if (confirm('Clear all recorded tasks from your memory library?')) {
      onUpdateSettings({ ...settings, rememberedTasks: [] });
    }
  };

  const handleHexChange = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onUpdateSettings({ ...settings, accentColor: hex });
    }
  };

  const handleUniformHexChange = (hex: string) => {
    setCustomUniformHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onUpdateSettings({ ...settings, uniformTaskColor: hex });
    }
  };

  const quickDurations = settings.quickDurations || [15, 30, 45, 60, 90];

  const handleRemovePreset = (mins: number) => {
    const updated = quickDurations.filter((d) => d !== mins);
    onUpdateSettings({ ...settings, quickDurations: updated });
  };

  const handleAddPreset = () => {
    const val = parseInt(newPresetVal, 10);
    if (isNaN(val) || val <= 0) return;
    if (quickDurations.includes(val)) {
      setNewPresetVal('');
      return;
    }
    const updated = [...quickDurations, val].sort((a, b) => a - b);
    onUpdateSettings({ ...settings, quickDurations: updated });
    setNewPresetVal('');
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-stone-100 dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 dark:border-white/5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md">
          {activeSection === 'main' ? (
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-800 dark:text-zinc-100">Settings</span>
            </div>
          ) : (
            <button
              onClick={() => setActiveSection('main')}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Settings</span>
            </button>
          )}

          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            {activeSection === 'customisation'
              ? 'Customisation'
              : activeSection === 'recorded_tasks'
              ? 'Recorded Tasks'
              : activeSection === 'notifications'
              ? 'Notifications'
              : activeSection === 'widgets'
              ? 'Widgets'
              : activeSection === 'icloud'
              ? 'Cloud Sync'
              : 'Structura'}
          </div>

          <button
            onClick={() => {
              setActiveSection('main');
              onClose();
            }}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-zinc-700/80 hover:bg-slate-300 flex items-center justify-center text-slate-700 dark:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4 flex-1">
          {activeSection === 'main' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-4 shadow-xs border border-black/5 dark:border-white/5 flex items-center gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md text-white font-bold text-lg"
                  style={{ backgroundColor: currentAccent }}
                >
                  S
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-100">Structura</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Daily Timeline & Focus Routine</p>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Version 2.4 (App Store Build)</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xs overflow-hidden border border-black/5 dark:border-white/5 divide-y divide-slate-100 dark:divide-zinc-700/50">
                <button
                  type="button"
                  onClick={() => setActiveSection('customisation')}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-700/40 transition-colors text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: `${currentAccent}20`, color: currentAccent }}
                    >
                      <Palette className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 block">Customisation & Presets</span>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                        Theme color, Duration presets,
                        <span className="block">Uniform task colors</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 self-center text-slate-400">
                    <div
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-zinc-800 shadow-2xs"
                      style={{ backgroundColor: currentAccent }}
                    />
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('recorded_tasks')}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-700/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 block">Recorded Tasks</span>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">Year-long task library & suggestions</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-slate-600 dark:bg-zinc-700 dark:text-zinc-300">
                      {recordedList.length} tasks
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xs overflow-hidden border border-black/5 dark:border-white/5 divide-y divide-slate-100 dark:divide-zinc-700/50">
                <button
                  type="button"
                  onClick={() => setActiveSection('notifications')}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-700/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shadow-xs">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 block">Notifications & Alerts</span>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">Task start chime, reminders & haptics</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('widgets')}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-700/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shadow-xs">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 block">Widgets & Lock Screen</span>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">Next Up widget, timeline bar preview</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('icloud')}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-700/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shadow-xs">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 block">Cloud Sync & Backup</span>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">Encrypted cloud sync & JSON export</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Synced</span>
                </button>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xs overflow-hidden border border-black/5 dark:border-white/5 divide-y divide-slate-100 dark:divide-zinc-700/50">
                <button
                  type="button"
                  onClick={() => alert('Thank you for rating Structura on the App Store! ⭐️⭐️⭐️⭐️⭐️')}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-700/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs">
                      <Star className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100">Rate & Review on App Store</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all tasks and routine blocks from your schedule?')) {
                      onResetDefaultSchedule();
                      onClose();
                    }
                  }}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shadow-xs">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-rose-600">Clear Schedule</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'customisation' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
              {/* App Theme Accent */}
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-4 shadow-xs border border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    App Theme Accent Color
                  </h4>
                  <span className="text-xs font-mono font-bold" style={{ color: currentAccent }}>
                    {currentAccent.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2.5 pt-1">
                  {APPLE_PALETTE.map((c) => {
                    const isSelected = currentAccent.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          onUpdateSettings({ ...settings, accentColor: c.hex });
                          setCustomHex(c.hex);
                        }}
                        aria-label={`Select ${c.name} color`}
                        className="flex flex-col items-center gap-1 group/color"
                      >
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover/color:scale-105 active:scale-95 relative"
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </div>
                        <span className="text-[9px] font-medium text-slate-500 dark:text-zinc-400">
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration Presets Customisation (Requirement 7) */}
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-4 shadow-xs border border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Duration Presets
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Customize quick duration options (in minutes)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {quickDurations.map((mins) => (
                    <div
                      key={mins}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-200"
                    >
                      <span>{formatDuration(mins)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePreset(mins)}
                        className="text-slate-400 hover:text-rose-500 ml-1"
                        title="Remove preset"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-zinc-700/50">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min="5"
                    max="360"
                    step="5"
                    value={newPresetVal}
                    onChange={(e) => setNewPresetVal(e.target.value)}
                    placeholder="Minutes e.g. 20"
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-zinc-100 border-none outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddPreset}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Preset</span>
                  </button>
                </div>
              </div>

              {/* Uniform Task Color Toggle */}
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-4 shadow-xs border border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 block">Uniform Color for All Tasks</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">Use one single color for all tasks (blocks remain distinct)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, uniformTaskColorEnabled: !uniformEnabled })}
                    className="w-11 h-6 rounded-full transition-colors relative"
                    style={{ backgroundColor: uniformEnabled ? currentAccent : '#cbd5e1' }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                        uniformEnabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {uniformEnabled && (
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-700/50 space-y-2.5">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">
                      Choose Uniform Task Color:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {APPLE_PALETTE.map((pal) => {
                        const isSel = uniformColor.toLowerCase() === pal.hex.toLowerCase();
                        return (
                          <button
                            key={pal.hex}
                            type="button"
                            onClick={() => {
                              onUpdateSettings({ ...settings, uniformTaskColor: pal.hex });
                              setCustomUniformHex(pal.hex);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                              isSel ? 'scale-110 ring-2 ring-offset-2 ring-blue-500' : ''
                            }`}
                            style={{ backgroundColor: pal.hex }}
                          >
                            {isSel && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-mono text-slate-400">#</span>
                      <input
                        type="text"
                        maxLength={7}
                        value={customUniformHex}
                        onChange={(e) => handleUniformHexChange(e.target.value)}
                        placeholder="#007AFF"
                        className="flex-1 text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-zinc-100 border-none uppercase"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Time Format */}
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-4 shadow-xs border border-black/5 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 block">24-Hour Time Format</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">Display 16:00 instead of 4:00 PM</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, use24Hour: !settings.use24Hour })}
                    className="w-11 h-6 rounded-full transition-colors relative"
                    style={{ backgroundColor: settings.use24Hour ? currentAccent : '#cbd5e1' }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                        settings.use24Hour ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'recorded_tasks' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-3 shadow-xs border border-black/5 dark:border-white/5 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    placeholder="Search recorded tasks..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-zinc-700/60 text-slate-800 dark:text-zinc-100 border-none outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                  {['All', 'Morning', 'Work', 'Fitness', 'Learning', 'Evening'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTaskCategory(cat)}
                      className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                        taskCategory === cat
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                          : 'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-zinc-700/50">
                  <input
                    type="text"
                    value={newSuggestion}
                    onChange={(e) => setNewSuggestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTaskMemory()}
                    placeholder="Record custom task title..."
                    className="flex-1 text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-zinc-100 border-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTaskMemory}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-900 active:scale-95 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-xs border border-black/5 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-zinc-700 flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Library ({filteredTasks.length} tasks)</span>
                  <button
                    type="button"
                    onClick={handleClearAllMemory}
                    className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
                  >
                    Clear Library
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-zinc-700/50 max-h-[360px] overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No recorded tasks match your search.</div>
                  ) : (
                    filteredTasks.map((t) => (
                      <div
                        key={t}
                        className="px-4 py-2 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-zinc-700/30 text-xs"
                      >
                        <span className="text-slate-700 dark:text-zinc-200">{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskMemory(t)}
                          aria-label={`Remove ${t}`}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-4 shadow-xs border border-black/5 dark:border-white/5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 block">Task Reminders</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">Receive alert when a task is about to start</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
                    className="w-11 h-6 rounded-full transition-colors relative"
                    style={{ backgroundColor: settings.notificationsEnabled !== false ? currentAccent : '#cbd5e1' }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                        settings.notificationsEnabled !== false ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-zinc-700/60">
                  <label htmlFor="notification-api-secret" className="text-xs font-semibold text-slate-800 dark:text-zinc-100">
                    Vercel scheduler secret
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="notification-api-secret"
                      type="password"
                      autoComplete="new-password"
                      value={settings.notificationApiSecret || ''}
                      onChange={(event) => {
                        const updatedSettings = {
                          ...settings,
                          notificationApiSecret: event.target.value,
                        };
                        secretWriteSucceededRef.current = saveStoredSettings(updatedSettings);
                        onUpdateSettings(updatedSettings);
                        setSecretSaved(false);
                        setSecretSaveFailed(false);
                      }}
                      onBlur={() => {
                        setSecretSaved(secretWriteSucceededRef.current);
                        setSecretSaveFailed(!secretWriteSucceededRef.current);
                      }}
                      placeholder="Enter the secret configured in Vercel"
                      className="min-w-0 flex-1 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                    />
                    {secretSaved && (
                      <span role="status" className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ Saved
                      </span>
                    )}
                  </div>
                  {secretSaveFailed && (
                    <p role="alert" className="text-[10px] text-rose-600 dark:text-rose-400">
                      Could not save the secret in this browser. Check storage permissions and try again.
                    </p>
                  )}
                  {!settings.notificationApiSecret?.trim() && (
                    <p role="status" className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Add your Vercel scheduler secret here to enable task reminders.
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                    Match the scheduler secret configured in Vercel. Stored in this browser’s local storage.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'widgets' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-4 shadow-xs border border-black/5 dark:border-white/5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">iOS Widget Preview</h4>
                <p className="text-xs text-slate-500">Live glanceable preview for your iPhone Home Screen & Lock Screen.</p>

                <div className="bg-slate-950 text-white p-4 rounded-3xl shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold tracking-wider text-rose-400 uppercase text-[10px]">NEXT UP · NOW</span>
                    <span className="tabular-nums text-[11px]">10:00 – 11:30</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold"
                      style={{ backgroundColor: currentAccent }}
                    >
                      ⚡️
                    </div>
                    <div>
                      <h5 className="font-bold text-sm">Deep Work Architecture</h5>
                      <span className="text-xs text-slate-400">45 mins remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'icloud' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="bg-white dark:bg-zinc-800 rounded-3xl p-4 shadow-xs border border-black/5 dark:border-white/5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 block">Encrypted Cloud Backup</span>
                      <span className="text-[11px] text-slate-400">Restore tasks with your recovery key</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, iCloudSyncEnabled: !settings.iCloudSyncEnabled })}
                    className="w-11 h-6 rounded-full transition-colors relative"
                    style={{ backgroundColor: settings.iCloudSyncEnabled !== false ? currentAccent : '#cbd5e1' }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                        settings.iCloudSyncEnabled !== false ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-zinc-700">
                  <label
                    htmlFor="cloud-sync-recovery-key"
                    className="block text-[11px] font-medium text-slate-600 dark:text-zinc-300"
                  >
                    Recovery key
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="cloud-sync-recovery-key"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={settings.cloudSyncKey || ''}
                      onChange={(event) => {
                        setCloudKeyMessage(null);
                        onUpdateSettings({
                          ...settings,
                          cloudSyncKey: event.target.value.trim(),
                          cloudSyncLastBackupAt: undefined,
                        });
                      }}
                      placeholder="Paste or generate a recovery key"
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const key = generateCloudSyncKey();
                          setCloudKeyMessage('New key generated. Save it somewhere safe.');
                          onUpdateSettings({
                            ...settings,
                            cloudSyncKey: key,
                            cloudSyncLastBackupAt: undefined,
                          });
                        } catch (error) {
                          console.error('Could not generate cloud recovery key', error);
                          setCloudKeyMessage('Secure key generation is unavailable in this browser.');
                        }
                      }}
                      className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-medium text-slate-700 dark:bg-zinc-700 dark:text-zinc-100"
                    >
                      Generate
                    </button>
                  </div>
                  {settings.cloudSyncKey && (
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          try {
                            await navigator.clipboard.writeText(settings.cloudSyncKey || '');
                            setCloudKeyMessage('Recovery key copied. Store it somewhere safe.');
                          } catch (error) {
                            console.error('Could not copy cloud recovery key', error);
                            setCloudKeyMessage('Could not copy the key. Select and copy it manually.');
                          }
                        })();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      <Copy className="h-3 w-3" />
                      Copy recovery key
                    </button>
                  )}
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    Tasks are encrypted before upload. Keep this key: it cannot be recovered, and you will need it to restore tasks after reinstalling.
                  </p>
                  <p
                    role={cloudSyncStatus === 'error' ? 'alert' : 'status'}
                    className={`text-[11px] ${
                      cloudSyncStatus === 'active'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : cloudSyncStatus === 'error'
                          ? 'text-red-500'
                          : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {cloudSyncStatus === 'active'
                      ? 'Cloud Connection: Active'
                      : cloudSyncStatus === 'syncing'
                        ? 'Cloud Connection: Syncing…'
                        : cloudSyncStatus === 'disabled'
                          ? 'Cloud Connection: Off'
                          : cloudSyncStatus === 'error'
                            ? `Cloud Connection: Error${cloudSyncError ? ` — ${cloudSyncError}` : ''}`
                            : 'Cloud Connection: Set up a recovery key'}
                  </p>
                  {settings.cloudSyncLastBackupAt && (
                    <p className="text-[10px] text-slate-400">
                      Last Backed Up: {new Date(settings.cloudSyncLastBackupAt).toLocaleString()}
                    </p>
                  )}
                  {cloudKeyMessage && (
                    <p role="status" className="text-[10px] text-slate-500 dark:text-zinc-400">
                      {cloudKeyMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
