import { useRef, useCallback } from 'react';

export interface ThrottleOptions {
  leading?: boolean; // Call on leading edge (default: true)
  trailing?: boolean; // Call on trailing edge (default: true)
}

/**
 * Hook that throttles a callback function
 * @param callback - Function to throttle
 * @param delay - Delay in milliseconds
 * @param options - Throttle options
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: ThrottleOptions = {}
): [(...args: Parameters<T>) => void, () => void] {
  const { leading = true, trailing = true } = options;
  
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  callbackRef.current = callback;

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    lastArgsRef.current = args;

    if (timeSinceLastCall >= delay) {
      // Enough time has passed
      if (leading) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    } else if (trailing && !timeoutRef.current) {
      // Schedule trailing call
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        if (lastArgsRef.current) {
          callbackRef.current(...lastArgsRef.current);
        }
        timeoutRef.current = null;
      }, delay - timeSinceLastCall);
    }
  }, [delay, leading, trailing]) as (...args: Parameters<T>) => void;

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [throttledCallback, cancel];
}

/**
 * Hook that returns a throttled value
 */
export function useThrottledValue<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdateRef = useRef<number>(0);
  const pendingRef = useRef<boolean>(false);

  if (pendingRef.current) return throttledValue;

  const now = Date.now();
  if (now - lastUpdateRef.current >= delay) {
    lastUpdateRef.current = now;
    return value;
  }

  return throttledValue;
}

export default useThrottle;
