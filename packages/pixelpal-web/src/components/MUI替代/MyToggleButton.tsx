/**
 * MyToggleButton.tsx — MUI ToggleButton replacement
 * 
 * Replaces MUI ToggleButton with custom styling.
 * Supports: value, selected, onChange, children, color, size, disabled
 */

import { type FC, type ReactNode, type CSSProperties } from 'react';

export interface MyToggleButtonProps {
  value: string;
  selected?: boolean;
  onChange?: (value: string) => void;
  children?: ReactNode;
  color?: 'primary' | 'secondary' | 'standard';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
  sx?: CSSProperties;
  style?: CSSProperties;
}

export const MyToggleButton: FC<MyToggleButtonProps> = ({
  value,
  selected = false,
  onChange,
  children,
  color = 'standard',
  size = 'medium',
  disabled = false,
  className = '',
  sx = {},
  style = {},
}) => {
  const colorMap: Record<string, { bg: string; text: string; border: string; selectedBg: string; selectedText: string }> = {
    primary: {
      bg: 'transparent',
      text: '#fff',
      border: 'rgba(255, 255, 255, 0.2)',
      selectedBg: '#5e6ad2',
      selectedText: '#fff',
    },
    secondary: {
      bg: 'transparent',
      text: '#fff',
      border: 'rgba(255, 255, 255, 0.2)',
      selectedBg: '#7170ff',
      selectedText: '#fff',
    },
    standard: {
      bg: 'transparent',
      text: '#fff',
      border: 'rgba(255, 255, 255, 0.2)',
      selectedBg: 'rgba(255, 255, 255, 0.15)',
      selectedText: '#fff',
    },
  };

  const colors = colorMap[color] || colorMap.standard;
  const sizeStyles: Record<string, CSSProperties> = {
    small: { padding: '4px 12px', fontSize: '13px' },
    medium: { padding: '8px 16px', fontSize: '14px' },
    large: { padding: '12px 24px', fontSize: '16px' },
  };

  const buttonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: `1px solid ${selected ? colors.selectedBg : colors.border}`,
    borderRadius: '8px',
    backgroundColor: selected ? colors.selectedBg : colors.bg,
    color: selected ? colors.selectedText : colors.text,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
    ...sizeStyles[size],
    ...sx,
    ...style,
  };

  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(value);
    }
  };

  return (
    <button
      type="button"
      className={className}
      style={buttonStyle}
      onClick={handleClick}
      disabled={disabled}
      value={value}
    >
      {children}
    </button>
  );
};

export default MyToggleButton;
