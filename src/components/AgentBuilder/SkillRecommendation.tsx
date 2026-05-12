/**
 * Skill Recommendation Component - V99
 * 
 * Recommends and allows selection of skills from marketplace.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Collapse,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { recommendSkills, generateSkill } from '../../services/agentBuilder/skillGenerator';
import type { SkillRecommendation } from '../../types/agentBuilder';
import type { SkillDefinition } from '../../services/skills/types';

interface SkillRecommendationProps {
  agentCapabilities: string[];
  selectedSkills: string[];
  onSelectionChange: (skillIds: string[]) => void;
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

export const SkillRecommendationPanel: React.FC<SkillRecommendationProps> = ({
  agentCapabilities,
  selectedSkills,
  onSelectionChange,
}) => {
  const [recommendations, setRecommendations] = useState<SkillRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [newSkillDesc, setNewSkillDesc] = useState('');

  useEffect(() => {
    loadRecommendations();
  }, [agentCapabilities]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const skills = await recommendSkills(agentCapabilities);
      setRecommendations(skills);
    } catch (error) {
      console.error('Failed to load skill recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSkill = (skillId: string) => {
    const newSelection = selectedSkills.includes(skillId)
      ? selectedSkills.filter((id) => id !== skillId)
      : [...selectedSkills, skillId];
    onSelectionChange(newSelection);
  };

  const handleCreateNewSkill = async () => {
    if (!newSkillDesc.trim()) return;
    
    setCreatingSkill(true);
    try {
      const newSkill = await generateSkill(newSkillDesc);
      const recommendation: SkillRecommendation = {
        id: newSkill.id,
        name: newSkill.name,
        description: newSkill.description,
        category: newSkill.category,
        relevance: 1.0,
        selected: true,
      };
      
      setRecommendations((prev) => [recommendation, ...prev]);
      onSelectionChange((prev) => [...prev, newSkill.id]);
      setNewSkillDesc('');
    } catch (error) {
      console.error('Failed to create skill:', error);
    } finally {
      setCreatingSkill(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Group recommendations by category
  const groupedByCategory = recommendations.reduce((acc, rec) => {
    if (!acc[rec.category]) {
      acc[rec.category] = [];
    }
    acc[rec.category].push(rec);
    return acc;
  }, {} as Record<string, SkillRecommendation[]>);

  // Filter by search
  const filteredRecommendations = recommendations.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rec.name.toLowerCase().includes(q) ||
      rec.description.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading skill recommendations...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Search and Actions */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadRecommendations}
          size="small"
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {/* Create New Skill */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon sx={{ fontSize: 16 }} /> Create New Skill
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Describe the skill you need..."
            value={newSkillDesc}
            onChange={(e) => setNewSkillDesc(e.target.value)}
            sx={{ flex: 1 }}
            disabled={creatingSkill}
          />
          <Button
            variant="contained"
            onClick={handleCreateNewSkill}
            disabled={!newSkillDesc.trim() || creatingSkill}
            size="small"
          >
            {creatingSkill ? <CircularProgress size={16} /> : 'Create'}
          </Button>
        </Box>
      </Paper>

      {/* Selected Skills Summary */}
      {selectedSkills.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Selected: {selectedSkills.length} skill(s)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {selectedSkills.map((skillId) => {
              const rec = recommendations.find((r) => r.id === skillId);
              return (
                <Chip
                  key={skillId}
                  label={rec?.name || skillId}
                  size="small"
                  onDelete={() => handleToggleSkill(skillId)}
                  sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: 'rgba(16, 185, 129, 0.9)' }}
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Recommendations by Category */}
      {Object.entries(groupedByCategory).map(([category, skills]) => {
        const categorySkills = skills.filter((s) =>
          searchQuery.trim()
            ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.description.toLowerCase().includes(searchQuery.toLowerCase())
            : true
        );

        if (categorySkills.length === 0) return null;

        const isExpanded = expandedCategories.has(category);

        return (
          <Box key={category} sx={{ mb: 1 }}>
            {/* Category Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1,
                cursor: 'pointer',
                borderRadius: 1,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
              }}
              onClick={() => toggleCategory(category)}
            >
              <Chip
                label={category}
                size="small"
                sx={{
                  bgcolor: `${CATEGORY_COLORS[category] || '#607d8b'}20`,
                  color: CATEGORY_COLORS[category] || '#607d8b',
                  mr: 1,
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                {categorySkills.length} skill(s)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {categorySkills.filter((s) => selectedSkills.includes(s.id)).length} selected
              </Typography>
              {isExpanded ? <CollapseIcon sx={{ fontSize: 16, ml: 1 }} /> : <ExpandIcon sx={{ fontSize: 16, ml: 1 }} />}
            </Box>

            {/* Category Skills */}
            <Collapse in={isExpanded}>
              <Box sx={{ pl: 2 }}>
                {categorySkills.map((rec) => (
                  <Box
                    key={rec.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      p: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedSkills.includes(rec.id)}
                          onChange={() => handleToggleSkill(rec.id)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ ml: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: 13 }}>
                            {rec.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                            {rec.description.length > 60
                              ? rec.description.slice(0, 60) + '...'
                              : rec.description}
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, alignItems: 'flex-start' }}
                    />
                    <Chip
                      label={`${Math.round(rec.relevance * 100)}%`}
                      size="small"
                      sx={{
                        ml: 'auto',
                        height: 18,
                        fontSize: 9,
                        bgcolor:
                          rec.relevance > 0.7
                            ? 'rgba(16, 185, 129, 0.15)'
                            : rec.relevance > 0.4
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(107, 114, 128, 0.15)',
                        color:
                          rec.relevance > 0.7
                            ? 'rgba(16, 185, 129, 0.9)'
                            : rec.relevance > 0.4
                            ? 'rgba(245, 158, 11, 0.9)'
                            : 'rgba(107, 114, 128, 0.9)',
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        );
      })}

      {recommendations.length === 0 && !loading && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          No skill recommendations available. Try describing your agent's capabilities more specifically.
        </Typography>
      )}
    </Box>
  );
};

export default SkillRecommendationPanel;
