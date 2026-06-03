import { css } from '@emotion/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildFileTree, getFileById, type SkillFile } from '../../../services/skilldev/fileService';
import { useMacSplitStore } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';
import { MacSearchField } from '../MacSearchField';

function flattenFiles(tree: ReturnType<typeof buildFileTree>): SkillFile[] {
  const files: SkillFile[] = [];
  for (const folder of tree.children ?? []) {
    for (const node of folder.children ?? []) {
      const file = getFileById(node.id);
      if (file) files.push(file);
    }
  }
  return files;
}

export function SkillDevItemList() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<SkillFile[]>([]);
  const fileId = useMacSplitStore((s) => s.skillDevFileId);
  const setFileId = useMacSplitStore((s) => s.setSkillDevFileId);

  useEffect(() => {
    setFiles(flattenFiles(buildFileTree()));
  }, []);

  useEffect(() => {
    if (files.length > 0 && !fileId) {
      setFileId(files[0].id);
    }
  }, [files, fileId, setFileId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
  }, [files, query]);

  return (
    <div css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}>
      <MacSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('skillDev.searchFiles', '搜索文件')}
      />
      <div css={css({ flex: 1, overflowY: 'auto', padding: '0 var(--space-2) var(--space-2)' })}>
        {filtered.length === 0 ? (
          <div css={css({ color: 'var(--text-secondary)', fontSize: 13, padding: 16, textAlign: 'center' })}>
            {t('skillDev.noFiles', '暂无技能文件')}
          </div>
        ) : (
          filtered.map((file) => (
            <MacListRow
              key={file.id}
              title={file.name}
              subtitle={file.path}
              icon={<span>{file.isPreset ? '📦' : '📄'}</span>}
              selected={fileId === file.id}
              onClick={() => setFileId(file.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
