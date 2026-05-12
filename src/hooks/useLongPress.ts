import { useState, useEffect, useRef, useCallback } from 'react';

export interface LongPressOptions {
  delay?: number; // Time in ms before long press triggers (default: 500)
  threshold?: number; // Movement threshold in px to cancel long press (default: 10)
  onStart?: (e: React.TouchEvent | React.MouseEvent) => void;
  onEnd?: (e: React.TouchEvent | React.MouseEvent) => void;
  onCancel?: () => void;
}

export interface LongPressResult {
  isPressed: boolean;
  isLongPressing: boolean;
 Handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
}

export function useLongPress<T extends HTMLElement = HTMLElement>(
  callback: (e: React.TouchEvent | React.MouseEvent) => void,
  options: LongPressOptions = {}
): LongPressResult {
  const {
    delay = 500,
    threshold = 10,
    onStart,
    onEnd,
    onCancel,
  } = options;

  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const elementRef = useRef<T | null>(null);

  const clearLongPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsPressed(true);
    setIsLongPressing(false);

    // Get starting position
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPosRef.current = { x: clientX, y: clientY };

    onStart?.(e);

    timeoutRef.current = setTimeout(() => {
      setIsLongPressing(true);
      callback(e);
    }, delay);
  }, [delay, callback, onStart]);

  const handleEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    clearLongPress();

    if (isPressed) {
      onEnd?.(e);
    }

    setIsPressed(false);
    setIsLongPressing(false);
    startPosRef.current = null;
  }, [clearLongPress, isPressed, onEnd]);

  const handleCancel = useCallback(() => {
    clearLongPress();

    if (isPressed) {
      onCancel?.();
    }

    setIsPressed(false);
    setIsLongPressing(false);
    startPosRef.current = null;
  }, [clearLongPress, isPressed, onCancel]);

  // Handle move to check if we've exceeded threshold
  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!startPosRef.current || timeoutRef.current === null) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = Math.abs(clientX - startPosRef.current.x);
    const dy = Math.abs(clientY - startPosRef.current.y);

    if (dx > threshold || dy > threshold) {
      handleCancel();
    }
  }, [threshold, handleCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPress();
    };
  }, [clearLongPress]);

  return {
    isPressed,
    isLongPressing,
    Handlers: {
      onMouseDown: handleStart as (e: React.MouseEvent) => void,
      onMouseUp: handleEnd as (e: React.MouseEvent) => void,
      onMouseLeave: handleCancel as (e: React.MouseEvent) => void,
      onTouchStart: handleStart as (e: React.TouchEvent) => void,
      onTouchEnd: handleEnd as (e: React.TouchEvent) => void,
      onTouchCancel: handleCancel as (e: React.TouchEvent) => void,
    },
  };
}

export default useLongPress;
