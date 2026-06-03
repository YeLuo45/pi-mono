/**
 * MyPaper.tsx — MUI Paper replacement
 * 
 * Replaces MUI Paper component with custom styling using design tokens.
 * Supports: children, variant, elevation, outlined, square
 */

import { type FC, type ReactNode } from 'react';
import { Box } from '../ui/Box';

export interface MyPaperProps {
  children?: ReactNode;
  variant?: 'elevation' | 'outlined';
  elevation?: number;
  outlined?: boolean;
  square?: boolean;
  className?: string;
  sx?: Record<string, unknown>;
  style?: React.CSSProperties;
}

export const MyPaper: FC<MyPaperProps> = ({
  children,
  variant = 'elevation',
  elevation = 1,
  outlined = false,
  square = false,
  className = '',
  sx = {},
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

  const paperSx = {
    backgroundColor: 'var(--bg-elevated, #2d2d2d)',
    borderRadius: square ? '0px' : 'var(--radius-lg, 10px)',
    padding: '16px',
    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
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
    <Box className={className} sx={paperSx} style={style}>
      {children}
    </Box>
  );
};

export default MyPaper;
