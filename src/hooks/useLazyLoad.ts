import { useState, useEffect, useRef, useCallback } from 'react';

export interface LazyLoadOptions {
  threshold?: number; // How much of the element should be visible before loading (0-1)
  rootMargin?: string; // Margin around the root for early loading
  triggerOnce?: boolean; // Only load once (default: true)
}

export interface LazyLoadResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  ref: React.RefObject<HTMLElement>;
}

export function useLazyLoad(
  options: LazyLoadOptions = {}
): LazyLoadResult & { setRef: (el: HTMLElement | null) => void } {
  const { threshold = 0.1, rootMargin = '100px', triggerOnce = true } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [element, setElement] = useState<HTMLElement | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasTriggeredRef = useRef(false);

  const setRef = useCallback((el: HTMLElement | null) => {
    setElement(el);
  }, []);

  useEffect(() => {
    if (!element) return;

    // If already loaded and triggerOnce, don't set up observer
    if (triggerOnce && hasTriggeredRef.current) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (triggerOnce && hasTriggeredRef.current) return;

            hasTriggeredRef.current = true;
            setIsLoading(true);

            // For images, trigger load
            if (element.tagName === 'IMG') {
              const img = element as HTMLImageElement;
              if (!img.complete) {
                img.src = img.dataset.src || img.src;
              }
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [element, threshold, rootMargin, triggerOnce]);

  // Handle successful load
  useEffect(() => {
    if (!element) return;

    const handleLoad = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      setError(new Error('Failed to load resource'));
      setIsLoading(false);
    };

    element.addEventListener('load', handleLoad);
    element.addEventListener('error', handleError);

    // Check if already loaded (for cached images)
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement;
      if (img.complete && img.naturalHeight > 0) {
        setIsLoaded(true);
        setIsLoading(false);
      }
    }

    return () => {
      element.removeEventListener('load', handleLoad);
      element.removeEventListener('error', handleError);
    };
  }, [element]);

  return {
    isLoaded,
    isLoading,
    error,
    ref: { current: element },
    setRef,
  };
}

// Hook for lazy loading images with src replacement
export function useImageLazyLoad(options: LazyLoadOptions = {}) {
  const { threshold = 0.1, rootMargin = '100px', triggerOnce = true } = options;

  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (triggerOnce && hasTriggeredRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (triggerOnce && hasTriggeredRef.current) return;

            hasTriggeredRef.current = true;
            setIsInView(true);

            // Get the data-src or data-srcset
            const dataSrc = img.dataset.src;
            const dataSrcset = img.dataset.srcset;

            if (dataSrc) {
              img.src = dataSrc;
            }
            if (dataSrcset) {
              img.srcset = dataSrcset;
            }

            observer.unobserve(img);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => {
    setError(new Error('Image failed to load'));
    setIsLoaded(true); // Stop loading state even on error
  };

  return {
    imgRef,
    isLoaded,
    isInView,
    error,
    onLoad: handleLoad,
    onError: handleError,
  };
}

export default useLazyLoad;
