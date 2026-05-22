/**
 * MyBadge.tsx — MUI Badge replacement
 * 
 * Replaces MUI Badge with custom styling.
 * Supports: badgeContent, children, color, variant
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyBadgeProps {
  badgeContent?: ReactNode;
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  variant?: 'standard' | 'dot';
  max?: number;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'right';
  };
}

export const MyBadge: FC<MyBadgeProps> = ({
  badgeContent,
  children,
  className = '',
  sx = {},
  color = 'primary',
  variant = 'standard',
  max = 99,
  anchorOrigin = { vertical: 'top', horizontal: 'right' },
}) => {
  const theme = useTheme();

  const colorMap: Record<string, string> = {
    primary: theme.palette.primary?.main || '#5e6ad2',
    secondary: theme.palette.secondary?.main || '#9c27b0',
    error: '#ef5350',
    info: '#2196f3',
    success: '#4caf50',
    warning: '#ff9800',
  };

  const bgColor = colorMap[color] || colorMap.primary;
  const displayContent = typeof badgeContent === 'number' && badgeContent > max ? `${max}+` : badgeContent;

  const horizontalOffset = anchorOrigin.horizontal === 'right' ? 'calc(100% - 8px)' : 'calc(-100% + 8px)';
  const verticalOffset = anchorOrigin.vertical === 'top' ? '-4px' : '4px';

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        ...sx,
      }}
    >
      {children}
      {badgeContent && (
        <span
          style={{
            position: 'absolute',
            top: verticalOffset,
            right: anchorOrigin.horizontal === 'right' ? '-4px' : 'auto',
            left: anchorOrigin.horizontal === 'left' ? '-4px' : 'auto',
            transform: anchorOrigin.horizontal === 'left' ? 'translateX(-50%)' : 'translateX(50%)',
            display: variant === 'dot' ? 'none' : 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            borderRadius: '9px',
            backgroundColor: bgColor,
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {displayContent}
        </span>
      )}
      {variant === 'dot' && badgeContent && (
        <span
          style={{
            position: 'absolute',
            top: verticalOffset,
            right: anchorOrigin.horizontal === 'right' ? '-2px' : 'auto',
            left: anchorOrigin.horizontal === 'left' ? '-2px' : 'auto',
            transform: anchorOrigin.horizontal === 'left' ? 'translateX(-50%)' : 'translateX(50%)',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: bgColor,
          }}
        />
      )}
    </span>
  );
};

export default MyBadge;
