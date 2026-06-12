/**
 * MyFormControl.tsx — MUI FormControl + InputLabel + FormControlLabel replacement
 * 
 * Replaces MUI FormControl, InputLabel, FormControlLabel with custom styling.
 */

import { type FC, type ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';
import { borderRadius } from '../ui/design-tokens';

export interface MyFormControlProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
  error?: boolean;
}

export const MyFormControl: FC<MyFormControlProps> = ({
  children,
  className = '',
  sx = {},
  fullWidth = false,
  size = 'medium',
  variant = 'outlined',
  error = false,
}) => {
  const theme = useTheme();

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: fullWidth ? '100%' : 'auto',
        ...sx,
      }}
    >
      {children}
    </div>
  );
};

export interface MyInputLabelProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  htmlFor?: string;
  shrink?: boolean;
  error?: boolean;
  size?: 'normal' | 'small';
}

export const MyInputLabel: FC<MyInputLabelProps> = ({
  children,
  className = '',
  sx = {},
  shrink = false,
  error = false,
  size = 'normal',
}) => {
  const theme = useTheme();
  const fontSize = size === 'small' ? '12px' : '14px';

  return (
    <label
      className={className}
      style={{
        display: shrink ? 'inline-block' : 'block',
        marginBottom: shrink ? 0 : theme.spacing(0.5),
        fontSize,
        fontWeight: 500,
        color: error
          ? '#ef5350'
          : theme.palette.text.secondary || '#d0d6e0',
        transition: 'color 0.2s ease',
        ...sx,
      }}
    >
      {children}
    </label>
  );
};

export interface MyFormControlLabelProps {
  children?: ReactNode;
  className?: string;
  sx?: Record<string, string | number>;
  control?: ReactNode;
  label?: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
  name?: string;
}

export const MyFormControlLabel: FC<MyFormControlLabelProps> = ({
  children,
  className = '',
  sx = {},
  control,
  label,
  disabled = false,
}) => {
  const theme = useTheme();

  return (
    <label
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginRight: theme.spacing(2),
        opacity: disabled ? 0.5 : 1,
        ...sx,
      }}
    >
      {control}
      {label && (
        <span
          style={{
            marginLeft: theme.spacing(1),
            fontSize: '14px',
            color: theme.palette.text.primary || '#f7f8f8',
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
};

export default MyFormControl;
