/**
 * SkillPanel — V77 Skill Framework UI
 * Displays available skills grouped by category, allows users to trigger them.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MyAlpha } from '../MUI替代';
import { MyBox, MyTypography, MyPaper, MyStack, MyChip, MyCollapse, MyButton, MyDivider, MyIconButton, MyTextField, MyInputAdornment, MyTooltip, MyCircularProgress } from '../MUI替代';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  PlayArrow as PlayIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Share as ShareIcon,
  Add as AddIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { MySwitch } from '../MUI替代';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { skillRunner } from '../../services/skills/skillRunner';
import { skillRegistry } from '../../services/skills/skillRegistry';
import type { SkillDefinition, SkillCategory, SkillExecutionResult, ChainDefinition } from '../../services/skills/types';
import { ChainListItem } from '../Chains/ChainListItem';
import { ChainEditorDialog } from '../Chains/ChainEditorDialog';
import { getAllChains, saveChain, deleteChain, setChainEnabled } from '../../services/chains/chainStorage';
import { executeChain } from '../../services/chains/chainEngine';
import { seedSampleChains } from '../../data/sampleChains';
import type { Message } from '../../types';
import { useStore } from '../../store';

interface SkillPanelProps {
  /** Whether the panel is visible */
  visible: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
  /** Current chat messages (for skill context) */
  messages: Message[];
  /** Callback to insert skill result into chat */
  onResult: (result: SkillExecutionResult) => void;
}

const CATEGORY_LABELS: Record<SkillCategory, { en: string; zh: string }> = {
  productivity: { en: 'Productivity', zh: '效率工具' },
  creative: { en: 'Creative', zh: '创意' },
  analysis: { en: 'Analysis', zh: '分析' },
  lifestyle: { en: 'Lifestyle', zh: '生活' },
  developer: { en: 'Developer', zh: '开发者' },
  entertainment: { en: 'Entertainment', zh: '娱乐' },
  custom: { en: 'Custom', zh: '自定义' },
};

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  productivity: '#4caf50',
  creative: '#9c27b0',
  analysis: '#2196f3',
  lifestyle: '#ff9800',
  developer: '#00bcd4',
  entertainment: '#e91e63',
  custom: '#607d8b',
};

// =============================================================================
// Skill Card
// =============================================================================

interface SkillCardProps {
  skill: SkillDefinition;
  onToggle: (id: string, enabled: boolean) => void;
  onRun: (skill: SkillDefinition) => void;
  isRunning: boolean;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onToggle, onRun, isRunning }) => {
  const [expanded, setExpanded] = useState(false);
  const { t, i18n } = useTranslation();
  const categoryLabel = CATEGORY_LABELS[skill.category]?.[i18n.language === 'zh' ? 'zh' : 'en'] || skill.category;

  return (
    <Paper
      sx={{
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: `${CATEGORY_COLORS[skill.category]}60` },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icon */}
        <Typography variant="h6" sx={{ fontSize: 20, flexShrink: 0 }}>
          {skill.icon}
        </Typography>

        {/* Name + meta */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
            {skill.name}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" mt={0.3}>
            <Chip
              label={categoryLabel}
              size="small"
              sx={{
                height: 16,
                fontSize: 9,
                bgcolor: alpha(CATEGORY_COLORS[skill.category], 0.2),
                color: CATEGORY_COLORS[skill.category],
                border: 'none',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
              v{skill.version}
            </Typography>
            {skill.chatTriggerable && (
              <Chip
                label="💬"
                size="small"
                sx={{
                  height: 16,
                  fontSize: 9,
                  bgcolor: 'rgba(94,106,210,0.2)',
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}
          </Stack>
        </Box>

        {/* Run button */}
        <Tooltip title={t('skill.run') || 'Run skill'}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (!isRunning) onRun(skill);
            }}
            disabled={isRunning}
            sx={{
              color: CATEGORY_COLORS[skill.category],
              '&:hover': { bgcolor: alpha(CATEGORY_COLORS[skill.category], 0.15) },
            }}
          >
            {isRunning ? <CircularProgress size={16} /> : <PlayIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Switch */}
        <MySwitch
          size="small"
          checked={skill.enabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggle(skill.id, e.target.checked)}
        />

        {/* Expand icon */}
        {expanded ? (
          <CollapseIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
        ) : (
          <ExpandIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
        )}
      </Box>

      {/* Expanded content */}
      <Collapse in={expanded}>
        <Divider sx={{ opacity: 0.1 }} />
        <Box sx={{ px: 2, py: 1.5 }}>
          {/* Description */}
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
            {skill.description}
          </Typography>

          {/* Example prompts */}
          {skill.examplePrompts.length > 0 && (
            <Box mb={1}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('skill.examples') || 'Examples'}
              </Typography>
              <Stack spacing={0.5} mt={0.5}>
                {skill.examplePrompts.slice(0, 3).map((prompt, i) => (
                  <Box
                    key={i}
                    sx={{
                      px: 1,
                      py: 0.5,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                    }}
                    onClick={() => onRun(skill)}
                  >
                    <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic' }}>
                      "{prompt}"
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Chat keywords */}
          {skill.chatTriggerable && skill.chatKeywords.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('skill.chatKeywords') || 'Chat Keywords'}
              </Typography>
              <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                {skill.chatKeywords.slice(0, 6).map((kw) => (
                  <Chip
                    key={kw}
                    label={kw}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: 'rgba(94,106,210,0.15)',
                      color: 'rgba(94,106,210,0.9)',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

// =============================================================================
// Main SkillPanel
// =============================================================================

export const SkillPanel: React.FC<SkillPanelProps> = ({ visible, onClose, messages, onResult }) => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [runningSkillId, setRunningSkillId] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<SkillCategory>>(new Set());
  const { getCurrentPersonaId } = useStore();
  const navigate = useNavigate();
  // Chain state (V79)
  const [chainsTab, setChainsTab] = useState(false);
  const [chains, setChains] = useState<ChainDefinition[]>([]);
  const [chainEditorOpen, setChainEditorOpen] = useState(false);
  const [editingChain, setEditingChain] = useState<ChainDefinition | null>(null);
  const [runningChainId, setRunningChainId] = useState<string | null>(null);

  // Load skills on mount
  useEffect(() => {
    const loadSkills = async () => {
      await skillRegistry.loadSkills();
      setSkills(skillRegistry.getSortedSkills());
    };
    void loadSkills();
  }, []);

  // Reload when visible changes (in case skills were added)
  useEffect(() => {
    if (visible) {
      setSkills(skillRegistry.getSortedSkills());
    }
  }, [visible]);

  // Load chains on mount and when visible (V79)
  useEffect(() => {
    const loadChains = async () => {
      await seedSampleChains();
      const allChains = await getAllChains();
      setChains(allChains);
    };
    void loadChains();
  }, [visible]);
  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    if (enabled) {
      await skillRegistry.enableSkill(id);
    } else {
      await skillRegistry.disableSkill(id);
    }
    setSkills(skillRegistry.getSortedSkills());
  }, []);

  const handleRun = useCallback(
    async (skill: SkillDefinition) => {
      setRunningSkillId(skill.id);

      const result = await skillRunner.runSkillFromPanel(
        skill,
        skill.examplePrompts[0] || skill.description,
        messages,
        getCurrentPersonaId(),
        undefined,
        { triggeredFrom: 'panel' }
      );

      setRunningSkillId(null);
      onResult(result);
    },
    [messages, getCurrentPersonaId, onResult]
  );

  // Filter skills by search
  const filteredSkills = skills.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      s.category.toLowerCase().includes(q)
    );
  });

  // Group skills by category
  const grouped = new Map<SkillCategory, SkillDefinition[]>();
  for (const skill of filteredSkills) {
    const list = grouped.get(skill.category) || [];
    list.push(skill);
    grouped.set(skill.category, list);
  }

  // Chain handlers (V79)
  const handleChainToggle = useCallback(async (id: string, enabled: boolean) => {
    await setChainEnabled(id, enabled);
    const allChains = await getAllChains();
    setChains(allChains);
  }, []);

  const handleChainEdit = useCallback((chain: ChainDefinition) => {
    setEditingChain(chain);
    setChainEditorOpen(true);
  }, []);

  const handleChainDelete = useCallback(async (id: string) => {
    await deleteChain(id);
    const allChains = await getAllChains();
    setChains(allChains);
  }, []);

  const handleChainSave = useCallback(async (chain: ChainDefinition) => {
    await saveChain(chain);
    const allChains = await getAllChains();
    setChains(allChains);
    setChainEditorOpen(false);
    setEditingChain(null);
  }, []);

  const handleChainRun = useCallback(async (chain: ChainDefinition) => {
    setRunningChainId(chain.id);
    try {
      const result = await executeChain(chain, {
        triggerMessage: `Run chain: ${chain.name}`,
        metadata: { triggeredFrom: 'panel' },
        recentMessages: messages,
        personaId: getCurrentPersonaId(),
      });
      onResult({ skillId: 'chain', success: result.success, response: result.finalResult, durationMs: result.durationMs } as any);
    } finally {
      setRunningChainId(null);
    }
  }, [messages, getCurrentPersonaId, onResult]);

  if (!visible) return null;

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        bgcolor: 'rgba(15, 17, 23, 0.98)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 18, color: 'rgba(94,106,210,0.9)' }} />
        <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
          {t('skill.title') || 'Skills'}
        </Typography>
        <Tooltip title="Dev Tools">
          <IconButton size="small" onClick={() => navigate('/skill-dev')} sx={{ color: 'text.secondary' }}>
            <BuildIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('skill.shareMarketplace') || 'Share to Marketplace'}>
          <IconButton size="small" onClick={() => navigate('/skill-store')} sx={{ color: 'text.secondary' }}>
            <ShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t('skill.searchPlaceholder') || 'Search skills...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </InputAdornment>
            ),
            sx: { fontSize: 13, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1.5 },
          }}
        />
      </Box>

      {/* Tab switcher: Skills / Chains (V79) */}
      <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Button
          size="small"
          onClick={() => setChainsTab(false)}
          sx={{
            flex: 1,
            borderRadius: 0,
            fontSize: 12,
            fontWeight: 600,
            color: !chainsTab ? 'rgba(94,106,210,0.9)' : 'text.secondary',
            borderBottom: !chainsTab ? '2px solid rgba(94,106,210,0.9)' : '2px solid transparent',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
          }}
        >
          Skills
        </Button>
        <Button
          size="small"
          onClick={() => setChainsTab(true)}
          sx={{
            flex: 1,
            borderRadius: 0,
            fontSize: 12,
            fontWeight: 600,
            color: chainsTab ? 'rgba(94,106,210,0.9)' : 'text.secondary',
            borderBottom: chainsTab ? '2px solid rgba(94,106,210,0.9)' : '2px solid transparent',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
          }}
        >
          Chains
        </Button>
      </Box>

      {/* Skills list */}
      {!chainsTab && (
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {Array.from(grouped.entries()).map(([category, categorySkills]) => {
          const label = CATEGORY_LABELS[category]?.[i18n.language === 'zh' ? 'zh' : 'en'] || category;
          const color = CATEGORY_COLORS[category] || '#607d8b';
          const isExpanded = expandedCategories.has(category) || search.trim().length > 0;

          return (
            <Box key={category} mb={1}>
              {/* Category header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                }}
                onClick={() => {
                  setExpandedCategories((prev) => {
                    const next = new Set(prev);
                    if (next.has(category)) {
                      next.delete(category);
                    } else {
                      next.add(category);
                    }
                    return next;
                  });
                }}
              >
                <Box
                  sx={{
                    width: 3,
                    height: 14,
                    borderRadius: 1,
                    bgcolor: color,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    color,
                    flex: 1,
                  }}
                >
                  {label}
                </Typography>
                <Chip
                  label={categorySkills.length}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: 9,
                    bgcolor: `${color}25`,
                    color,
                    '& .MuiChip-label': { px: 0.6 },
                  }}
                />
                {isExpanded ? (
                  <CollapseIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                ) : (
                  <ExpandIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                )}
              </Box>

              {/* Skills in category */}
              <Collapse in={isExpanded}>
                <Stack spacing={0.5} mt={0.5} pl={0.5}>
                  {categorySkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      onToggle={handleToggle}
                      onRun={handleRun}
                      isRunning={runningSkillId === skill.id}
                    />
                  ))}
                </Stack>
              </Collapse>
            </Box>
          );
        })}

        {filteredSkills.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
              {t('skill.noSkills') || 'No skills found'}
            </Typography>
          </Box>
        )}
      </Box>
      )}

      {/* Chains list (V79) */}
      {chainsTab && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
          {/* Add chain button */}
          <Button
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => { setEditingChain(null); setChainEditorOpen(true); }}
            sx={{
              mb: 1.5,
              bgcolor: 'rgba(156,39,176,0.15)',
              color: '#9c27b0',
              border: '1px dashed rgba(156,39,176,0.3)',
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(156,39,176,0.25)' },
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            New Chain
          </Button>

          {chains.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: 13, color: 'text.secondary' }}>
                No chains yet. Create one to get started!
              </Typography>
            </Box>
          ) : (
            <Stack spacing={0.75}>
              {chains.map((chain) => (
                <ChainListItem
                  key={chain.id}
                  chain={chain}
                  onToggle={handleChainToggle}
                  onEdit={handleChainEdit}
                  onDelete={handleChainDelete}
                  onRun={handleChainRun}
                />
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* Footer */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
          {skills.length} {t('skill.available') || 'skills available'}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
          v79
        </Typography>
      </Box>

      {/* Chain editor dialog (V79) */}
      <ChainEditorDialog
        open={chainEditorOpen}
        chain={editingChain}
        onClose={() => { setChainEditorOpen(false); setEditingChain(null); }}
        onSave={handleChainSave}
      />
    </Paper>
  );
};
