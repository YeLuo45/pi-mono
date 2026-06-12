/**
 * MyListItemSecondaryAction.tsx — MUI ListItemSecondaryAction replacement
 * 
 * Replaces MUI ListItemSecondaryAction with custom styling.
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyListItemSecondaryActionProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
}

export const MyListItemSecondaryAction: FC<MyListItemSecondaryActionProps> = ({
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
        position: 'absolute',
        right: theme.spacing(1),
        top: '50%',
        transform: 'translateY(-50%)',
        ...sx,
      }}
    >
      {children}
    </span>
  );
};

export default MyListItemSecondaryAction;
