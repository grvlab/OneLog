import { useState, useRef, useEffect } from 'react';
import type { TaskTemplate, TaskTemplateDef } from '../types';

interface TaskTemplatesProps {
  templates: TaskTemplate[];
  onApply: (templateId: number) => void;
  onSave: (name: string, tasks: TaskTemplateDef[], recurring: boolean) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, name: string, tasks: TaskTemplateDef[], recurring: boolean) => void;
  currentTasks: { text: string; projectId?: number }[];
}

function parseTemplateTasks(tasksJson: string): TaskTemplateDef[] {
  try {
    return JSON.parse(tasksJson) as TaskTemplateDef[];
  } catch {
    return [];
  }
}

export default function TaskTemplates({
  templates,
  onApply,
  onSave,
  onDelete,
  onUpdate,
  currentTasks,
}: TaskTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRecurring, setNewRecurring] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleSave = () => {
    const name = newName.trim();
    if (!name || currentTasks.length === 0) return;
    const taskDefs: TaskTemplateDef[] = currentTasks.map((t) => ({
      text: t.text,
      ...(t.projectId ? { projectId: t.projectId } : {}),
    }));
    onSave(name, taskDefs, newRecurring);
    setNewName('');
    setNewRecurring(false);
  };

  const handleToggleRecurring = (template: TaskTemplate) => {
    const tasks = parseTemplateTasks(template.tasks_json);
    onUpdate(template.id, template.name, tasks, !template.recurring);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 transition-colors"
      >
        Templates
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              Task Templates
            </span>
          </div>

          {/* Template list */}
          <div className="max-h-60 overflow-y-auto">
            {templates.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                No templates yet. Save your current tasks as a template below.
              </div>
            ) : (
              templates.map((template) => {
                const tasks = parseTemplateTasks(template.tasks_json);
                const isExpanded = expandedId === template.id;

                return (
                  <div
                    key={template.id}
                    className="border-b border-gray-50 dark:border-gray-700/50 last:border-b-0"
                  >
                    {/* Template row */}
                    <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 group">
                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : template.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-[10px] flex-shrink-0"
                        title="Show tasks"
                      >
                        <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                          ▶
                        </span>
                      </button>

                      {/* Name and info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-700 dark:text-gray-200 truncate">
                          {template.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                          </span>
                          {!!template.recurring && (
                            <span className="text-[10px] text-blue-500 dark:text-blue-400">
                              recurring
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Recurring toggle */}
                      <label
                        className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Toggle recurring"
                      >
                        <input
                          type="checkbox"
                          checked={!!template.recurring}
                          onChange={() => handleToggleRecurring(template)}
                          className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-400 cursor-pointer"
                        />
                      </label>

                      {/* Apply button */}
                      <button
                        onClick={() => onApply(template.id)}
                        className="text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 flex-shrink-0 transition-colors"
                        title="Apply template"
                      >
                        Apply
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => onDelete(template.id)}
                        className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
                        title="Delete template"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Expanded task list */}
                    {isExpanded && tasks.length > 0 && (
                      <div className="px-3 pb-2 pl-8">
                        {tasks.map((task, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] text-gray-500 dark:text-gray-400 py-0.5 flex items-center gap-1.5"
                          >
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                            <span className="truncate">{task.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Save current tasks section */}
          <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2 space-y-2">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Save Current Tasks
            </span>
            {currentTasks.length === 0 ? (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                No tasks to save.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder="Template name..."
                    className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50 placeholder-gray-300 dark:border-gray-700 dark:bg-slate-700 dark:text-gray-200 dark:placeholder-gray-500"
                  />
                  <button
                    onClick={handleSave}
                    disabled={!newName.trim()}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRecurring}
                    onChange={(e) => setNewRecurring(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-400"
                  />
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Apply automatically on new days
                  </span>
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
