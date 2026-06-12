/**
 * MyStack.tsx — MUI Stack replacement
 * 
 * Replaces MUI Stack component for flexbox layouts.
 * Supports: direction, spacing, alignItems, justifyContent, flex
 */

import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyStackProps {
  children?: ReactNode;
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  spacing?: number | string;
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  flex?: number | string;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
  divider?: ReactNode;
  gap?: number | string;
}

export const MyStack: FC<MyStackProps> = ({
  children,
  direction = 'column',
  spacing = 0,
  alignItems = 'stretch',
  justifyContent = 'flex-start',
  flex,
  className = '',
  sx = {},
  style = {},
  divider,
  gap,
}) => {
  const stackStyle: CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    alignItems,
    justifyContent,
    gap: gap ?? (typeof spacing === 'number' ? `${spacing * 8}px` : spacing),
    flex,
    ...sx,
    ...style,
  };

  if (divider) {
    const childArray = Array.isArray(children) ? children : [children];
    return (
      <div className={className} style={stackStyle}>
        {childArray.map((child, index) => (
          <div key={index}>
            {child}
            {index < childArray.length - 1 && divider}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className} style={stackStyle}>
      {children}
    </div>
  );
};

export default MyStack;
