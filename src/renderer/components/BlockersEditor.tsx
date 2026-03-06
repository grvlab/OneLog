import { useState } from 'react';
import RichTextEditor from './RichTextEditor';

interface BlockersEditorProps {
  value: string;
  onChange: (value: string) => void;
  currentDate?: string;
  onNavigateToDate?: (date: string) => void;
}

function hasContent(html: string): boolean {
  if (!html) return false;
  const text = html.replace(/<[^>]*>/g, '').trim();
  return text.length > 0;
}

export default function BlockersEditor({ value, onChange, currentDate, onNavigateToDate }: BlockersEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const active = hasContent(value);

  return (
    <section data-tour="blockers">
      <div className={`rounded-lg border overflow-hidden ${
        active
          ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-slate-800/30'
      }`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100/50 dark:hover:bg-slate-700/30 transition-colors"
        >
          <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''} ${
            active ? 'text-red-500' : 'text-gray-500 dark:text-gray-500'
          }`}>
            &#9654;
          </span>
          <span className={`text-xs font-semibold ${
            active ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
          }`}>
            🚧 Blockers
          </span>
          {!isExpanded && active && (
            <span className="ml-auto text-[10px] text-red-500 dark:text-red-500 truncate max-w-[300px]">
              {value.replace(/<[^>]*>/g, '').trim().slice(0, 80)}...
            </span>
          )}
          {!active && (
            <span className="ml-auto text-[10px] text-gray-500 dark:text-gray-500">None</span>
          )}
        </button>

        {isExpanded && (
          <div className="px-3 pb-3">
            <RichTextEditor
              content={value}
              onChange={onChange}
              placeholder="Any blockers or impediments? Things you're stuck on or waiting for..."
              minHeight="4rem"
              currentDate={currentDate}
              onNavigateToDate={onNavigateToDate}
            />
          </div>
        )}
      </div>
    </section>
  );
}
