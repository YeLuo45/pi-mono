/**
 * MyTextField.tsx — MUI TextField replacement
 * 
 * Replaces MUI TextField component with custom styling using design tokens.
 * Supports: value, onChange, placeholder, error, helperText, variant (outlined/filled/standard)
 */

import { type FC, type ChangeEvent, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { borderRadius } from '../ui/design-tokens';

export interface MyTextFieldProps {
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  variant?: 'outlined' | 'filled' | 'standard';
  size?: 'small' | 'medium';
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url';
  multiline?: boolean;
  rows?: number;
  className?: string;
  sx?: Record<string, string | number>;
  InputProps?: {
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    sx?: Record<string, string | number>;
  };
  [key: string]: unknown;
}

export const MyTextField: FC<MyTextFieldProps> = ({
  value: initialValue = '',
  onChange,
  placeholder = '',
  error = false,
  helperText = '',
  variant = 'outlined',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  type = 'text',
  multiline = false,
  rows = 1,
  className = '',
  sx = {},
  InputProps = {},
  ...rest
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState(initialValue);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(e);
  };

  // Use value from props if controlled
  const displayValue = initialValue !== undefined ? initialValue : value;

  const sizeStyles = {
    small: {
      padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
      fontSize: '13px',
      minHeight: '32px',
    },
    medium: {
      padding: `${theme.spacing(1)} ${theme.spacing(1.5)}`,
      fontSize: '14px',
      minHeight: '32px',
    },
  };

  const currentSize = sizeStyles[size];
  const borderColor = error
    ? 'var(--system-red)'
    : isFocused
    ? 'var(--system-blue)'
    : 'var(--separator)';

  const getOutlinedStyles = () => ({
    container: {
      position: 'relative' as const,
      width: fullWidth ? '100%' : 'auto',
      display: 'inline-flex',
    },
    inputWrapper: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      border: `1px solid ${borderColor}`,
      borderRadius: borderRadius.md,
      backgroundColor: disabled ? 'var(--bg-hover)' : 'var(--bg-input)',
      transition: 'border-color var(--duration-short) var(--ease-macOS), box-shadow var(--duration-short) var(--ease-macOS)',
      boxShadow: isFocused ? '0 0 0 3px color-mix(in srgb, var(--system-blue) 25%, transparent)' : 'none',
      ...currentSize,
    },
    input: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'var(--text-primary)',
      fontSize: currentSize.fontSize,
      width: '100%',
      '&::placeholder': {
        color: 'var(--text-placeholder)',
        opacity: 1,
      },
    },
  });

  const getFilledStyles = () => ({
    container: {
      position: 'relative' as const,
      width: fullWidth ? '100%' : 'auto',
      display: 'inline-flex',
    },
    inputWrapper: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      border: `1px solid transparent`,
      borderBottomColor: borderColor,
      borderRadius: `${borderRadius.md} ${borderRadius.md} 0 0`,
      backgroundColor: disabled ? 'var(--bg-hover)' : 'var(--bg-input)',
      transition: 'border-color 0.2s ease',
      ...currentSize,
    },
    input: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'var(--text-primary)',
      fontSize: currentSize.fontSize,
      width: '100%',
      '&::placeholder': {
        color: 'var(--text-placeholder)',
        opacity: 1,
      },
    },
  });

  const getStandardStyles = () => ({
    container: {
      position: 'relative' as const,
      width: fullWidth ? '100%' : 'auto',
      display: 'inline-flex',
      flexDirection: 'column' as const,
    },
    inputWrapper: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      border: 'none',
      borderBottom: `1px solid ${borderColor}`,
      backgroundColor: 'transparent',
      transition: 'border-color 0.2s ease',
      ...currentSize,
    },
    input: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'var(--text-primary)',
      fontSize: currentSize.fontSize,
      width: '100%',
      '&::placeholder': {
        color: 'var(--text-placeholder)',
        opacity: 1,
      },
    },
  });

  const getStyles = () => {
    switch (variant) {
      case 'filled':
        return getFilledStyles();
      case 'standard':
        return getStandardStyles();
      default:
        return getOutlinedStyles();
    }
  };

  const styles = getStyles();
  const startAdornment = InputProps.startAdornment;
  const endAdornment = InputProps.endAdornment;

  return (
    <div className={className} style={{ ...styles.container, ...sx }}>
      <div
        style={{
          ...styles.inputWrapper,
          ...(InputProps.sx || {}),
        }}
      >
        {startAdornment && (
          <span style={{ display: 'flex', marginRight: theme.spacing(0.5) }}>
            {startAdornment}
          </span>
        )}

        {multiline ? (
          <textarea
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...rest}
            rows={rows}
            style={{
              ...styles.input,
              resize: 'vertical',
              padding: variant === 'standard' ? `${theme.spacing(0.5)} 0` : styles.input.padding,
              minHeight: rows * 24,
            }}
          />
        ) : (
          <input
            type={type}
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            {...rest}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={styles.input}
          />
        )}

        {endAdornment && (
          <span style={{ display: 'flex', marginLeft: theme.spacing(0.5) }}>
            {endAdornment}
          </span>
        )}
      </div>

      {/* Helper text / Error message */}
      {(helperText || error) && (
        <span
          style={{
            display: 'block',
            marginTop: theme.spacing(0.5),
            fontSize: '12px',
            color: error ? 'var(--system-red)' : 'var(--text-secondary)',
            lineHeight: 1.4,
          }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
};

export default MyTextField;
