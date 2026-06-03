/**
 * MyCard.tsx — MUI Card replacement
 * 
 * Replaces MUI Card component with custom styling using design tokens.
 * Supports: children, variant, elevation, outlined
 */

import { type FC, type ReactNode } from 'react';
import { Box } from '../ui/Box';

export interface MyCardProps {
  children?: ReactNode;
  variant?: 'elevation' | 'outlined';
  elevation?: number;
  outlined?: boolean;
  className?: string;
  sx?: Record<string, unknown>;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const MyCard: FC<MyCardProps> = ({
  children,
  variant = 'elevation',
  elevation = 1,
  outlined = false,
  className = '',
  sx = {},
  onClick,
  style = {},
}) => {
  const getShadow = (level: number): string => {
    const shadows = [
      'none',
      '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
      '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
      '0 10px 15px rgba(0, 0, 0, 0.07), 0 4px 6px rgba(0, 0, 0, 0.05)',
      '0 20px 25px rgba(0, 0, 0, 0.08), 0 10px 10px rgba(0, 0, 0, 0.04)',
      '0 25px 50px rgba(0, 0, 0, 0.15)',
    ];
    return shadows[Math.min(level, shadows.length - 1)] || shadows[1];
  };

  const cardSx = {
    backgroundColor: 'var(--bg-elevated, #2d2d2d)',
    borderRadius: 'var(--radius-lg, 10px)',
    padding: '16px',
    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: onClick ? 'pointer' : 'default',
    ...(variant === 'outlined' || outlined
      ? {
          border: '1px solid var(--separator, rgba(255, 255, 255, 0.08))',
          boxShadow: 'none',
        }
      : {
          boxShadow: getShadow(elevation),
        }),
    ...sx,
  };

  return (
    <Box
      className={className}
      sx={cardSx}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </Box>
  );
};

export interface MyCardContentProps {
  children: React.ReactNode;
  sx?: Record<string, unknown>;
  className?: string;
}

export const MyCardContent: FC<MyCardContentProps> = ({ children, sx = {}, className = '' }) => {
  return (
    <Box className={className} sx={{ padding: '0 16px 16px', ...sx }}>
      {children}
    </Box>
  );
};

export default MyCard;
