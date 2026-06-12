import { css } from '@emotion/react';
import { ReactNode } from 'react';
import { MacSplitView } from './MacSplitView';
import { MacTitlebar } from './MacTitlebar';

interface MacAppShellProps {
  title: string;
  source: ReactNode;
  itemList: ReactNode;
  detail: ReactNode;
  toolbar?: ReactNode;
}

export function MacAppShell({ title, source, itemList, detail, toolbar }: MacAppShellProps) {
  return (
    <div
      css={css({
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        height: '100%',
        overflow: 'hidden',
      })}
    >
      <MacTitlebar title={title} toolbar={toolbar} />
      <MacSplitView source={source} itemList={itemList} detail={detail} />
    </div>
  );
}
