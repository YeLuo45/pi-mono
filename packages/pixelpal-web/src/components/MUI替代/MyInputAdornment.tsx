/**
 * MyInputAdornment.tsx — MUI InputAdornment replacement
 * 
 * Replaces MUI InputAdornment for text field adornments.
 * Supports: children, position (start/end), disablePointerEvents, disableTypography
 */

import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyInputAdornmentProps {
  children?: ReactNode;
  position?: 'start' | 'end';
  disablePointerEvents?: boolean;
  disableTypography?: boolean;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyInputAdornment: FC<MyInputAdornmentProps> = ({
  children,
  position = 'end',
  disablePointerEvents = false,
  disableTypography = false,
  className = '',
  sx = {},
  style = {},
}) => {
  const adornmentStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: disablePointerEvents ? 'none' : 'auto',
    margin: position === 'start' ? '0 8px 0 0' : '0 0 0 8px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    ...sx,
    ...style,
  };

  const content = disableTypography ? children : (
    <span style={{ fontSize: 'inherit', color: 'inherit' }}>
      {children}
    </span>
  );

  return (
    <div className={className} style={adornmentStyle}>
      {content}
    </div>
  );
};

export default MyInputAdornment;
