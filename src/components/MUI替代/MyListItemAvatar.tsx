/**
 * MyListItemAvatar.tsx — MUI ListItemAvatar replacement
 * 
 * Replaces MUI ListItemAvatar with custom styling.
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyListItemAvatarProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
}

export const MyListItemAvatar: FC<MyListItemAvatarProps> = ({
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
        paddingRight: theme.spacing(1),
        ...sx,
      }}
    >
      {children}
    </span>
  );
};

export default MyListItemAvatar;
