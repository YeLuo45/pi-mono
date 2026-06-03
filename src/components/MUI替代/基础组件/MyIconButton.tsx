import { type FC, type CSSProperties, useState } from 'react';

export interface MyIconButtonProps {
  children?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info' | 'inherit';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  sx?: CSSProperties;
  edge?: 'start' | 'end' | false;
}

export const MyIconButton: FC<MyIconButtonProps> = ({
  children,
  color = 'inherit',
  size = 'medium',
  disabled = false,
  onClick,
  className = '',
  sx = {},
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const sizeStyles: Record<string, CSSProperties> = {
    small: { width: 28, height: 28, minWidth: 28, minHeight: 28, borderRadius: '5px' },
    medium: { width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: '6px' },
    large: { width: 40, height: 40, minWidth: 40, minHeight: 40, borderRadius: '8px' },
  };

  const colorMap: Record<string, string> = {
    primary: 'var(--system-blue)',
    secondary: 'var(--system-purple)',
    error: 'var(--system-red)',
    warning: 'var(--system-orange)',
    success: 'var(--system-green)',
    info: 'var(--system-teal)',
    inherit: 'currentColor',
  };

  const getStyles = (): CSSProperties => {
    const base: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      background: 'transparent',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
      padding: 0,
      color: colorMap[color] || colorMap.inherit,
      ...sizeStyles[size],
    };

    if (disabled) {
      return { ...base, ...sx };
    }

    if (isActive) {
      base.transform = 'scale(0.93)';
      base.backgroundColor = 'var(--bg-active, rgba(255, 255, 255, 0.08))';
    } else if (isHovered) {
      base.transform = 'scale(1.04)';
      base.backgroundColor = 'var(--bg-hover, rgba(255, 255, 255, 0.04))';
    }

    return { ...base, ...sx };
  };

  return (
    <button
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
      {children}
    </button>
  );
};

export default MyIconButton;
