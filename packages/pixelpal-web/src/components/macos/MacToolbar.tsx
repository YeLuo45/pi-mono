import { css } from '@emotion/react';
import { ReactNode } from 'react';

interface MacToolbarProps {
  children: ReactNode;
}

export function MacToolbar({ children }: MacToolbarProps) {
  return (
    <div
      css={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 'var(--space-2)',
      })}
    >
      {children}
    </div>
  );
}
