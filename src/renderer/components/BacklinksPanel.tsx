import type { BacklinkEntry } from '../types';

interface BacklinksPanelProps {
  backlinks: BacklinkEntry[];
  onNavigateToDate: (date: string) => void;
}

function formatBacklinkDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function BacklinksPanel({ backlinks, onNavigateToDate }: BacklinksPanelProps) {
  if (backlinks.length === 0) return null;

  return (
    <section className="mt-2">
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">
        Referenced by ({backlinks.length})
      </label>
      <div className="flex flex-wrap gap-1.5">
        {backlinks.map((bl) => (
          <button
            key={bl.date}
            onClick={() => onNavigateToDate(bl.date)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-iqz-blue/10 dark:hover:bg-iqz-blue/20 hover:text-iqz-blue transition-colors"
            title={`Go to ${bl.date}`}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="11,1 15,1 15,5" />
              <line x1="15" y1="1" x2="8" y2="8" />
              <path d="M13 9v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
            </svg>
            {formatBacklinkDate(bl.date)}
          </button>
        ))}
      </div>
    </section>
  );
}
