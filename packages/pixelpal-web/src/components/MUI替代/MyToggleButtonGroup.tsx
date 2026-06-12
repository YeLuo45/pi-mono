/**
 * MyToggleButtonGroup.tsx — MUI ToggleButtonGroup replacement
 * 
 * Replaces MUI ToggleButtonGroup with custom styling.
 * Supports: value, onChange, children, color, size, exclusive, disabled
 */

import React, { type FC, type ReactNode, type CSSProperties } from 'react';
import { MyToggleButton, type MyToggleButtonProps } from './MyToggleButton';

export interface MyToggleButtonGroupProps {
  children?: ReactNode;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  color?: 'primary' | 'secondary' | 'standard';
  size?: 'small' | 'medium' | 'large';
  exclusive?: boolean;
  disabled?: boolean;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyToggleButtonGroup: FC<MyToggleButtonGroupProps> = ({
  children,
  value,
  onChange,
  color = 'standard',
  size = 'medium',
  exclusive = true,
  disabled = false,
  className = '',
  sx = {},
  style = {},
}) => {
  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    gap: '0px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    ...sx,
    ...style,
  };

  const handleChange = (buttonValue: string) => {
    if (!onChange) return;

    if (exclusive) {
      onChange(buttonValue);
    } else {
      const currentValues = Array.isArray(value) ? value : value ? [value] : [];
      const newValues = currentValues.includes(buttonValue)
        ? currentValues.filter(v => v !== buttonValue)
        : [...currentValues, buttonValue];
      onChange(newValues);
    }
  };

  // Clone children to pass selected state and onChange
  const renderChildren = () => {
    if (!children) return null;
    
    const childrenArray = Array.isArray(children) ? children : [children];
    
    return childrenArray.map((child, index) => {
      if (!React.isValidElement(child)) return child;
      
      const buttonValue = (child.props as MyToggleButtonProps).value;
      const isSelected = exclusive
        ? value === buttonValue
        : Array.isArray(value) && value.includes(buttonValue);
      
      return React.cloneElement(child as React.ReactElement<MyToggleButtonProps>, {
        key: index,
        selected: isSelected,
        onChange: handleChange,
        color,
        size,
        disabled: disabled || (child.props as MyToggleButtonProps).disabled,
      });
    });
  };

  return (
    <div className={className} style={containerStyle} role="group">
      {renderChildren()}
    </div>
  );
};

export default MyToggleButtonGroup;
