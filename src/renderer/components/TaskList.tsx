import { useState, useEffect, useRef } from 'react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, Project } from '../types';

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  onAdd: (text: string, projectId?: number) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdateText: (id: number, text: string) => void;
  onUpdateProject: (id: number, projectId: number | null) => void;
  onStartTimer: (id: number) => void;
  onStopTimer: (id: number) => void;
  onSetManualTime: (id: number, seconds: number) => void;
  onReorder: (taskOrders: { id: number; position: number }[]) => void;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parseTimeInput(input: string): number | null {
  // Parse "2h 30m", "1h", "45m", "90" (minutes), "1:30" (h:mm)
  const hmMatch = input.match(/(\d+)\s*h\s*(\d+)\s*m/i);
  if (hmMatch) return parseInt(hmMatch[1]) * 3600 + parseInt(hmMatch[2]) * 60;

  const hMatch = input.match(/^(\d+)\s*h$/i);
  if (hMatch) return parseInt(hMatch[1]) * 3600;

  const mMatch = input.match(/^(\d+)\s*m$/i);
  if (mMatch) return parseInt(mMatch[1]) * 60;

  const colonMatch = input.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) return parseInt(colonMatch[1]) * 3600 + parseInt(colonMatch[2]) * 60;

  const numMatch = input.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1]) * 60; // plain number = minutes

  return null;
}

function LiveTimer({ task }: { task: Task }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (task.timer_started_at) {
      const update = () => {
        const started = new Date(task.timer_started_at!).getTime();
        const now = Date.now();
        setElapsed(Math.floor((now - started) / 1000));
      };
      update();
      intervalRef.current = setInterval(update, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      setElapsed(0);
    }
  }, [task.timer_started_at]);

  const total = (task.time_spent || 0) + elapsed;
  if (total === 0 && !task.timer_started_at) return null;
  // Always show time if tracked (not just on hover)

  return (
    <span className={`flex items-center gap-1 text-xs font-mono ${task.timer_started_at ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-500 dark:text-gray-500'}`}>
      {task.timer_started_at && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"
          style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }}
        />
      )}
      {formatTime(total)}
    </span>
  );
}

interface SortableTaskRowProps {
  task: Task;
  projects: Project[];
  editingId: number | null;
  editText: string;
  setEditText: (text: string) => void;
  startEditing: (task: Task) => void;
  finishEditing: () => void;
  timeEditId: number | null;
  timeInput: string;
  setTimeInput: (input: string) => void;
  openTimeEdit: (task: Task) => void;
  finishTimeEdit: () => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdateProject: (id: number, projectId: number | null) => void;
  onStartTimer: (id: number) => void;
  onStopTimer: (id: number) => void;
  confirmDeleteId: number | null;
  onConfirmDelete: (id: number) => void;
  onCancelDelete: () => void;
}

function SortableTaskRow({
  task, projects, editingId, editText, setEditText, startEditing, finishEditing,
  timeEditId, timeInput, setTimeInput, openTimeEdit, finishTimeEdit,
  onToggle, onDelete, onUpdateProject, onStartTimer, onStopTimer,
  confirmDeleteId, onConfirmDelete, onCancelDelete,
}: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: String(task.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 group px-3 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {/* Drag handle */}
      <span {...listeners} {...attributes} className="cursor-grab text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:text-gray-600 dark:hover:text-gray-400">⠿</span>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          task.completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500'
        }`}
      >
        {task.completed ? '✓' : ''}
      </button>

      {/* Task text */}
      {editingId === task.id ? (
        <input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
          className="flex-1 text-sm px-1 py-0.5 border border-blue-300 dark:border-blue-600 dark:bg-slate-700 dark:text-gray-200 rounded focus:outline-none"
          autoFocus
        />
      ) : (
        <span
          onDoubleClick={() => startEditing(task)}
          className={`flex-1 text-sm cursor-default ${
            task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          {task.text}
        </span>
      )}

      {/* Project badge */}
      {task.project_name ? (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
          style={{ backgroundColor: (task.project_color || '#6366f1') + '20', color: task.project_color || '#6366f1' }}
        >
          {task.project_name}
        </span>
      ) : null}

      {/* Project selector (on hover) */}
      <select
        value={task.project_id ?? ''}
        onChange={(e) => onUpdateProject(task.id, e.target.value ? Number(e.target.value) : null)}
        className="text-[10px] w-16 opacity-0 group-hover:opacity-100 bg-transparent border-none cursor-pointer focus:outline-none text-gray-600 dark:text-gray-500 dark:bg-slate-800"
        title="Assign project"
      >
        <option value="">No project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Live timer display -- always visible when time tracked */}
      <LiveTimer task={task} />

      {/* Manual time edit */}
      {timeEditId === task.id ? (
        <input
          value={timeInput}
          onChange={(e) => setTimeInput(e.target.value)}
          onBlur={finishTimeEdit}
          onKeyDown={(e) => e.key === 'Enter' && finishTimeEdit()}
          placeholder="e.g. 2h 30m"
          className="w-24 text-xs px-1.5 py-0.5 border border-blue-300 dark:border-blue-600 dark:bg-slate-700 dark:text-gray-200 rounded focus:outline-none"
          autoFocus
        />
      ) : (
        <button
          onClick={() => openTimeEdit(task)}
          className="text-gray-400 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
          title="Set time manually"
        >
          ✏️
        </button>
      )}

      {/* Timer start/stop */}
      <button
        onClick={() => task.timer_started_at ? onStopTimer(task.id) : onStartTimer(task.id)}
        className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${
          task.timer_started_at
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200 dark:shadow-red-900/40'
            : 'opacity-0 group-hover:opacity-100 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900/40'
        }`}
        title={task.timer_started_at ? 'Stop timer' : 'Start timer'}
      >
        {task.timer_started_at ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="8" height="8" rx="1" /></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,0.5 9.5,5 2,9.5" /></svg>
        )}
      </button>

      {/* Delete with confirmation */}
      {confirmDeleteId === task.id ? (
        <span className="flex items-center gap-1 text-[10px]">
          <button
            onClick={() => { onDelete(task.id); onCancelDelete(); }}
            className="px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onCancelDelete}
            className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          onClick={() => onConfirmDelete(task.id)}
          className="text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
          title="Delete task"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function TaskList({
  tasks, projects, onAdd, onToggle, onDelete, onUpdateText, onUpdateProject, onStartTimer, onStopTimer, onSetManualTime, onReorder,
}: TaskListProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState<number | undefined>(undefined);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [timeEditId, setTimeEditId] = useState<number | null>(null);
  const [timeInput, setTimeInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleAdd = () => {
    const text = newTaskText.trim();
    if (!text) return;
    onAdd(text, newTaskProjectId);
    setNewTaskText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditText(task.text);
  };

  const finishEditing = () => {
    if (editingId !== null && editText.trim()) {
      onUpdateText(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const openTimeEdit = (task: Task) => {
    setTimeEditId(task.id);
    const h = Math.floor((task.time_spent || 0) / 3600);
    const m = Math.floor(((task.time_spent || 0) % 3600) / 60);
    setTimeInput(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '');
  };

  const finishTimeEdit = () => {
    if (timeEditId !== null && timeInput.trim()) {
      const seconds = parseTimeInput(timeInput.trim());
      if (seconds !== null && seconds >= 0) {
        onSetManualTime(timeEditId, seconds);
      }
    }
    setTimeEditId(null);
    setTimeInput('');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex(t => String(t.id) === active.id);
    const newIndex = tasks.findIndex(t => String(t.id) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...tasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const taskOrders = reordered.map((t, index) => ({ id: t.id, position: index }));
    onReorder(taskOrders);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTime = tasks.reduce((sum, t) => sum + (t.time_spent || 0), 0);

  return (
    <section data-tour="task-list">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">☑️ Tasks</label>
        <div className="flex items-center gap-3">
          {totalTime > 0 && (
            <span className="text-xs text-blue-500 dark:text-blue-400 font-mono">⏱ {formatTime(totalTime)} total</span>
          )}
          {tasks.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {completedCount}/{tasks.length} done
            </span>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-1 mb-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map(t => String(t.id))} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                projects={projects}
                editingId={editingId}
                editText={editText}
                setEditText={setEditText}
                startEditing={startEditing}
                finishEditing={finishEditing}
                timeEditId={timeEditId}
                timeInput={timeInput}
                setTimeInput={setTimeInput}
                openTimeEdit={openTimeEdit}
                finishTimeEdit={finishTimeEdit}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdateProject={onUpdateProject}
                onStartTimer={onStartTimer}
                onStopTimer={onStopTimer}
                confirmDeleteId={confirmDeleteId}
                onConfirmDelete={(id) => setConfirmDeleteId(id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Add Task */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task..."
          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50 placeholder-gray-400 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 dark:placeholder-gray-600"
        />
        {projects.length > 0 && (
          <select
            value={newTaskProjectId ?? ''}
            onChange={(e) => setNewTaskProjectId(e.target.value ? Number(e.target.value) : undefined)}
            className="text-xs px-2 py-1.5 border border-gray-200 rounded-md bg-gray-50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-300"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={handleAdd}
          disabled={!newTaskText.trim()}
          className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add
        </button>
      </div>
    </section>
  );
}
