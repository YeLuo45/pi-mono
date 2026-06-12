/**
 * MyListItemButton.tsx — MUI ListItemButton replacement
 * 
 * Replaces MUI ListItemButton with custom styling.
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyListItemButtonProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  autoFocus?: boolean;
  dense?: boolean;
}

export const MyListItemButton: FC<MyListItemButtonProps> = ({
  children,
  className = '',
  sx = {},
  selected = false,
  disabled = false,
  onClick,
  autoFocus = false,
  dense = false,
}) => {
  const theme = useTheme();

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={className}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onClick?.();
        }
      }}
      autoFocus={autoFocus}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: dense ? `${theme.spacing(0.75)} ${theme.spacing(2)}` : `${theme.spacing(1)} ${theme.spacing(2)}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        backgroundColor: selected ? 'var(--bg-active)' : 'transparent',
        borderLeft: selected ? '3px solid var(--system-blue)' : '3px solid transparent',
        color: selected ? 'var(--system-blue)' : 'var(--text-primary)',
        fontWeight: selected ? 500 : 400,
        transition: 'all 0.15s ease',
        outline: 'none',
        ...sx,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !selected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !selected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
        } else if (selected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg-active)';
        }
      }}
    >
      {children}
    </div>
  );
};

export default MyListItemButton;
