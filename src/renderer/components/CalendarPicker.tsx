import { useState, useEffect, useRef } from 'react';
import { formatDate } from '../utils';
import type { Holiday } from '../types';

interface CalendarPickerProps {
  selectedDate: string; // YYYY-MM-DD
  entryDates: string[];
  onSelectDate: (date: string) => void;
  holidays?: Holiday[];
  onSetHoliday?: (date: string, label: string) => void;
  onRemoveHoliday?: (date: string) => void;
  workloadData?: Map<string, { taskCount: number; completedCount: number; totalTime: number }>;
}

function getWorkloadColor(totalTimeSeconds: number, taskCount: number): string {
  const hours = totalTimeSeconds / 3600;
  // Hours-based heat map: blue(light) → green(healthy) → amber(overtime) → red(burnout)
  if (hours > 12) return 'bg-red-400/80 dark:bg-red-600/60';
  if (hours > 10) return 'bg-orange-300/80 dark:bg-orange-700/50';
  if (hours > 8)  return 'bg-amber-200/80 dark:bg-amber-800/50';
  if (hours > 6)  return 'bg-green-300/70 dark:bg-green-700/50';
  if (hours > 4)  return 'bg-green-200 dark:bg-green-800/40';
  if (hours > 0)  return 'bg-blue-100 dark:bg-blue-900/30';
  // Fallback: no tracked time but has tasks
  if (taskCount > 0) return 'bg-gray-100 dark:bg-gray-800/40';
  return '';
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarPicker({ selectedDate, entryDates, onSelectDate, holidays, onSetHoliday, onRemoveHoliday, workloadData }: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = new Date(selectedDate + 'T00:00:00');
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const ref = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; date: string } | null>(null);
  const [holidayInput, setHolidayInput] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const holidayMap = new Map((holidays || []).map(h => [h.date, h.label]));

  // Sync view when selectedDate changes externally
  useEffect(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [selectedDate]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const todayStr = formatDate(new Date());
  const entrySet = new Set(entryDates);

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; month: number; year: number; current: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const pm = viewMonth === 0 ? 11 : viewMonth - 1;
    const py = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: daysInPrevMonth - i, month: pm, year: py, current: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, current: true });
  }
  // Next month leading days
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, month: nm, year: ny, current: false });
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleSelect = (cell: typeof cells[0]) => {
    const dateStr = formatDate(new Date(cell.year, cell.month, cell.day));
    onSelectDate(dateStr);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-iqz-navy/50 dark:text-gray-500 hover:text-iqz-navy dark:hover:text-gray-200 transition-colors"
        title="Open calendar"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="16" height="14" rx="2" />
          <line x1="2" y1="8" x2="18" y2="8" />
          <line x1="6" y1="2" x2="6" y2="6" />
          <line x1="14" y1="2" x2="14" y2="6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-50 w-[280px] select-none">
          {/* Month/Year header */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-iqz-navy dark:hover:text-gray-200">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="10,3 5,8 10,13"/></svg>
            </button>
            <span className="text-sm font-semibold text-iqz-navy dark:text-white">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-iqz-navy dark:hover:text-gray-200">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6,3 11,8 6,13"/></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-[10px] font-medium text-gray-500 dark:text-gray-500 text-center py-0.5">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              const dateStr = formatDate(new Date(cell.year, cell.month, cell.day));
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const hasEntry = entrySet.has(dateStr);
              const dayOfWeek = new Date(cell.year, cell.month, cell.day).getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const holidayLabel = holidayMap.get(dateStr);
              const isHoliday = !!holidayLabel;
              const workload = workloadData?.get(dateStr);
              const workloadColor = cell.current && !isSelected ? getWorkloadColor(workload?.totalTime || 0, workload?.taskCount || 0) : '';
              const workHours = workload ? (workload.totalTime / 3600) : 0;
              const workLabel = workHours > 12 ? 'Burnout risk' : workHours > 10 ? 'Heavy overtime' : workHours > 8 ? 'Overtime' : '';
              const cellTitle = isHoliday ? holidayLabel : workload ? `${workload.taskCount} task${workload.taskCount !== 1 ? 's' : ''}, ${workHours.toFixed(1)}h${workLabel ? ' - ' + workLabel : ''}` : undefined;

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(cell)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (onSetHoliday || onRemoveHoliday) {
                      setContextMenu({ x: e.clientX, y: e.clientY, date: dateStr });
                      setHolidayInput(holidayMap.get(dateStr) || '');
                    }
                  }}
                  title={cellTitle}
                  className={`
                    relative w-full aspect-square flex items-center justify-center rounded-lg text-xs transition-all
                    ${workloadColor}
                    ${!cell.current && !isSelected ? (isWeekend ? 'text-red-300 dark:text-red-900/50' : 'text-gray-400 dark:text-gray-600') : ''}
                    ${isSelected ? 'bg-iqz-blue text-white font-bold shadow-sm' : ''}
                    ${!isSelected && isToday ? 'ring-1 ring-iqz-blue text-iqz-blue font-semibold' : ''}
                    ${!isSelected && !isToday && cell.current && isWeekend ? 'text-red-400 dark:text-red-400/50' : ''}
                    ${!isSelected && !isToday && cell.current && !isWeekend ? 'text-gray-700 dark:text-gray-200' : ''}
                    ${!isSelected && !isToday && !cell.current ? 'hover:bg-slate-50 dark:hover:bg-slate-700' : ''}
                  `}
                >
                  {cell.day}
                  {hasEntry && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-iqz-blue/60" />
                  )}
                  {isHoliday && !isSelected && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500/80 dark:bg-orange-400/80" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <button
            onClick={() => { onSelectDate(todayStr); setOpen(false); }}
            className="mt-2 w-full text-xs py-1.5 rounded-lg text-iqz-blue hover:bg-iqz-blue/10 dark:hover:bg-iqz-blue/20 font-medium transition-colors"
          >
            Go to Today
          </button>
        </div>
      )}

      {/* Holiday context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-2 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {holidayMap.has(contextMenu.date) ? (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                Holiday: <span className="font-medium text-gray-700 dark:text-gray-200">{holidayMap.get(contextMenu.date)}</span>
              </div>
              {onRemoveHoliday && (
                <button
                  onClick={() => {
                    onRemoveHoliday(contextMenu.date);
                    setContextMenu(null);
                  }}
                  className="w-full text-left text-xs px-2 py-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Remove Holiday
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-500 dark:text-gray-400 px-1 font-medium">Mark as Holiday</div>
              <input
                type="text"
                value={holidayInput}
                onChange={(e) => setHolidayInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && holidayInput.trim() && onSetHoliday) {
                    onSetHoliday(contextMenu.date, holidayInput.trim());
                    setContextMenu(null);
                  }
                  if (e.key === 'Escape') setContextMenu(null);
                }}
                placeholder="Holiday label..."
                autoFocus
                className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-iqz-blue"
              />
              {onSetHoliday && (
                <button
                  onClick={() => {
                    if (holidayInput.trim()) {
                      onSetHoliday(contextMenu.date, holidayInput.trim());
                      setContextMenu(null);
                    }
                  }}
                  disabled={!holidayInput.trim()}
                  className="w-full text-xs px-2 py-1.5 rounded-md bg-iqz-blue text-white hover:bg-iqz-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Add Holiday
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
