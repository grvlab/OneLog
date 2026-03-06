import { useState, useEffect, useRef, useMemo } from 'react';

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onExecute: (commandId: string) => void;
  commands: Command[];
}

export default function CommandPalette({ open, onClose, onExecute, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Auto-focus the input after a frame so the modal is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Fuzzy-ish filter: match if every character of query appears in order in the label
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter((cmd) => {
      const label = cmd.label.toLowerCase();
      let qi = 0;
      for (let li = 0; li < label.length && qi < lower.length; li++) {
        if (label[li] === lower[qi]) qi++;
      }
      return qi === lower.length;
    });
  }, [commands, query]);

  // Group filtered commands by category
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const cat = cmd.category || '';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(cmd);
    }
    return map;
  }, [filtered]);

  // Flat list for arrow-key indexing
  const flatList = useMemo(() => {
    const result: Command[] = [];
    for (const cmds of grouped.values()) {
      result.push(...cmds);
    }
    return result;
  }, [grouped]);

  // Clamp active index when filtered list changes
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(flatList.length - 1, 0)));
  }, [flatList.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Close on Escape, navigate with arrows, execute with Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(flatList.length, 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + Math.max(flatList.length, 1)) % Math.max(flatList.length, 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (flatList[activeIndex]) {
        onExecute(flatList[activeIndex].id);
        onClose();
      }
      return;
    }
  };

  if (!open) return null;

  let itemIndex = 0;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 dark:bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      {/* Panel */}
      <div className="w-full max-w-[480px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {/* Magnifying glass icon */}
          <svg
            className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="Type a command..."
            className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-500 border border-gray-200 dark:border-gray-600 font-mono">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
          {flatList.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-500">
              No commands found
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, cmds]) => (
              <div key={category}>
                {/* Category header */}
                {category && (
                  <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
                    {category}
                  </div>
                )}

                {/* Commands in this category */}
                {cmds.map((cmd) => {
                  const isActive = itemIndex === activeIndex;
                  const currentIndex = itemIndex;
                  itemIndex++;

                  return (
                    <button
                      key={cmd.id}
                      data-active={isActive}
                      onClick={() => { onExecute(cmd.id); onClose(); }}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      className={`
                        w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors
                        ${isActive
                          ? 'bg-iqz-blue/10 text-iqz-navy dark:text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }
                      `}
                    >
                      <span className="truncate">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="ml-3 flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-500 border border-gray-200 dark:border-gray-600 font-mono">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
