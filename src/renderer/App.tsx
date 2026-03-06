import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Entry, Task, Project, Tag, Holiday, TaskTemplate, TaskTemplateDef, ViewType, BacklinkEntry } from './types';
import type { Command } from './components/CommandPalette';
import { formatDate, generateStandupMessage } from './utils';
import Sidebar from './components/Sidebar';
import DailyLog from './components/DailyLog';
import TaskList from './components/TaskList';
import TomorrowPlan from './components/TomorrowPlan';
import GuidedTour from './components/GuidedTour';
import CalendarPicker from './components/CalendarPicker';
import ErrorBoundary from './components/ErrorBoundary';
import KanbanBoard from './components/KanbanBoard';
import StatsDashboard from './components/StatsDashboard';
import EntryTags from './components/EntryTags';
import TaskTemplates from './components/TaskTemplates';
import BacklinksPanel from './components/BacklinksPanel';
import BlockersEditor from './components/BlockersEditor';
import YesterdayPlan from './components/YesterdayPlan';
import CommandPalette from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function HeaderTimer({ task }: { task: { time_spent: number; timer_started_at: string | null } }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!task.timer_started_at) { setElapsed(0); return; }
    const update = () => {
      const started = new Date(task.timer_started_at!).getTime();
      setElapsed(Math.floor((Date.now() - started) / 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [task.timer_started_at]);
  const total = (task.time_spent || 0) + elapsed;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const display = h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, '0')}`;
  return <span className="text-xs font-mono text-green-600 font-semibold">{display}</span>;
}

function displayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [entry, setEntry] = useState<Entry | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logContent, setLogContent] = useState('');
  const [tomorrowsPlan, setTomorrowsPlan] = useState('');
  const [blockers, setBlockers] = useState('');
  const [entryDates, setEntryDates] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  // Track which date has unsaved content so we save to the correct date on navigation
  const pendingSaveRef = useRef<{ date: string; logContent: string; tomorrowsPlan: string; blockers: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [carryOverAvailable, setCarryOverAvailable] = useState<Task[]>([]);
  const [showTour, setShowTour] = useState(false);

  // New state for features
  const [currentView, setCurrentView] = useState<ViewType>('diary');
  const [tags, setTags] = useState<Tag[]>([]);
  const [entryTags, setEntryTags] = useState<Tag[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [backlinks, setBacklinks] = useState<BacklinkEntry[]>([]);
  const [workloadData, setWorkloadData] = useState<Map<string, { taskCount: number; completedCount: number; totalTime: number }>>(new Map());
  const [standupCopied, setStandupCopied] = useState(false);
  const [yesterdayPlan, setYesterdayPlan] = useState<{ date: string; plan: string } | null>(null);
  const [convertedPlanItems, setConvertedPlanItems] = useState<string[]>([]);

  // Load projects and tags once
  useEffect(() => {
    window.api.getProjects().then(setProjects).catch(console.error);
    window.api.getTags().then(setTags).catch(console.error);
    window.api.getTaskTemplates().then(setTaskTemplates).catch(console.error);
  }, []);

  // Check if guided tour should be shown (first launch)
  useEffect(() => {
    window.api.getSetting('onboarding_complete').then((val) => {
      if (val === 'pending_tour') setShowTour(true);
    }).catch(console.error);
  }, []);

  // Load holidays for current month view
  useEffect(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const year = d.getFullYear();
    const month = d.getMonth();
    const startDate = formatDate(new Date(year, month - 1, 1));
    const endDate = formatDate(new Date(year, month + 2, 0));
    window.api.getHolidaysInRange({ startDate, endDate }).then(setHolidays).catch(console.error);
    window.api.getWorkloadPerDate({ startDate, endDate }).then((data) => {
      const map = new Map<string, { taskCount: number; completedCount: number; totalTime: number }>();
      for (const row of data) {
        map.set(row.date, { taskCount: row.task_count, completedCount: row.completed_count, totalTime: row.total_time });
      }
      setWorkloadData(map);
    }).catch(console.error);
  }, [selectedDate]);

  // Load entry, tasks, and entry tags when date changes
  const loadData = useCallback(async (date: string) => {
    // Flush any pending save to the PREVIOUS date before loading new data
    const pending = pendingSaveRef.current;
    if (pending && pending.date !== date) {
      await window.api.saveEntry({
        date: pending.date,
        logContent: pending.logContent,
        tomorrowsPlan: pending.tomorrowsPlan,
        blockers: pending.blockers,
      });
      pendingSaveRef.current = null;
      setSaveStatus('saved');
    }
    try {
      const [entryData, tasksData, tagsData, backlinksData] = await Promise.all([
        window.api.getEntry(date),
        window.api.getTasks(date),
        window.api.getTagsForEntry(date),
        window.api.getEntriesMentioningDate(date),
      ]);
      setEntry(entryData);
      setTasks(tasksData);
      setEntryTags(tagsData);
      setBacklinks(backlinksData);
      setLogContent(entryData?.log_content ?? '');
      setTomorrowsPlan(entryData?.tomorrows_plan ?? '');
      setBlockers(entryData?.blockers ?? '');
      try {
        setConvertedPlanItems(JSON.parse(entryData?.converted_plan_items || '[]'));
      } catch {
        setConvertedPlanItems([]);
      }
      setSaveStatus('saved');

      // Fetch previous working day data (plan + carry-over)  - only for today
      const today = formatDate(new Date());
      const prevDate = await window.api.getPreviousWorkingDay(date);
      if (date === today) {
        const prevEntry = await window.api.getEntry(prevDate);
        if (prevEntry?.tomorrows_plan) {
          setYesterdayPlan({ date: prevDate, plan: prevEntry.tomorrows_plan });
        } else {
          setYesterdayPlan(null);
        }
      } else {
        setYesterdayPlan(null);
      }

      // Check if there are incomplete tasks from the previous working day to carry over
      if (tasksData.length === 0) {
        const incomplete = await window.api.getIncompleteTasks(prevDate);
        setCarryOverAvailable(incomplete);

        // Auto-apply recurring templates on new days with no tasks
        const recurring = await window.api.applyRecurringTemplates(date);
        if (recurring.length > 0) {
          setTasks(recurring);
          setCarryOverAvailable([]);
        }
      } else {
        setCarryOverAvailable([]);
      }
    } catch (err) {
      console.error('Failed to load data for', date, err);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  // Load entry dates for sidebar
  useEffect(() => {
    window.api.getEntryDates().then(setEntryDates).catch(console.error);
  }, [entry]);

  // Auto-save with debounce. Uses pendingSaveRef to always save to the correct date.
  useEffect(() => {
    if (saveStatus !== 'unsaved') return;
    const timer = setTimeout(async () => {
      const pending = pendingSaveRef.current;
      if (!pending) return;
      setSaveStatus('saving');
      const saved = await window.api.saveEntry({
        date: pending.date,
        logContent: pending.logContent,
        tomorrowsPlan: pending.tomorrowsPlan,
        blockers: pending.blockers,
      });
      pendingSaveRef.current = null;
      // Only update entry state if we're still on the same date
      if (pending.date === selectedDate) {
        setEntry(saved);
      }
      setSaveStatus('saved');
    }, 800);
    return () => clearTimeout(timer);
  }, [logContent, tomorrowsPlan, blockers, saveStatus, selectedDate]);

  const forceSave = useCallback(async () => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    setSaveStatus('saving');
    const saved = await window.api.saveEntry({
      date: pending.date,
      logContent: pending.logContent,
      tomorrowsPlan: pending.tomorrowsPlan,
      blockers: pending.blockers,
    });
    pendingSaveRef.current = null;
    if (pending.date === selectedDate) {
      setEntry(saved);
    }
    setSaveStatus('saved');
  }, [selectedDate]);

  const handleLogChange = (value: string) => {
    setLogContent(value);
    setSaveStatus('unsaved');
    pendingSaveRef.current = { date: selectedDate, logContent: value, tomorrowsPlan, blockers };
  };

  const handlePlanChange = (value: string) => {
    setTomorrowsPlan(value);
    setSaveStatus('unsaved');
    pendingSaveRef.current = { date: selectedDate, logContent, tomorrowsPlan: value, blockers };
  };

  const handleBlockersChange = (value: string) => {
    setBlockers(value);
    setSaveStatus('unsaved');
    pendingSaveRef.current = { date: selectedDate, logContent, tomorrowsPlan, blockers: value };
  };

  const navigateDay = useCallback((offset: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + offset);
      return formatDate(d);
    });
  }, []);

  const goToToday = useCallback(() => setSelectedDate(formatDate(new Date())), []);

  // Keyboard shortcuts
  const shortcutHandlers = useMemo(() => ({
    onSave: () => forceSave(),
    onNavigateDay: (offset: number) => navigateDay(offset),
    onNewTask: () => {
      // Focus the new task input
      const input = document.querySelector<HTMLInputElement>('[data-tour="task-list"] input[placeholder="Add a task..."]');
      if (input) input.focus();
    },
    onToggleCommandPalette: () => setShowCommandPalette((prev) => !prev),
    onFocusSection: (section: 'log' | 'tasks' | 'plan') => {
      const targets: Record<string, string> = { log: 'daily-log', tasks: 'task-list', plan: 'tomorrow-plan' };
      const el = document.querySelector(`[data-tour="${targets[section]}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = el.querySelector<HTMLElement>('.tiptap, input, textarea');
        if (focusable) focusable.focus();
      }
    },
  }), [forceSave, navigateDay]);

  useKeyboardShortcuts(shortcutHandlers);

  // Standup generator (must be declared before handleCommand which references it)
  const handleGenerateStandup = useCallback(async () => {
    const prevDate = await window.api.getPreviousWorkingDay(selectedDate);
    const [prevEntry, prevTasks, todayTasks, todayEntry] = await Promise.all([
      window.api.getEntry(prevDate),
      window.api.getTasks(prevDate),
      window.api.getTasks(selectedDate),
      window.api.getEntry(selectedDate),
    ]);
    const msg = generateStandupMessage({
      prevEntry,
      prevTasks,
      todayTasks,
      todayBlockers: todayEntry?.blockers ?? '',
      prevDate,
      todayDate: selectedDate,
    });
    await navigator.clipboard.writeText(msg);
    setStandupCopied(true);
    setTimeout(() => setStandupCopied(false), 2000);
  }, [selectedDate]);

  // Command palette commands
  const commands: Command[] = useMemo(() => [
    { id: 'go-today', label: 'Go to Today', shortcut: 'Alt+T', category: 'Navigation' },
    { id: 'prev-day', label: 'Previous Day', shortcut: 'Alt+←', category: 'Navigation' },
    { id: 'next-day', label: 'Next Day', shortcut: 'Alt+→', category: 'Navigation' },
    { id: 'view-diary', label: 'Switch to Diary View', category: 'Views' },
    { id: 'view-kanban', label: 'Switch to Kanban Board', category: 'Views' },
    { id: 'view-stats', label: 'Switch to Statistics', category: 'Views' },
    { id: 'focus-log', label: 'Focus Daily Log', shortcut: 'Alt+1', category: 'Focus' },
    { id: 'focus-tasks', label: 'Focus Task List', shortcut: 'Alt+2', category: 'Focus' },
    { id: 'focus-plan', label: "Focus Tomorrow's Plan", shortcut: 'Alt+3', category: 'Focus' },
    { id: 'new-task', label: 'New Task', shortcut: 'Alt+T', category: 'Actions' },
    { id: 'save', label: 'Save Entry', shortcut: 'Alt+S', category: 'Actions' },
    { id: 'export-md', label: 'Export as Markdown', category: 'Export' },
    { id: 'export-pdf', label: 'Export as PDF', category: 'Export' },
    { id: 'generate-standup', label: 'Generate Standup Message', category: 'Actions' },
  ], []);

  const handleCommand = useCallback((commandId: string) => {
    setShowCommandPalette(false);
    switch (commandId) {
      case 'go-today': goToToday(); break;
      case 'prev-day': navigateDay(-1); break;
      case 'next-day': navigateDay(1); break;
      case 'view-diary': setCurrentView('diary'); break;
      case 'view-kanban': setCurrentView('kanban'); break;
      case 'view-stats': setCurrentView('stats'); break;
      case 'focus-log': shortcutHandlers.onFocusSection('log'); break;
      case 'focus-tasks': shortcutHandlers.onFocusSection('tasks'); break;
      case 'focus-plan': shortcutHandlers.onFocusSection('plan'); break;
      case 'new-task': shortcutHandlers.onNewTask(); break;
      case 'save': forceSave(); break;
      case 'export-md':
        window.api.exportMarkdown({ date: selectedDate, content: logContent });
        break;
      case 'export-pdf':
        window.api.exportPDF({ date: selectedDate });
        break;
      case 'generate-standup':
        handleGenerateStandup();
        break;
    }
  }, [goToToday, navigateDay, shortcutHandlers, forceSave, selectedDate, logContent, handleGenerateStandup]);

  // Task handlers
  const handleAddTask = async (text: string, projectId?: number) => {
    const task = await window.api.addTask({ date: selectedDate, text, projectId });
    setTasks((prev) => [...prev, task]);
    setCarryOverAvailable([]);
  };

  const handleToggleTask = async (id: number) => {
    // Timer is auto-stopped in the database layer when completing
    const updated = await window.api.toggleTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleDeleteTask = async (id: number) => {
    await window.api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTaskText = async (id: number, text: string) => {
    const updated = await window.api.updateTaskText({ id, text });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleUpdateTaskProject = async (id: number, projectId: number | null) => {
    const updated = await window.api.updateTaskProject({ id, projectId });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleReorderTasks = async (taskOrders: { id: number; position: number }[]) => {
    await window.api.reorderTasks(taskOrders);
    // Optimistically reorder locally
    setTasks((prev) => {
      const ordered = [...prev];
      for (const { id, position } of taskOrders) {
        const task = ordered.find((t) => t.id === id);
        if (task) task.position = position;
      }
      return ordered.sort((a, b) => a.position - b.position);
    });
  };

  const handleUpdateTaskStatus = async (id: number, status: string) => {
    const updated = await window.api.updateTaskStatus({ id, status });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  // Time tracking handlers
  const handleStartTimer = async (id: number) => {
    const running = tasks.filter((t) => t.timer_started_at && t.id !== id);
    const stopUpdates: Task[] = [];
    for (const t of running) {
      const stopped = await window.api.stopTimer(t.id);
      stopUpdates.push(stopped);
    }
    const updated = await window.api.startTimer(id);
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) return updated;
        const stopped = stopUpdates.find((s) => s.id === t.id);
        return stopped ?? t;
      })
    );
  };

  const handleStopTimer = async (id: number) => {
    const updated = await window.api.stopTimer(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const activeTimerTask = tasks.find((t) => t.timer_started_at);

  const handleSetManualTime = async (id: number, seconds: number) => {
    const updated = await window.api.setManualTime({ id, seconds });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  // Project handlers
  const handleAddProject = async (name: string, color: string) => {
    const project = await window.api.addProject({ name, color });
    setProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleUpdateProject = async (id: number, name: string, color: string) => {
    const updated = await window.api.updateProject({ id, name, color });
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    const tasksData = await window.api.getTasks(selectedDate);
    setTasks(tasksData);
  };

  const handleDeleteProject = async (id: number) => {
    await window.api.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    const tasksData = await window.api.getTasks(selectedDate);
    setTasks(tasksData);
  };

  // Tag handlers
  const handleAddTag = async (name: string, color: string) => {
    const tag = await window.api.addTag({ name, color });
    setTags((prev) => [...prev, tag]);
  };

  const handleUpdateTag = async (id: number, name: string, color: string) => {
    const updated = await window.api.updateTag({ id, name, color });
    setTags((prev) => prev.map((t) => (t.id === id ? updated : t)));
    // Refresh entry tags in case the name/color changed
    const et = await window.api.getTagsForEntry(selectedDate);
    setEntryTags(et);
  };

  const handleDeleteTag = async (id: number) => {
    await window.api.deleteTag(id);
    setTags((prev) => prev.filter((t) => t.id !== id));
    setEntryTags((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTagToEntry = async (tagId: number) => {
    await window.api.addTagToEntry({ date: selectedDate, tagId });
    const et = await window.api.getTagsForEntry(selectedDate);
    setEntryTags(et);
  };

  const handleRemoveTagFromEntry = async (tagId: number) => {
    await window.api.removeTagFromEntry({ date: selectedDate, tagId });
    setEntryTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  // Holiday handlers
  const handleSetHoliday = async (date: string, label: string) => {
    const holiday = await window.api.setHoliday({ date, label });
    setHolidays((prev) => {
      const filtered = prev.filter((h) => h.date !== date);
      return [...filtered, holiday];
    });
  };

  const handleRemoveHoliday = async (date: string) => {
    await window.api.removeHoliday(date);
    setHolidays((prev) => prev.filter((h) => h.date !== date));
  };

  // Template handlers
  const handleApplyTemplate = async (templateId: number) => {
    const newTasks = await window.api.applyTemplate({ templateId, date: selectedDate });
    setTasks((prev) => [...prev, ...newTasks]);
  };

  const handleSaveTemplate = async (name: string, taskDefs: TaskTemplateDef[], recurring: boolean) => {
    const template = await window.api.addTaskTemplate({ name, tasks: taskDefs, recurring });
    setTaskTemplates((prev) => [...prev, template]);
  };

  const handleDeleteTemplate = async (id: number) => {
    await window.api.deleteTaskTemplate(id);
    setTaskTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTemplate = async (id: number, name: string, taskDefs: TaskTemplateDef[], recurring: boolean) => {
    const updated = await window.api.updateTaskTemplate({ id, name, tasks: taskDefs, recurring });
    setTaskTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  // Carry-over handler
  const handleCarryOver = async () => {
    const prevDate = await window.api.getPreviousWorkingDay(selectedDate);
    const carried = await window.api.carryOverTasks({ fromDate: prevDate, toDate: selectedDate });
    setTasks((prev) => [...prev, ...carried]);
    setCarryOverAvailable([]);
  };

  // Backlink navigation
  const handleNavigateToDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  // Menu-triggered export
  useEffect(() => {
    const cleanup = window.api.onMenuExport(async (format: 'json' | 'csv') => {
      await window.api.exportData(format);
    });
    return cleanup;
  }, []);

  // Menu-triggered import complete  - reload everything
  useEffect(() => {
    const cleanup = window.api.onMenuImportComplete(async (result: { success: boolean; error?: string }) => {
      if (result.success) {
        await loadData(selectedDate);
        window.api.getEntryDates().then(setEntryDates);
        window.api.getProjects().then(setProjects);
        window.api.getTags().then(setTags);
        window.api.getTaskTemplates().then(setTaskTemplates);
      } else {
        alert('Import failed: ' + (result.error || 'Unknown error'));
      }
    });
    return cleanup;
  }, [selectedDate, loadData]);

  // Reset handler
  const handleDataReset = useCallback(() => {
    setEntry(null);
    setTasks([]);
    setLogContent('');
    setTomorrowsPlan('');
    setBlockers('');
    setConvertedPlanItems([]);
    setEntryDates([]);
    setProjects([]);
    setTags([]);
    setEntryTags([]);
    setHolidays([]);
    setTaskTemplates([]);
    setBacklinks([]);
    setCarryOverAvailable([]);
    setSaveStatus('saved');
    setCurrentView('diary');
    setSelectedDate(formatDate(new Date()));
  }, []);

  const handleDeleteEntry = useCallback(async (date: string) => {
    await window.api.deleteEntry(date);
    // If we deleted the currently viewed date, navigate to today
    if (date === selectedDate) {
      const today = formatDate(new Date());
      setSelectedDate(today);
    }
    // Refresh entry dates list
    const dates = await window.api.getEntryDates();
    setEntryDates(dates);
    // Reload current view data
    loadData(date === selectedDate ? formatDate(new Date()) : selectedDate);
  }, [selectedDate, loadData]);

  const handleTourComplete = useCallback(async () => {
    setShowTour(false);
    await window.api.setSetting({ key: 'onboarding_complete', value: 'true' });
  }, []);

  const isToday = selectedDate === formatDate(new Date());

  // Current tasks as template defs for "Save as Template"
  const currentTaskDefs = tasks.map((t) => ({ text: t.text, projectId: t.project_id ?? undefined }));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <ErrorBoundary fallbackTitle="Sidebar Error">
        <Sidebar
          selectedDate={selectedDate}
          entryDates={entryDates}
          onSelectDate={setSelectedDate}
          projects={projects}
          onAddProject={handleAddProject}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onDataReset={handleDataReset}
          tags={tags}
          onAddTag={handleAddTag}
          onUpdateTag={handleUpdateTag}
          onDeleteTag={handleDeleteTag}
          currentView={currentView}
          onChangeView={setCurrentView}
          onDeleteEntry={handleDeleteEntry}
        />
      </ErrorBoundary>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - shown for diary view */}
        {currentView === 'diary' && (
          <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-3" data-tour="date-nav">
              <button
                onClick={() => navigateDay(-1)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-iqz-navy/40 dark:text-gray-500 hover:text-iqz-navy dark:hover:text-gray-200"
                title="Previous day (Alt+←)"
              >
                &#8592;
              </button>
              <h1 className="text-lg font-semibold text-iqz-navy dark:text-white">{displayDate(selectedDate)}</h1>
              <button
                onClick={() => navigateDay(1)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-iqz-navy/40 dark:text-gray-500 hover:text-iqz-navy dark:hover:text-gray-200"
                title="Next day (Alt+→)"
              >
                &#8594;
              </button>
              <CalendarPicker
                selectedDate={selectedDate}
                entryDates={entryDates}
                onSelectDate={setSelectedDate}
                holidays={holidays}
                onSetHoliday={handleSetHoliday}
                onRemoveHoliday={handleRemoveHoliday}
                workloadData={workloadData}
              />
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="ml-2 text-xs px-2.5 py-1 rounded-full bg-iqz-blue/10 dark:bg-iqz-blue/20 text-iqz-blue hover:bg-iqz-blue/20 dark:hover:bg-iqz-blue/30 font-medium"
                >
                  Today
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={handleGenerateStandup}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-400 hover:text-iqz-navy dark:text-gray-500 dark:hover:text-gray-200 transition-colors"
                  title="Generate standup & copy to clipboard"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                {standupCopied && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-green-600 text-white px-2 py-0.5 rounded shadow-lg z-50">
                    Standup copied!
                  </div>
                )}
              </div>
              {activeTimerTask && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-xs text-green-700 dark:text-green-300 font-medium max-w-[120px] truncate">{activeTimerTask.text}</span>
                  <HeaderTimer task={activeTimerTask} />
                  <button
                    onClick={() => handleStopTimer(activeTimerTask.id)}
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors ml-0.5"
                    title="Stop timer"
                  >
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="8" height="8" rx="1" /></svg>
                  </button>
                </div>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {saveStatus === 'saving'
                  ? 'Saving...'
                  : saveStatus === 'unsaved'
                  ? 'Unsaved changes'
                  : '✓ Saved'}
              </span>
              {saveStatus === 'unsaved' && (
                <button
                  onClick={forceSave}
                  className="text-xs px-2 py-1 bg-iqz-blue text-white rounded hover:bg-iqz-blue-light"
                  title="Save now (Alt+S)"
                >
                  Save
                </button>
              )}
            </div>
          </header>
        )}

        {/* View Content */}
        {currentView === 'diary' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 dark:bg-slate-900">
            {/* Carry-over banner */}
            {carryOverAvailable.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <span className="text-sm text-amber-800 dark:text-amber-300">
                  📋 {carryOverAvailable.length} incomplete task{carryOverAvailable.length > 1 ? 's' : ''} from previous working day
                </span>
                <button
                  onClick={handleCarryOver}
                  className="text-xs px-3 py-1 bg-amber-500 dark:bg-amber-600 text-white rounded-md hover:bg-amber-600 dark:hover:bg-amber-500"
                >
                  Carry over
                </button>
              </div>
            )}

            {/* Entry Tags */}
            <EntryTags
              entryTags={entryTags}
              allTags={tags}
              date={selectedDate}
              onAddTagToEntry={handleAddTagToEntry}
              onRemoveTagFromEntry={handleRemoveTagFromEntry}
              onCreateTag={handleAddTag}
            />

            {yesterdayPlan && (
              <YesterdayPlan
                date={yesterdayPlan.date}
                plan={yesterdayPlan.plan}
                convertedItems={convertedPlanItems}
                onConvertToTask={(text) => handleAddTask(text)}
                onItemConverted={(items) => {
                  setConvertedPlanItems(items);
                  window.api.saveConvertedPlanItems({ date: selectedDate, items });
                }}
                onNavigateToDate={handleNavigateToDate}
              />
            )}

            <ErrorBoundary fallbackTitle="Daily Log Error">
              <DailyLog key={`log-${selectedDate}`} value={logContent} onChange={handleLogChange} currentDate={selectedDate} onNavigateToDate={handleNavigateToDate} />
            </ErrorBoundary>

            <ErrorBoundary fallbackTitle="Task List Error">
              <div className="space-y-2">
                <TaskList
                  tasks={tasks}
                  projects={projects}
                  onAdd={handleAddTask}
                  onToggle={handleToggleTask}
                  onDelete={handleDeleteTask}
                  onUpdateText={handleUpdateTaskText}
                  onUpdateProject={handleUpdateTaskProject}
                  onStartTimer={handleStartTimer}
                  onStopTimer={handleStopTimer}
                  onSetManualTime={handleSetManualTime}
                  onReorder={handleReorderTasks}
                />
                <div className="flex justify-end">
                  <TaskTemplates
                    templates={taskTemplates}
                    onApply={handleApplyTemplate}
                    onSave={handleSaveTemplate}
                    onDelete={handleDeleteTemplate}
                    onUpdate={handleUpdateTemplate}
                    currentTasks={currentTaskDefs}
                  />
                </div>
              </div>
            </ErrorBoundary>

            <ErrorBoundary fallbackTitle="Blockers Error">
              <BlockersEditor key={`blockers-${selectedDate}`} value={blockers} onChange={handleBlockersChange} currentDate={selectedDate} onNavigateToDate={handleNavigateToDate} />
            </ErrorBoundary>

            <ErrorBoundary fallbackTitle="Tomorrow's Plan Error">
              <TomorrowPlan key={`plan-${selectedDate}`} value={tomorrowsPlan} onChange={handlePlanChange} currentDate={selectedDate} onNavigateToDate={handleNavigateToDate} />
            </ErrorBoundary>

            <BacklinksPanel backlinks={backlinks} onNavigateToDate={handleNavigateToDate} />
          </div>
        )}

        {currentView === 'kanban' && (
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary fallbackTitle="Kanban Board Error">
              <KanbanBoard
                projects={projects}
                onUpdateStatus={handleUpdateTaskStatus}
                onToggleTask={handleToggleTask}
                onNavigateToDate={(date) => { setSelectedDate(date); setCurrentView('diary'); }}
              />
            </ErrorBoundary>
          </div>
        )}

        {currentView === 'stats' && (
          <div className="flex-1 overflow-y-auto">
            <ErrorBoundary fallbackTitle="Statistics Error">
              <StatsDashboard />
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* Guided Tour Overlay */}
      {showTour && <GuidedTour onComplete={handleTourComplete} />}

      {/* Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onExecute={handleCommand}
        commands={commands}
      />
    </div>
  );
}
