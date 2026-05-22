/**
 * MyCheckbox.tsx — MUI Checkbox replacement
 * 
 * Replaces MUI Checkbox with custom styling.
 * Supports: checked, onChange, disabled, indeterminate
 */

import { type FC } from 'react';
import { useTheme } from '@mui/material/styles';

export interface MyCheckboxProps {
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  className?: string;
  sx?: Record<string, string | number>;
  inputProps?: {
    'aria-label'?: string;
  };
}

export const MyCheckbox: FC<MyCheckboxProps> = ({
  checked = false,
  onChange,
  disabled = false,
  indeterminate = false,
  className = '',
  sx = {},
  inputProps = {},
}) => {
  const theme = useTheme();

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...sx,
      }}
    >
      <span
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '4px',
          border: `2px solid ${
            checked || indeterminate
              ? theme.palette.primary?.main || '#5e6ad2'
              : theme.palette.divider || 'rgba(255,255,255,0.2)'
          }`,
          backgroundColor: checked || indeterminate
            ? theme.palette.primary?.main || '#5e6ad2'
            : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
      >
        {(checked || indeterminate) && (
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
            {indeterminate ? '−' : '✓'}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
        }}
        {...inputProps}
      />
    </span>
  );
};

export default MyCheckbox;
