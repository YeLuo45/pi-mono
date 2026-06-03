import { css } from '@emotion/react';
import { Search } from 'lucide-react';

interface MacSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MacSearchField({ value, onChange, placeholder = '搜索' }: MacSearchFieldProps) {
  return (
    <div
      css={css({
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        margin: 'var(--space-2)',
        padding: '6px 10px',
        borderRadius: 'var(--control-radius, 6px)',
        background: 'var(--bg-input)',
        border: '1px solid var(--separator)',
      })}
    >
      <Search size={14} color="var(--text-secondary)" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        css={css({
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-base)',
          fontFamily: 'var(--font-stack)',
          '&::placeholder': { color: 'var(--text-tertiary)' },
        })}
      />
    </div>
  );
}
