import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useState, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  NodeView component  - renders image with corner drag handles       */
/* ------------------------------------------------------------------ */

function ResizableImageView({ node, updateAttributes, selected }: {
  node: { attrs: { src: string; alt: string; title: string; width: number } };
  updateAttributes: (attrs: Record<string, unknown>) => void;
  selected: boolean;
}) {
  const { src, alt, title, width } = node.attrs;
  const [resizing, setResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    startX.current = e.clientX;
    startWidth.current = imgRef.current?.offsetWidth || width || 300;

    const onMouseMove = (ev: MouseEvent) => {
      const diff = ev.clientX - startX.current;
      const newWidth = Math.max(80, startWidth.current + diff);
      if (imgRef.current) {
        imgRef.current.style.width = `${newWidth}px`;
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setResizing(false);
      const diff = ev.clientX - startX.current;
      const finalWidth = Math.max(80, startWidth.current + diff);
      updateAttributes({ width: finalWidth });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [width, updateAttributes]);

  return (
    <NodeViewWrapper className="relative inline-block my-2" data-drag-handle>
      <div className={`relative inline-block group ${selected ? 'ring-2 ring-iqz-blue/50 rounded' : ''}`}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          style={{ width: width ? `${width}px` : undefined, maxWidth: '100%', height: 'auto', display: 'block' }}
          draggable={false}
          className="rounded"
        />
        {/* Resize handles  - visible on hover or when selected */}
        {(selected || resizing) && (
          <>
            {/* Bottom-right handle */}
            <div
              onMouseDown={onMouseDown}
              className="absolute bottom-0 right-0 w-3 h-3 bg-iqz-blue border border-white rounded-sm cursor-se-resize shadow-sm"
              style={{ transform: 'translate(25%, 25%)' }}
            />
            {/* Bottom-left handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setResizing(true);
                startX.current = e.clientX;
                startWidth.current = imgRef.current?.offsetWidth || width || 300;

                const onMouseMove = (ev: MouseEvent) => {
                  const diff = startX.current - ev.clientX;
                  const newWidth = Math.max(80, startWidth.current + diff);
                  if (imgRef.current) {
                    imgRef.current.style.width = `${newWidth}px`;
                  }
                };

                const onMouseUp = (ev: MouseEvent) => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                  setResizing(false);
                  const diff = startX.current - ev.clientX;
                  const finalWidth = Math.max(80, startWidth.current + diff);
                  updateAttributes({ width: finalWidth });
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
              className="absolute bottom-0 left-0 w-3 h-3 bg-iqz-blue border border-white rounded-sm cursor-sw-resize shadow-sm"
              style={{ transform: 'translate(-25%, 25%)' }}
            />
            {/* Width indicator */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded opacity-80 pointer-events-none whitespace-nowrap">
              {Math.round(imgRef.current?.offsetWidth || width || 0)}px
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  TipTap extension                                                  */
/* ------------------------------------------------------------------ */

const ResizableImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.getAttribute('width') || element.style.width;
          return w ? parseInt(String(w), 10) || null : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width, style: `width: ${attributes.width}px` };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number }) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    };
  },
});

export default ResizableImage;
