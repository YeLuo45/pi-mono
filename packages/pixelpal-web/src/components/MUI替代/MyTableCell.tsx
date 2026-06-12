/**
 * MyTableCell.tsx — MUI TableCell replacement
 * 
 * Replaces MUI TableCell with custom styling.
 * Supports: align, size, padding, variant
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyTableCellProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  align?: 'left' | 'center' | 'right';
  size?: 'small' | 'medium';
  padding?: 'none' | 'checkbox' | 'normal';
  variant?: 'head' | 'body' | 'footer';
  scope?: string;
}

export const MyTableCell: FC<MyTableCellProps> = ({
  children,
  className = '',
  sx = {},
  align = 'left',
  size = 'medium',
  padding = 'normal',
  variant = 'body',
}) => {
  const theme = useTheme();

  const paddingStyles = {
    none: '0',
    checkbox: '0 4px',
    normal: theme.spacing(1),
  };

  const sizeStyles = {
    small: {
      padding: paddingStyles[padding],
      fontSize: '13px',
      minHeight: '36px',
    },
    medium: {
      padding: paddingStyles[padding],
      fontSize: '14px',
      minHeight: '48px',
    },
  };

  const isHeader = variant === 'head';

  return (
    <td
      className={className}
      scope={isHeader ? 'col' : undefined}
      style={{
        textAlign: align,
        padding: sizeStyles[size].padding,
        minHeight: sizeStyles[size].minHeight,
        fontSize: sizeStyles[size].fontSize,
        fontWeight: isHeader ? 600 : 400,
        color: isHeader
          ? theme.palette.text.secondary || '#d0d6e0'
          : theme.palette.text.primary || '#f7f8f8',
        backgroundColor: isHeader
          ? theme.palette.background.default || '#1a1a1a'
          : 'transparent',
        borderBottom: `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.08)'}`,
        ...sx,
      }}
    >
      {children}
    </td>
  );
};

export default MyTableCell;
