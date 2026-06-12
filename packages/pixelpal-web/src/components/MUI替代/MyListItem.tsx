/**
 * MyListItem.tsx — MUI ListItem replacement
 * 
 * Replaces MUI ListItem with custom styling.
 * Supports: children, button, selected, disabled, onClick, alignItems
 */

import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyListItemProps {
  children?: ReactNode;
  button?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  alignItems?: 'flex-start' | 'center';
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyListItem: FC<MyListItemProps> = ({
  children,
  button = false,
  selected = false,
  disabled = false,
  onClick,
  alignItems = 'center',
  className = '',
  sx = {},
  style = {},
}) => {
  const listItemStyle: CSSProperties = {
    display: 'flex',
    alignItems,
    padding: '8px 16px',
    cursor: button || onClick ? 'pointer' : 'default',
    backgroundColor: selected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 0.2s ease',
    borderRadius: '8px',
    margin: '2px 8px',
    ...sx,
    ...style,
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <li
      className={className}
      style={listItemStyle}
      onClick={handleClick}
      role={button ? 'button' : undefined}
      tabIndex={button && !disabled ? 0 : undefined}
    >
      {children}
    </li>
  );
};

export default MyListItem;
