/**
 * ProgressTracker
 * V105: Checkpoint + Progress Tracker
 * 
 * Tracks agent execution progress with EventEmitter for real-time updates.
 */

import { EventEmitter } from '@/lib/EventEmitter';
import type { ProgressState } from './types';

export class ProgressTracker extends EventEmitter {
  private state: ProgressState = {
    current: 0,
    total: 0,
    label: '',
    percent: 0,
  };

  /**
   * Start tracking progress
   */
  start(total: number, label: string = 'Starting'): void {
    this.state = {
      current: 0,
      total,
      label,
      percent: 0,
    };
    this.emit('progress', this.state);
  }

  /**
   * Update current step
   */
  update(step: number, label?: string): void {
    this.state.current = step;
    if (label) this.state.label = label;
    this.state.percent = this.state.total > 0 
      ? Math.round((step / this.state.total) * 100)
      : 0;
    this.emit('progress', this.state);
  }

  /**
   * Mark progress as complete
   */
  complete(): void {
    this.state.current = this.state.total;
    this.state.percent = 100;
    this.emit('complete', this.state);
  }

  /**
   * Get current progress state
   */
  getState(): ProgressState {
    return { ...this.state };
  }
}

// Singleton instance
export const progressTracker = new ProgressTracker();