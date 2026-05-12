import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to handle keyboard adaptation for mobile devices.
 * When a keyboard appears, the input field is scrolled into view.
 */
export function useKeyboardAdapt() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const viewportHeightRef = useRef(window.innerHeight);
  const previousScrollRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const viewportDiff = viewportHeightRef.current - currentHeight;
      
      // Keyboard typically takes at least 200px
      if (viewportDiff > 200) {
        setIsKeyboardVisible(true);
        setKeyboardHeight(viewportDiff);
      } else {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
      
      viewportHeightRef.current = currentHeight;
    };

    // Use visualViewport API if available for better detection
    if (window.visualViewport) {
      const handleVisualViewport = () => {
        const visualViewport = window.visualViewport!;
        const currentHeight = visualViewport.height;
        const offsetTop = visualViewport.offsetTop;
        const viewportDiff = window.innerHeight - currentHeight;
        
        if (viewportDiff > 200) {
          setIsKeyboardVisible(true);
          setKeyboardHeight(viewportDiff);
        } else {
          setIsKeyboardVisible(false);
          setKeyboardHeight(0);
        }
      };

      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);

      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewport);
        window.visualViewport?.removeEventListener('scroll', handleVisualViewport);
      };
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  /**
   * Scroll an element into view when keyboard is visible
   */
  const scrollIntoView = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    if (isKeyboardVisible && keyboardHeight > 0) {
      // Save current scroll position
      previousScrollRef.current = window.scrollY;

      // Calculate where element should be positioned
      const rect = element.getBoundingClientRect();
      const targetY = rect.top + window.scrollY - keyboardHeight - 20;

      // Scroll to position element above keyboard
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth',
      });
    }
  }, [isKeyboardVisible, keyboardHeight]);

  /**
   * Restore scroll position when keyboard hides
   */
  const restoreScrollPosition = useCallback(() => {
    if (!isKeyboardVisible && previousScrollRef.current > 0) {
      window.scrollTo({
        top: previousScrollRef.current,
        behavior: 'instant',
      });
      previousScrollRef.current = 0;
    }
  }, [isKeyboardVisible]);

  return {
    isKeyboardVisible,
    keyboardHeight,
    scrollIntoView,
    restoreScrollPosition,
  };
}

/**
 * Hook to get CSS custom property value for keyboard height
 * Use in combination with CSS calc() for proper layout
 */
export function useKeyboardHeightCSS(): string {
  const [height, setHeight] = useState('0px');

  useEffect(() => {
    const updateHeight = () => {
      const currentHeight = window.innerHeight;
      const viewportDiff = window.screen.height - currentHeight;
      
      if (viewportDiff > 200) {
        setHeight(`${viewportDiff}px`);
      } else {
        setHeight('0px');
      }
    };

    // Use visualViewport if available
    if (window.visualViewport) {
      const handleVisualViewport = () => {
        const visualViewport = window.visualViewport!;
        const diff = window.innerHeight - visualViewport.height;
        setHeight(diff > 200 ? `${diff}px` : '0px');
      };

      window.visualViewport.addEventListener('resize', handleVisualViewport);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewport);
      };
    } else {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, []);

  return height;
}

export default useKeyboardAdapt;
