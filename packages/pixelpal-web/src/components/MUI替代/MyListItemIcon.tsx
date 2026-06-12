/**
 * MyListItemIcon.tsx — MUI ListItemIcon replacement
 * 
 * Replaces MUI ListItemIcon with custom styling.
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyListItemIconProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
}

export const MyListItemIcon: FC<MyListItemIconProps> = ({
  children,
  className = '',
  sx = {},
}) => {
  const theme = useTheme();

  return (
    <span
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '40px',
        color: theme.palette.text.secondary || '#d0d6e0',
        ...sx,
      }}
    >
      {children}
    </span>
  );
};

export default MyListItemIcon;
