import { useCallback, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface SwipeBackOptions {
  threshold?: number; // Distance in pixels to trigger back (default: 100)
  velocityThreshold?: number; // Velocity to trigger back (default: 0.5)
  elementRef?: React.RefObject<HTMLElement | null>; // Container element, defaults to document
  disabled?: boolean; // Disable swipe back
}

export interface SwipeBackResult {
  isSwipingBack: boolean;
  translateX: number;
  progress: number; // 0-1 progress of the swipe
}

export function useSwipeBack(options: SwipeBackOptions = {}): SwipeBackResult {
  const {
    threshold = 100,
    velocityThreshold = 0.5,
    elementRef,
    disabled = false,
  } = options;

  const navigate = useNavigate();
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const [isSwipingBack, setIsSwipingBack] = useState(false);
  const [translateX, setTranslateX] = useState(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only handle single touch
    if (e.touches.length !== 1) return;

    // Check if swiping from left edge (within 20px)
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    const clientX = touch.clientX;

    // Only trigger if starting from left edge and horizontal movement is dominant
    if (clientX > 20) return;

    startXRef.current = clientX;
    startYRef.current = touch.clientY;
    startTimeRef.current = Date.now();
    currentXRef.current = clientX;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    if (startXRef.current === 0) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    // Only handle right swipes
    if (deltaX <= 0) {
      setIsSwipingBack(false);
      setTranslateX(0);
      return;
    }

    // If vertical movement is dominant, don't handle
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    // Prevent default to stop scrolling
    e.preventDefault();

    // Limit max translation
    const maxTranslate = window.innerWidth * 0.4;
    const clampedX = Math.min(deltaX, maxTranslate);

    currentXRef.current = touch.clientX;
    setTranslateX(clampedX);
    setIsSwipingBack(true);
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isSwipingBack) {
      startXRef.current = 0;
      return;
    }

    const deltaX = currentXRef.current - startXRef.current;
    const deltaTime = Date.now() - startTimeRef.current;
    const velocity = deltaX / deltaTime;

    // Determine if should navigate back
    const shouldNavigate = deltaX > threshold || velocity > velocityThreshold;

    if (shouldNavigate) {
      navigate(-1);
    }

    setIsSwipingBack(false);
    setTranslateX(0);
    startXRef.current = 0;
  }, [isSwipingBack, navigate, threshold, velocityThreshold]);

  useEffect(() => {
    if (disabled) return;

    const target = elementRef?.current || document;

    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(translateX / threshold, 1);

  return {
    isSwipingBack,
    translateX,
    progress,
  };
}

export default useSwipeBack;
