/**
 * MyTable.tsx — MUI Table, TableContainer, TableHead, TableBody replacement
 * 
 * Replaces MUI Table components with custom styling.
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyTableContainerProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
}

export const MyTableContainer: FC<MyTableContainerProps> = ({
  children,
  className = '',
  sx = {},
}) => {
  const theme = useTheme();

  return (
    <div
      className={className}
      style={{
        width: '100%',
        overflowX: 'auto',
        backgroundColor: theme.palette.background.paper || '#1a1a1a',
        borderRadius: '8px',
        border: `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.08)'}`,
        ...sx,
      }}
    >
      {children}
    </div>
  );
};

export interface MyTableHeadProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
}

export const MyTableHead: FC<MyTableHeadProps> = ({
  children,
  className = '',
  sx = {},
}) => {
  const theme = useTheme();

  return (
    <thead
      className={className}
      style={{
        backgroundColor: theme.palette.background.default || '#151515',
        ...sx,
      }}
    >
      {children}
    </thead>
  );
};

export interface MyTableBodyProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
}

export const MyTableBody: FC<MyTableBodyProps> = ({
  children,
  className = '',
  sx = {},
}) => {
  return (
    <tbody
      className={className}
      style={sx}
    >
      {children}
    </tbody>
  );
};

export interface MyTableProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  size?: 'small' | 'medium';
}

export const MyTable: FC<MyTableProps> = ({
  children,
  className = '',
  sx = {},
  size = 'medium',
}) => {
  const theme = useTheme();

  return (
    <table
      className={className}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: size === 'small' ? '13px' : '14px',
        ...sx,
      }}
    >
      {children}
    </table>
  );
};

export default MyTable;
