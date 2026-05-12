import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface VirtualListOptions<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  overscan?: number; // Number of items to render outside visible area (default: 3)
  getItemKey?: (item: T, index: number) => string | number;
}

export interface VirtualListResult<T> {
  virtualItems: Array<{
    item: T;
    index: number;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void;
  containerProps: {
    ref: React.RefObject<HTMLDivElement>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  innerProps: {
    style: React.CSSProperties;
  };
}

export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 3,
  getItemKey,
}: VirtualListOptions<T>): VirtualListResult<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate item heights
  const getHeight = useCallback(
    (index: number): number => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getHeight(i);
    }
    return total;
  }, [items.length, itemHeight, getHeight]);

  // Calculate which items are visible
  const virtualItems = useMemo(() => {
    const result: Array<{
      item: T;
      index: number;
      style: React.CSSProperties;
    }> = [];

    let accumulatedHeight = 0;

    for (let i = 0; i < items.length; i++) {
      const itemHeight = getHeight(i);

      // Check if item is within visible range (with overscan)
      const itemTop = accumulatedHeight;
      const itemBottom = itemTop + itemHeight;
      const visibleTop = scrollTop - overscan * itemHeight;
      const visibleBottom = scrollTop + containerHeight + overscan * itemHeight;

      if (itemBottom >= visibleTop && itemTop <= visibleBottom) {
        result.push({
          item: items[i],
          index: i,
          style: {
            position: 'absolute',
            top: itemTop,
            left: 0,
            right: 0,
            height: itemHeight,
          },
        });
      }

      accumulatedHeight += itemHeight;

      // Early exit if we've passed the visible area
      if (itemTop > scrollTop + containerHeight + overscan * itemHeight) {
        break;
      }
    }

    return result;
  }, [items, scrollTop, containerHeight, getHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Set up resize observer for container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
      const container = containerRef.current;
      if (!container || index < 0 || index >= items.length) return;

      let targetScrollTop = 0;
      for (let i = 0; i < index; i++) {
        targetScrollTop += getHeight(i);
      }

      const itemHeight = getHeight(index);

      switch (align) {
        case 'center':
          targetScrollTop -= containerHeight / 2 - itemHeight / 2;
          break;
        case 'end':
          targetScrollTop -= containerHeight - itemHeight;
          break;
        case 'auto':
          // Only adjust if already visible
          if (
            targetScrollTop < scrollTop ||
            targetScrollTop + itemHeight > scrollTop + containerHeight
          ) {
            targetScrollTop -= containerHeight / 2 - itemHeight / 2;
          }
          break;
      }

      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    },
    [containerHeight, getHeight, items.length, scrollTop]
  );

  const containerProps = {
    ref: containerRef,
    onScroll: handleScroll,
    style: {
      overflow: 'auto',
      position: 'relative' as const,
    } as React.CSSProperties,
  };

  const innerProps = {
    style: {
      position: 'relative' as const,
      height: totalHeight,
    } as React.CSSProperties,
  };

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
    containerProps,
    innerProps,
  };
}

export default useVirtualList;
