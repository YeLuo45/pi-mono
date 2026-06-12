import { css } from '@emotion/react';
import { ReactNode } from 'react';

interface MacTitlebarProps {
  title: string;
  toolbar?: ReactNode;
}

const hasElectronAPI = typeof window !== 'undefined' && !!window.electronAPI;

export function MacTitlebar({ title, toolbar }: MacTitlebarProps) {
  return (
    <header
      css={css({
        height: 'var(--titlebar-height, 52px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-4)',
        borderBottom: '1px solid var(--separator)',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px)',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      })}
    >
      {hasElectronAPI && (
        <div
          css={css({
            display: 'flex',
            gap: 'var(--space-2)',
            WebkitAppRegion: 'no-drag',
            marginRight: 'var(--space-4)',
          })}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => window.electronAPI?.close()}
            css={css({
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#FF5F57',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            })}
          />
          <button
            type="button"
            aria-label="Minimize"
            onClick={() => window.electronAPI?.minimize()}
            css={css({
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#FEBC2E',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            })}
          />
          <button
            type="button"
            aria-label="Maximize"
            onClick={() => window.electronAPI?.maximize()}
            css={css({
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#28C840',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            })}
          />
        </div>
      )}
      <span
        css={css({
          flex: 1,
          textAlign: 'center',
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-stack)',
        })}
      >
        {title}
      </span>
      <div css={css({ WebkitAppRegion: 'no-drag' })}>{toolbar}</div>
    </header>
  );
}
