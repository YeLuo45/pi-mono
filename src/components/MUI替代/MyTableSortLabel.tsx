/**
 * MyTableSortLabel.tsx — MUI TableSortLabel replacement
 * 
 * Replaces MUI TableSortLabel with custom styling.
 * Supports: active, direction, onClick, children
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyTableSortLabelProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  active?: boolean;
  direction?: 'asc' | 'desc';
  onClick?: () => void;
}

export const MyTableSortLabel: FC<MyTableSortLabelProps> = ({
  children,
  className = '',
  sx = {},
  active = false,
  direction = 'asc',
  onClick,
}) => {
  const theme = useTheme();

  return (
    <span
      className={className}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing(0.5),
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
        color: active
          ? theme.palette.primary?.main || '#5e6ad2'
          : theme.palette.text.secondary || '#d0d6e0',
        transition: 'color 0.15s ease',
        ...sx,
      }}
    >
      {children}
      {active && (
        <span style={{ fontSize: '12px' }}>
          {direction === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </span>
  );
};

export default MyTableSortLabel;
