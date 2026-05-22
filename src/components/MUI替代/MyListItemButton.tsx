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
        backgroundColor: selected
          ? `${theme.palette.primary?.main || '#5e6ad2'}15`
          : 'transparent',
        borderLeft: selected
          ? `3px solid ${theme.palette.primary?.main || '#5e6ad2'}`
          : '3px solid transparent',
        color: selected
          ? theme.palette.primary?.main || '#5e6ad2'
          : theme.palette.text.primary || '#f7f8f8',
        fontWeight: selected ? 500 : 400,
        transition: 'all 0.15s ease',
        outline: 'none',
        ...sx,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !selected) {
          (e.target as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !selected) {
          (e.target as HTMLDivElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      {children}
    </div>
  );
};

export default MyListItemButton;
