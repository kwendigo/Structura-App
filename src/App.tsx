/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Folder,
  Copy,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  Task,
  RoutineBlock,
  AppSettings,
  DayOfWeek,
  TaskTemplate,
} from './types';
import {
  DAYS_OF_WEEK,
  filterTasksForDay,
  sortTasksByTime,
  buildTimelineWithGaps,
  duplicateDaySchedule,
  duplicateBlockSchedule,
  parseTimeToMinutes,
  minutesToTimeString,
  detectAllClashes,
  filterBlocksForDay,
  formatDuration,
} from './utils/scheduleLogic';
import {
  loadStoredTasks,
  saveStoredTasks,
  loadStoredBlocks,
  saveStoredBlocks,
  loadStoredSettings,
  saveStoredSettings,
} from './utils/storage';
import {
  cancelTaskNotification,
  getNextScheduledAt,
  getOneSignalSubscriptionId,
  initializeOneSignal,
  scheduleTaskNotification,
} from './utils/notifications';
import {
  decryptTasks,
  fetchCloudTaskBackup,
  isValidCloudSyncKey,
  uploadCloudTaskBackup,
} from './utils/cloudSync';
import { Header } from './components/Header';
import { TimelineTask } from './components/TimelineTask';
import { UnallocatedGap } from './components/UnallocatedGap';
import { RoutineBlockContainer } from './components/RoutineBlockContainer';
import { TaskModal } from './components/TaskModal';
import { TaskPickerModal } from './components/TaskPickerModal';
import { SettingsModal } from './components/SettingsModal';
import { RoutineBlockModal } from './components/RoutineBlockModal';
import { BlockPickerModal } from './components/BlockPickerModal';
import { CalendarModal } from './components/CalendarModal';
import { FocusModeModal } from './components/FocusModeModal';

export default function App() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const [tasks, setTasks] = useState<Task[]>(loadStoredTasks);
  const [blocks, setBlocks] = useState<RoutineBlock[]>(loadStoredBlocks);
  const [settings, setSettings] = useState<AppSettings>(loadStoredSettings);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'disabled' | 'setup' | 'syncing' | 'active' | 'error'>('setup');
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [cloudSyncReadyKey, setCloudSyncReadyKey] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('wed');
  const [weekSwipeOffset, setWeekSwipeOffset] = useState(0);
  const [weekSwipeAnimating, setWeekSwipeAnimating] = useState(false);
  const [weekPageTransition, setWeekPageTransition] = useState({ key: 0, direction: -1 as -1 | 1 });
  const [dateTransitionParts, setDateTransitionParts] = useState({ day: false, month: false, year: false });
  const weekSwipeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  const [realTimeMinutes, setRealTimeMinutes] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const jsDay = currentDate.getDay();
    const dayKeyMap: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    setSelectedDay(dayKeyMap[jsDay]);
  }, []);

  useEffect(() => () => {
    if (weekSwipeTimeout.current) clearTimeout(weekSwipeTimeout.current);
  }, []);

  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isBlockPickerOpen, setIsBlockPickerOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<RoutineBlock | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  const [modalInitialTemplate, setModalInitialTemplate] = useState<TaskTemplate | null>(null);
  const [modalInitialTime, setModalInitialTime] = useState<string | undefined>();
  const [modalInitialDuration, setModalInitialDuration] = useState<number | undefined>();
  const [pendingBlockRemoval, setPendingBlockRemoval] = useState<{ taskId: string; startTime: string } | null>(null);

  const [clipboardDay, setClipboardDay] = useState<DayOfWeek | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const settingsRef = useRef(settings);
  const cloudSyncWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const cloudSyncWriteVersionRef = useRef(0);
  settingsRef.current = settings;

  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveStoredBlocks(blocks);
  }, [blocks]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    const recoveryKey = settings.cloudSyncKey?.trim() || '';
    if (settings.iCloudSyncEnabled === false) {
      setCloudSyncReadyKey(null);
      setCloudSyncStatus('disabled');
      setCloudSyncError(null);
      return;
    }
    if (!recoveryKey) {
      setCloudSyncReadyKey(null);
      setCloudSyncStatus('setup');
      setCloudSyncError(null);
      return;
    }
    if (!isValidCloudSyncKey(recoveryKey)) {
      setCloudSyncReadyKey(null);
      setCloudSyncStatus('error');
      setCloudSyncError('Enter a valid recovery key or generate a new one.');
      return;
    }

    let cancelled = false;
    setCloudSyncReadyKey(null);
    setCloudSyncStatus('syncing');
    setCloudSyncError(null);

    void (async () => {
      try {
        const backup = await fetchCloudTaskBackup(recoveryKey);
        if (cancelled) return;
        if (backup) {
          const restoredTasks = await decryptTasks(backup.payload, recoveryKey);
          if (cancelled) return;
          setTasks(restoredTasks);
          saveStoredTasks(restoredTasks);
          setSettings((previous) => ({
            ...previous,
            cloudSyncLastBackupAt: backup.updatedAt,
          }));
        }
        setCloudSyncReadyKey(recoveryKey);
      } catch (error) {
        if (cancelled) return;
        console.error('Could not restore tasks from cloud sync', error);
        setCloudSyncStatus('error');
        setCloudSyncError(error instanceof Error ? error.message : 'Cloud restore failed.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [settings.cloudSyncKey, settings.iCloudSyncEnabled]);

  useEffect(() => {
    const recoveryKey = settings.cloudSyncKey?.trim() || '';
    const version = ++cloudSyncWriteVersionRef.current;
    if (
      settings.iCloudSyncEnabled === false ||
      cloudSyncReadyKey !== recoveryKey ||
      !isValidCloudSyncKey(recoveryKey)
    ) return;

    cloudSyncWriteQueueRef.current = cloudSyncWriteQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (
          settingsRef.current.iCloudSyncEnabled === false ||
          settingsRef.current.cloudSyncKey?.trim() !== recoveryKey
        ) return;
        setCloudSyncStatus('syncing');
        setCloudSyncError(null);
        try {
          const updatedAt = await uploadCloudTaskBackup(recoveryKey, tasks);
          if (version !== cloudSyncWriteVersionRef.current) return;
          setSettings((previous) => ({
            ...previous,
            cloudSyncLastBackupAt: updatedAt,
          }));
          setCloudSyncStatus('active');
        } catch (error) {
          if (version !== cloudSyncWriteVersionRef.current) return;
          console.error('Could not back up tasks to cloud sync', error);
          setCloudSyncStatus('error');
          setCloudSyncError(error instanceof Error ? error.message : 'Cloud backup failed.');
        }
      });
  }, [tasks, settings.cloudSyncKey, settings.iCloudSyncEnabled, cloudSyncReadyKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setRealTimeMinutes(d.getHours() * 60 + d.getMinutes());
      if (!settings.simulatedTimeEnabled) {
        setNowMinutes(d.getHours() * 60 + d.getMinutes());
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [settings.simulatedTimeEnabled]);

  useEffect(() => {
    if (!import.meta.env.VITE_ONESIGNAL_APP_ID) return;
    initializeOneSignal().catch((error: unknown) => {
      console.error('OneSignal initialization failed', error);
    });
  }, []);

  const effectiveCurrentTimeMinutes = settings.simulatedTimeEnabled
    ? settings.simulatedTimeMinutes
    : nowMinutes;

  const accentColor = settings.accentColor || '#007AFF';
  const uniformEnabled = settings.uniformTaskColorEnabled || false;
  const uniformColor = settings.uniformTaskColor || accentColor;

  const currentDayTasks = useMemo(() => {
    const list = filterTasksForDay(tasks, selectedDay);
    if (uniformEnabled) {
      return list.map((t) => ({ ...t, color: uniformColor }));
    }
    return list;
  }, [tasks, selectedDay, uniformEnabled, uniformColor]);

  const clashMap = useMemo(() => {
    return detectAllClashes(currentDayTasks);
  }, [currentDayTasks]);

  const currentDayBlocks = useMemo(() => {
    return filterBlocksForDay(blocks, selectedDay);
  }, [blocks, selectedDay]);

  const getRoutineBlockBounds = (block: RoutineBlock) => {
    const blockTasks = sortTasksByTime(tasks.filter(
      (task) => task.blockId === block.id && task.days.includes(selectedDay)
    ));
    const startMinutes = parseTimeToMinutes(block.startTime || blockTasks[0]?.startTime || '09:00');
    const inferredDuration = Math.max(
      60,
      ...blockTasks.map((task) =>
        parseTimeToMinutes(task.startTime) + (task.isReminder ? 0 : task.durationMinutes) - startMinutes
      )
    );
    return {
      startMinutes,
      endMinutes: startMinutes + (block.durationMinutes || inferredDuration),
    };
  };

  const timelineItems = useMemo(() => {
    return buildTimelineWithGaps(currentDayTasks, 15);
  }, [currentDayTasks]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const executeTaskMove = (taskId: string, newStartTime: string, targetBlockId?: string | null) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            startTime: newStartTime,
            blockId: targetBlockId !== undefined ? targetBlockId : t.blockId,
          };
        }
        return t;
      })
    );
  };

  const handleUpdateTaskTime = (taskId: string, newStartTime: string) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const newStartMinutes = parseTimeToMinutes(newStartTime);
    const taskEndMinutes = newStartMinutes + (task.isReminder ? 0 : task.durationMinutes);
    const destinationBlock = currentDayBlocks.find((block) => {
      const { startMinutes, endMinutes } = getRoutineBlockBounds(block);
      return task.isReminder
        ? newStartMinutes >= startMinutes && newStartMinutes <= endMinutes
        : newStartMinutes >= startMinutes && taskEndMinutes <= endMinutes;
    });

    if (task.blockId && !destinationBlock) {
      const parentBlock = currentDayBlocks.find((block) => block.id === task.blockId);
      if (parentBlock) {
        const { startMinutes, endMinutes } = getRoutineBlockBounds(parentBlock);
        const completelyOutside = task.isReminder
          ? newStartMinutes < startMinutes || newStartMinutes > endMinutes
          : taskEndMinutes <= startMinutes || newStartMinutes >= endMinutes;
        if (completelyOutside) {
          setPendingBlockRemoval({ taskId, startTime: newStartTime });
          return;
        }
        executeTaskMove(taskId, newStartTime, parentBlock.id);
        return;
      }
    }

    executeTaskMove(taskId, newStartTime, destinationBlock?.id || null);
  };

  const handleAssignTaskToBlock = (taskId: string, blockId: string) => {
    const task = tasks.find((candidate) => candidate.id === taskId);
    const block = currentDayBlocks.find((candidate) => candidate.id === blockId);
    if (!task || !block || !task.days.includes(selectedDay)) return;
    const { startMinutes, endMinutes } = getRoutineBlockBounds(block);
    const taskDuration = task.isReminder ? 0 : task.durationMinutes;
    if (taskDuration > endMinutes - startMinutes) {
      showToast(`"${task.title}" is longer than this routine block`);
      return;
    }
    const maxStart = endMinutes - taskDuration;
    const clampedStart = Math.max(startMinutes, Math.min(maxStart, parseTimeToMinutes(task.startTime)));
    const snappedStart = Math.max(
      startMinutes,
      Math.min(maxStart, Math.round(clampedStart / 10) * 10)
    );
    setTasks((previous) =>
      previous.map((candidate) =>
        candidate.id === taskId
          ? { ...candidate, startTime: minutesToTimeString(snappedStart, true), blockId }
          : candidate
      )
    );
    showToast(`Added "${task.title}" to routine block`);
  };

  const handleMoveBlock = (blockId: string, deltaMinutes: number) => {
    if (deltaMinutes === 0) return;
    const block = currentDayBlocks.find((candidate) => candidate.id === blockId);
    if (block) {
      const { startMinutes } = getRoutineBlockBounds(block);
      const maxStart = 1440 - (block.durationMinutes || 60);
      const newBlockStart = Math.max(0, Math.min(maxStart, startMinutes + deltaMinutes));
      const snappedBlockStart = Math.max(0, Math.min(maxStart, Math.round(newBlockStart / 10) * 10));
      setBlocks((previous) =>
        previous.map((candidate) => candidate.id === blockId
          ? { ...candidate, startTime: minutesToTimeString(snappedBlockStart, true) }
          : candidate)
      );
    }
    setTasks((prev) =>
      prev.map((t) => {
        if (t.blockId === blockId && t.days.includes(selectedDay)) {
          const currentM = parseTimeToMinutes(t.startTime);
          const newM = Math.max(0, Math.min(1440 - t.durationMinutes, currentM + deltaMinutes));
          const snappedM = Math.round(newM / 10) * 10;
          return {
            ...t,
            startTime: minutesToTimeString(snappedM, true),
          };
        }
        return t;
      })
    );
    showToast('Shifted routine block');
  };

  const handleDropOutsideBlocks = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task?.blockId) {
      setPendingBlockRemoval({ taskId, startTime: task.startTime });
    }
  };

  const handleWeekSwipe = (direction: -1 | 1, width: number) => {
    if (weekSwipeTimeout.current) clearTimeout(weekSwipeTimeout.current);
    setWeekSwipeAnimating(true);
    setWeekSwipeOffset(direction * (width + 32));
    weekSwipeTimeout.current = setTimeout(() => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + (direction === -1 ? 7 : -7));
      setDateTransitionParts({
        day: currentDate.getDate() !== nextDate.getDate(),
        month: currentDate.getMonth() !== nextDate.getMonth(),
        year: currentDate.getFullYear() !== nextDate.getFullYear(),
      });
      setCurrentDate(nextDate);
      setWeekPageTransition((previous) => ({
        key: previous.key + 1,
        direction,
      }));
      setWeekSwipeOffset(0);
      setWeekSwipeAnimating(false);
      weekSwipeTimeout.current = null;
    }, 240);
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);
          return {
            ...t,
            subtasks: updatedSubtasks,
            completed: allCompleted ? true : t.completed,
          };
        }
        return t;
      })
    );
  };

  const handleSaveTask = (taskData: Omit<Task, 'id'>, existingId?: string) => {
    const finalColor = uniformEnabled ? uniformColor : taskData.color;
    const finalData = { ...taskData, color: finalColor };
    const existingTask = existingId ? tasks.find((task) => task.id === existingId) : undefined;
    const savedTask: Task = {
      ...finalData,
      id: existingId || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      scheduledNotificationId: existingTask?.scheduledNotificationId,
    };

    if (existingId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === existingId ? savedTask : t))
      );
      showToast(`Updated "${finalData.title}"`);
    } else {
      setTasks((prev) => [...prev, savedTask]);
      showToast(`Added "${finalData.title}"`);
    }

    if (settings.notificationsEnabled !== false && settings.notificationApiSecret?.trim()) {
      void (async () => {
        try {
          const scheduledAt = getNextScheduledAt(savedTask);
          const subscriptionId = await getOneSignalSubscriptionId();
          const result = await scheduleTaskNotification(
            savedTask,
            scheduledAt,
            subscriptionId,
            settings.notificationApiSecret || '',
            existingTask?.scheduledNotificationId
          );
          setTasks((prev) =>
            prev.map((task) => task.id === savedTask.id
              ? { ...task, scheduledNotificationId: result.notificationId }
              : task)
          );
          showToast(result.warning || `Reminder scheduled for ${savedTask.startTime}`);
        } catch (error) {
          console.error('Could not schedule task notification', error);
          const message = error instanceof Error ? error.message : 'Unknown notification error.';
          showToast(`Task saved, but notification was not scheduled: ${message}`);
        }
      })();
    }

    const currentTemplates = settings.taskTemplates || [];
    const templateIndex = currentTemplates.findIndex(
      (tt) => tt.title.toLowerCase() === finalData.title.toLowerCase()
    );
    const newTemplate: TaskTemplate = {
      title: finalData.title,
      color: finalData.color,
      icon: finalData.icon,
      durationMinutes: finalData.durationMinutes,
      isReminder: finalData.isReminder,
    };

    let updatedTemplates = [...currentTemplates];
    if (templateIndex >= 0) {
      updatedTemplates[templateIndex] = newTemplate;
    } else {
      updatedTemplates = [newTemplate, ...updatedTemplates];
    }

    setSettings((prev) => ({
      ...prev,
      taskTemplates: updatedTemplates,
      rememberedTasks: Array.from(new Set([finalData.title, ...(prev.rememberedTasks || [])])),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    const deletedTask = tasks.find((task) => task.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('Task deleted');
    if (deletedTask?.scheduledNotificationId) {
      void cancelTaskNotification(
        deletedTask.scheduledNotificationId,
        settings.notificationApiSecret || ''
      ).catch((error: unknown) => {
        console.error('Could not cancel task notification', error);
        const message = error instanceof Error ? error.message : 'Unknown notification error.';
        showToast(`Task deleted, but its notification could not be cancelled: ${message}`);
      });
    }
  };

  const handleCopyTask = (task: Task) => {
    const clonedTask: Task = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `${task.title} (Copy)`,
      completed: false,
      scheduledNotificationId: undefined,
      days: [selectedDay],
      subtasks: task.subtasks.map((st) => ({
        ...st,
        id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        completed: false,
      })),
    };
    setTasks((prev) => [...prev, clonedTask]);
    showToast(`Copied "${task.title}"`);
  };

  const handleSaveBlock = (blockData: Omit<RoutineBlock, 'id'>, existingId?: string) => {
    if (existingId) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === existingId ? { ...b, ...blockData, id: existingId } : b))
      );
      showToast(`Updated block "${blockData.name}"`);
    } else {
      const newBlock: RoutineBlock = {
        ...blockData,
        id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
      setBlocks((prev) => [...prev, newBlock]);
      showToast(`Created block "${blockData.name}"`);
    }

  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setTasks((prev) =>
      prev.map((t) => (t.blockId === blockId ? { ...t, blockId: null } : t))
    );
    showToast('Routine block removed');
  };

  const handleCopyBlock = (block: RoutineBlock) => {
    const res = duplicateBlockSchedule(tasks, blocks, block.id, selectedDay);
    setTasks(res.tasks);
    setBlocks(res.blocks);
    showToast(`Copied block "${block.name}"`);
  };

  const handleCopyWholeDay = (sourceDay: DayOfWeek) => {
    setClipboardDay(sourceDay);
    showToast(`Copied all tasks from ${sourceDay.toUpperCase()}`);
  };

  const handlePasteWholeDay = (targetDay: DayOfWeek) => {
    if (!clipboardDay) return;
    const res = duplicateDaySchedule(tasks, blocks, clipboardDay, targetDay);
    setTasks(res.tasks);
    setBlocks(res.blocks);
    showToast(`Pasted schedule to ${targetDay.toUpperCase()}`);
  };

  const handleQuickAddGap = (startTime: string, duration: number) => {
    setEditingTask(null);
    setModalInitialTemplate(null);
    setModalInitialTime(startTime);
    setModalInitialDuration(duration);
    setIsTaskModalOpen(true);
  };

  const handleResetDefaultSchedule = () => {
    tasks.forEach((task) => {
      if (!task.scheduledNotificationId) return;
      void cancelTaskNotification(
        task.scheduledNotificationId,
        settings.notificationApiSecret || ''
      ).catch((error: unknown) => {
        console.error('Could not cancel task notification while clearing the schedule', error);
        showToast(`Could not cancel the scheduled notification for "${task.title}".`);
      });
    });
    setTasks([]);
    setBlocks([]);
    showToast('Schedule cleared');
  };

  const renderTimeline = () => {
    if (timelineItems.length === 0 && currentDayBlocks.length === 0) {
      return (
        <div className="py-12 px-6 text-center select-none">
          <div className="w-12 h-12 mx-auto mb-2.5 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
            No activities scheduled for {DAYS_OF_WEEK.find((d) => d.key === selectedDay)?.label}
          </h3>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setIsTaskPickerOpen(true)}
              className="text-xs bg-blue-600 text-white font-medium px-3 py-1.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors"
            >
              Add Activity
            </button>
            {clipboardDay && (
              <button
                onClick={() => handlePasteWholeDay(selectedDay)}
                className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3 h-3" />
                <span>Paste from {clipboardDay.toUpperCase()}</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    type RenderableTimelineItem = Extract<(typeof timelineItems)[number], { type: 'gap' | 'task' }>;
    type TimelineRenderEvent =
      | { time: number; kind: 'timeline'; item: RenderableTimelineItem }
      | { time: number; kind: 'block'; block: RoutineBlock; blockTasks: Task[] };

    const blockEvents: TimelineRenderEvent[] = currentDayBlocks.map((block) => {
      const blockTasks = sortTasksByTime(currentDayTasks.filter((task) => task.blockId === block.id));
      const startTime = block.startTime || blockTasks[0]?.startTime || '09:00';
      return {
        time: parseTimeToMinutes(startTime),
        kind: 'block',
        block,
        blockTasks,
      };
    });
    const timelineEvents: TimelineRenderEvent[] = timelineItems.flatMap((item) => {
      if (item.type === 'clash_warning') return [];
      return [{
        time: parseTimeToMinutes(item.type === 'gap' ? item.startTime : item.task.startTime),
        kind: 'timeline' as const,
        item,
      }];
    });
    const events = [...timelineEvents, ...blockEvents].sort((a, b) =>
      a.time - b.time || (a.kind === b.kind ? 0 : a.kind === 'block' ? -1 : 1)
    );
    const renderedElements: React.ReactNode[] = [];
    let lastColor: string | undefined = undefined;
    let lastTaskEndM: number | null = null;

    events.forEach((event, index) => {
      if (event.kind === 'block') {
        const { block, blockTasks } = event;
        const blockStartM = parseTimeToMinutes(block.startTime || blockTasks[0]?.startTime || '09:00');
        const blockEndM = blockStartM + (block.durationMinutes || 60);
        renderedElements.push(
          <RoutineBlockContainer
            key={`block-container-${block.id}`}
            block={block}
            tasks={blockTasks}
            use24Hour={settings.use24Hour}
            accentColor={accentColor}
            onMoveBlock={handleMoveBlock}
            onCopyBlock={handleCopyBlock}
            onEditBlock={(targetBlock) => {
              setEditingBlock(targetBlock);
              setIsBlockModalOpen(true);
            }}
            onDeleteBlock={handleDeleteBlock}
            onAssignTaskToBlock={handleAssignTaskToBlock}
          >
            {blockTasks.map((task, taskIndex) => {
              const previousTask = blockTasks[taskIndex - 1];
              const taskStartM = parseTimeToMinutes(task.startTime);
              const taskEndM = taskStartM + (task.isReminder ? 0 : task.durationMinutes);
              const isOverlappingPrev = previousTask
                ? taskStartM < parseTimeToMinutes(previousTask.startTime) + previousTask.durationMinutes
                : taskStartM < blockStartM;
              return (
                <TimelineTask
                  key={task.id}
                  task={task}
                  currentTimeMinutes={effectiveCurrentTimeMinutes}
                  realTimeMinutes={realTimeMinutes}
                  use24Hour={settings.use24Hour}
                  isFirst={taskIndex === 0}
                  isLast={taskIndex === blockTasks.length - 1}
                  isOverlappingPrev={isOverlappingPrev}
                  prevTaskColor={previousTask?.color || block.color}
                  accentColor={accentColor}
                  onToggleComplete={handleToggleComplete}
                  onToggleSubtask={handleToggleSubtask}
                  onEditTask={(taskToEdit) => {
                    setEditingTask(taskToEdit);
                    setModalInitialTemplate(null);
                    setIsTaskModalOpen(true);
                  }}
                  onDeleteTask={handleDeleteTask}
                  onCopyTask={handleCopyTask}
                  onOpenFocus={(taskToFocus) => setFocusTask(taskToFocus)}
                  onUpdateTaskTime={handleUpdateTaskTime}
                />
              );
            })}
          </RoutineBlockContainer>
        );
        lastColor = blockTasks[blockTasks.length - 1]?.color || block.color;
        lastTaskEndM = blockTasks.length > 0
          ? Math.max(blockEndM, ...blockTasks.map((task) =>
            parseTimeToMinutes(task.startTime) + (task.isReminder ? 0 : task.durationMinutes)
          ))
          : blockEndM;
        return;
      }

      const item = event.item;
      if (item.type === 'gap') {
        const isPastGap = parseTimeToMinutes(item.endTime) <= effectiveCurrentTimeMinutes;
        renderedElements.push(
          <UnallocatedGap
            key={item.id}
            startTime={item.startTime}
            endTime={item.endTime}
            durationMinutes={item.durationMinutes}
            realTimeMinutes={realTimeMinutes}
            prevTaskColor={lastColor}
            isPast={isPastGap}
            onQuickAdd={handleQuickAddGap}
          />
        );
        lastTaskEndM = parseTimeToMinutes(item.endTime);
      } else if (item.type === 'task') {
        const task = item.task;
        const hasVisibleBlock = currentDayBlocks.some((block) => block.id === task.blockId);
        if (!hasVisibleBlock) {
          const prevColor = lastColor;
          lastColor = task.color;
          const taskStartM = parseTimeToMinutes(task.startTime);
          const isOverlappingPrev = lastTaskEndM !== null && taskStartM < lastTaskEndM;
          lastTaskEndM = taskStartM + (task.isReminder ? 0 : task.durationMinutes);
          renderedElements.push(
            <TimelineTask
              key={task.id}
              task={task}
              currentTimeMinutes={effectiveCurrentTimeMinutes}
              realTimeMinutes={realTimeMinutes}
              use24Hour={settings.use24Hour}
              isFirst={index === 0}
              isLast={index === timelineItems.length - 1}
              isOverlappingPrev={isOverlappingPrev}
              prevTaskColor={prevColor}
              accentColor={accentColor}
              onToggleComplete={handleToggleComplete}
              onToggleSubtask={handleToggleSubtask}
              onEditTask={(taskToEdit) => {
                setEditingTask(taskToEdit);
                setModalInitialTemplate(null);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onCopyTask={handleCopyTask}
              onOpenFocus={(taskToFocus) => setFocusTask(taskToFocus)}
              onUpdateTaskTime={handleUpdateTaskTime}
            />
          );
        }
      }
    });

    return renderedElements;
  };

  return (
    <div className="h-dvh overscroll-none bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-start sm:py-6 selection:bg-blue-500 selection:text-white">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={handleDropOutsideBlocks}
        className="w-full max-w-lg h-full overscroll-none bg-white dark:bg-zinc-950 sm:rounded-[36px] shadow-2xl relative flex flex-col overflow-hidden sm:ring-1 sm:ring-black/10 dark:sm:ring-white/10"
      >
        <div className="hidden sm:flex justify-center pt-3 pb-1 select-none">
          <div className="w-28 h-4 bg-black dark:bg-zinc-800 rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-950 ml-auto mr-3 ring-1 ring-zinc-700/50" />
          </div>
        </div>

        <Header
          currentDay={selectedDay}
          currentDate={currentDate}
          weekSwipeOffset={weekSwipeOffset}
          weekSwipeAnimating={weekSwipeAnimating}
          dateTransitionKey={weekPageTransition.key}
          dateTransitionParts={dateTransitionParts}
          onSelectDay={(day) => setSelectedDay(day)}
          onWeekSwipeOffset={setWeekSwipeOffset}
          onWeekSwipe={handleWeekSwipe}
          onSelectDate={(newDate) => {
            setCurrentDate(newDate);
            const jsDay = newDate.getDay();
            const dayKeyMap: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            setSelectedDay(dayKeyMap[jsDay]);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCalendar={() => setIsCalendarOpen(true)}
          onCopyWholeDay={handleCopyWholeDay}
          onPasteWholeDay={handlePasteWholeDay}
          hasClipboard={clipboardDay !== null}
          clipboardSourceDay={clipboardDay}
          accentColor={accentColor}
          simulatedTimeText={
            settings.simulatedTimeEnabled
              ? `Sim: ${minutesToTimeString(settings.simulatedTimeMinutes, true)}`
              : null
          }
        />

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1 py-3 pb-32 overscroll-none">
          <div
            key={weekPageTransition.key}
            className={weekPageTransition.key > 0 ? 'timeline-page-enter' : ''}
            style={
              weekPageTransition.key > 0
                ? { '--timeline-enter-offset': weekPageTransition.direction === -1 ? '100%' : '-100%' } as React.CSSProperties
                : undefined
            }
          >
            {renderTimeline()}

            <div className="mt-6 mb-8 px-4 flex flex-col items-center select-none">
              <div className="w-full h-[1px] bg-slate-200 dark:bg-zinc-800 my-4" />
            </div>
          </div>
        </main>

        <div
          className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-lg -translate-x-1/2 flex-col items-center gap-1 bg-gradient-to-t from-white via-white/95 to-transparent pt-3 dark:from-zinc-950 dark:via-zinc-950/95 pointer-events-none"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
        >
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => setIsBlockPickerOpen(true)}
              aria-label="Add routine block"
              style={{ backgroundColor: accentColor }}
              className="h-13 w-13 rounded-full text-white shadow-lg shadow-black/20 flex items-center justify-center active:scale-90 transition-all cursor-pointer hover:brightness-110"
              title="Add Routine Block"
            >
              <Folder className="w-5 h-5 stroke-[2.5]" />
            </button>

            <button
              onClick={() => {
                setEditingTask(null);
                setModalInitialTemplate(null);
                setModalInitialTime('09:00');
                setModalInitialDuration(30);
                setIsTaskPickerOpen(true);
              }}
              aria-label="Add task"
              style={{ backgroundColor: accentColor }}
              className="h-13 w-13 rounded-full text-white shadow-xl shadow-black/10 flex items-center justify-center active:scale-90 transition-all cursor-pointer hover:brightness-110"
              title="Add Task"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>
          <div className="text-center select-none">
            <span className="app-signature-title text-[11px] font-bold text-slate-500 dark:text-zinc-400 tracking-wider lowercase">structura app</span>
            <span className="app-signature-author mx-1 text-[9px] text-slate-400 dark:text-zinc-500 font-mono">by kwendig0</span>
          </div>
        </div>

        {toastMessage && (
          <div className="fixed sm:absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 text-white text-xs font-medium px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      <TaskPickerModal
        isOpen={isTaskPickerOpen}
        onClose={() => setIsTaskPickerOpen(false)}
        onSelectTaskTemplate={(template) => {
          setIsTaskPickerOpen(false);
          setEditingTask(null);
          setModalInitialTemplate(template);
          setModalInitialTime('09:00');
          setIsTaskModalOpen(true);
        }}
        taskTemplates={settings.taskTemplates || []}
        existingTasks={tasks}
        currentDay={selectedDay}
        accentColor={accentColor}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSaveTask={handleSaveTask}
        editingTask={editingTask}
        currentDay={selectedDay}
        taskTemplates={settings.taskTemplates || []}
        quickDurations={settings.quickDurations}
        initialTemplate={modalInitialTemplate}
        initialStartTime={modalInitialTime}
        initialDuration={modalInitialDuration}
        accentColor={accentColor}
        uniformTaskColorEnabled={uniformEnabled}
        uniformTaskColor={uniformColor}
        savedCustomHexes={settings.savedCustomHexes || []}
        onSaveCustomHex={(hex) => {
          const currentHexes = settings.savedCustomHexes || [];
          if (!currentHexes.includes(hex)) {
            setSettings((prev) => ({
              ...prev,
              savedCustomHexes: [...currentHexes, hex],
            }));
            showToast(`Saved custom hex ${hex}`);
          }
        }}
        onDeleteCustomHex={(hex) => {
          const currentHexes = settings.savedCustomHexes || [];
          setSettings((prev) => ({
            ...prev,
            savedCustomHexes: currentHexes.filter((h) => h !== hex),
          }));
          showToast(`Deleted custom hex ${hex}`);
        }}
        onOpenFocus={(t) => setFocusTask(t)}
      />

      <BlockPickerModal
        isOpen={isBlockPickerOpen}
        onClose={() => setIsBlockPickerOpen(false)}
        blocks={currentDayBlocks}
        accentColor={accentColor}
        tasks={currentDayTasks}
        currentDay={selectedDay}
        onSelectExistingBlock={(blk) => {
          setEditingBlock(blk);
          setIsBlockModalOpen(true);
        }}
        onCreateNewBlock={() => {
          setEditingBlock(null);
          setIsBlockModalOpen(true);
        }}
      />

      <RoutineBlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSaveBlock={handleSaveBlock}
        editingBlock={editingBlock}
        currentDay={selectedDay}
        allTasks={tasks}
        accentColor={accentColor}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        cloudSyncStatus={cloudSyncStatus}
        cloudSyncError={cloudSyncError}
        onUpdateSettings={(newSettings) => {
          if (settings.notificationsEnabled !== false && newSettings.notificationsEnabled === false) {
            const scheduledTasks = tasks.filter((task) => task.scheduledNotificationId);
            scheduledTasks.forEach((task) => {
              const notificationId = task.scheduledNotificationId;
              if (!notificationId) return;
              void cancelTaskNotification(notificationId, settings.notificationApiSecret || '')
                .then(() => {
                  setTasks((prev) => prev.map((currentTask) => (
                    currentTask.id === task.id && currentTask.scheduledNotificationId === notificationId
                      ? { ...currentTask, scheduledNotificationId: undefined }
                      : currentTask
                  )));
                })
                .catch((error: unknown) => {
                  console.error('Could not cancel task notification after disabling reminders', error);
                  showToast(`Could not cancel the scheduled notification for "${task.title}".`);
                });
            });
          }
          setSettings(newSettings);
        }}
        onResetDefaultSchedule={handleResetDefaultSchedule}
      />

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={currentDate}
        onSelectDate={(newDate) => {
          setCurrentDate(newDate);
          const jsDay = newDate.getDay();
          const dayKeyMap: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          setSelectedDay(dayKeyMap[jsDay]);
        }}
        tasks={tasks}
        accentColor={accentColor}
      />

      <FocusModeModal
        isOpen={focusTask !== null}
        onClose={() => setFocusTask(null)}
        task={focusTask}
        currentTimeMinutes={effectiveCurrentTimeMinutes}
        accentColor={accentColor}
        onToggleComplete={handleToggleComplete}
        onToggleSubtask={handleToggleSubtask}
      />

      {pendingBlockRemoval && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-task-from-block-title"
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900"
          >
            <h2 id="remove-task-from-block-title" className="text-base font-bold text-slate-900 dark:text-white">
              Remove task from routine block?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">
              Are you sure you want to remove this task from your routine block?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingBlockRemoval(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  executeTaskMove(pendingBlockRemoval.taskId, pendingBlockRemoval.startTime, null);
                  setPendingBlockRemoval(null);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Remove task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
