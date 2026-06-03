import { css } from '@emotion/react';
import { ReactNode, useState, useRef } from 'react';
import { useMobile, useTablet } from '../../hooks/useMobile';

interface MacSplitViewProps {
  source: ReactNode;
  itemList: ReactNode;
  detail: ReactNode;
}

export function MacSplitView({ source, itemList, detail }: MacSplitViewProps) {
  const isMobile = useMobile();
  const isTablet = useTablet();
  const showSource = !isMobile && !isTablet;
  const showItemList = !isMobile;

  const [sourceWidth, setSourceWidth] = useState<number | null>(null);
  const [itemListWidth, setItemListWidth] = useState<number | null>(null);

  const actualSourceWidth = sourceWidth !== null ? sourceWidth : 220;
  const actualItemListWidth = itemListWidth !== null ? itemListWidth : (isTablet ? 240 : 280);

  const isDraggingSource = useRef(false);
  const isDraggingItemList = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleSourceResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingSource.current = true;
    startX.current = e.clientX;
    startWidth.current = actualSourceWidth;
  };

  const handleSourceResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSource.current) return;
    const delta = e.clientX - startX.current;
    const newWidth = Math.max(160, Math.min(320, startWidth.current + delta));
    setSourceWidth(newWidth);
  };

  const handleSourceResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    isDraggingSource.current = false;
  };

  const handleItemListResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingItemList.current = true;
    startX.current = e.clientX;
    startWidth.current = actualItemListWidth;
  };

  const handleItemListResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingItemList.current) return;
    const delta = e.clientX - startX.current;
    const newWidth = Math.max(200, Math.min(450, startWidth.current + delta));
    setItemListWidth(newWidth);
  };

  const handleItemListResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    isDraggingItemList.current = false;
  };

  return (
    <div
      css={css({
        display: 'flex',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        flexDirection: isMobile ? 'column' : 'row',
      })}
    >
      {showSource && (
        <>
          <aside
            css={css({
              width: actualSourceWidth,
              flexShrink: 0,
              background: 'var(--bg-sidebar)',
              backdropFilter: 'blur(20px)',
              overflowY: 'auto',
            })}
          >
            {source}
          </aside>
          <div
            onPointerDown={handleSourceResizeStart}
            onPointerMove={handleSourceResizeMove}
            onPointerUp={handleSourceResizeEnd}
            css={css({
              width: '1px',
              background: 'var(--separator)',
              position: 'relative',
              cursor: 'col-resize',
              flexShrink: 0,
              zIndex: 10,
              touchAction: 'none',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '-4px',
                right: '-4px',
                background: 'transparent',
              },
            })}
          />
        </>
      )}
      {showItemList && (
        <>
          <aside
            css={css({
              width: isMobile ? '100%' : actualItemListWidth,
              flexShrink: 0,
              background: 'var(--bg-elevated)',
              overflowY: 'auto',
              ...(isMobile
                ? {
                    maxHeight: '40vh',
                    borderBottom: '1px solid var(--separator)',
                  }
                : {}),
            })}
          >
            {itemList}
          </aside>
          {!isMobile && (
            <div
              onPointerDown={handleItemListResizeStart}
              onPointerMove={handleItemListResizeMove}
              onPointerUp={handleItemListResizeEnd}
              css={css({
                width: '1px',
                background: 'var(--separator)',
                position: 'relative',
                cursor: 'col-resize',
                flexShrink: 0,
                zIndex: 10,
                touchAction: 'none',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '-4px',
                  right: '-4px',
                  background: 'transparent',
                },
              })}
            />
          )}
        </>
      )}
      <main
        css={css({
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          background: 'var(--bg-base)',
        })}
      >
        {detail}
      </main>
    </div>
  );
}
