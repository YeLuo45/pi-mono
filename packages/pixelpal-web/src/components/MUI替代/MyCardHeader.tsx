/**
 * MyCardHeader.tsx — MUI CardHeader replacement
 * 
 * Replaces MUI CardHeader with custom styling.
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyCardHeaderProps {
  title?: ReactNode;
  subheader?: ReactNode;
  avatar?: ReactNode;
  action?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
}

export const MyCardHeader: FC<MyCardHeaderProps> = ({
  title,
  subheader,
  avatar,
  action,
  className = '',
  sx = {},
}) => {
  const theme = useTheme();

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: theme.spacing(1.5),
        borderBottom: `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.05)'}`,
        ...sx,
      }}
    >
      {avatar && (
        <div style={{ marginRight: theme.spacing(1.5), display: 'flex', alignItems: 'center' }}>
          {avatar}
        </div>
      )}
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{
            fontSize: '16px',
            fontWeight: 600,
            color: theme.palette.text.primary || '#f7f8f8',
          }}>
            {title}
          </div>
        )}
        {subheader && (
          <div style={{
            fontSize: '13px',
            color: theme.palette.text.secondary || '#d0d6e0',
            marginTop: '2px',
          }}>
            {subheader}
          </div>
        )}
      </div>
      {action && (
        <div style={{ marginLeft: theme.spacing(1) }}>
          {action}
        </div>
      )}
    </div>
  );
};

export default MyCardHeader;
