import { useState, useEffect, useCallback, useRef } from 'react';
import type { SearchResult, Project, Tag, ViewType } from '../types';
import ProjectManager from './ProjectManager';
import TagManager from './TagManager';
import ThemeToggle from './ThemeToggle';


interface SidebarProps {
  selectedDate: string;
  entryDates: string[];
  onSelectDate: (date: string) => void;
  projects: Project[];
  onAddProject: (name: string, color: string) => void;
  onUpdateProject: (id: number, name: string, color: string) => void;
  onDeleteProject: (id: number) => void;
  onDataReset: () => void;
  tags: Tag[];
  onAddTag: (name: string, color: string) => void;
  onUpdateTag: (id: number, name: string, color: string) => void;
  onDeleteTag: (id: number) => void;
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  onDeleteEntry: (date: string) => void;
}

export default function Sidebar({ selectedDate, entryDates, onSelectDate, projects, onAddProject, onUpdateProject, onDeleteProject, onDataReset, tags, onAddTag, onUpdateTag, onDeleteTag, currentView, onChangeView, onDeleteEntry }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(5);
  const [isResetting, setIsResetting] = useState(false);
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string | null>(null);

  // 5-second countdown timer when modal opens
  useEffect(() => {
    if (!showResetModal) {
      setResetCountdown(5);
      return;
    }
    if (resetCountdown <= 0) return;
    const timer = setTimeout(() => setResetCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showResetModal, resetCountdown]);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    await window.api.resetAllData();
    setIsResetting(false);
    setShowResetModal(false);
    onDataReset();
  }, [onDataReset]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await window.api.searchEntries(searchQuery.trim());
    setSearchResults(results);
    setIsSearching(false);
    setShowSearch(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  // Scroll selected date into view
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('[data-selected="true"]');
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedDate]);

  // Group dates by month for the sidebar
  const datesByMonth: Record<string, string[]> = {};
  for (const date of entryDates) {
    const month = date.substring(0, 7); // YYYY-MM
    if (!datesByMonth[month]) datesByMonth[month] = [];
    datesByMonth[month].push(date);
  }

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text.substring(0, 100);
    const start = Math.max(0, idx - 30);
    const end = Math.min(text.length, idx + query.length + 30);
    const snippet = text.substring(start, end);
    return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '');
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full" data-tour="sidebar">
      {/* App Title */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M8 7h6" />
            <path d="M8 11h4" />
          </svg>
        </div>
        <span className="text-lg font-bold tracking-tight text-gray-800 dark:text-gray-100">
          One<span className="text-teal-600 dark:text-teal-400">Log</span>
        </span>
      </div>

      {/* View Navigation */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => onChangeView('diary')}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
            currentView === 'diary'
              ? 'bg-iqz-blue text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          📓 Diary
        </button>
        <button
          onClick={() => onChangeView('kanban')}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
            currentView === 'kanban'
              ? 'bg-iqz-blue text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          📋 Kanban
        </button>
        <button
          onClick={() => onChangeView('stats')}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
            currentView === 'stats'
              ? 'bg-iqz-blue text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          📊 Stats
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-iqz-blue bg-gray-50 dark:bg-slate-700 dark:text-gray-200"
          />
          {showSearch ? (
            <button onClick={clearSearch} className="text-xs px-2 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              ✕
            </button>
          ) : (
            <button
              onClick={handleSearch}
              className="text-sm px-2.5 py-1.5 bg-iqz-blue text-white rounded-md hover:bg-iqz-blue-light"
            >
              🔍
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2" ref={listRef}>
        {showSearch ? (
          // Search Results
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
              {isSearching ? 'Searching...' : `${searchResults.length} result(s)`}
            </p>
            {searchResults.map((r) => (
              <button
                key={r.date}
                onClick={() => {
                  onSelectDate(r.date);
                  clearSearch();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-md mb-1 text-sm transition-colors ${
                  r.date === selectedDate ? 'bg-iqz-blue/10 dark:bg-iqz-blue/20 text-iqz-blue' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <div className="font-medium text-xs">{r.date}</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 truncate">
                  {highlightMatch(r.log_content || r.tomorrows_plan || '', searchQuery)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          // Date list grouped by month
          <div>
            {entryDates.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-8">
                No entries yet.
                <br />
                Start writing!
              </p>
            )}
            {Object.entries(datesByMonth).map(([month, dates]) => (
              <div key={month} className="mb-3">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider px-2 mb-1">
                  {formatMonth(month)}
                </p>
                {dates.map((date) => (
                  <div key={date} className="group/entry relative">
                    {deleteConfirmDate === date ? (
                      <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <span className="text-xs text-red-600 dark:text-red-400 flex-1">Delete {formatDay(date)}?</span>
                        <button
                          onClick={() => { onDeleteEntry(date); setDeleteConfirmDate(null); }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirmDate(null)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        data-selected={date === selectedDate ? 'true' : undefined}
                        onClick={() => onSelectDate(date)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                          date === selectedDate
                            ? 'bg-iqz-blue/15 dark:bg-iqz-blue/20 text-iqz-blue font-semibold border-l-3 border-iqz-blue shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {formatDay(date)}
                      </button>
                    )}
                    {deleteConfirmDate !== date && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmDate(date); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover/entry:opacity-100 transition-opacity"
                        title="Delete this day"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Manager */}
      <div className="px-1 pb-3 border-t border-gray-100 dark:border-gray-700">
        <ProjectManager
          projects={projects}
          onAdd={onAddProject}
          onUpdate={onUpdateProject}
          onDelete={onDeleteProject}
        />
      </div>

      {/* Tag Manager */}
      <div className="px-1 pb-3 border-t border-gray-100 dark:border-gray-700">
        <TagManager
          tags={tags}
          onAdd={onAddTag}
          onUpdate={onUpdateTag}
          onDelete={onDeleteTag}
        />
      </div>

      {/* Theme Toggle */}
      <div className="px-3 pb-2">
        <ThemeToggle />
      </div>

      {/* Reset Data Button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setShowResetModal(true)}
          className="w-full text-xs py-1.5 rounded-md border border-red-200 dark:border-red-800 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-700 transition-colors"
        >
          Reset All Data
        </button>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-[380px] overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 dark:bg-red-900/20 px-5 py-4 flex items-center gap-3 border-b border-red-100 dark:border-red-800">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800 dark:text-red-400">Delete All Data</h3>
                <p className="text-xs text-red-500 dark:text-red-400">This action cannot be undone</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                This will permanently delete <strong>all entries, tasks, projects, and settings</strong>. Your diary will be completely empty.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Consider exporting your data first using the Export button.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-4">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 text-sm py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetCountdown > 0 || isResetting}
                className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${
                  resetCountdown > 0
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                }`}
              >
                {isResetting
                  ? 'Deleting...'
                  : resetCountdown > 0
                  ? `Confirm (${resetCountdown}s)`
                  : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
