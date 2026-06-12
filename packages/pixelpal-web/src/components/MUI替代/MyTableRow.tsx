/**
 * MyTableRow.tsx — MUI TableRow replacement
 * 
 * Replaces MUI TableRow with custom styling.
 * Supports: hover, selected, children
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyTableRowProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  hover?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export const MyTableRow: FC<MyTableRowProps> = ({
  children,
  className = '',
  sx = {},
  hover = false,
  selected = false,
  onClick,
}) => {
  const theme = useTheme();

  return (
    <tr
      className={className}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: selected
          ? `${theme.palette.primary?.main || '#5e6ad2'}10`
          : 'transparent',
        transition: 'background-color 0.15s ease',
        ...sx,
      }}
      onMouseEnter={(e) => {
        if (hover && !selected) {
          (e.target as HTMLTableRowElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover && !selected) {
          (e.target as HTMLTableRowElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      {children}
    </tr>
  );
};

export default MyTableRow;
