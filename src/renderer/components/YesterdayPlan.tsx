interface YesterdayPlanProps {
  date: string;
  plan: string;
  convertedItems: string[];
  onConvertToTask: (text: string) => void;
  onItemConverted: (items: string[]) => void;
  onNavigateToDate: (date: string) => void;
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

function extractPlanItems(html: string): string[] {
  const div = document.createElement('div');
  div.innerHTML = html;

  const items: string[] = [];
  // Extract from <li> elements
  div.querySelectorAll('li').forEach((li) => {
    const text = (li.textContent || '').trim();
    if (text) items.push(text);
  });

  // If no list items, split by line breaks
  if (items.length === 0) {
    const plain = stripHtml(html);
    plain.split(/\n+/).forEach((line) => {
      const trimmed = line.replace(/^[-•*]\s*/, '').trim();
      if (trimmed) items.push(trimmed);
    });
  }

  return items;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

import { useState } from 'react';

export default function YesterdayPlan({ date, plan, convertedItems, onConvertToTask, onItemConverted, onNavigateToDate }: YesterdayPlanProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const convertedSet = new Set(convertedItems);
  const planItems = extractPlanItems(plan);
  const hasItems = planItems.length > 0;
  const plainPreview = stripHtml(plan).slice(0, 80);

  const handleConvert = (item: string) => {
    onConvertToTask(item);
    const updated = [...convertedItems, item];
    onItemConverted(updated);
  };

  const handleConvertAll = () => {
    const newItems: string[] = [];
    for (const item of planItems) {
      if (!convertedSet.has(item)) {
        onConvertToTask(item);
        newItems.push(item);
      }
    }
    const updated = [...convertedItems, ...newItems];
    onItemConverted(updated);
  };

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <span className={`text-xs text-amber-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
          &#9654;
        </span>
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          Yesterday's Plan
        </span>
        <span className="text-[10px] text-amber-500 dark:text-amber-500/70">
          from{' '}
          <button
            onClick={(e) => { e.stopPropagation(); onNavigateToDate(date); }}
            className="underline hover:text-amber-700 dark:hover:text-amber-300"
          >
            {formatDateLabel(date)}
          </button>
        </span>
        {!isExpanded && (
          <span className="ml-auto text-[10px] text-amber-600 dark:text-amber-600 truncate max-w-[200px]">
            {plainPreview}...
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3">
          {hasItems ? (
            <>
              <ul className="space-y-1">
                {planItems.map((item, i) => {
                  const isConverted = convertedSet.has(item);
                  return (
                    <li key={i} className="flex items-start gap-2 group/item">
                      <span className="text-amber-500 dark:text-amber-600 mt-0.5 text-xs">&#9679;</span>
                      <span className={`flex-1 text-sm ${isConverted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                        {item}
                      </span>
                      {!isConverted && (
                        <button
                          onClick={() => handleConvert(item)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 hover:bg-amber-300 dark:hover:bg-amber-700/50 opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap"
                          title="Add as task for today"
                        >
                          + Task
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {planItems.length > 1 && convertedSet.size < planItems.length && (
                <button
                  onClick={handleConvertAll}
                  className="mt-2 text-[10px] px-2 py-1 rounded bg-amber-200 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 hover:bg-amber-300 dark:hover:bg-amber-700/40 transition-colors"
                >
                  Convert all to tasks
                </button>
              )}
            </>
          ) : (
            <div
              className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0"
              dangerouslySetInnerHTML={{ __html: plan }}
            />
          )}
        </div>
      )}
    </div>
  );
}
