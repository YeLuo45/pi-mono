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
} from '@mui/icons-material';
import { useStore } from '../../store';
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

  const companion = useStore((s) => s.companion);
  const setPersona = useStore((s) => s.setPersona);

  // Sync with current discussion
  useEffect(() => {
    const discussion = getCurrentDiscussion();
    if (discussion) {
      setLocalDiscussion({ ...discussion });
      // Update contribution tracking
      const contribs: { [key: string]: number } = {};
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
              {localDiscussion && localDiscussion.status === 'active' && (
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

            {/* Tabs for different views */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                mb: 1.5,
                minHeight: 32,
                '& .MuiTab-root': { minHeight: 32, py: 0.5, fontSize: 11 },
              }}
            >
              <Tab icon={<ChatIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Chat" />
              <Tab icon={<InsightsIcon sx={{ fontSize: 14 }} />} iconPosition="start" label="Analysis" />
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
              </Box>
            )}

            {/* Chat Messages */}
            <Box sx={{
              maxHeight: 300,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              mb: 1.5,
            }}>
              {localDiscussion?.messages.map(msg => {
                const personaColor = personaColors[msg.personaId] || '#9B7FD4';
                const isUser = msg.personaId === companion.personaId;
                return (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: personaColor,
                        }}
                      />
                      <Typography sx={{ fontSize: 10, fontWeight: 600, color: personaColor }}>
                        {msg.personaName}
                      </Typography>
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
                    <Paper
                      sx={{
                        p: 1,
                        bgcolor: 'rgba(0,0,0,0.2)',
                        maxWidth: '85%',
                        borderRadius: 1,
                        borderLeft: `2px solid ${personaColor}`,
                      }}
                    >
                      <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>

            {/* Analysis Tab Content */}
            {activeTab === 1 && localDiscussion && (
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
    </Box>
  );
};

export default MultiPersonaCollaboration;
