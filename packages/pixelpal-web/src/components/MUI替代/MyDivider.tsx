/**
 * MyDivider.tsx — MUI Divider replacement
 * 
 * Replaces MUI Divider with custom styling.
 * Supports: orientation, flexItem, light, absolute
 */

import { type FC, type CSSProperties } from 'react';

export interface MyDividerProps {
  orientation?: 'horizontal' | 'vertical';
  flexItem?: boolean;
  light?: boolean;
  absolute?: boolean;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyDivider: FC<MyDividerProps> = ({
  orientation = 'horizontal',
  flexItem = false,
  light = false,
  absolute = false,
  className = '',
  sx = {},
  style = {},
}) => {
  const dividerStyle: CSSProperties = {
    ...(orientation === 'horizontal'
      ? {
          width: '100%',
          height: '1px',
          border: 'none',
          borderTop: `1px solid ${light ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)'}`,
          margin: '12px 0',
        }
      : {
          width: '1px',
          height: '100%',
          border: 'none',
          borderLeft: `1px solid ${light ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)'}`,
          margin: '0 12px',
        }),
    ...(flexItem && { alignSelf: 'stretch' }),
    ...(absolute && { position: 'absolute', bottom: 0, left: 0 }),
    ...sx,
    ...style,
  };

  return <hr className={className} style={dividerStyle} />;
};

export default MyDivider;
