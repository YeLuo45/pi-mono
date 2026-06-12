/**
 * MySelect.tsx — MUI Select replacement
 * 
 * Replaces MUI Select component with custom styling using design tokens.
 * Supports: value, onChange, MenuItem, variant
 */

import { type FC, type ReactNode, useState, useRef, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { borderRadius } from '../ui/design-tokens';

export interface MySelectProps {
  value?: string | number;
  onChange?: (value: string | number) => void;
  children?: ReactNode;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  className?: string;
  sx?: Record<string, string | number>;
  displayEmpty?: boolean;
  native?: boolean;
}

export interface MyMenuItemProps {
  value: string | number;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export const MyMenuItem: FC<MyMenuItemProps> = ({
  value,
  children,
  disabled = false,
  className = '',
}) => {
  return (
    <option value={value} disabled={disabled} className={className}>
      {children}
    </option>
  );
};

export const MySelect: FC<MySelectProps> = ({
  value = '',
  onChange,
  children,
  disabled = false,
  size = 'medium',
  fullWidth = false,
  className = '',
  sx = {},
  displayEmpty = false,
  native = false,
}) => {
  const theme = useTheme();
  const shop = theme.palette.shop || {};
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const selectRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Update selectedValue when value prop changes
  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || !listboxRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const listbox = listboxRef.current;
      if (!listbox) return;

      const options = Array.from(listbox.querySelectorAll('li:not([aria-disabled="true"])')) as HTMLLIElement[];
      const currentIndex = options.findIndex(
        (opt) => opt.dataset.value === String(selectedValue)
      );

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (currentIndex < options.length - 1) {
            const nextOption = options[currentIndex + 1];
            nextOption.focus();
            setSelectedValue(nextOption.dataset.value || '');
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (currentIndex > 0) {
            const prevOption = options[currentIndex - 1];
            prevOption.focus();
            setSelectedValue(prevOption.dataset.value || '');
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          setIsOpen(false);
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedValue]);

  const handleSelectClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue: string | number) => {
    setSelectedValue(optionValue);
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const handleListboxKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  // Find selected label
  const getSelectedLabel = () => {
    let label = '';
    const childArray = Array.isArray(children) ? children : children ? [children] : [];
    
    childArray.forEach((child) => {
      if (child && typeof child === 'object' && 'props' in child) {
        const childProps = child.props as { value?: string | number };
        if (childProps.value === selectedValue) {
          // Get text content from children
          const childAny = child as { props: { children?: ReactNode } };
          if (typeof childAny.props.children === 'string') {
            label = childAny.props.children;
          } else if (Array.isArray(childAny.props.children)) {
            label = childAny.props.children
              .map((c) => (typeof c === 'string' ? c : ''))
              .join('');
          }
        }
      }
    });

    return label || (displayEmpty ? '' : 'Select...');
  };

  const sizeStyles = {
    small: {
      padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
      fontSize: '13px',
      minHeight: '32px',
    },
    medium: {
      padding: `${theme.spacing(1)} ${theme.spacing(1.5)}`,
      fontSize: '14px',
      minHeight: '40px',
    },
  };

  const currentSize = sizeStyles[size];

  const getSelectDisplayStyles = () => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none' as const,
    border: `1px solid ${
      isOpen
        ? theme.palette.primary?.main || '#5e6ad2'
        : theme.palette.divider || 'rgba(255,255,255,0.1)'
    }`,
    borderRadius: borderRadius.md,
    backgroundColor: disabled
      ? 'rgba(255,255,255,0.04)'
      : shop.selectBackground || theme.palette.background?.paper || '#0f1011',
    color: theme.palette.text?.primary || '#f7f8f8',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: isOpen ? `0 0 0 2px ${theme.palette.primary?.main}20` : 'none',
    ...currentSize,
  });

  // Render native select for accessibility
  if (native) {
    return (
      <select
        value={String(selectedValue)}
        onChange={(e) => onChange?.(e.target.value as string | number)}
        disabled={disabled}
        className={className}
        style={{
          width: fullWidth ? '100%' : 'auto',
          ...currentSize,
          border: `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.1)'}`,
          borderRadius: borderRadius.md,
          backgroundColor: shop.selectBackground || theme.palette.background?.paper || '#0f1011',
          color: theme.palette.text?.primary || '#f7f8f8',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          ...sx,
        }}
      >
        {children}
      </select>
    );
  }

  return (
    <div
      ref={selectRef}
      className={className}
      style={{
        position: 'relative',
        width: fullWidth ? '100%' : 'auto',
        minWidth: '120px',
        ...sx,
      }}
    >
      {/* Select display */}
      <div
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        aria-label="Select an option"
        tabIndex={disabled ? -1 : 0}
        onClick={handleSelectClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        style={getSelectDisplayStyles()}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getSelectedLabel()}
        </span>
        <span style={{ marginLeft: theme.spacing(1), fontSize: '12px', opacity: 0.7 }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* Dropdown listbox */}
      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          aria-activedescendant={String(selectedValue)}
          onKeyDown={handleListboxKeyDown}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: theme.spacing(0.5),
            padding: 0,
            listStyle: 'none',
            border: `1px solid ${theme.palette.divider || 'rgba(255,255,255,0.1)'}`,
            borderRadius: borderRadius.md,
            backgroundColor: shop.selectBackground || theme.palette.background?.paper || '#0f1011',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: theme.zIndex.select || 1300,
            maxHeight: '200px',
            overflowY: 'auto',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Parse and render children as options */}
          {Array.isArray(children) ? children.map((child, index) => {
            if (!child) return null;
            if (typeof child === 'string') {
              return (
                <li
                  key={`text-${index}`}
                  role="option"
                  aria-selected={String(((child as any)?.props?.value)) === String(selectedValue)}
                  style={{
                    padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: theme.palette.text?.primary || '#f7f8f8',
                    backgroundColor: 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                  onClick={() => handleOptionClick(child as unknown as string | number)}
                >
                  {child}
                </li>
              );
            }
            if (typeof child === 'object' && 'props' in child) {
              const childProps = child as { props: { value?: string | number; children?: ReactNode; disabled?: boolean; className?: string } };
              const optionValue = childProps.props.value;
              const optionLabel = typeof childProps.props.children === 'string'
                ? childProps.props.children
                : '';
              const isSelected = String(optionValue) === String(selectedValue);
              const isOptionDisabled = childProps.props.disabled || false;

              return (
                <li
                  key={String(optionValue)}
                  id={String(optionValue)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isOptionDisabled}
                  data-value={String(optionValue)}
                  tabIndex={-1}
                  onClick={() => !isOptionDisabled && handleOptionClick(optionValue!)}
                  style={{
                    padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
                    cursor: isOptionDisabled ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    color: isOptionDisabled
                      ? theme.palette.text?.disabled || '#62666d'
                      : isSelected
                      ? theme.palette.primary?.main || '#5e6ad2'
                      : theme.palette.text?.primary || '#f7f8f8',
                    backgroundColor: isSelected
                      ? `${theme.palette.primary?.main || '#5e6ad2'}15`
                      : 'transparent',
                    fontWeight: isSelected ? 500 : 400,
                    display: 'flex',
                    alignItems: 'center',
                    opacity: isOptionDisabled ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isOptionDisabled) {
                      (e.target as HTMLLIElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isOptionDisabled) {
                      (e.target as HTMLLIElement).style.backgroundColor = isSelected
                        ? `${theme.palette.primary?.main || '#5e6ad2'}15`
                        : 'transparent';
                    }
                  }}
                >
                  {optionLabel}
                </li>
              );
            }
            return null;
          }) : null}
        </ul>
      )}
    </div>
  );
};

export default MySelect;
