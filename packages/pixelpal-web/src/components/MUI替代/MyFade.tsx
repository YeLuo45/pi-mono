/**
 * MyFade.tsx — MUI Fade replacement
 * 
 * Replaces MUI Fade component for fade transitions.
 * Supports: in, children, timeout, unmountOnExit
 */

import React, { type FC, type ReactNode, useEffect, useState, type CSSProperties } from 'react';

export interface MyFadeProps {
  in: boolean;
  children?: ReactNode;
  timeout?: number | { enter?: number; exit?: number };
  unmountOnExit?: boolean;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyFade: FC<MyFadeProps> = ({
  in: inProp,
  children,
  timeout = 300,
  unmountOnExit = false,
  className = '',
  sx = {},
  style = {},
}) => {
  const [isVisible, setIsVisible] = useState(inProp);
  const [opacity, setOpacity] = useState(inProp ? 1 : 0);

  useEffect(() => {
    if (inProp) {
      setIsVisible(true);
      // Force reflow
      requestAnimationFrame(() => {
        setOpacity(1);
      });
    } else {
      setOpacity(0);
      const exitDuration = typeof timeout === 'number' ? timeout : (timeout.exit || 300);
      if (unmountOnExit) {
        const timer = setTimeout(() => setIsVisible(false), exitDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [inProp, timeout, unmountOnExit]);

  if (unmountOnExit && !isVisible) {
    return null;
  }

  const transitionDuration = typeof timeout === 'number' ? timeout : (timeout.enter || 300);

  const containerStyle: CSSProperties = {
    opacity,
    transition: `opacity ${transitionDuration}ms ease-in-out`,
    ...sx,
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {children}
    </div>
  );
};

export default MyFade;
