import { useState, useEffect, useRef, useCallback } from 'react';

export interface PinchZoomOptions {
  minScale?: number; // Minimum zoom scale (default: 0.5)
  maxScale?: number; // Maximum zoom scale (default: 4)
  zoomSensitivity?: number; // How sensitive zoom is (default: 1)
  onZoomChange?: (scale: number) => void;
}

export interface PinchZoomResult {
  scale: number;
  translateX: number;
  translateY: number;
  isZooming: boolean;
  containerProps: {
    ref: React.RefObject<HTMLDivElement>;
    style: React.CSSProperties;
  };
 Handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  resetZoom: () => void;
  zoomTo: (scale: number, centerX?: number, centerY?: number) => void;
}

export function usePinchZoom(options: PinchZoomOptions = {}): PinchZoomResult {
  const {
    minScale = 0.5,
    maxScale = 4,
    zoomSensitivity = 1,
    onZoomChange,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isZooming, setIsZooming] = useState(false);

  // Store initial values for pinch
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const lastPinchCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const getCenter = useCallback((touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      initialDistanceRef.current = getDistance(touch1, touch2);
      initialScaleRef.current = scale;
      lastPinchCenterRef.current = getCenter(touch1, touch2);
      setIsZooming(true);
    }
  }, [scale, getDistance, getCenter]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !isZooming) return;

    e.preventDefault();

    const touch1 = e.touches[0];
    const touch2 = e.touches[1];

    const currentDistance = getDistance(touch1, touch2);
    const center = getCenter(touch1, touch2);

    // Calculate scale change
    let newScale = (currentDistance / initialDistanceRef.current) * initialScaleRef.current;
    newScale = Math.max(minScale, Math.min(maxScale, newScale));

    // Calculate translation based on pinch center
    const scaleChange = newScale / scale;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      const centerX = center.x - containerRect.left;
      const centerY = center.y - containerRect.top;

      const newTranslateX = translateX - (centerX - translateX) * (scaleChange - 1);
      const newTranslateY = translateY - (centerY - translateY) * (scaleChange - 1);

      setTranslateX(newTranslateX);
      setTranslateY(newTranslateY);
    }

    setScale(newScale);
    lastPinchCenterRef.current = center;

    onZoomChange?.(newScale);
  }, [isZooming, scale, translateX, translateY, minScale, maxScale, getDistance, getCenter, onZoomChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsZooming(false);
    }
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    onZoomChange?.(1);
  }, [onZoomChange]);

  const zoomTo = useCallback((newScale: number, centerX?: number, centerY?: number) => {
    const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (containerRect && centerX !== undefined && centerY !== undefined) {
      const centerPx = centerX - containerRect.left;
      const centerPy = centerY - containerRect.top;

      const scaleChange = clampedScale / scale;
      const newTranslateX = translateX - (centerPx - translateX) * (scaleChange - 1);
      const newTranslateY = translateY - (centerPy - translateY) * (scaleChange - 1);

      setTranslateX(newTranslateX);
      setTranslateY(newTranslateY);
    }

    setScale(clampedScale);
    onZoomChange?.(clampedScale);
  }, [scale, translateX, translateY, minScale, maxScale, onZoomChange]);

  const containerProps = {
    ref: containerRef,
    style: {
      touchAction: 'none',
      userSelect: 'none' as const,
    } as React.CSSProperties,
  };

  return {
    scale,
    translateX,
    translateY,
    isZooming,
    containerProps,
    Handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    resetZoom,
    zoomTo,
  };
}

export default usePinchZoom;
