/**
 * MyMenu.tsx — MUI Menu replacement
 * 
 * Replaces MUI Menu component with custom styling.
 * Supports: anchorEl, open, onClose, children
 */

import { type FC, type ReactNode, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { borderRadius } from '../ui/design-tokens';

export interface MyMenuProps {
  anchorEl?: HTMLElement | null;
  open: boolean;
  onClose?: () => void;
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  PaperProps?: {
    sx?: Record<string, string | number>;
    className?: string;
    style?: Record<string, string | number>;
  };
  MenuListProps?: {
    sx?: Record<string, string | number>;
  };
}

export const MyMenu: FC<MyMenuProps> = ({
  anchorEl,
  open,
  onClose,
  children,
  className = '',
  sx = {},
  PaperProps = {},
  MenuListProps = {},
}) => {
  const theme = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        if (open && onClose) {
          onClose();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && onClose) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !anchorEl) return null;

  const anchorRect = anchorEl.getBoundingClientRect();
  const paperSx = PaperProps.sx || {};
  const paperStyle = PaperProps.style || {};
  const paperClassName = PaperProps.className || '';
  const listSx = MenuListProps.sx || {};

  return (
    <div
      ref={menuRef}
      className={className}
      style={{
        position: 'fixed',
        top: anchorRect.bottom + 4,
        left: Math.min(anchorRect.left, window.innerWidth - 200),
        zIndex: theme.zIndex.menu || 1300,
        ...sx,
      }}
    >
      <div
        className={paperClassName}
        style={{
          backgroundColor: theme.palette.background.paper || '#1a1a1a',
          borderRadius: borderRadius.md,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          minWidth: '120px',
          padding: `${theme.spacing(0.5)} 0`,
          border: `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.08)'}`,
          animation: 'menuFadeIn 0.15s ease',
          ...paperSx,
          ...paperStyle,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            ...listSx,
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MyMenu;
