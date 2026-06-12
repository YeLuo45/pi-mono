import { css } from '@emotion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getIndexedDocuments } from '../../../services/rag';
import { getAllSources } from '../../../services/rag/sourceStorage';
import type { KnowledgeSource } from '../../../services/rag/types';
import { useStore } from '../../../store';
import { useMacSplitStore } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';
import { MacSearchField } from '../MacSearchField';

export function KnowledgeItemList() {
  const { t } = useTranslation();
  const location = useLocation();
  const isKnowledgeRoute = location.pathname === '/knowledge';
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const documents = useStore((s) => s.documents);
  const knowledgeSourceId = useMacSplitStore((s) => s.knowledgeSourceId);
  const knowledgeDocId = useMacSplitStore((s) => s.knowledgeDocId);
  const setKnowledgeSourceId = useMacSplitStore((s) => s.setKnowledgeSourceId);
  const setKnowledgeDocId = useMacSplitStore((s) => s.setKnowledgeDocId);

  const loadSources = useCallback(async () => {
    const list = await getAllSources();
    setSources(list);
    if (list.length > 0 && !knowledgeSourceId) {
      setKnowledgeSourceId(list[0].id);
    }
  }, [knowledgeSourceId, setKnowledgeSourceId]);

  const indexedDocs = useMemo(() => getIndexedDocuments(), [documents]);

  useEffect(() => {
    if (isKnowledgeRoute) loadSources();
  }, [isKnowledgeRoute, loadSources]);

  useEffect(() => {
    if (!isKnowledgeRoute && indexedDocs.length > 0 && !knowledgeDocId) {
      setKnowledgeDocId(indexedDocs[0].id);
    }
  }, [isKnowledgeRoute, indexedDocs, knowledgeDocId, setKnowledgeDocId]);

  const filteredSources = useMemo(() => {
    if (!query.trim()) return sources;
    const q = query.toLowerCase();
    return sources.filter((s) => s.title.toLowerCase().includes(q));
  }, [sources, query]);

  const filteredDocs = useMemo(() => {
    if (!query.trim()) return indexedDocs;
    const q = query.toLowerCase();
    return indexedDocs.filter((d) => d.name.toLowerCase().includes(q));
  }, [indexedDocs, query]);

  if (isKnowledgeRoute) {
    return (
      <div css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}>
        <MacSearchField
          value={query}
          onChange={setQuery}
          placeholder={t('knowledge.searchSources', '搜索来源')}
        />
        <div css={css({ flex: 1, overflowY: 'auto', padding: '0 var(--space-2) var(--space-2)' })}>
          {filteredSources.length === 0 ? (
            <div css={css({ color: 'var(--text-secondary)', fontSize: 13, padding: 16, textAlign: 'center' })}>
              {t('knowledge.noSources', '暂无知识来源')}
            </div>
          ) : (
            filteredSources.map((source) => (
              <MacListRow
                key={source.id}
                title={source.title}
                subtitle={source.type}
                icon={<span>📄</span>}
                selected={knowledgeSourceId === source.id}
                onClick={() => setKnowledgeSourceId(source.id)}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}>
      <MacSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('knowledge.searchDocs', '搜索文档')}
      />
      <div css={css({ flex: 1, overflowY: 'auto', padding: '0 var(--space-2) var(--space-2)' })}>
        {filteredDocs.length === 0 ? (
          <div css={css({ color: 'var(--text-secondary)', fontSize: 13, padding: 16, textAlign: 'center' })}>
            {t('knowledge.noDocs', '暂无索引文档')}
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <MacListRow
              key={doc.id}
              title={doc.name}
              subtitle={`${doc.chunkCount ?? 0} chunks`}
              icon={<span>📚</span>}
              selected={knowledgeDocId === doc.id}
              onClick={() => setKnowledgeDocId(doc.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
