/**
 * MyCollapse.tsx — MUI Collapse replacement
 * 
 * Replaces MUI Collapse component for animated show/hide.
 * Supports: in, children, timeout, orientation (horizontal/vertical)
 */

import { type FC, type ReactNode, useEffect, useState, type CSSProperties } from 'react';

export interface MyCollapseProps {
  in: boolean;
  children?: ReactNode;
  timeout?: number | 'auto';
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyCollapse: FC<MyCollapseProps> = ({
  in: inProp,
  children,
  timeout = 300,
  orientation = 'vertical',
  className = '',
  sx = {},
  style = {},
}) => {
  const [isExpanded, setIsExpanded] = useState(inProp);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    if (inProp) {
      setIsExpanded(true);
      setHeight('auto');
    } else {
      setHeight(0);
      const timer = setTimeout(() => setIsExpanded(false), timeout === 'auto' ? 300 : timeout);
      return () => clearTimeout(timer);
    }
  }, [inProp, timeout]);

  const containerStyle: CSSProperties = {
    overflow: 'hidden',
    transition: typeof timeout === 'number' 
      ? `height ${timeout}ms ease-in-out` 
      : 'height 300ms ease-in-out',
    height: isExpanded ? height : 0,
    ...sx,
    ...style,
  };

  if (!isExpanded && !inProp) {
    return null;
  }

  return (
    <div className={className} style={containerStyle}>
      {children}
    </div>
  );
};

export default MyCollapse;
