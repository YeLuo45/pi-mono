/**
 * V80 Skill Dev Tools - SkillPreview Component
 * Read-only preview card showing how the skill will appear in SkillPanel.
 */

import React, { useMemo } from 'react';
import { MyAlpha } from '../MUI替代';
import { MyTypography, MyChip, MyStack, MyDivider } from '../MUI替代';
import { Box } from '../ui/Box';
import type { SkillDefinition } from '../../services/skills/types';

interface SkillPreviewProps {
  name: string;
  description: string;
  icon?: string;
  version?: string;
  category?: string;
  tags?: string[];
  examplePrompts?: string[];
  chatTriggerable?: boolean;
  chatKeywords?: string[];
  code?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  productivity: '#4caf50',
  creative: '#9c27b0',
  analysis: '#2196f3',
  lifestyle: '#ff9800',
  developer: '#00bcd4',
  entertainment: '#e91e63',
  custom: '#607d8b',
};

export const SkillPreview: React.FC<SkillPreviewProps> = ({
  name,
  description,
  icon = '⚡',
  version = '1.0.0',
  category = 'custom',
  tags = [],
  examplePrompts = [],
  chatTriggerable = false,
  chatKeywords = [],
  code,
}) => {
  const parsedSkill = useMemo(() => {
    if (!code) return null;
    try {
      // Try to extract skill metadata from code
      const idMatch = code.match(/id:\s*['"]([^'"]+)['"]/);
      const nameMatch = code.match(/name:\s*['"]([^'"]+)['"]/);
      const descMatch = code.match(/description:\s*['"]([^'"]+)['"]/);
      const iconMatch = code.match(/icon:\s*['"]([^'"]+)['"]/);
      const versionMatch = code.match(/version:\s*['"]([^'"]+)['"]/);
      const categoryMatch = code.match(/category:\s*['"](\w+)['"]/);
      const tagsMatch = code.match(/tags:\s*\[([^\]]+)\]/);
      const chatTriggerableMatch = code.match(/chatTriggerable:\s*(true|false)/);
      const keywordsMatch = code.match(/chatKeywords:\s*\[([^\]]+)\]/);
      const examplesMatch = code.match(/examplePrompts:\s*\[([^\]]+)\]/);

      return {
        id: idMatch?.[1] || 'unknown',
        name: name || nameMatch?.[1] || 'Untitled Skill',
        description: description || descMatch?.[1] || '',
        icon: iconMatch?.[1] || icon,
        version: versionMatch?.[1] || version,
        category: (categoryMatch?.[1] as SkillDefinition['category']) || (category as SkillDefinition['category']),
        tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')) : tags,
        chatTriggerable: chatTriggerableMatch ? chatTriggerableMatch[1] === 'true' : chatTriggerable,
        chatKeywords: keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim().replace(/['"]/g, '')) : chatKeywords,
        examplePrompts: examplesMatch ? examplesMatch[1].split(',').map(p => p.trim().replace(/['"]/g, '')) : examplePrompts,
      };
    } catch {
      return null;
    }
  }, [code, name, description, icon, version, category, tags, examplePrompts, chatTriggerable, chatKeywords]);

  const skill = parsedSkill || {
    name: name || 'Untitled Skill',
    description: description || 'No description',
    icon,
    version,
    category: category as SkillDefinition['category'],
    tags,
    chatTriggerable,
    chatKeywords,
    examplePrompts,
  };

  const color = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.custom;
  const categoryLabel = skill.category.charAt(0).toUpperCase() + skill.category.slice(1);

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2,
      }}
    >
      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Preview
      </Typography>

      <Divider sx={{ my: 1, opacity: 0.1 }} />

      {/* Icon + Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Typography variant="h6" sx={{ fontSize: 20 }}>
          {skill.icon}
        </Typography>
        <Box sx={{ flex: 1 }}>
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
                bgcolor: alpha(color, 0.2),
                color: color,
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
      </Box>

      {/* Description */}
      <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
        {skill.description}
      </Typography>

      {/* Tags */}
      {skill.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={1}>
          {skill.tags.slice(0, 4).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 16,
                fontSize: 9,
                bgcolor: 'rgba(255,255,255,0.05)',
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
          ))}
        </Stack>
      )}

      {/* Chat Keywords */}
      {skill.chatTriggerable && skill.chatKeywords.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Keywords
          </Typography>
          <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
            {skill.chatKeywords.slice(0, 5).map((kw) => (
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

      {/* Example Prompts */}
      {skill.examplePrompts.length > 0 && (
        <Box mt={1}>
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Examples
          </Typography>
          <Stack spacing={0.5} mt={0.5}>
            {skill.examplePrompts.slice(0, 2).map((prompt, i) => (
              <Box
                key={i}
                sx={{
                  px: 1,
                  py: 0.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic' }}>
                  "{prompt}"
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default SkillPreview;
