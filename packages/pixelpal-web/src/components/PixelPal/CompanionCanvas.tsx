/**
 * CompanionCanvas.tsx — PixelPal V3 Companion Canvas Container
 * 
 * Combines PixelPal pet display with ActionToast notifications.
 * Subscribes to the action queue and renders the active action as a toast.
 * Also handles the "click pet" interaction to trigger greeting.
 */

import React, { useEffect, useState } from 'react';
import { PixelPal } from './PixelPal';
import { ActionToast } from './ActionToast';
import {
  subscribeToQueue,
  dismissCurrentWithReason,
  getCurrentAction,
  type ActionQueueItem,
} from '../../services/actions/ActionEngine';
import type { CompanionAction } from '../../services/actions/ActionTypes';
import { useStore } from '../../store';

export const CompanionCanvas: React.FC = () => {
  const petStatus = useStore((s) => s.petStatus);
  const setPetStatus = useStore((s) => s.setPetStatus);
  const [currentItem, setCurrentItem] = useState<ActionQueueItem | null>(null);

  // Subscribe to action queue changes
  useEffect(() => {
    const unsubscribe = subscribeToQueue((_queue) => {
      const current = getCurrentAction();
      setCurrentItem(current);
    });

    // Initialize with current state
    setCurrentItem(getCurrentAction());

    return unsubscribe;
  }, []);

  // Update pet state when displaying an action
  useEffect(() => {
    if (!currentItem) return;

    const actionType = currentItem.action.type;
    
    // Map action type to pet state
    switch (actionType) {
      case 'celebrate':
        setPetStatus({ state: 'notification', message: currentItem.action.achievement });
        break;
      case 'greet':
        setPetStatus({ state: 'notification', message: currentItem.action.greeting });
        break;
      case 'remind':
        setPetStatus({ state: 'notification', message: currentItem.action.content });
        break;
      case 'suggest':
        setPetStatus({ state: 'thinking', message: currentItem.action.suggestion });
        break;
      case 'memory_recall':
        setPetStatus({ state: 'thinking', message: currentItem.action.topic });
        break;
      case 'text':
      default:
        setPetStatus({ state: 'notification', message: currentItem.action.content });
        break;
    }
  }, [currentItem, setPetStatus]);

  // Handle action-specific interactions
  const handleActionTake = (action: CompanionAction) => {
    if (action.type === 'remind') {
      // User clicked "马上做" — navigate to tasks panel and focus the task
      useStore.getState().setActivePanel('tasks');
    }
    // Other action types don't have specific "take" behavior
  };

  // Handle toast dismiss
  const handleDismiss = () => {
    dismissCurrentWithReason('user_dismissed');
  };

  return (
    <>
      <PixelPal />
      
      {currentItem && (
        <ActionToast
          action={currentItem.action}
          onDismiss={handleDismiss}
          onActionTake={currentItem.action.type === 'remind' ? handleActionTake : undefined}
          position={petStatus.position}
        />
      )}
    </>
  );
};

export default CompanionCanvas;
