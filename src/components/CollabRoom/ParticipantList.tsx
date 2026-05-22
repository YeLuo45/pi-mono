/**
 * ParticipantList.tsx — V93 Multi-User Collaboration
 * 
 * Displays list of participants with:
 * - Role badges (owner/editor/viewer)
 * - Online status indicator
 * - Last active time
 */

import React, { useState } from 'react';
import { MyListItemAvatar, MyMenu } from '../MUI替代';
import { MyBox, MyTypography, MyList, MyListItem, MyListItemText, MyIconButton, MyChip, MyIconButton, MySelect, MyTooltip, MyDivider } from '../MUI替代';
import {
  MoreVert as MoreVertIcon,
  AdminPanelSettings as OwnerIcon,
  Edit as EditorIcon,
  Visibility as ViewerIcon,
  Circle as OnlineIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { roomManager, roomEventBus } from '../../services/room';
import type { Participant } from '../../types/collab';

interface ParticipantListProps {
  className?: string;
  showActions?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  owner: '#863bff',
  editor: '#4caf50',
  viewer: '#757575',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <OwnerIcon sx={{ fontSize: 12 }} />,
  editor: <EditorIcon sx={{ fontSize: 12 }} />,
  viewer: <ViewerIcon sx={{ fontSize: 12 }} />,
};

function formatLastActive(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ className, showActions = true }) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  const room = roomManager.getCurrentRoom();
  if (!room) return null;

  const currentUserId = (roomManager as any).currentUserId;
  const isOwner = roomManager.isOwner();

  const onlineParticipants = room.participants.filter((p) => p.isOnline);
  const offlineParticipants = room.participants.filter((p) => !p.isOnline);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, participant: Participant) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedParticipant(participant);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedParticipant(null);
  };

  const handleChangeRole = (newRole: 'editor' | 'viewer') => {
    if (selectedParticipant) {
      roomManager.updateParticipantRole(selectedParticipant.id, newRole);
    }
    handleMenuClose();
  };

  const handleRemoveParticipant = () => {
    if (selectedParticipant) {
      roomManager.removeParticipant(selectedParticipant.id);
    }
    handleMenuClose();
  };

  const renderParticipant = (participant: Participant, isOnline: boolean) => {
    const isSelf = participant.userId === currentUserId;

    return (
      <ListItem
        key={participant.id}
        sx={{
          px: 1,
          py: 0.75,
          opacity: isOnline ? 1 : 0.5,
          '&:hover': showActions && isOwner && !isSelf ? { bgcolor: 'action.hover' } : {},
        }}
        secondaryAction={
          showActions && isOwner && !isSelf ? (
            <IconButton edge="end" size="small" onClick={(e) => handleMenuOpen(e, participant)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          ) : null
        }
      >
        <ListItemAvatar sx={{ minWidth: 40 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 13,
                bgcolor: ROLE_COLORS[participant.role],
              }}
            >
              {participant.name.charAt(0).toUpperCase()}
            </Avatar>
            {isOnline && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: '#4caf50',
                  border: '2px solid',
                  borderColor: 'background.paper',
                }}
              />
            )}
          </Box>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 14 }}>
                {participant.name}
                {isSelf && (
                  <Typography component="span" sx={{ fontSize: 12, color: 'text.disabled', ml: 0.5 }}>
                    ({t('common.you', 'You')})
                  </Typography>
                )}
              </Typography>
            </Box>
          }
          secondary={
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              {isOnline ? t('collabRoom.online', 'Online') : formatLastActive(participant.lastActive)}
            </Typography>
          }
        />

        <Chip
          size="small"
          icon={ROLE_ICONS[participant.role]}
          label={t(`collabRoom.role.${participant.role}`, participant.role)}
          sx={{
            bgcolor: ROLE_COLORS[participant.role],
            color: 'white',
            fontSize: 11,
            height: 22,
            '& .MuiChip-icon': { color: 'white', ml: 0.5 },
          }}
        />
      </ListItem>
    );
  };

  return (
    <Box className={className} sx={{ width: '100%' }}>
      {/* Online Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ px: 1, mb: 0.5, color: 'text.secondary', fontSize: 11 }}>
          {t('collabRoom.onlineParticipants', 'Online').toUpperCase()} ({onlineParticipants.length})
        </Typography>
        <List dense disablePadding>
          {onlineParticipants.map((p) => renderParticipant(p, true))}
        </List>
      </Box>

      {/* Offline Section */}
      {offlineParticipants.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ px: 1, mb: 0.5, color: 'text.disabled', fontSize: 11 }}>
            {t('collabRoom.offlineParticipants', 'Offline').toUpperCase()} ({offlineParticipants.length})
          </Typography>
          <List dense disablePadding>
            {offlineParticipants.map((p) => renderParticipant(p, false))}
          </List>
        </Box>
      )}

      {/* Participant Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleChangeRole('editor')}>
          <EditorIcon sx={{ fontSize: 16, mr: 1 }} />
          {t('collabRoom.makeEditor', 'Make Editor')}
        </MenuItem>
        <MenuItem onClick={() => handleChangeRole('viewer')}>
          <ViewerIcon sx={{ fontSize: 16, mr: 1 }} />
          {t('collabRoom.makeViewer', 'Make Viewer')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleRemoveParticipant} sx={{ color: 'error.main' }}>
          {t('collabRoom.removeParticipant', 'Remove')}
        </MenuItem>
      </Menu>
    </Box>
  );
};
