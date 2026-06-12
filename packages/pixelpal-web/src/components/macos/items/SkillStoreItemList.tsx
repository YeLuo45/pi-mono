import { css } from '@emotion/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MarketplaceSkill } from '../../../data/sampleMarketplaceSkills';
import type { SkillCategory } from '../../../services/skills/types';
import {
  getCommunitySkills,
  searchCommunitySkills,
  sortCommunitySkills,
} from '../../../services/marketplace/marketplaceService';
import { useMacSplitStore, type SkillStoreSort } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';
import { MacSearchField } from '../MacSearchField';

const CATEGORIES: { id: SkillCategory | 'all'; labelKey: string; icon: string }[] = [
  { id: 'all', labelKey: 'skillStore.categoryAll', icon: '🏪' },
  { id: 'productivity', labelKey: 'skillStore.categoryProductivity', icon: '⚡' },
  { id: 'developer', labelKey: 'skillStore.categoryDeveloper', icon: '💻' },
  { id: 'lifestyle', labelKey: 'skillStore.categoryLifestyle', icon: '🌿' },
  { id: 'creative', labelKey: 'skillStore.categoryCreative', icon: '🎨' },
  { id: 'analysis', labelKey: 'skillStore.categoryAnalysis', icon: '📈' },
  { id: 'entertainment', labelKey: 'skillStore.categoryEntertainment', icon: '🎮' },
];

const SORT_OPTIONS: { id: SkillStoreSort; labelKey: string }[] = [
  { id: 'popular', labelKey: 'skillStore.sortPopular' },
  { id: 'rating', labelKey: 'skillStore.sortRating' },
  { id: 'newest', labelKey: 'skillStore.sortNewest' },
];

export function SkillStoreItemList() {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const query = useMacSplitStore((s) => s.skillStoreQuery);
  const setQuery = useMacSplitStore((s) => s.setSkillStoreQuery);
  const category = useMacSplitStore((s) => s.skillStoreCategory);
  const sortBy = useMacSplitStore((s) => s.skillStoreSort);
  const skillId = useMacSplitStore((s) => s.skillStoreSkillId);
  const setCategory = useMacSplitStore((s) => s.setSkillStoreCategory);
  const setSortBy = useMacSplitStore((s) => s.setSkillStoreSort);
  const setSkillId = useMacSplitStore((s) => s.setSkillStoreSkillId);

  useEffect(() => {
    setSkills(getCommunitySkills());
  }, []);

  const filtered = useMemo(() => {
    let result = searchCommunitySkills(query, category);
    return sortCommunitySkills(result, sortBy);
  }, [query, category, sortBy, skills]);

  const sectionLabel = css({
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    padding: 'var(--space-1) var(--space-2)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  });

  return (
    <div css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}>
      <MacSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('skillStore.search', '搜索技能')}
      />
      <div css={sectionLabel}>{t('skillStore.sort', '排序')}</div>
      <div css={css({ padding: '0 var(--space-2)' })}>
        {SORT_OPTIONS.map((s) => (
          <MacListRow
            key={s.id}
            title={t(s.labelKey, s.id)}
            selected={sortBy === s.id && !skillId}
            onClick={() => {
              setSortBy(s.id);
              setSkillId(null);
            }}
          />
        ))}
      </div>
      <div css={sectionLabel}>{t('skillStore.categories', '分类')}</div>
      <div css={css({ flex: 1, overflowY: 'auto', padding: '0 var(--space-2) var(--space-2)' })}>
        {CATEGORIES.map((c) => (
          <MacListRow
            key={c.id}
            title={t(c.labelKey, c.id)}
            icon={<span>{c.icon}</span>}
            selected={category === c.id && !skillId}
            onClick={() => setCategory(c.id)}
          />
        ))}
        <div css={[sectionLabel, { marginTop: 'var(--space-2)' }]}>
          {t('skillStore.skills', '技能')} ({filtered.length})
        </div>
        {filtered.map((skill) => (
          <MacListRow
            key={skill.id}
            title={skill.name}
            subtitle={skill.description.slice(0, 48) + (skill.description.length > 48 ? '…' : '')}
            icon={<span>{skill.icon || '🧩'}</span>}
            selected={skillId === skill.id}
            onClick={() => setSkillId(skill.id)}
          />
        ))}
      </div>
    </div>
  );
}
