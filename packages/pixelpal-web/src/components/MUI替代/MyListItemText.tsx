/**
 * MyListItemText.tsx — MUI ListItemText replacement
 * 
 * Replaces MUI ListItemText for text content in lists.
 * Supports: primary, secondary, inset, primaryTypographyProps, secondaryTypographyProps
 */

import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyListItemTextProps {
  primary?: ReactNode;
  secondary?: ReactNode;
  inset?: boolean;
  primaryTypographyProps?: {
    className?: string;
    sx?: CSSProperties;
    style?: CSSProperties;
  };
  secondaryTypographyProps?: {
    className?: string;
    sx?: CSSProperties;
    style?: CSSProperties;
  };
  className?: string;
}

export const MyListItemText: FC<MyListItemTextProps> = ({
  primary,
  secondary,
  inset = false,
  primaryTypographyProps = {},
  secondaryTypographyProps = {},
  className = '',
}) => {
  const primaryStyle: CSSProperties = {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    margin: 0,
    paddingLeft: inset ? '32px' : '0',
    ...primaryTypographyProps.sx,
    ...primaryTypographyProps.style,
  };

  const secondaryStyle: CSSProperties = {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '12px',
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.6)',
    margin: '4px 0 0 0',
    paddingLeft: inset ? '32px' : '0',
    ...secondaryTypographyProps.sx,
    ...secondaryTypographyProps.style,
  };

  return (
    <div className={className}>
      {primary && (
        <p style={primaryStyle} className={primaryTypographyProps.className}>
          {primary}
        </p>
      )}
      {secondary && (
        <p style={secondaryStyle} className={secondaryTypographyProps.className}>
          {secondary}
        </p>
      )}
    </div>
  );
};

export default MyListItemText;
