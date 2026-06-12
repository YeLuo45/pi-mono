/**
 * CollabCursor.tsx — V93 Multi-User Collaboration
 * 
 * Shows other participants' cursor/input positions in real-time
 * Optional feature for collaboration awareness
 */

import React, { useEffect, useState } from 'react';
import { MyTypography, MyIconButton , MyAvatar as Avatar } from '../MUI替代';
import { Box } from '../ui/Box';
import { roomManager, roomEventBus } from '../../services/room';
import type { Participant, CursorPosition } from '../../types/collab';

interface CursorProps {
  participant: Participant;
  position: CursorPosition;
}

const Cursor: React.FC<CursorProps> = ({ participant, position }) => {
  const colors = ['#863bff', '#4caf50', '#ff9800', '#2196f3', '#f44336', '#9c27b0'];
  const colorIndex = participant.name.charCodeAt(0) % colors.length;
  const color = colors[colorIndex];

  return (
    <Box
      sx={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'left 0.1s ease-out, top 0.1s ease-out',
      }}
    >
      {/* Cursor Arrow */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.5"
        />
      </svg>

      {/* Name Label */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: color,
          color: 'white',
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          fontSize: 10,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        <Avatar
          sx={{
            width: 14,
            height: 14,
            fontSize: 8,
            bgcolor: 'rgba(255,255,255,0.2)',
          }}
        >
          {participant.name.charAt(0).toUpperCase()}
        </Avatar>
        {participant.name}
      </Box>
    </Box>
  );
};

interface CollabCursorProps {
  className?: string;
  containerId?: string; // Optional: limit cursor display to specific container
}

export const CollabCursor: React.FC<CollabCursorProps> = ({ className, containerId }) => {
  const [cursors, setCursors] = useState<Map<string, { participant: Participant; position: CursorPosition }>>(new Map());

  useEffect(() => {
    const room = roomManager.getCurrentRoom();
    if (!room) return;

    // Initialize with current cursor positions
    const initialCursors = new Map<string, { participant: Participant; position: CursorPosition }>();
    room.participants.forEach((p) => {
      if (p.cursorPosition && p.isOnline && p.userId !== (roomManager as any).currentUserId) {
        initialCursors.set(p.id, { participant: p, position: p.cursorPosition });
      }
    });
    setCursors(initialCursors);

    // Subscribe to cursor move events
    const handleCursorMove = (event: any) => {
      const { userId, data } = event;
      if (!userId || userId === (roomManager as any).currentUserId) return;

      const participant = room.participants.find((p) => p.userId === userId);
      if (!participant) return;

      setCursors((prev) => {
        const next = new Map(prev);
        next.set(participant.id, { participant, position: data.position });
        return next;
      });
    };

    // Subscribe to participant updates
    const handleParticipantUpdate = () => {
      const updatedRoom = roomManager.getCurrentRoom();
      if (!updatedRoom) return;

      setCursors((prev) => {
        const next = new Map(prev);
        // Remove cursors for offline participants
        updatedRoom.participants.forEach((p) => {
          if (!p.isOnline) {
            next.delete(p.id);
          }
        });
        return next;
      });
    };

    roomEventBus.on('cursor_moved', handleCursorMove);
    roomEventBus.on('participant_left', handleParticipantUpdate);
    roomEventBus.on('participant_updated', handleParticipantUpdate);

    return () => {
      roomEventBus.off('cursor_moved', handleCursorMove);
      roomEventBus.off('participant_left', handleParticipantUpdate);
      roomEventBus.off('participant_updated', handleParticipantUpdate);
    };
  }, []);

  // Track mouse movement globally
  useEffect(() => {
    if (!containerId) {
      // Only track if we're not limited to a container
      const handleMouseMove = (e: MouseEvent) => {
        roomManager.updateCursor(e.clientX, e.clientY);
      };

      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [containerId]);

  // Don't render if no cursors
  if (cursors.size === 0) return null;

  return (
    <Box className={className} sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}>
      {Array.from(cursors.values()).map(({ participant, position }) => (
        <Cursor key={participant.id} participant={participant} position={position} />
      ))}
    </Box>
  );
};
