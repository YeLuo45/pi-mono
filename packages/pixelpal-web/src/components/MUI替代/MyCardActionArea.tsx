/**
 * MyCardActionArea.tsx — MUI CardActionArea replacement
 * 
 * Replaces MUI CardActionArea for clickable card content.
 * Supports: children, onClick, className, sx, style
 */

import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyCardActionAreaProps {
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyCardActionArea: FC<MyCardActionAreaProps> = ({
  children,
  onClick,
  className = '',
  sx = {},
  style = {},
}) => {
  const areaStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
    cursor: onClick ? 'pointer' : 'default',
    borderRadius: '12px',
    transition: 'background-color 0.2s ease',
    ...sx,
    ...style,
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={className}
      style={areaStyle}
      onClick={handleClick}
      role="button"
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
};

export default MyCardActionArea;
