import React, { useState, useCallback } from 'react';
import { Box, Button, IconButton } from '@mui/material';

export interface RippleEffectProps {
  children: React.ReactNode;
  color?: string;
  disabled?: boolean;
  className?: string;
}

export interface RippleState {
  x: number;
  y: number;
  id: number;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  children,
  color = 'rgba(255, 255, 255, 0.3)',
  disabled = false,
  className,
}) => {
  const [ripples, setRipples] = useState<RippleState[]>([]);
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
      setIsPressed(true);
    },
    [disabled]
  );

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleAnimationEnd = useCallback((id: number) => {
    setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
  }, []);

  return (
    <Box
      className={className}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={(e) => {
        if (disabled) return;
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
        setIsPressed(true);
      }}
      onTouchEnd={handleMouseUp}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}

      {/* Ripple elements */}
      {ripples.map((ripple) => (
        <Box
          key={ripple.id}
          onAnimationEnd={() => handleAnimationEnd(ripple.id)}
          sx={{
            position: 'absolute',
            borderRadius: '50%',
            backgroundColor: color,
            width: 200,
            height: 200,
            transform: `translate(-50%, -50%) translate(${ripple.x}px, ${ripple.y}px)`,
            animation: 'ripple 0.6s ease-out forwards',
            pointerEvents: 'none',
            '@keyframes ripple': {
              '0%': {
                opacity: 0.5,
                transform: 'translate(-50%, -50%) translate(var(--x), var(--y)) scale(0)',
              },
              '100%': {
                opacity: 0,
                transform: 'translate(-50%, -50%) translate(var(--x), var(--y)) scale(1)',
              },
            },
          }}
        />
      ))}
    </Box>
  );
};

/**
 * Button with ripple effect
 */
export interface RippleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'inherit';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  className?: string;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  onClick,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  className,
}) => {
  const [ripples, setRipples] = useState<RippleState[]>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
      onClick?.();
    },
    [disabled, onClick]
  );

  const handleAnimationEnd = useCallback((id: number) => {
    setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
  }, []);

  const colorValue = color === 'inherit' ? 'inherit' : `${color}.main`;

  return (
    <Box
      component="button"
      onClick={handleClick}
      disabled={disabled}
      className={className}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        border: 'none',
        outline: 'none',
        cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        borderRadius: 1,
        fontWeight: 510,
        fontSize: size === 'small' ? 12 : size === 'large' ? 16 : 14,
        minHeight: size === 'small' ? 32 : size === 'large' ? 48 : 40,
        px: size === 'small' ? 1.5 : size === 'large' ? 3 : 2,
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.5 : 1,
        backgroundColor:
          variant === 'contained'
            ? disabled
              ? 'rgba(0,0,0,0.12)'
              : colorValue
            : 'transparent',
        color:
          variant === 'contained'
            ? '#fff'
            : disabled
            ? 'rgba(0,0,0,0.26)'
            : colorValue,
        borderWidth: variant === 'outlined' ? 1 : 0,
        borderStyle: 'solid',
        borderColor: disabled ? 'rgba(0,0,0,0.26)' : colorValue,
        transition: 'all 0.15s ease',
        '&:hover': {
          backgroundColor:
            variant === 'contained'
              ? disabled
                ? 'rgba(0,0,0,0.12)'
                : `${colorValue}`
              : variant === 'outlined'
              ? 'rgba(0,0,0,0.04)'
              : 'rgba(0,0,0,0.08)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      }}
    >
      {startIcon}
      {children}

      {/* Ripples */}
      {ripples.map((ripple) => (
        <Box
          key={ripple.id}
          onAnimationEnd={() => handleAnimationEnd(ripple.id)}
          sx={{
            position: 'absolute',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            width: 200,
            height: 200,
            transform: `translate(-50%, -50%) translate(${ripple.x}px, ${ripple.y}px)`,
            animation: 'ripple 0.6s ease-out forwards',
            pointerEvents: 'none',
            '@keyframes ripple': {
              '0%': {
                opacity: 0.5,
                transform: 'translate(-50%, -50%) translate(var(--x), var(--y)) scale(0)',
              },
              '100%': {
                opacity: 0,
                transform: 'translate(-50%, -50%) translate(var(--x), var(--y)) scale(1)',
              },
            },
          }}
        />
      ))}
    </Box>
  );
};

export default RippleEffect;
