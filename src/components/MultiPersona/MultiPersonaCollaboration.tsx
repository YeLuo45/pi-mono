/**
 * Multi-Persona Collaboration Panel V21
 *
 * Enhanced UI for team management and collaborative discussion with:
 * - Role-based team organization
 * - Real-time contribution tracking
 * - Cross-persona discussion threads
 * - Team response synthesis
 * - Emotion-aware interactions
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Avatar,
  Collapse,
  Divider,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  LinearProgress,
  Tab,
  Tabs,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Group as GroupIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Star as StarIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  Chat as ChatIcon,
  Clear as ClearIcon,
  Summarize as SummarizeIcon,
  Psychology as SpecialistIcon,
  Analytics as AnalystIcon,
  Balance as MediatorIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  EmojiEmotions as EmojiIcon,
  Insights as InsightsIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import { CollaborationStatus } from '../Collaboration/CollaborationStatus';
import { CollabHistory } from '../Collaboration/CollabHistory';
import {
  type PersonaMember,
  type TeamDiscussion,
  type CollaborationMessage,
  type PersonaRole,
  getAvailablePersonasForTeam,
  getTeamConfig,
  setTeamConfig,
  addPersonaToTeam,
  removePersonaFromTeam,
  setPersonaActive,
  getTeamMembers,
  getActiveMembers,
  setPrimaryPersona,
  setupBalancedTeam,
  getTeamDescription,
  startDiscussion,
  addDiscussionMessage,
  getCurrentDiscussion,
  concludeDiscussion,
  clearDiscussion,
  analyzeDiscussion,
  synthesizeTeamResponse,
  getRoleDescription,
  setPersonaRole,
  getPersonaMessages,
} from '../../services/companion/multiPersonaService';
import type { PersonaId } from '../../services/companion/personalityTypes';
import { getPersona } from '../../services/companion/personalityTypes';
import { runSequentialDiscussion, getPersonaInfo } from '../../services/discussionService';
import { getEmotionLabel, emotionToScore, getEmotionColor, emotionColors, type EmotionState } from '../../services/voice/emotionDetector';
import { getAllPersonas } from '../../services/persona/personaStorage';

const roleIcons: Record<PersonaRole, React.ReactNode> = {
  primary: <StarIcon sx={{ fontSize: 14, color: 'gold' }} />,
  specialist: <SpecialistIcon sx={{ fontSize: 14, color: '#FF9800' }} />,
  analyst: <AnalystIcon sx={{ fontSize: 14, color: '#2196F3' }} />,
  mediator: <MediatorIcon sx={{ fontSize: 14, color: '#E91E63' }} />,
  observer: <VisibilityIcon sx={{ fontSize: 14, opacity: 0.6 }} />,
};

const roleColors: Record<PersonaRole, string> = {
  primary: '#FFD700',
  specialist: '#FF9800',
  analyst: '#2196F3',
  mediator: '#E91E63',
  observer: '#9E9E9E',
};

export const MultiPersonaCollaboration: React.FC = () => {
  const { t } = useTranslation();
  const [teamExpanded, setTeamExpanded] = useState(true);
  const [addPersonaOpen, setAddPersonaOpen] = useState(false);
  const [selectedNewPersona, setSelectedNewPersona] = useState<PersonaId | ''>('');
  const [chatExpanded, setChatExpanded] = useState(false);
  const [localDiscussion, setLocalDiscussion] = useState<TeamDiscussion | null>(null);
  const [teamInput, setTeamInput] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [contributions, setContributions] = useState<{ [key: string]: number }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // V27: Real Debate state
  const [debateOpen, setDebateOpen] = useState(false);
  const [debateTopic, setDebateTopic] = useState('');
  const [debateSelectedPersonas, setDebateSelectedPersonas] = useState<string[]>([]);
  const [debateInput, setDebateInput] = useState('');
  const [typingPersona, setTypingPersona] = useState<string | null>(null);
  const [isDebateActive, setIsDebateActive] = useState(false);

  // V28: Emotion history for chart (personaId -> scores[])
  const [emotionHistory, setEmotionHistory] = useState<Record<string, number[]>>({});

  const companion = useStore((s) => s.companion);
  const setPersona = useStore((s) => s.setPersona);

  // Sync with current discussion + V28 emotion history tracking
  useEffect(() => {
    const discussion = getCurrentDiscussion();
    if (discussion) {
      setLocalDiscussion({ ...discussion });
      // Update contribution tracking
      const contribs: { [key: string]: number } = {};
      // V28: Update emotion history
      setEmotionHistory(prev => {
        const next = { ...prev };
        for (const msg of discussion.messages) {
          if (msg.type === 'contribution' && (msg as any).emotion) {
            const score = emotionToScore((msg as any).emotion);
            if (!next[msg.personaId]) {
              next[msg.personaId] = [];
            }
            // Only add if different from last or first message
            const lastScore = next[msg.personaId][next[msg.personaId].length - 1];
            if (next[msg.personaId].length === 0 || score !== lastScore) {
              next[msg.personaId] = [...next[msg.personaId], score];
            }
          }
        }
        return next;
      });
      for (const msg of discussion.messages) {
        if (msg.type === 'contribution') {
          contribs[msg.personaId] = (contribs[msg.personaId] || 0) + 1;
        }
      }
      setContributions(contribs);
    }
  }, [localDiscussion?.messages.length]);

  // Auto-scroll to bottom of discussion
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localDiscussion?.messages.length]);

  const availablePersonas = getAvailablePersonasForTeam();
  const teamMembers = getTeamMembers();
  const activeMembers = getActiveMembers();
  const teamConfig = getTeamConfig();

  const handleAddPersona = () => {
    if (selectedNewPersona) {
      const success = addPersonaToTeam(selectedNewPersona, 'specialist');
      if (success) {
        setSelectedNewPersona('');
        setAddPersonaOpen(false);
      }
    }
  };

  const handleRemovePersona = (personaId: PersonaId) => {
    removePersonaFromTeam(personaId);
  };

  const handleToggleActive = (personaId: PersonaId, currentActive: boolean) => {
    setPersonaActive(personaId, !currentActive);
  };

  const handleSetPrimary = (personaId: PersonaId) => {
    setPrimaryPersona(personaId);
    setPersona(personaId);
  };

  const handleRoleChange = (personaId: PersonaId, role: PersonaRole) => {
    setPersonaRole(personaId, role);
  };

  const handleSetupBalanced = () => {
    setupBalancedTeam(companion.personaId);
  };

  const handleStartDiscussion = () => {
    if (teamInput.trim()) {
      const discussion = startDiscussion(teamInput.trim());
      setLocalDiscussion(discussion);
      setTeamInput('');
      addDiscussionMessage(companion.personaId, `Starting discussion about: ${discussion.topic}`, 'contribution');
    }
  };

  const handleConcludeDiscussion = () => {
    if (localDiscussion) {
      const synthesis = synthesizeTeamResponse();
      const summary = `Team discussed: ${localDiscussion.topic}. ${localDiscussion.messages.length} messages exchanged.`;
      concludeDiscussion(summary);
      setLocalDiscussion(prev => prev ? { ...prev, status: 'summarized', summary } : null);
    }
  };

  const handleClearTeamChat = () => {
    clearDiscussion();
    setLocalDiscussion(null);
    setContributions({});
  };

  // V27: Real Debate handlers
  const handleOpenDebate = () => {
    setDebateTopic('');
    setDebateSelectedPersonas([]);
    setDebateOpen(true);
  };

  const handleCloseDebate = () => {
    setDebateOpen(false);
    setDebateTopic('');
    setDebateSelectedPersonas([]);
    setDebateInput('');
    setTypingPersona(null);
  };

  const handleToggleDebatePersona = (personaId: string) => {
    setDebateSelectedPersonas(prev => {
      if (prev.includes(personaId)) {
        return prev.filter(id => id !== personaId);
      }
      return [...prev, personaId];
    });
  };

  const handleStartDebate = () => {
    if (debateTopic.trim() && debateSelectedPersonas.length >= 2) {
      const discussion = startDiscussion(debateTopic.trim());
      setLocalDiscussion(discussion);
      setIsDebateActive(true);
      setDebateOpen(false);
    }
  };

  const handleDebateSubmit = async () => {
    if (!debateInput.trim() || debateSelectedPersonas.length < 2 || !localDiscussion) return;

    const userMsg = addDiscussionMessage(companion.personaId, debateInput.trim(), 'contribution');
    if (userMsg) {
      setLocalDiscussion(prev => prev ? {
        ...prev,
        messages: [...prev.messages, userMsg],
      } : null);
    }

    const input = debateInput;
    setDebateInput('');

    await runSequentialDiscussion(input, debateSelectedPersonas, {
      onMessage: (msg) => {
        setLocalDiscussion(prev => prev ? {
          ...prev,
          messages: [...prev.messages, msg],
        } : null);
      },
      onTyping: (personaId) => {
        setTypingPersona(personaId);
      },
    });
  };

  const handleEndDebate = () => {
    concludeDiscussion();
    setIsDebateActive(false);
    setLocalDiscussion(prev => prev ? { ...prev, status: 'concluded' } : null);
  };

  const getStatusColor = (isActive: boolean) => isActive ? 'success' : 'default';
  const getStatusLabel = (isActive: boolean) => isActive ? t('team.active') : t('team.observing');

  const getMessageTypeColor = (type: CollaborationMessage['type']) => {
    switch (type) {
      case 'contribution': return '#9B7FD4';
      case 'question': return '#64B5F6';
      case 'agreement': return '#81C784';
      case 'disagreement': return '#FF8A65';
      case 'summary': return '#FFD54F';
      case 'synthesis': return '#CE93D8';
      default: return '#9B7FD4';
    }
  };

  const personaColors: Record<PersonaId, string> = {
    default: '#9C27B0',
    playful: '#FF9800',
    professional: '#2196F3',
    gentle: '#E91E63',
    witty: '#4CAF50',
  };

  const getContributionPercentage = (personaId: PersonaId): number => {
    if (!localDiscussion || localDiscussion.messages.length === 0) return 0;
    const count = contributions[personaId] || 0;
    return Math.round((count / localDiscussion.messages.filter(m => m.type === 'contribution').length) * 100);
  };

  // V28: Emotion history line chart renderer
  const renderEmotionChart = () => {
    const personaIds = Object.keys(emotionHistory);
    if (personaIds.length === 0) return null;

    const width = 100; // percent
    const height = 60;
    const padding = { top: 4, right: 4, bottom: 4, left: 4 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Find max length across all personas
    const maxLen = Math.max(...personaIds.map(id => emotionHistory[id].length));
    if (maxLen < 2) return null;

    const getX = (idx: number) => padding.left + (idx / (maxLen - 1)) * chartW;
    const getY = (score: number) => padding.top + (1 - score / 100) * chartH;

    return (
      <Box sx={{ mb: 1, px: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', display: 'block', mb: 0.25 }}>
          {t('multiPersona.emotionTrend', '情绪趋势')}
        </Typography>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => (
            <line
              key={v}
              x1={padding.left}
              y1={getY(v)}
              x2={padding.left + chartW}
              y2={getY(v)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.3"
            />
          ))}
          {/* Lines per persona */}
          {personaIds.map((pid, pIdx) => {
            const scores = emotionHistory[pid];
            if (scores.length < 2) return null;
            const color = personaColors[pid as PersonaId] || roleColors[(getPersonaInfo(pid) as any)?.role || 'observer'] || '#9B7FD4';
            const points = scores.map((s, i) => `${getX(i)},${getY(s)}`).join(' ');
            return (
              <polyline
                key={pid}
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="0.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </Box>
    );
  };

  // V28: Emotion summary card (shown when discussion is concluded)
  const renderEmotionSummary = () => {
    if (!localDiscussion || localDiscussion.status === 'active') return null;

    const personaIds = Object.keys(emotionHistory);
    if (personaIds.length === 0) return null;

    return (
      <Card sx={{ m: 1, p: 1.5, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontSize: 11, mb: 1, color: 'primary.light' }}>
          {t('multiPersona.emotionSummary', '情绪摘要')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {personaIds.map(pid => {
            const scores = emotionHistory[pid];
            if (!scores || scores.length === 0) return null;
            const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            const emotion = scores[scores.length - 1] > 60 ? 'positive' : scores[scores.length - 1] < 40 ? 'negative' : 'neutral';
            const avgColor = emotion === 'positive' ? '#4CAF50' : emotion === 'negative' ? '#F44336' : '#2196F3';
            const info = getPersonaInfo(pid);
            return (
              <Box key={pid} sx={{ textAlign: 'center', minWidth: 60 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: personaColors[pid as PersonaId] || '#9B7FD4', fontSize: 10, mx: 'auto', mb: 0.25 }}>
                  {info?.avatar || pid[0]}
                </Avatar>
                <Typography variant="caption" sx={{ fontSize: 9, display: 'block', color: 'text.secondary' }}>
                  {info?.name || pid}
                </Typography>
                <Typography variant="h6" sx={{ fontSize: 14, fontWeight: 700, color: avgColor }}>
                  {avgScore}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 8, color: avgColor }}>
                  /100
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Card>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Team Management Section */}
      <Paper sx={{ p: 2, bgcolor: 'rgba(30, 20, 55, 0.95)', borderRadius: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 600 }}>
              {t('team.title') || 'Team Collaboration'}
            </Typography>
            <Chip
              size="small"
              label={`${teamMembers.length} ${teamMembers.length !== 1 ? 'members' : 'member'}`}
              sx={{ height: 20, fontSize: 10 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={t('team.setupBalanced') || 'Setup Balanced Team'}>
              <Button size="small" onClick={handleSetupBalanced} sx={{ minWidth: 0, p: 0.5 }}>
                <PsychologyIcon sx={{ fontSize: 16 }} />
              </Button>
            </Tooltip>
            <IconButton size="small" onClick={() => setTeamExpanded(!teamExpanded)}>
              {teamExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={teamExpanded}>
          <Divider sx={{ my: 1.5 }} />

          {/* Team Description */}
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', mb: 2, whiteSpace: 'pre-line' }}>
            {getTeamDescription()}
          </Typography>

          {/* Contribution Overview (when discussion active) */}
          {localDiscussion && localDiscussion.status === 'active' && activeMembers.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                {t('team.contribution') || 'Contribution Distribution'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {activeMembers.map(member => (
                  <Tooltip key={member.personaId} title={`${getContributionPercentage(member.personaId)}% of contributions`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: member.color,
                        }}
                      />
                      <Typography sx={{ fontSize: 10 }}>
                        {member.name}: {contributions[member.personaId] || 0}
                      </Typography>
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}

          {/* Active Members Quick View */}
          {activeMembers.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                {t('team.activeCollaborators') || 'Active Collaborators'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {activeMembers.map(member => (
                  <Chip
                    key={member.personaId}
                    size="small"
                    avatar={
                      <Avatar sx={{ bgcolor: member.color, fontSize: 10, width: 20, height: 20 }}>
                        {member.name[0]}
                      </Avatar>
                    }
                    label={member.name}
                    icon={roleIcons[member.role] as any}
                    sx={{
                      height: 24,
                      fontSize: 11,
                      border: member.role === 'primary' ? `1px solid ${member.color}` : 'none',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* All Team Members */}
          {teamMembers.length > 0 ? (
            <List dense disablePadding>
              {teamMembers.map(member => {
                const persona = getPersona(member.personaId);
                return (
                  <ListItem
                    key={member.personaId}
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: member.role === 'primary' ? 'rgba(155, 127, 212, 0.1)' : 'transparent',
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: member.isActive ? 'success.main' : 'grey.500',
                              border: '1px solid rgba(30,20,55,0.95)',
                            }}
                          />
                        }
                      >
                        <Avatar
                          sx={{
                            bgcolor: member.color,
                            width: 28,
                            height: 28,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {member.name[0]}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: member.role === 'primary' ? 600 : 400 }}>
                            {member.name}
                          </Typography>
                          {roleIcons[member.role]}
                          <Typography sx={{ fontSize: 10, color: roleColors[member.role] }}>
                            {member.role}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                          {member.expertise.slice(0, 3).join(', ')}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction sx={{ right: 0 }}>
                      <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
                        {/* Role Selector */}
                        <Select
                          size="small"
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.personaId, e.target.value as PersonaRole)}
                          sx={{
                            fontSize: 10,
                            height: 24,
                            '& .MuiSelect-select': { py: 0.5 },
                            minWidth: 80,
                          }}
                        >
                          <MenuItem value="primary" sx={{ fontSize: 10 }}>Lead</MenuItem>
                          <MenuItem value="specialist" sx={{ fontSize: 10 }}>Specialist</MenuItem>
                          <MenuItem value="analyst" sx={{ fontSize: 10 }}>Analyst</MenuItem>
                          <MenuItem value="mediator" sx={{ fontSize: 10 }}>Mediator</MenuItem>
                          <MenuItem value="observer" sx={{ fontSize: 10 }}>Observer</MenuItem>
                        </Select>

                        {member.role !== 'primary' && (
                          <Tooltip title={t('team.setAsTeamLead') || 'Set as Team Lead'}>
                            <IconButton
                              size="small"
                              onClick={() => handleSetPrimary(member.personaId)}
                              sx={{ p: 0.25 }}
                            >
                              <StarIcon sx={{ fontSize: 14, color: 'grey.500' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title={member.isActive ? t('team.setAsObserver') || 'Set as Observer' : t('team.setAsActive') || 'Set as Active'}>
                          <Switch
                            size="small"
                            checked={member.isActive}
                            onChange={() => handleToggleActive(member.personaId, member.isActive)}
                            sx={{ '& .MuiSwitch-thumb': { width: 10, height: 10 } }}
                          />
                        </Tooltip>
                        <Tooltip title={t('team.removeFromTeam') || 'Remove from Team'}>
                          <IconButton
                            size="small"
                            onClick={() => handleRemovePersona(member.personaId)}
                            sx={{ p: 0.25, color: 'error.light' }}
                          >
                            <RemoveIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2, opacity: 0.6 }}>
              <Typography variant="body2" sx={{ fontSize: 12 }}>
                {t('team.noMembers') || 'No team members yet'}
              </Typography>
            </Box>
          )}

          {/* Add Persona Button */}
          <Button
            startIcon={<AddIcon />}
            size="small"
            fullWidth
            onClick={() => setAddPersonaOpen(true)}
            sx={{ mt: 1.5 }}
          >
            {t('team.addTeamMember') || 'Add Team Member'}
          </Button>

          {/* Team Settings */}
          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={teamConfig.allowDebate}
                  onChange={(_, checked) => setTeamConfig({ allowDebate: checked })}
                />
              }
              label={
                <Typography sx={{ fontSize: 11 }}>
                  {t('team.allowDebate') || 'Allow Debate'}
                </Typography>
              }
              sx={{ mb: 0.5 }}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={teamConfig.allowCrossTalk}
                  onChange={(_, checked) => setTeamConfig({ allowCrossTalk: checked })}
                />
              }
              label={
                <Typography sx={{ fontSize: 11 }}>
                  {t('team.allowCrossTalk') || 'Allow Cross-Talk'}
                </Typography>
              }
              sx={{ mb: 0.5 }}
            />
            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel sx={{ fontSize: 12 }}>{t('team.maxActiveMembers') || 'Max Active'}</InputLabel>
              <Select
                value={teamConfig.maxActiveMembers}
                label={t('team.maxActiveMembers') || 'Max Active'}
                onChange={(e) => setTeamConfig({ maxActiveMembers: Number(e.target.value) })}
                sx={{ fontSize: 12 }}
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <MenuItem key={n} value={n} sx={{ fontSize: 12 }}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Collapse>
      </Paper>

      {/* Team Chat Section */}
      {teamMembers.length > 1 && (
        <Paper sx={{ p: 2, bgcolor: 'rgba(30, 20, 55, 0.95)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 600 }}>
                {t('team.teamDiscussion') || 'Team Discussion'}
              </Typography>
              {localDiscussion && (
                <Chip
                  size="small"
                  label={localDiscussion.status}
                  color={localDiscussion.status === 'active' ? 'primary' : 'default'}
                  sx={{ height: 18, fontSize: 9, textTransform: 'capitalize' }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {!isDebateActive && (
                <Tooltip title={t('team.startDebate') || '发起讨论'}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleOpenDebate}
                    startIcon={<ChatIcon sx={{ fontSize: 14 }} />}
                    sx={{ fontSize: 10, py: 0.25 }}
                  >
                    {t('team.startDebate') || '发起讨论'}
                  </Button>
                </Tooltip>
              )}
              {isDebateActive && (
                <Tooltip title={t('team.endDebate') || '结束讨论'}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={handleEndDebate}
                    sx={{ fontSize: 10, py: 0.25 }}
                  >
                    {t('team.endDebate') || '结束'}
                  </Button>
                </Tooltip>
              )}
              {localDiscussion && localDiscussion.status === 'active' && !isDebateActive && (
                <Tooltip title={t('team.concludeDiscussion') || 'Conclude & Synthesize'}>
                  <IconButton size="small" onClick={handleConcludeDiscussion}>
                    <SummarizeIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              {localDiscussion && (
                <Tooltip title={t('team.clear') || 'Clear'}>
                  <IconButton size="small" onClick={handleClearTeamChat}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton size="small" onClick={() => setChatExpanded(!chatExpanded)}>
                {chatExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          <Collapse in={chatExpanded}>
            <Divider sx={{ my: 1.5 }} />

            {/* Tabs: 分工视图 / 实时对话 / 结果汇总 / 历史记录 */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                mb: 1.5,
                minHeight: 32,
                '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: 11 },
              }}
            >
              <Tab icon={<GroupIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="分工视图" />
              <Tab icon={<ChatIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="实时对话" />
              <Tab icon={<SummarizeIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="结果汇总" />
              <Tab icon={<HistoryIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="历史记录" />
            </Tabs>

            {/* Discussion Topic Input */}
            {!localDiscussion && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('team.discussionPlaceholder') || 'Start a team discussion...'}
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartDiscussion()}
                  sx={{
                    '& .MuiInputBase-input': { fontSize: 12 },
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleStartDiscussion}
                  disabled={!teamInput.trim()}
                  startIcon={<PlayIcon />}
                >
                  {t('team.start') || 'Start'}
                </Button>
              </Box>
            )}

            {/* Discussion Topic Display */}
            {localDiscussion && (
              <Box sx={{ mb: 1.5, p: 1, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                  {t('team.topic') || 'Topic'}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                  {localDiscussion.topic}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                  {localDiscussion.messages.length} messages · {activeMembers.length} active
                </Typography>
                {/* V28: Emotion Chart */}
                {renderEmotionChart()}
              </Box>
            )}

            {/* Chat Messages — only on 实时对话 tab */}
            {activeTab === 1 && (
            <Box sx={{
              maxHeight: 300,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              mb: 1.5,
            }}>
              {localDiscussion?.messages.map((msg, msgIdx) => {
                const personaColor = personaColors[msg.personaId as PersonaId] || '#9B7FD4';
                const isUser = msg.personaId === companion.personaId || String(msg.personaId) === 'user';
                const isSystem = String(msg.personaId) === 'system';
                const personaInfo = getPersonaInfo(msg.personaId);

                // V28: Emotion calculation
                const msgEmotion = (msg as any).emotion as string | undefined;
                const emotionScore = msgEmotion ? emotionToScore(msgEmotion) : 50;
                const emotionColor = msgEmotion ? getEmotionColor(msgEmotion) : personaColor;

                // V28: Emotion fluctuation detection (spike >30)
                let hasEmotionSpike = false;
                if (msgEmotion && msgIdx > 0) {
                  const prevMsgs = localDiscussion.messages.slice(0, msgIdx).filter(m => m.personaId === msg.personaId && (m as any).emotion);
                  if (prevMsgs.length > 0) {
                    const prevEmotion = (prevMsgs[prevMsgs.length - 1] as any).emotion as string;
                    const prevScore = emotionToScore(prevEmotion);
                    hasEmotionSpike = Math.abs(emotionScore - prevScore) > 30;
                  }
                }

                return (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : isSystem ? 'center' : 'flex-start',
                    }}
                  >
                    {/* Persona header: avatar + name + emotion */}
                    {!isSystem && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                        <Avatar sx={{ width: 18, height: 18, bgcolor: personaColor, fontSize: 10 }}>
                          {personaInfo?.avatar || msg.personaName?.[0] || '?'}
                        </Avatar>
                        <Typography sx={{ fontSize: 10, fontWeight: 600, color: personaColor }}>
                          {msg.personaName || personaInfo?.name || 'Unknown'}
                        </Typography>
                        {/* V28: Emotion progress bar */}
                        {msgEmotion && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LinearProgress
                              variant="determinate"
                              value={emotionScore}
                              sx={{
                                width: 32,
                                height: 3,
                                borderRadius: 1,
                                bgcolor: 'rgba(255,255,255,0.1)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: emotionColor,
                                  borderRadius: 1,
                                },
                              }}
                            />
                            <Chip
                              label={getEmotionLabel(msgEmotion as EmotionState)}
                              size="small"
                              sx={{
                                height: 14,
                                fontSize: 8,
                                bgcolor: 'rgba(0,0,0,0.2)',
                                '& .MuiChip-label': { px: 0.5 },
                              }}
                            />
                          </Box>
                        )}
                        <Chip
                          label={msg.type}
                          size="small"
                          sx={{
                            height: 14,
                            fontSize: 8,
                            bgcolor: getMessageTypeColor(msg.type),
                            '& .MuiChip-label': { px: 0.5 },
                          }}
                        />
                      </Box>
                    )}
                    {/* V28: Message bubble with emotion gradient */}
                    <Paper
                      sx={{
                        p: 1,
                        bgcolor: isSystem
                          ? 'rgba(255, 215, 0, 0.1)'
                          : msgEmotion
                            ? `linear-gradient(135deg, ${emotionColor}22, ${emotionColor}11)`
                            : `${personaColor}22`,
                        background: isSystem
                          ? 'rgba(255, 215, 0, 0.1)'
                          : msgEmotion
                            ? `linear-gradient(135deg, ${emotionColor}22, ${emotionColor}11)`
                            : `${personaColor}22`,
                        maxWidth: '85%',
                        borderRadius: 1,
                        borderLeft: isSystem ? '2px solid #FFD700' : `3px solid ${msgEmotion || personaColor}`,
                        border: hasEmotionSpike
                          ? '1px solid #FF9800'
                          : isSystem ? '2px solid #FFD700' : `3px solid ${msgEmotion || personaColor}`,
                        boxShadow: hasEmotionSpike ? '0 0 6px rgba(255, 152, 0, 0.4)' : 'none',
                      }}
                    >
                      <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </Typography>
                    </Paper>
                    {/* Timestamp */}
                    <Typography sx={{ fontSize: 9, color: 'text.secondary', mt: 0.25 }}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                );
              })}
              
              {/* Typing Indicator */}
              {typingPersona && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Avatar sx={{ width: 18, height: 18, bgcolor: personaColors[typingPersona as PersonaId] || '#9B7FD4', fontSize: 10 }}>
                      {getPersonaInfo(typingPersona)?.avatar || '?'}
                    </Avatar>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: personaColors[typingPersona as PersonaId] || '#9B7FD4' }}>
                      {getPersonaInfo(typingPersona)?.name || typingPersona}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', fontStyle: 'italic' }}>
                      {t('team.thinking', '正在思考...')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, ml: 3 }}>
                    {[0, 1, 2].map(i => (
                      <Box
                        key={i}
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: personaColors[typingPersona as PersonaId] || '#9B7FD4',
                          animation: 'bounce 1.4s infinite ease-in-out both',
                          animationDelay: `${i * 0.16}s`,
                          '@keyframes bounce': {
                            '0%, 80%, 100%': { transform: 'scale(0)' },
                            '40%': { transform: 'scale(1)' },
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>
            )}

            {/* V28: Emotion Summary Card (shown when discussion concluded) */}
            {activeTab === 1 && renderEmotionSummary()}

            {/* V27: Real Debate Input */}
            {activeTab === 1 && isDebateActive && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('team.debateInputPlaceholder', '输入你的观点，开启讨论...')}
                  value={debateInput}
                  onChange={(e) => setDebateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleDebateSubmit()}
                  disabled={!!typingPersona}
                  multiline
                  maxRows={3}
                  sx={{
                    '& .MuiInputBase-input': { fontSize: 12 },
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleDebateSubmit}
                  disabled={!debateInput.trim() || !!typingPersona}
                >
                  {t('team.speak', '发言')}
                </Button>
              </Box>
            )}

            {/* Regular Team Chat Input (non-debate) */}
            {activeTab === 1 && !isDebateActive && localDiscussion && localDiscussion.status === 'active' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('team.chatPlaceholder') || 'Say something...'}
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleStartDiscussion()}
                  sx={{
                    '& .MuiInputBase-input': { fontSize: 12 },
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleStartDiscussion}
                  disabled={!teamInput.trim()}
                  startIcon={<PlayIcon />}
                >
                  {t('team.send') || 'Send'}
                </Button>
              </Box>
            )}

            {/* 分工视图 Tab — team contribution distribution */}
            {activeTab === 0 && localDiscussion && activeMembers.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, display: 'block', mb: 1 }}>
                  {t('team.contribution', '分工贡献分布')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {activeMembers.map(member => (
                    <Box key={member.personaId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: member.color }} />
                      <Typography sx={{ fontSize: 11, flex: 1 }}>{member.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {contributions[member.personaId] || 0} 条
                      </Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: member.color, minWidth: 36, textAlign: 'right' }}>
                        {getContributionPercentage(member.personaId)}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* 实时对话 Tab — chat messages */}
            {activeTab === 1 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
                  {t('team.analysis') || 'Discussion Analysis'}
                </Typography>
                {(() => {
                  const analysis = analyzeDiscussion();
                  return (
                    <Box sx={{ mt: 1 }}>
                      {analysis.map(a => (
                        <Card key={a.personaId} sx={{ mb: 1, bgcolor: 'rgba(0,0,0,0.2)' }}>
                          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Box sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: personaColors[a.personaId],
                              }} />
                              <Typography sx={{ fontSize: 11, fontWeight: 600 }}>
                                {a.perspective}
                              </Typography>
                              <Chip
                                label={a.emotion}
                                size="small"
                                sx={{ height: 14, fontSize: 8 }}
                              />
                            </Box>
                            <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                              Confidence: {Math.round(a.confidence * 100)}%
                            </Typography>
                            {a.keyPoints.length > 0 && (
                              <Box sx={{ mt: 0.5 }}>
                                {a.keyPoints.map((p, i) => (
                                  <Typography key={i} sx={{ fontSize: 10 }}>
                                    • {p.slice(0, 80)}{p.length > 80 ? '...' : ''}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  );
                })()}
              </Box>
            )}

            {/* 结果汇总 Tab — synthesis + CollaborationStatus */}
            {activeTab === 2 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, display: 'block', mb: 1 }}>
                  {t('team.summary', '协作结果汇总')}
                </Typography>
                <CollaborationStatus />
                {localDiscussion && localDiscussion.status === 'summarized' && localDiscussion.summary && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, border: '1px solid rgba(134,59,255,0.2)' }}>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      {t('team.synthesis', '团队综合结论')}
                    </Typography>
                    <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                      {localDiscussion.summary}
                    </Typography>
                  </Box>
                )}
                {(!localDiscussion || localDiscussion.status !== 'summarized') && (
                  <Box sx={{ mt: 1, p: 2, textAlign: 'center', opacity: 0.5 }}>
                    <Typography sx={{ fontSize: 11 }}>
                      {t('team.noSummary', '暂无汇总结果，请先发起讨论并结束')}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* 历史记录 Tab */}
            {activeTab === 3 && (
              <Box sx={{ mb: 1.5 }}>
                <CollabHistory />
              </Box>
            )}
          </Collapse>
        </Paper>
      )}

      {/* Add Persona Dialog */}
      <Dialog
        open={addPersonaOpen}
        onClose={() => setAddPersonaOpen(false)}
        PaperProps={{
          sx: { bgcolor: 'rgba(30, 20, 55, 0.98)', minWidth: 320 },
        }}
      >
        <DialogTitle sx={{ fontSize: 14 }}>
          {t('team.addPersona') || 'Add Team Member'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel sx={{ fontSize: 12 }}>
              {t('team.selectPersona') || 'Select Persona'}
            </InputLabel>
            <Select
              value={selectedNewPersona}
              label={t('team.selectPersona') || 'Select Persona'}
              onChange={(e) => setSelectedNewPersona(e.target.value as PersonaId)}
              sx={{ fontSize: 12 }}
            >
              {availablePersonas
                .filter(p => !teamMembers.some(m => m.personaId === p.id))
                .map(p => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: p.color, fontSize: 10 }}>
                        {p.name[0]}
                      </Avatar>
                      {p.name}
                    </Box>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPersonaOpen(false)} size="small">
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handleAddPersona}
            variant="contained"
            size="small"
            disabled={!selectedNewPersona}
          >
            {t('team.add') || 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* V27: Real Debate Dialog */}
      <Dialog
        open={debateOpen}
        onClose={handleCloseDebate}
        PaperProps={{
          sx: { bgcolor: 'rgba(30, 20, 55, 0.98)', minWidth: 400 },
        }}
      >
        <DialogTitle sx={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatIcon sx={{ fontSize: 18 }} />
          {t('team.startDebate') || '发起讨论'}
        </DialogTitle>
        <DialogContent>
          {/* Topic Input */}
          <TextField
            fullWidth
            size="small"
            label={t('team.topic') || '话题'}
            placeholder={t('team.debateTopicPlaceholder', '例如：AI对教育的影响')}
            value={debateTopic}
            onChange={(e) => setDebateTopic(e.target.value)}
            sx={{ mt: 1, '& .MuiInputBase-input': { fontSize: 12 } }}
          />

          {/* Persona Selection */}
          <Typography variant="caption" sx={{ fontSize: 11, display: 'block', mt: 2, mb: 1 }}>
            {t('team.selectPersonasDebate', '选择参与讨论的角色（至少2个）')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {(() => {
              const allPersonas = getAllPersonas();
              return allPersonas.map(p => {
                const isSelected = debateSelectedPersonas.includes(p.id);
                return (
                  <Box
                    key={p.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 0.75,
                      borderRadius: 1,
                      bgcolor: isSelected ? `${p.theme?.primaryColor}22` : 'rgba(0,0,0,0.1)',
                      border: `1px solid ${isSelected ? (p.theme?.primaryColor) : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleToggleDebatePersona(p.id)}
                  >
                    <Avatar sx={{ width: 24, height: 24, bgcolor: p.theme?.primaryColor, fontSize: 10 }}>
                      {p.avatar}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{p.name}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{p.bio}</Typography>
                    </Box>
                    <Box sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? (p.theme?.primaryColor) : '#666'}`,
                      bgcolor: isSelected ? (p.theme?.primaryColor) : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isSelected && (
                        <Typography sx={{ fontSize: 10, color: '#fff' }}>✓</Typography>
                      )}
                    </Box>
                  </Box>
                );
              });
            })()}
          </Box>

          {debateSelectedPersonas.length > 0 && (
            <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 1 }}>
              {t('team.selectedCount', '{{count}} 个角色已选择', { count: debateSelectedPersonas.length })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDebate} size="small">
            {t('common.cancel') || '取消'}
          </Button>
          <Button
            onClick={handleStartDebate}
            variant="contained"
            size="small"
            disabled={!debateTopic.trim() || debateSelectedPersonas.length < 2}
            startIcon={<PlayIcon />}
          >
            {t('team.start') || '开始'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MultiPersonaCollaboration;
