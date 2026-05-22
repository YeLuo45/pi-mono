/**
 * MyMenuItem.tsx — MUI MenuItem replacement
 * 
 * Replaces MUI MenuItem component with custom styling.
 * Supports: value, onClick, disabled, children
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyMenuItemProps {
  value?: string | number;
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  selected?: boolean;
  autoFocus?: boolean;
}

export const MyMenuItem: FC<MyMenuItemProps> = ({
  value,
  onClick,
  disabled = false,
  children,
  className = '',
  sx = {},
  selected = false,
  autoFocus = false,
}) => {
  const theme = useTheme();

  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      data-value={value !== undefined ? String(value) : undefined}
      className={className}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        color: disabled
          ? theme.palette.text.disabled || '#62666d'
          : selected
          ? theme.palette.primary?.main || '#5e6ad2'
          : theme.palette.text.primary || '#f7f8f8',
        backgroundColor: selected
          ? `${theme.palette.primary?.main || '#5e6ad2'}15`
          : 'transparent',
        fontWeight: selected ? 500 : 400,
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        outline: 'none',
        transition: 'background-color 0.15s ease',
        ...(autoFocus ? { backgroundColor: 'rgba(255,255,255,0.05)' } : {}),
        ...sx,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.target as HTMLDivElement).style.backgroundColor = selected
            ? `${theme.palette.primary?.main || '#5e6ad2'}20`
            : 'rgba(255,255,255,0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.target as HTMLDivElement).style.backgroundColor = selected
            ? `${theme.palette.primary?.main || '#5e6ad2'}15`
            : 'transparent';
        }
      }}
    >
      {children}
    </div>
  );
};

export default MyMenuItem;
