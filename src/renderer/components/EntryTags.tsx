import { useState, useRef, useEffect } from 'react';
import type { Tag } from '../types';

interface EntryTagsProps {
  entryTags: Tag[];
  allTags: Tag[];
  date: string;
  onAddTagToEntry: (tagId: number) => void;
  onRemoveTagFromEntry: (tagId: number) => void;
  onCreateTag: (name: string, color: string) => void;
}

const DEFAULT_NEW_TAG_COLOR = '#6366f1';

export default function EntryTags({
  entryTags,
  allTags,
  date,
  onAddTagToEntry,
  onRemoveTagFromEntry,
  onCreateTag,
}: EntryTagsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_NEW_TAG_COLOR);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setFilter('');
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (showDropdown && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showDropdown]);

  const entryTagIds = new Set(entryTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !entryTagIds.has(t.id));
  const filteredTags = availableTags.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase()),
  );
  const exactMatch = allTags.some((t) => t.name.toLowerCase() === filter.trim().toLowerCase());
  const canCreateNew = filter.trim().length > 0 && !exactMatch;

  const handleAddTag = (tagId: number) => {
    onAddTagToEntry(tagId);
    setFilter('');
    setShowDropdown(false);
  };

  const handleCreateTag = () => {
    const name = filter.trim();
    if (!name) return;
    onCreateTag(name, newTagColor);
    setFilter('');
    setNewTagColor(DEFAULT_NEW_TAG_COLOR);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-2">
      {/* Tag badges */}
      {entryTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white font-medium"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          <button
            onClick={() => onRemoveTagFromEntry(tag.id)}
            className="hover:text-white/70 text-white/90 text-[10px] leading-none ml-0.5"
            title={`Remove ${tag.name}`}
          >
            ✕
          </button>
        </span>
      ))}

      {/* Add tag button + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-iqz-blue hover:text-iqz-blue dark:hover:border-iqz-blue dark:hover:text-iqz-blue text-xs transition-colors"
          title="Add tag"
        >
          +
        </button>

        {showDropdown && (
          <div className="absolute left-0 top-8 z-20 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
            {/* Search/filter input */}
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <input
                ref={inputRef}
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (filteredTags.length === 1) {
                      handleAddTag(filteredTags[0].id);
                    } else if (canCreateNew) {
                      handleCreateTag();
                    }
                  }
                  if (e.key === 'Escape') {
                    setShowDropdown(false);
                    setFilter('');
                  }
                }}
                placeholder="Search or create tag..."
                className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-iqz-blue bg-gray-50 dark:bg-slate-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-500"
              />
            </div>

            {/* Tag list */}
            <div className="max-h-40 overflow-y-auto">
              {filteredTags.length === 0 && !canCreateNew && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                  No tags available
                </p>
              )}

              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}

              {/* Create new tag option */}
              {canCreateNew && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={handleCreateTag}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-iqz-blue hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => {
                        e.stopPropagation();
                        setNewTagColor(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                    />
                    <span>
                      Create "<strong>{filter.trim()}</strong>"
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
