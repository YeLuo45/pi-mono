import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that debounces a value - delays updating the returned value
 * until after the specified delay has elapsed since the last change.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that debounces a callback function
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): [(...args: Parameters<T>) => void, boolean] {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [debouncedCallback, flush];
}

/**
 * Hook that returns a debounced version of the given value
 * along with a flush function to trigger the debounced value immediately
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number
): [T, () => T, () => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const valueRef = useRef(value);

  // Update ref when value changes
  valueRef.current = value;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(valueRef.current);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [delay]);

  const getValue = useCallback(() => valueRef.current, []);

  const flush = useCallback(() => {
    setDebouncedValue(valueRef.current);
  }, []);

  return [debouncedValue, getValue, flush];
}

export default useDebounce;
