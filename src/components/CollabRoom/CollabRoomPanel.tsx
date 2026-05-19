/**
 * CollabRoomPanel.tsx — V93 Multi-User Collaboration Room Management
 * 
 * UI for:
 * - Creating a new room
 * - Joining an existing room
 * - Managing room settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Switch,
  FormControlLabel,
  Tooltip,
  Divider,
  Alert,
} from '@mui/material';
import { MySwitch } from '../MUI替代';
import {
  Add as AddIcon,
  Link as LinkIcon,
  Settings as SettingsIcon,
  ExitToApp as ExitIcon,
  People as PeopleIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Mic as MicIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { roomManager, roomEventBus } from '../../services/room';
import type { CollabRoom, Participant, RoomSettings } from '../../types/collab';
import { useStore } from '../../store';

interface CollabRoomPanelProps {
  className?: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: '#863bff',
  editor: '#4caf50',
  viewer: '#666',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'owner',
  editor: 'editor',
  viewer: 'viewer',
};

export const CollabRoomPanel: React.FC<CollabRoomPanelProps> = ({ className }) => {
  const { t } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<CollabRoom | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Room settings form
  const [settings, setSettings] = useState<RoomSettings>({
    allowVoice: false,
    allowFileShare: true,
    maxParticipants: 10,
    isPublic: false,
  });

  useEffect(() => {
    // Load current room state
    const room = roomManager.getCurrentRoom();
    setCurrentRoom(room);

    // Subscribe to events
    const handleRoomCreated = () => {
      setCurrentRoom(roomManager.getCurrentRoom());
    };
    const handleRoomJoined = () => {
      setCurrentRoom(roomManager.getCurrentRoom());
      setIsConnected(true);
    };
    const handleRoomLeft = () => {
      setCurrentRoom(null);
      setIsConnected(false);
    };
    const handleParticipantUpdate = () => {
      setCurrentRoom(roomManager.getCurrentRoom());
    };

    roomEventBus.on('room_created', handleRoomCreated);
    roomEventBus.on('room_joined', handleRoomJoined);
    roomEventBus.on('room_left', handleRoomLeft);
    roomEventBus.on('participant_updated', handleParticipantUpdate);
    roomEventBus.on('participant_joined', handleParticipantUpdate);
    roomEventBus.on('participant_left', handleParticipantUpdate);

    return () => {
      roomEventBus.off('room_created', handleRoomCreated);
      roomEventBus.off('room_joined', handleRoomJoined);
      roomEventBus.off('room_left', handleRoomLeft);
      roomEventBus.off('participant_updated', handleParticipantUpdate);
      roomEventBus.off('participant_joined', handleParticipantUpdate);
      roomEventBus.off('participant_left', handleParticipantUpdate);
    };
  }, []);

  const handleCreateRoom = () => {
    if (!roomName.trim()) return;

    const room = roomManager.createRoom(roomName.trim(), settings);
    setCurrentRoom(room);
    setCreateDialogOpen(false);
    setRoomName('');

    // Try to connect
    roomManager.connect();
    setIsConnected(true);
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) return;

    // Parse invite link or code
    let roomId = joinCode.trim();
    let code = '';

    const parsed = roomManager.parseInviteLink(joinCode.trim());
    if (parsed) {
      roomId = parsed.roomId;
      code = parsed.code;
    } else {
      // Assume it's a room ID directly
      code = '';
    }

    if (roomManager.joinRoom(roomId, userName)) {
      setJoinDialogOpen(false);
      setJoinCode('');
      roomManager.connect();
      setIsConnected(true);
    }
  };

  const handleLeaveRoom = () => {
    roomManager.leaveRoom();
    setCurrentRoom(null);
    setIsConnected(false);
  };

  const handleUpdateSettings = () => {
    roomManager.updateRoomSettings(settings);
    setSettingsDialogOpen(false);
  };

  const userName = useStore((s) => s.companion.customName) || 'Anonymous';

  // ============================================================================
  // Render: Not in a room
  // ============================================================================

  if (!currentRoom) {
    return (
      <Box className={className} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('collabRoom.title', 'Collaboration')}
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          {t('collabRoom.noRoomHint', 'Create or join a room to collaborate with others')}
        </Alert>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            {t('collabRoom.create', 'Create Room')}
          </Button>

          <Button
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={() => setJoinDialogOpen(true)}
          >
            {t('collabRoom.join', 'Join Room')}
          </Button>
        </Box>

        {/* Create Room Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('collabRoom.createTitle', 'Create Collaboration Room')}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={t('collabRoom.roomName', 'Room Name')}
              fullWidth
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('collabRoom.settings', 'Room Settings')}
            </Typography>

            <FormControlLabel
              control={
                <MySwitch
                  checked={settings.isPublic}
                  onChange={(e) => setSettings({ ...settings, isPublic: e.target.checked })}
                />
              }
              label={t('collabRoom.public', 'Public Room')}
            />

            <FormControlLabel
              control={
                <MySwitch
                  checked={settings.allowVoice}
                  onChange={(e) => setSettings({ ...settings, allowVoice: e.target.checked })}
                />
              }
              label={t('collabRoom.allowVoice', 'Allow Voice Chat')}
            />

            <FormControlLabel
              control={
                <MySwitch
                  checked={settings.allowFileShare}
                  onChange={(e) => setSettings({ ...settings, allowFileShare: e.target.checked })}
                />
              }
              label={t('collabRoom.allowFileShare', 'Allow File Sharing')}
            />

            <TextField
              margin="dense"
              label={t('collabRoom.maxParticipants', 'Max Participants')}
              type="number"
              fullWidth
              value={settings.maxParticipants}
              onChange={(e) => setSettings({ ...settings, maxParticipants: parseInt(e.target.value) || 10 })}
              inputProps={{ min: 2, max: 50 }}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button variant="contained" onClick={handleCreateRoom} disabled={!roomName.trim()}>
              {t('collabRoom.create', 'Create')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Join Room Dialog */}
        <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('collabRoom.joinTitle', 'Join Collaboration Room')}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label={t('collabRoom.inviteLink', 'Invite Link or Room ID')}
              fullWidth
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="https://... or room ID"
            />

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('collabRoom.joinHint', 'Paste an invite link or room ID to join')}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJoinDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button variant="contained" onClick={handleJoinRoom} disabled={!joinCode.trim()}>
              {t('collabRoom.join', 'Join')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // ============================================================================
  // Render: In a room
  // ============================================================================

  const onlineParticipants = currentRoom.participants.filter((p) => p.isOnline);
  const offlineParticipants = currentRoom.participants.filter((p) => !p.isOnline);

  return (
    <Box className={className} sx={{ p: 2 }}>
      {/* Room Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon />
          <Typography variant="h6">{currentRoom.name}</Typography>
          <Chip
            size="small"
            label={isConnected ? t('collabRoom.connected', 'Connected') : t('collabRoom.offline', 'Offline')}
            color={isConnected ? 'success' : 'default'}
            sx={{ ml: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {roomManager.isOwner() && (
            <Tooltip title={t('collabRoom.settings', 'Settings')}>
              <IconButton onClick={() => setSettingsDialogOpen(true)} size="small">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={t('collabRoom.leave', 'Leave Room')}>
            <IconButton onClick={handleLeaveRoom} size="small" color="error">
              <ExitIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Room Info */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          icon={currentRoom.settings.isPublic ? <PublicIcon /> : <LockIcon />}
          label={currentRoom.settings.isPublic ? t('collabRoom.public', 'Public') : t('collabRoom.private', 'Private')}
        />
        {currentRoom.settings.allowVoice && (
          <Chip size="small" icon={<MicIcon />} label={t('collabRoom.voice', 'Voice')} />
        )}
        {currentRoom.settings.allowFileShare && (
          <Chip size="small" icon={<AttachFileIcon />} label={t('collabRoom.files', 'Files')} />
        )}
        <Chip size="small" label={`${onlineParticipants.length}/${currentRoom.settings.maxParticipants}`} />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Online Participants */}
      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        {t('collabRoom.onlineParticipants', 'Online')} ({onlineParticipants.length})
      </Typography>

      <List dense sx={{ mb: 1 }}>
        {onlineParticipants.map((participant) => (
          <ListItem key={participant.id} sx={{ px: 1 }}>
            <ListItemAvatar sx={{ minWidth: 36 }}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: ROLE_COLORS[participant.role] }}>
                {participant.name.charAt(0).toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={participant.name}
              secondary={participant.userId === roomManager['currentUserId'] ? `(${t('common.you', 'You')})` : ''}
              primaryTypographyProps={{ fontSize: 14 }}
              secondaryTypographyProps={{ fontSize: 11 }}
            />
            <Chip
              size="small"
              label={t(`collabRoom.role.${ROLE_LABELS[participant.role]}`, participant.role)}
              sx={{
                bgcolor: ROLE_COLORS[participant.role],
                color: 'white',
                fontSize: 10,
                height: 20,
              }}
            />
          </ListItem>
        ))}
      </List>

      {/* Offline Participants */}
      {offlineParticipants.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.disabled' }}>
            {t('collabRoom.offlineParticipants', 'Offline')} ({offlineParticipants.length})
          </Typography>

          <List dense>
            {offlineParticipants.map((participant) => (
              <ListItem key={participant.id} sx={{ px: 1, opacity: 0.5 }}>
                <ListItemAvatar sx={{ minWidth: 36 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#666' }}>
                    {participant.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={participant.name}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('collabRoom.settingsTitle', 'Room Settings')}</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <MySwitch
                checked={settings.isPublic}
                onChange={(e) => setSettings({ ...settings, isPublic: e.target.checked })}
              />
            }
            label={t('collabRoom.public', 'Public Room')}
            sx={{ my: 1 }}
          />

          <FormControlLabel
            control={
              <MySwitch
                checked={settings.allowVoice}
                onChange={(e) => setSettings({ ...settings, allowVoice: e.target.checked })}
              />
            }
            label={t('collabRoom.allowVoice', 'Allow Voice Chat')}
            sx={{ my: 1 }}
          />

          <FormControlLabel
            control={
              <MySwitch
                checked={settings.allowFileShare}
                onChange={(e) => setSettings({ ...settings, allowFileShare: e.target.checked })}
              />
            }
            label={t('collabRoom.allowFileShare', 'Allow File Sharing')}
            sx={{ my: 1 }}
          />

          <TextField
            margin="dense"
            label={t('collabRoom.maxParticipants', 'Max Participants')}
            type="number"
            fullWidth
            value={settings.maxParticipants}
            onChange={(e) => setSettings({ ...settings, maxParticipants: parseInt(e.target.value) || 10 })}
            inputProps={{ min: 2, max: 50 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" onClick={handleUpdateSettings}>
            {t('common.save', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
