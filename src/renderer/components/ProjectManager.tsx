import { useState } from 'react';
import type { Project } from '../types';

const PROJECT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
];

interface ProjectManagerProps {
  projects: Project[];
  onAdd: (name: string, color: string) => void;
  onUpdate: (id: number, name: string, color: string) => void;
  onDelete: (id: number) => void;
}

export default function ProjectManager({ projects, onAdd, onUpdate, onDelete }: ProjectManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    onAdd(name, newColor);
    setNewName('');
    setNewColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
  };

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditColor(p.color);
  };

  const finishEdit = () => {
    if (editingId !== null && editName.trim()) {
      onUpdate(editingId, editName.trim(), editColor);
    }
    setEditingId(null);
  };

  return (
    <div className="pt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 w-full px-2 py-1"
      >
        <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
        <span>Manage Projects ({projects.length})</span>
      </button>

      {isOpen && (
        <div className="mt-2 px-2 space-y-2">
          {/* Existing projects */}
          {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-2 group">
              {editingId === p.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                  />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={finishEdit}
                    onKeyDown={(e) => e.key === 'Enter' && finishEdit()}
                    className="flex-1 text-xs px-2 py-1 border border-iqz-blue/50 rounded focus:outline-none dark:bg-slate-700 dark:text-gray-200"
                    autoFocus
                  />
                </>
              ) : (
                <>
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="flex-1 text-xs text-gray-700 dark:text-gray-200">{p.name}</span>
                  <button
                    onClick={() => startEdit(p)}
                    className="text-gray-300 hover:text-iqz-blue dark:text-gray-600 dark:hover:text-iqz-blue opacity-0 group-hover:opacity-100 text-[10px]"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 text-[10px]"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Add new project */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border-0 p-0"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="New project name..."
              className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-iqz-blue bg-gray-50 placeholder-gray-300 dark:border-gray-700 dark:bg-slate-700 dark:text-gray-200 dark:placeholder-gray-500"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="text-xs px-2 py-1 bg-iqz-blue text-white rounded hover:bg-iqz-blue-light disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
