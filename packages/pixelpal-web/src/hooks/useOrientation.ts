import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';
export type OrientationAngle = 0 | 90 | 180 | 270;

export interface UseOrientationResult {
  orientation: Orientation;
  angle: OrientationAngle;
  isPortrait: boolean;
  isLandscape: boolean;
  isMobile: boolean;
}

/**
 * Hook to detect and track screen orientation
 */
export function useOrientation(): UseOrientationResult {
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [angle, setAngle] = useState<OrientationAngle>(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobile(!!isMobileDevice);
    };

    checkMobile();

    const updateOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const screenOrientation = window.screen.orientation;

      // Determine orientation from dimensions
      const newOrientation = height > width ? 'portrait' : 'landscape';
      setOrientation(newOrientation);

      // Get angle from screen orientation API if available
      if (screenOrientation && 'angle' in screenOrientation) {
        setAngle(screenOrientation.angle as OrientationAngle);
      } else {
        // Fallback: calculate from dimensions and current orientation
        if (width > height) {
          setAngle(90 as OrientationAngle);
        } else {
          setAngle(0 as OrientationAngle);
        }
      }
    };

    // Initial check
    updateOrientation();

    // Listen for orientation changes
    if (window.screen.orientation) {
      window.screen.orientation.addEventListener('change', updateOrientation);
    }

    // Also listen for resize events
    window.addEventListener('resize', updateOrientation);

    return () => {
      if (window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', updateOrientation);
      }
      window.removeEventListener('resize', updateOrientation);
    };
  }, []);

  return {
    orientation,
    angle,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    isMobile,
  };
}

/**
 * Hook to get CSS for handling orientation changes
 * Returns styles that adapt based on orientation
 */
export function useOrientationStyles() {
  const { orientation, isLandscape } = useOrientation();

  return {
    orientation,
    isLandscape,
    contentStyle: {
      paddingBottom: isLandscape ? 48 : 80, // Less bottom padding in landscape
    },
    mainStyle: {
      flexDirection: isLandscape ? 'row' : 'column' as const,
    },
  };
}

export default useOrientation;
