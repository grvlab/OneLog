import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';

/* ------------------------------------------------------------------ */
/*  NodeView component  - renders backlink as a clickable date chip    */
/* ------------------------------------------------------------------ */

function BacklinkView({ node, extension }: {
  node: { attrs: { date: string } };
  extension: { options: { onNavigateToDate?: (date: string) => void } };
}) {
  const { date } = node.attrs;

  const display = (() => {
    try {
      const d = new Date(date + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return date;
    }
  })();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    extension.options.onNavigateToDate?.(date);
  };

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        onClick={handleClick}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-iqz-blue/10 dark:bg-iqz-blue/20 text-iqz-blue hover:bg-iqz-blue/20 dark:hover:bg-iqz-blue/30 cursor-pointer text-xs font-medium transition-colors"
        title={`Go to ${date}`}
        contentEditable={false}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="3" width="12" height="11" rx="1.5" />
          <line x1="2" y1="6" x2="14" y2="6" />
          <line x1="5" y1="1" x2="5" y2="4" />
          <line x1="11" y1="1" x2="11" y2="4" />
        </svg>
        {display}
      </span>
    </NodeViewWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  TipTap extension                                                  */
/* ------------------------------------------------------------------ */

export interface BacklinkOptions {
  onNavigateToDate?: (date: string) => void;
}

const Backlink = Node.create<BacklinkOptions>({
  name: 'backlink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { onNavigateToDate: undefined };
  },

  addAttributes() {
    return {
      date: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-date'),
        renderHTML: (attributes) => ({
          'data-date': attributes.date,
          'data-type': 'backlink',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="backlink"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BacklinkView);
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[(\d{4}-\d{2}-\d{2})\]\]$/,
        handler: ({ state, range, match }) => {
          const date = match[1];
          const d = new Date(date + 'T00:00:00');
          if (isNaN(d.getTime())) return;

          const { tr } = state;
          tr.replaceWith(range.from, range.to, this.type.create({ date }));
        },
      }),
    ];
  },
});

export default Backlink;
