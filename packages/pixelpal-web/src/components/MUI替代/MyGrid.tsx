/**
 * MyGrid.tsx — MUI Grid replacement
 * 
 * Replaces MUI Grid component for CSS Grid layouts.
 * Supports: container, item, spacing, xs/sm/md/lg/xl breakpoints
 */

import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyGridProps {
  children?: ReactNode;
  container?: boolean;
  item?: boolean;
  spacing?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyGrid: FC<MyGridProps> = ({
  children,
  container = false,
  item = false,
  spacing = 0,
  xs,
  sm,
  md,
  lg,
  xl,
  className = '',
  sx = {},
  style = {},
}) => {
  const getGridTemplateColumns = (): string => {
    const columns: (number | string)[] = [];
    
    if (xs === true) columns.push('1fr');
    else if (typeof xs === 'number') columns.push(`repeat(${xs}, 1fr)`);
    
    if (sm === true) columns.push('1fr');
    else if (typeof sm === 'number') columns.push(`repeat(${sm}, 1fr)`);
    
    if (md === true) columns.push('1fr');
    else if (typeof md === 'number') columns.push(`repeat(${md}, 1fr)`);
    
    if (lg === true) columns.push('1fr');
    else if (typeof lg === 'number') columns.push(`repeat(${lg}, 1fr)`);
    
    if (xl === true) columns.push('1fr');
    else if (typeof xl === 'number') columns.push(`repeat(${xl}, 1fr)`);

    if (columns.length === 0) return 'none';
    return columns.join(' ');
  };

  const getSpacing = (): string => {
    if (typeof spacing === 'number') return `${spacing * 8}px`;
    if (typeof spacing === 'object') {
      const val = spacing.xs || spacing.sm || spacing.md || spacing.lg || spacing.xl || 0;
      return `${val * 8}px`;
    }
    return '0px';
  };

  const gridStyle: CSSProperties = {
    display: container ? 'grid' : 'block',
    ...(container && {
      gap: getSpacing(),
    }),
    ...(item && {
      gridColumn: typeof xs === 'number' ? `span ${xs}` : xs === true ? 'span 1' : 'auto',
    }),
    ...sx,
    ...style,
  };

  return (
    <div className={className} style={gridStyle}>
      {children}
    </div>
  );
};

export default MyGrid;
