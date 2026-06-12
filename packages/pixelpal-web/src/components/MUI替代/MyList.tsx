/**
 * MyList.tsx — MUI List replacement
 * 
 * Replaces MUI List component for list layouts.
 * Supports: children, dense, disablePadding, subheader
 */

import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyListProps {
  children?: ReactNode;
  dense?: boolean;
  disablePadding?: boolean;
  subheader?: ReactNode;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyList: FC<MyListProps> = ({
  children,
  dense = false,
  disablePadding = false,
  subheader,
  className = '',
  sx = {},
  style = {},
}) => {
  const listStyle: CSSProperties = {
    listStyle: 'none',
    padding: disablePadding ? '0' : dense ? '4px 0' : '8px 0',
    margin: 0,
    ...sx,
    ...style,
  };

  return (
    <ul className={className} style={listStyle}>
      {subheader && (
        <li style={{ padding: '0 16px', marginBottom: '8px' }}>
          {subheader}
        </li>
      )}
      {children}
    </ul>
  );
};

export default MyList;
