import React, { lazy, Suspense, ComponentType } from 'react';

// Type for the loaded component
type LazyComponent<P = {}> = React.LazyExoticComponent<ComponentType<P>>;

// Cache for loaded components
const cache = new Map<string, LazyComponent>();

export interface LazyImportOptions {
  fallback?: React.ReactNode;
  suspense?: boolean;
}

/**
 * Creates a lazily loaded component with caching
 */
export function lazyImport<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  name: string
): LazyComponent<P> {
  const cacheKey = `__lazy_${name}`;

  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, lazy(importFn));
  }

  return cache.get(cacheKey) as LazyComponent<P>;
}

/**
 * Component for lazy loading with fallback
 */
export interface LazyLoaderProps {
  importFn: () => Promise<{ default: ComponentType<any> }>;
  name: string;
  fallback?: React.ReactNode;
  SuspenseProps?: React.SuspenseProps;
}

/**
 * LazyLoader component with built-in Suspense
 */
export const LazyLoader: React.FC<LazyLoaderProps> = ({
  importFn,
  name,
  fallback = null,
  SuspenseProps,
}) => {
  const LazyComponent = lazyImport(importFn, name);

  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      <LazyComponent />
    </Suspense>
  );
};

/**
 * Loading fallback component
 */
export const LoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 100,
      color: 'rgba(255, 255, 255, 0.5)',
    }}
  >
    <div
      style={{
        width: 24,
        height: 24,
        border: '2px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: '#5e6ad2',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * Creates a component that only loads when rendered
 * Useful for code splitting large components
 */
export function createLazyComponent<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>
): React.FC<P> {
  const LazyComponent = lazy(importFn);

  return (props: P) => (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Check if a module is already loaded
 */
export function isModuleLoaded(name: string): boolean {
  return cache.has(`__lazy_${name}`);
}

/**
 * Preload a lazy module
 */
export function preloadModule(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  name: string
): void {
  const cacheKey = `__lazy_${name}`;
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, lazy(importFn));
  }
  // Start loading
  importFn();
}

export default lazyImport;
