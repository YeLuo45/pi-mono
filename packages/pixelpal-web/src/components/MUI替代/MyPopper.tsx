/**
 * MyPopper.tsx — MUI Popper replacement
 * 
 * Replaces MUI Popper for positioning floating content.
 * Supports: open, anchorEl, children, placement, modifiers
 */

import { type FC, type ReactNode, useState, useEffect, type CSSProperties, type RefObject } from 'react';

export interface MyPopperProps {
  open: boolean;
  anchorEl?: HTMLElement | null | (() => HTMLElement | null);
  children?: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
  modifiers?: Array<{
    name: string;
    options?: Record<string, unknown>;
  }>;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

interface Position {
  top: number;
  left: number;
}

export const MyPopper: FC<MyPopperProps> = ({
  open,
  anchorEl,
  children,
  placement = 'bottom',
  modifiers = [],
  className = '',
  sx = {},
  style = {},
}) => {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);

  const getAnchorElement = (): HTMLElement | null => {
    if (!anchorEl) return null;
    if (typeof anchorEl === 'function') return anchorEl();
    return anchorEl;
  };

  const calculatePosition = (): Position => {
    const anchor = getAnchorElement();
    if (!anchor || !popperElement) return { top: 0, left: 0 };

    const anchorRect = anchor.getBoundingClientRect();
    const popperRect = popperElement.getBoundingClientRect();

    let top = 0;
    let left = 0;

    const offset = 8;

    switch (placement) {
      case 'top':
        top = anchorRect.top - popperRect.height - offset;
        left = anchorRect.left + (anchorRect.width - popperRect.width) / 2;
        break;
      case 'bottom':
        top = anchorRect.bottom + offset;
        left = anchorRect.left + (anchorRect.width - popperRect.width) / 2;
        break;
      case 'left':
        top = anchorRect.top + (anchorRect.height - popperRect.height) / 2;
        left = anchorRect.left - popperRect.width - offset;
        break;
      case 'right':
        top = anchorRect.top + (anchorRect.height - popperRect.height) / 2;
        left = anchorRect.right + offset;
        break;
      case 'top-start':
        top = anchorRect.top - popperRect.height - offset;
        left = anchorRect.left;
        break;
      case 'top-end':
        top = anchorRect.top - popperRect.height - offset;
        left = anchorRect.right - popperRect.width;
        break;
      case 'bottom-start':
        top = anchorRect.bottom + offset;
        left = anchorRect.left;
        break;
      case 'bottom-end':
        top = anchorRect.bottom + offset;
        left = anchorRect.right - popperRect.width;
        break;
      default:
        top = anchorRect.bottom + offset;
        left = anchorRect.left + (anchorRect.width - popperRect.width) / 2;
    }

    // Apply modifiers (simplified)
    modifiers.forEach(modifier => {
      if (modifier.name === 'offset' && modifier.options) {
        const [x = 0, y = 0] = (modifier.options.offset as number[]) || [];
        top += y;
        left += x;
      }
    });

    return { top, left };
  };

  useEffect(() => {
    if (open) {
      const updatePosition = () => {
        setPosition(calculatePosition());
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [open, anchorEl, placement, popperElement, modifiers]);

  if (!open) return null;

  const popperStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    top: `${position.top}px`,
    left: `${position.left}px`,
    ...sx,
    ...style,
  };

  return (
    <div
      ref={setPopperElement}
      className={className}
      style={popperStyle}
      role="tooltip"
    >
      {children}
    </div>
  );
};

export default MyPopper;
