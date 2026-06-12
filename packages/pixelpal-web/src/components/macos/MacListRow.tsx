import { css } from '@emotion/react';
import { ReactNode } from 'react';

interface MacListRowProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export function MacListRow({ title, subtitle, icon, selected = false, onClick }: MacListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      css={css({
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        width: '100%',
        padding: 'var(--space-2) var(--space-3)',
        border: 'none',
        borderRadius: 'var(--control-radius)',
        background: selected ? 'var(--bg-active)' : 'transparent',
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: 'var(--font-stack)',
        fontSize: 'var(--text-base)',
        position: 'relative',
        transition: `background var(--duration-short) var(--ease-macOS), color var(--duration-short) var(--ease-macOS)`,
        ...(selected && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: 3,
            borderRadius: '0 2px 2px 0',
            background: 'var(--system-blue)',
          },
        }),
        '&:hover': onClick
          ? {
              background: selected ? 'var(--bg-active)' : 'var(--bg-hover)',
              color: 'var(--text-primary)',
            }
          : undefined,
      })}
    >
      {icon && (
        <span
          css={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: 'var(--icon-size-md)',
            height: 'var(--icon-size-md)',
            color: selected ? 'var(--system-blue)' : 'var(--text-secondary)',
          })}
        >
          {icon}
        </span>
      )}
      <span css={css({ flex: 1, minWidth: 0 })}>
        <span
          css={css({
            display: 'block',
            fontWeight: selected ? 'var(--font-weight-medium)' : 'var(--font-weight-regular)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {title}
        </span>
        {subtitle && (
          <span
            css={css({
              display: 'block',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            })}
          >
            {subtitle}
          </span>
        )}
      </span>
    </button>
  );
}
