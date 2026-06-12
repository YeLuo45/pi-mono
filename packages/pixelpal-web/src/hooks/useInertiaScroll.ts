import { useRef, useCallback, useEffect, useState } from 'react';

export interface InertiaScrollOptions {
  friction?: number; // Friction coefficient (default: 0.95)
  bounceStiffness?: number; // Spring stiffness for bounce (default: 200)
  bounceDamping?: number; // Spring damping for bounce (default: 20)
  maxVelocity?: number; // Maximum velocity (default: 50)
  contentRef: React.RefObject<HTMLElement>;
}

export interface InertiaScrollResult {
  isScrolling: boolean;
  velocity: number;
  handlers: {
    onWheel: (e: React.WheelEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  scrollTo: (offset: number, immediate?: boolean) => void;
  stop: () => void;
}

export function useInertiaScroll(options: InertiaScrollOptions): InertiaScrollResult {
  const {
    friction = 0.95,
    bounceStiffness = 200,
    bounceDamping = 20,
    maxVelocity = 50,
    contentRef,
  } = options;

  const [isScrolling, setIsScrolling] = useState(false);
  const [velocity, setVelocity] = useState(0);

  const velocityRef = useRef(0);
  const positionRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isBouncingRef = useRef(false);
  const targetRef = useRef(0);

  // Calculate bounds
  const getBounds = useCallback(() => {
    const el = contentRef.current;
    if (!el) return { min: 0, max: 0 };
    
    return {
      min: 0,
      max: Math.max(0, el.scrollHeight - el.clientHeight),
    };
  }, [contentRef]);

  // Apply bounce when at boundaries
  const applyBounce = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    const bounds = getBounds();
    let needsUpdate = false;

    if (positionRef.current < bounds.min) {
      const distance = bounds.min - positionRef.current;
      const springForce = distance * (bounceStiffness / 1000);
      velocityRef.current -= springForce;
      positionRef.current = bounds.min + distance * 0.1;
      needsUpdate = true;
      isBouncingRef.current = true;
    } else if (positionRef.current > bounds.max) {
      const distance = positionRef.current - bounds.max;
      const springForce = distance * (bounceStiffness / 1000);
      velocityRef.current += springForce;
      positionRef.current = bounds.max - distance * 0.1;
      needsUpdate = true;
      isBouncingRef.current = true;
    }

    if (needsUpdate) {
      el.scrollTop = positionRef.current;
    }
  }, [contentRef, getBounds, bounceStiffness]);

  // Animation loop
  const animate = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    // Apply friction
    velocityRef.current *= friction;

    // Clamp velocity
    velocityRef.current = Math.max(-maxVelocity, Math.min(maxVelocity, velocityRef.current));

    // Update position
    positionRef.current += velocityRef.current;

    // Apply to element
    el.scrollTop = positionRef.current;

    // Update state
    setVelocity(velocityRef.current);
    setIsScrolling(Math.abs(velocityRef.current) > 0.1);

    // Check bounds and apply bounce
    applyBounce();

    // Continue animation if still has velocity
    if (Math.abs(velocityRef.current) > 0.1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsScrolling(false);
      isBouncingRef.current = false;
    }
  }, [contentRef, friction, maxVelocity, applyBounce]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const el = contentRef.current;
    if (!el) return;

    // Calculate velocity from wheel delta
    const delta = e.deltaY;
    velocityRef.current += delta * 0.1;
    velocityRef.current = Math.max(-maxVelocity, Math.min(maxVelocity, velocityRef.current));

    // Update position
    positionRef.current = el.scrollTop + delta;

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Start new animation
    animationRef.current = requestAnimationFrame(animate);
  }, [contentRef, maxVelocity, animate]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    startYRef.current = e.touches[0].clientY;
    lastYRef.current = startYRef.current;
    lastTimeRef.current = Date.now();

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    velocityRef.current = 0;
    isBouncingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const currentY = e.touches[0].clientY;
    const currentTime = Date.now();
    const deltaY = lastYRef.current - currentY;
    const deltaTime = currentTime - lastTimeRef.current;

    if (deltaTime > 0) {
      // Calculate velocity
      let newVelocity = deltaY / deltaTime * 16;
      velocityRef.current = Math.max(-maxVelocity, Math.min(maxVelocity, newVelocity));
    }

    lastYRef.current = currentY;
    lastTimeRef.current = currentTime;

    // Update position
    const el = contentRef.current;
    if (el) {
      positionRef.current = el.scrollTop + deltaY;
    }
  }, [contentRef, maxVelocity]);

  const handleTouchEnd = useCallback(() => {
    // Start inertia animation
    if (Math.abs(velocityRef.current) > 0.5) {
      setIsScrolling(true);
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const scrollTo = useCallback((offset: number, immediate = false) => {
    const el = contentRef.current;
    if (!el) return;

    if (immediate) {
      positionRef.current = offset;
      velocityRef.current = 0;
      el.scrollTop = offset;
      setIsScrolling(false);
    } else {
      targetRef.current = offset;
      velocityRef.current = (offset - positionRef.current) * 0.1;
      setIsScrolling(true);
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [contentRef, animate]);

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    velocityRef.current = 0;
    setIsScrolling(false);
    setVelocity(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Sync position on scroll events
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (!isBouncingRef.current) {
        positionRef.current = el.scrollTop;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [contentRef]);

  return {
    isScrolling,
    velocity,
    handlers: {
      onWheel: handleWheel,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    scrollTo,
    stop,
  };
}

export default useInertiaScroll;
