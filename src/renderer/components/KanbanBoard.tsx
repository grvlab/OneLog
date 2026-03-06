import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Task, Project, TaskFilters } from '../types';
import KanbanCard from './KanbanCard';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                 */
/* ------------------------------------------------------------------ */

interface KanbanBoardProps {
  projects: Project[];
  onUpdateStatus: (id: number, status: string) => Promise<void>;
  onToggleTask: (id: number) => void;
  onNavigateToDate?: (date: string) => void;
}

type ColumnId = 'todo' | 'in_progress' | 'done';

interface ColumnDef {
  id: ColumnId;
  label: string;
  color: string;        // Tailwind ring / accent
  bgHeader: string;     // header gradient
  emptyIcon: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'todo',
    label: 'To Do',
    color: 'blue',
    bgHeader: 'from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10',
    emptyIcon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    color: 'amber',
    bgHeader: 'from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/10',
    emptyIcon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    id: 'done',
    label: 'Done',
    color: 'green',
    bgHeader: 'from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/10',
    emptyIcon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

const HEADER_DOT: Record<string, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
};

const COUNT_BADGE: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

/* ------------------------------------------------------------------ */
/*  Droppable Column wrapper                                          */
/* ------------------------------------------------------------------ */

function DroppableColumn({
  column,
  tasks,
  onNavigateToDate,
}: {
  column: ColumnDef;
  tasks: Task[];
  onNavigateToDate?: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="flex flex-col w-full min-w-[280px] max-w-[400px]">
      {/* Column header */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl bg-gradient-to-b ${column.bgHeader}`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${HEADER_DOT[column.color]}`} />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {column.label}
          </h3>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${COUNT_BADGE[column.color]}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto rounded-b-xl border border-t-0 p-2 space-y-2 transition-colors ${
          isOver
            ? 'bg-blue-50/60 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700'
            : 'bg-gray-50/50 dark:bg-slate-900/30 border-gray-200 dark:border-gray-700'
        }`}
        style={{ minHeight: 120 }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onNavigateToDate={onNavigateToDate} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={column.emptyIcon} />
            </svg>
            <span className="text-xs mt-2">No tasks</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KanbanBoard                                                       */
/* ------------------------------------------------------------------ */

export default function KanbanBoard({
  projects,
  onUpdateStatus,
  onToggleTask,
  onNavigateToDate,
}: KanbanBoardProps) {
  /* ----- filter state ----- */
  const [filterProjectId, setFilterProjectId] = useState<number | undefined>(undefined);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  /* ----- date preset helpers ----- */
  const datePresets = useMemo(() => {
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const today = new Date();
    const dow = today.getDay(); // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() + mondayOffset);
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    return {
      this_week: { start: fmt(thisWeekStart), end: fmt(thisWeekEnd) },
      last_week: { start: fmt(lastWeekStart), end: fmt(lastWeekEnd) },
      this_month: { start: fmt(thisMonthStart), end: fmt(thisMonthEnd) },
      last_month: { start: fmt(lastMonthStart), end: fmt(lastMonthEnd) },
      all: { start: '', end: '' },
    } as Record<string, { start: string; end: string }>;
  }, []);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const range = datePresets[preset];
    if (range) {
      setFilterStartDate(range.start);
      setFilterEndDate(range.end);
    }
  };

  /* ----- task state ----- */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  /* ----- drag state ----- */
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  /* ----- fetch tasks ----- */
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const filters: TaskFilters = {};
      if (filterProjectId) filters.projectId = filterProjectId;
      if (filterStartDate) filters.startDate = filterStartDate;
      if (filterEndDate) filters.endDate = filterEndDate;
      const result = await window.api.getAllTasks(filters);
      setTasks(result);
    } catch (err) {
      console.error('Failed to load kanban tasks', err);
    } finally {
      setLoading(false);
    }
  }, [filterProjectId, filterStartDate, filterEndDate]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /* ----- derived columns ----- */
  const tasksByColumn: Record<ColumnId, Task[]> = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  /* ----- clear filters ----- */
  const hasFilters = !!filterProjectId || !!filterStartDate || !!filterEndDate;

  const clearFilters = () => {
    setFilterProjectId(undefined);
    setFilterStartDate('');
    setFilterEndDate('');
    setDatePreset('all');
  };

  /* ----- DnD handlers ----- */
  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as number;
    const task = tasks.find((t) => t.id === id) ?? null;
    setActiveTask(task);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Could be used for live column-highlight feedback; kept as no-op for now.
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as number;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine the target column. `over.id` can be either a column id or a task id.
    let targetColumn: ColumnId | undefined;

    if (['todo', 'in_progress', 'done'].includes(over.id as string)) {
      targetColumn = over.id as ColumnId;
    } else {
      // Dropped over another task -- find which column that task is in
      const overTask = tasks.find((t) => t.id === (over.id as number));
      if (overTask) targetColumn = overTask.status;
    }

    if (!targetColumn || targetColumn === task.status) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetColumn as ColumnId } : t)),
    );

    try {
      await onUpdateStatus(taskId, targetColumn);
    } catch {
      // Revert on failure
      loadTasks();
    }
  };

  /* ----- Render ----- */
  return (
    <div className="flex flex-col h-full">
      {/* ---- Filter bar ---- */}
      <div className="flex flex-wrap items-center gap-3 px-1 pb-4">
        {/* Project filter */}
        <select
          value={filterProjectId ?? ''}
          onChange={(e) =>
            setFilterProjectId(e.target.value ? Number(e.target.value) : undefined)
          }
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Date range preset */}
        <select
          value={datePreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        >
          <option value="all">All Time</option>
          <option value="this_week">This Week</option>
          <option value="last_week">Last Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="custom" disabled>Custom Range</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => { setFilterStartDate(e.target.value); setDatePreset('custom'); }}
            className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            placeholder="Start date"
          />
          <span className="text-gray-500 dark:text-gray-500 text-xs">to</span>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => { setFilterEndDate(e.target.value); setDatePreset('custom'); }}
            className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            placeholder="End date"
          />
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            Clear filters
          </button>
        )}

        {/* Task total */}
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-500">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ---- Board ---- */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
            <svg
              className="animate-spin h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm">Loading tasks...</span>
          </div>
        </div>
      ) : (
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
            {COLUMNS.map((col) => (
              <DroppableColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id]}
                onNavigateToDate={onNavigateToDate}
              />
            ))}
          </div>

          {/* Drag overlay -- rendered outside columns so it floats freely */}
          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="rotate-2 scale-105">
                <KanbanCard task={activeTask} onNavigateToDate={onNavigateToDate} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
