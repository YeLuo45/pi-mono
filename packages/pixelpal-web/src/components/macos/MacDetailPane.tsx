import { css } from '@emotion/react';
import { ReactNode } from 'react';

interface MacDetailPaneProps {
  children: ReactNode;
  toolbar?: ReactNode;
}

export function MacDetailPane({ children, toolbar }: MacDetailPaneProps) {
  return (
    <div
      css={css({
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      })}
    >
      {toolbar && (
        <div
          css={css({
            flexShrink: 0,
            borderBottom: '1px solid var(--separator)',
            padding: 'var(--space-2) var(--space-4)',
          })}
        >
          {toolbar}
        </div>
      )}
      <div
        css={css({
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        })}
      >
        {children}
      </div>
    </div>
  );
}
