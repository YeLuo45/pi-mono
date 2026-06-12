import { type FC, type ReactNode, type CSSProperties, useState } from 'react';

export interface MyButtonProps {
  children?: ReactNode;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'inherit';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  sx?: CSSProperties;
}

export const MyButton: FC<MyButtonProps> = ({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  startIcon,
  endIcon,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  sx = {},
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const sizeStyles: Record<string, CSSProperties> = {
    small: { padding: '4px 10px', fontSize: '12px', minHeight: '28px', borderRadius: '5px' },
    medium: { padding: '6px 14px', fontSize: '13px', minHeight: '32px', borderRadius: '6px' },
    large: { padding: '10px 20px', fontSize: '14px', minHeight: '40px', borderRadius: '8px' },
  };

  const colorMap: Record<string, { bg: string; text: string; border: string; accent: string }> = {
    primary: { bg: 'var(--system-blue)', text: '#fff', border: 'var(--system-blue)', accent: 'var(--system-blue)' },
    secondary: { bg: 'var(--system-purple)', text: '#fff', border: 'var(--system-purple)', accent: 'var(--system-purple)' },
    error: { bg: 'var(--system-red)', text: '#fff', border: 'var(--system-red)', accent: 'var(--system-red)' },
    warning: { bg: 'var(--system-orange)', text: '#fff', border: 'var(--system-orange)', accent: 'var(--system-orange)' },
    success: { bg: 'var(--system-green)', text: '#fff', border: 'var(--system-green)', accent: 'var(--system-green)' },
    info: { bg: 'var(--system-teal)', text: '#fff', border: 'var(--system-teal)', accent: 'var(--system-teal)' },
    inherit: { bg: 'transparent', text: 'currentColor', border: 'transparent', accent: 'currentColor' },
  };

  const colors = colorMap[color] || colorMap.primary;

  const getStyles = (): CSSProperties => {
    const base: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      fontWeight: 500,
      fontFamily: 'var(--font-stack, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      width: fullWidth ? '100%' : 'auto',
      border: '1px solid transparent',
      ...sizeStyles[size],
    };

    if (disabled) {
      if (variant === 'contained') {
        base.backgroundColor = colors.bg;
        base.color = colors.text;
      } else if (variant === 'outlined') {
        base.borderColor = 'var(--separator)';
        base.color = 'var(--text-secondary)';
      } else {
        base.color = 'var(--text-secondary)';
      }
      return { ...base, ...sx };
    }

    // Active scale feedback
    if (isActive) {
      base.transform = 'scale(0.97)';
    } else if (isHovered) {
      base.transform = 'scale(1.01)';
    }

    if (variant === 'contained') {
      base.backgroundColor = colors.bg;
      base.color = colors.text;
      base.borderColor = colors.bg;
      base.boxShadow = isHovered 
        ? '0 2px 8px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)' 
        : '0 1px 3px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
      
      if (isHovered) {
        base.filter = 'brightness(1.08)';
      }
      if (isActive) {
        base.filter = 'brightness(0.92)';
      }
    } else if (variant === 'outlined') {
      base.backgroundColor = isHovered ? 'var(--bg-hover, rgba(255, 255, 255, 0.04))' : 'transparent';
      base.color = colors.accent;
      base.borderColor = isHovered ? 'rgba(255, 255, 255, 0.2)' : 'var(--separator, rgba(255, 255, 255, 0.1))';
      if (isActive) {
        base.backgroundColor = 'var(--bg-active, rgba(255, 255, 255, 0.08))';
      }
    } else {
      // Text variant
      base.backgroundColor = isHovered ? 'var(--bg-hover, rgba(255, 255, 255, 0.04))' : 'transparent';
      base.color = colors.accent;
      if (isActive) {
        base.backgroundColor = 'var(--bg-active, rgba(255, 255, 255, 0.08))';
      }
    }

    return { ...base, ...sx };
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={getStyles()}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => !disabled && setIsActive(true)}
      onMouseUp={() => !disabled && setIsActive(false)}
    >
      {startIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{startIcon}</span>}
      {children}
      {endIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{endIcon}</span>}
    </button>
  );
};

export default MyButton;
