/**
 * MyTooltip.tsx — MUI Tooltip replacement
 * 
 * Replaces MUI Tooltip with custom styling.
 * Supports: title, children, placement, arrow, followCursor
 */

import { type FC, type ReactNode, useState, useRef } from 'react';

export interface MyTooltipProps {
  title: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
  arrow?: boolean;
  followCursor?: boolean;
  className?: string;
}

export const MyTooltip: FC<MyTooltipProps> = ({
  title,
  children,
  placement = 'top',
  arrow = true,
  followCursor = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (followCursor) {
      setCoords({ x: e.clientX, y: e.clientY });
    } else if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      setCoords({ x: centerX, y: centerY });
    }
    setIsVisible(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (followCursor) {
      setCoords({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const getPlacementStyles = (): { top: string; left: string; transform: string } => {
    const offset = 12;
    const positions: Record<string, { transform: string; top: string; left: string }> = {
      'top': { transform: 'translateX(-50%) translateY(-100%)', top: `${coords.y - offset}px`, left: `${coords.x}px` },
      'bottom': { transform: 'translateX(-50%)', top: `${coords.y + offset}px`, left: `${coords.x}px` },
      'left': { transform: 'translateY(-50%) translateX(-100%)', top: `${coords.y}px`, left: `${coords.x - offset}px` },
      'right': { transform: 'translateY(-50%)', top: `${coords.y}px`, left: `${coords.x + offset}px` },
      'top-start': { transform: 'translateY(-100%)', top: `${coords.y - offset}px`, left: `${coords.x}px` },
      'top-end': { transform: 'translateY(-100%) translateX(-100%)', top: `${coords.y - offset}px`, left: `${coords.x}px` },
      'bottom-start': { transform: '', top: `${coords.y + offset}px`, left: `${coords.x}px` },
      'bottom-end': { transform: 'translateX(-100%)', top: `${coords.y + offset}px`, left: `${coords.x}px` },
    };
    return positions[placement] || positions['top'];
  };

  const placementStyles = getPlacementStyles();

  return (
    <div
      ref={triggerRef}
      className={className}
      style={{ display: 'inline-flex' }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && title && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            zIndex: 9999,
            ...placementStyles,
            backgroundColor: 'var(--bg-overlay)',
            color: 'var(--text-primary)',
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-stack)',
            fontWeight: 'var(--font-weight-medium)',
            boxShadow: 'var(--shadow-md)',
            pointerEvents: 'none',
            maxWidth: '300px',
            wordWrap: 'break-word',
          }}
        >
          {arrow && (
            <div
              style={{
                position: 'absolute',
                width: '8px',
                height: '8px',
                backgroundColor: 'var(--bg-overlay)',
                transform: 'rotate(45deg)',
                ...(placement.startsWith('top') ? { bottom: '-4px' } : {}),
                ...(placement.startsWith('bottom') ? { top: '-4px' } : {}),
                ...(placement.startsWith('left') ? { right: '-4px' } : {}),
                ...(placement.startsWith('right') ? { left: '-4px' } : {}),
                ...(placement === 'top' || placement === 'bottom' ? { left: '50%', marginLeft: '-4px' } : {}),
                ...(placement === 'left' || placement === 'right' ? { top: '50%', marginTop: '-4px' } : {}),
              }}
            />
          )}
          {title}
        </div>
      )}
    </div>
  );
};

export default MyTooltip;
