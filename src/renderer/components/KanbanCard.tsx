import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSeconds}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface KanbanCardProps {
  task: Task;
  onNavigateToDate?: (date: string) => void;
}

export default function KanbanCard({ task, onNavigateToDate }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-blue-400/40' : ''
      }`}
      onClick={(e) => {
        if (e.altKey && onNavigateToDate) {
          e.stopPropagation();
          onNavigateToDate(task.entry_date);
        }
      }}
      title="Alt+Click to go to this day"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 touch-none"
        aria-label="Drag to reorder"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </button>

      {/* Card content */}
      <div className="flex-1 min-w-0">
        {/* Task text */}
        <p
          className={`text-sm leading-snug ${
            task.completed
              ? 'line-through text-gray-400 dark:text-gray-500'
              : 'text-gray-800 dark:text-gray-100'
          }`}
        >
          {task.text}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {/* Date  - click to jump to diary */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToDate?.(task.entry_date);
            }}
            className="text-[10px] text-gray-500 dark:text-gray-500 font-medium hover:text-blue-500 dark:hover:text-blue-400 hover:underline transition-colors"
            title="Go to this day"
          >
            {formatDate(task.entry_date)}
          </button>

          {/* Project badge */}
          {task.project_name && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
              style={{
                backgroundColor: (task.project_color || '#6366f1') + '20',
                color: task.project_color || '#6366f1',
              }}
            >
              {task.project_name}
            </span>
          )}

          {/* Time spent */}
          {task.time_spent > 0 && (
            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-500 flex items-center gap-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatTime(task.time_spent)}
            </span>
          )}

          {/* Active timer indicator */}
          {task.timer_started_at && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"
                style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }}
              />
              Running
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
