import { css } from '@emotion/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store';
import { formatFileSize } from '../../../utils/documentParser';
import { useMacSplitStore } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';
import { MacSearchField } from '../MacSearchField';

export function DocumentItemList() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const documents = useStore((s) => s.documents);
  const documentId = useMacSplitStore((s) => s.documentId);
  const setDocumentId = useMacSplitStore((s) => s.setDocumentId);

  const filtered = useMemo(() => {
    if (!query.trim()) return documents;
    const q = query.toLowerCase();
    return documents.filter((d) => d.name.toLowerCase().includes(q));
  }, [documents, query]);

  return (
    <div css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}>
      <MacSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('document.searchDocs', '搜索文档')}
      />
      <div css={css({ flex: 1, overflowY: 'auto', padding: '0 var(--space-2) var(--space-2)' })}>
        {filtered.length === 0 ? (
          <div css={css({ color: 'var(--text-secondary)', fontSize: 13, padding: 16, textAlign: 'center' })}>
            {t('document.noDocs', '暂无上传文档')}
          </div>
        ) : (
          filtered.map((doc) => (
            <MacListRow
              key={doc.id}
              title={doc.name}
              subtitle={formatFileSize(doc.size)}
              icon={<span>📄</span>}
              selected={documentId === doc.id}
              onClick={() => setDocumentId(doc.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
