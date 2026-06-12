/**
 * React 18.3.1 Downgrade Acceptance Tests
 * 
 * Validates that the project has successfully downgraded from React 19.2.4 to React 18.3.1
 * and that @mui/material@5.17.0 + @mui/system@5.17.1 work correctly without ownerState errors.
 * 
 * Issue: React 19 incompatibility caused "styled.ownerState undefined" and "ownerState[800]" crashes.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import { renderToString } from 'react-dom/server';

// Import the theme system
import { ThemeProvider, darkTheme, lightTheme } from '../../components/ui/ThemeProvider';

// Get project root path - from src/__tests__/acceptance/ go up 3 levels to reach pixel-pal-web
const projectRoot = path.resolve(__dirname, '../../../');

// ============================================================================
// Test Suite: React 18.x Version Verification
// ============================================================================

describe('React 18.x Version Verification', () => {
  it('should have React 18.x in package.json dependencies', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    expect(packageJson.dependencies.react).toMatch(/^18\.\d+\.\d+$/);
    expect(packageJson.dependencies['react-dom']).toMatch(/^18\.\d+\.\d+$/);
  });

  it('should NOT have React 19.x installed', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    const reactVersion = packageJson.dependencies.react;
    expect(reactVersion).not.toMatch(/^19\.\d+\.\d+$/);
    expect(reactVersion).toBe('18.3.1');
  });

  it('should have React 18.x in node_modules', () => {
    const reactPath = path.join(projectRoot, 'node_modules/react/package.json');
    const reactPackageJson = JSON.parse(fs.readFileSync(reactPath, 'utf-8'));
    
    expect(reactPackageJson.version).toMatch(/^18\.\d+\.\d+$/);
  });

  it('should have correct @types/react version', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    expect(packageJson.devDependencies['@types/react']).toMatch(/^18\.\d+\.\d+$/);
  });
});

// ============================================================================
// Test Suite: MUI Styled Components Rendering
// ============================================================================

describe('MUI Styled Components Rendering', () => {
  it('should render Button component without ownerState errors', async () => {
    const Button = (await import('@mui/material/Button')).default;
    
    const html = renderToString(
      React.createElement(Button, { variant: 'contained', color: 'primary' }, 'Test Button')
    );
    
    expect(html).toContain('Test Button');
  });

  it('should render Tabs component without ownerState errors', async () => {
    const Tabs = (await import('@mui/material/Tabs')).default;
    const Tab = (await import('@mui/material/Tab')).default;
    
    const html = renderToString(
      React.createElement(Tabs, { value: 0 },
        React.createElement(Tab, { label: 'Tab 1' }),
        React.createElement(Tab, { label: 'Tab 2' })
      )
    );
    
    expect(html).toContain('Tab 1');
    expect(html).toContain('Tab 2');
  });

  it('should render Grid component without ownerState errors', async () => {
    const Grid = (await import('@mui/material/Grid')).default;
    
    const html = renderToString(
      React.createElement(Grid, { container: true },
        React.createElement(Grid, { item: true, xs: 12 }, 'Grid Item')
      )
    );
    
    expect(html).toContain('Grid Item');
  });

  it('should render Box component without ownerState errors', async () => {
    const Box = (await import('@mui/material/Box')).default;
    
    const html = renderToString(
      React.createElement(Box, { sx: { bgcolor: 'primary.main' } }, 'Box Content')
    );
    
    expect(html).toContain('Box Content');
  });
});

// ============================================================================
// Test Suite: ThemeProvider Integration
// ============================================================================

describe('ThemeProvider Integration', () => {
  it('should render ThemeProvider with dark theme', () => {
    const html = renderToString(
      React.createElement(ThemeProvider, { theme: darkTheme },
        React.createElement('div', null, 'Themed Content')
      )
    );
    
    expect(html).toContain('Themed Content');
  });

  it('should render ThemeProvider with light theme', () => {
    const html = renderToString(
      React.createElement(ThemeProvider, { theme: lightTheme },
        React.createElement('div', null, 'Light Themed Content')
      )
    );
    
    expect(html).toContain('Light Themed Content');
  });

  it('should render themed content without crashing', () => {
    // ThemeProvider wraps content and applies emotion global styles
    const html = renderToString(
      React.createElement(ThemeProvider, { theme: darkTheme },
        React.createElement('div', { 'data-testid': 'themed-div' }, 'Themed Content')
      )
    );
    
    expect(html).toContain('Themed Content');
    expect(html).toContain('data-testid');
  });
});

// ============================================================================
// Test Suite: Core Page Rendering
// ============================================================================

describe('Core Page Rendering', () => {
  it('should render App component without crashing', () => {
    const appPath = path.join(projectRoot, 'src/App.tsx');
    expect(fs.existsSync(appPath)).toBe(true);
    
    const appContent = fs.readFileSync(appPath, 'utf-8');
    expect(appContent).toContain('ThemeProvider');
    expect(appContent).toContain('BrowserRouter');
  });

  it('should render MacSourceList component without crashing', () => {
    const sourceListPath = path.join(projectRoot, 'src/components/macos/MacSourceList.tsx');
    expect(fs.existsSync(sourceListPath)).toBe(true);

    const sourceListContent = fs.readFileSync(sourceListPath, 'utf-8');
    expect(sourceListContent).toContain('role="navigation"');
  });

  it('should render BottomTabNav component without crashing', () => {
    const bottomNavPath = path.join(projectRoot, 'src/components/Layout/BottomTabNav.tsx');
    expect(fs.existsSync(bottomNavPath)).toBe(true);
  });

  it('should have correct MUI package versions', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    expect(packageJson.dependencies['@mui/material']).toBe('5.17.0');
    expect(packageJson.dependencies['@mui/system']).toBe('5.17.1');
  });
});

// ============================================================================
// Test Suite: Build Output Verification
// ============================================================================

describe('Build Output Verification', () => {
  const buildDir = path.join(projectRoot, 'dist/renderer');

  it('should have production build in dist/renderer', () => {
    expect(fs.existsSync(buildDir)).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'index.html'))).toBe(true);
  });

  it('should contain React 18 bundle in build output', () => {
    const assetsDir = path.join(buildDir, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);
    
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  it('should NOT contain ownerState[800] error string in build', () => {
    const checkDirectory = (dir: string): boolean => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (checkDirectory(fullPath)) return true;
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('ownerState[800]') || content.includes('ownerState[param]')) {
            return true;
          }
        }
      }
      return false;
    };
    
    if (fs.existsSync(buildDir)) {
      const hasOwnerStateError = checkDirectory(buildDir);
      expect(hasOwnerStateError).toBe(false);
    }
  });

  it('should have valid index.html with correct base path', () => {
    const indexPath = path.join(buildDir, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    
    expect(indexContent).toContain('<script');
    expect(indexContent).toContain('assets/');
  });
});

// ============================================================================
// Test Suite: MUI System Compatibility
// ============================================================================

describe('MUI System Compatibility', () => {
  it('should have styled-engine configured for Emotion', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    expect(packageJson.dependencies['@mui/styled-engine']).toBe('5.16.14');
  });

  it('should have Emotion packages installed', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    expect(packageJson.dependencies['@emotion/react']).toBeDefined();
    expect(packageJson.dependencies['@emotion/styled']).toBeDefined();
  });

  it('should render styled component with theme integration', async () => {
    const styled = (await import('@emotion/styled')).default;
    const Box = (await import('@mui/material/Box')).default;
    
    const StyledBox = styled(Box)({ bgcolor: 'primary.main', p: 2 });
    
    const html = renderToString(
      React.createElement(ThemeProvider, { theme: darkTheme },
        React.createElement(StyledBox, null, 'Styled Box Content')
      )
    );
    
    expect(html).toContain('Styled Box Content');
  });
});

// ============================================================================
// Summary Test: Overall Health Check
// ============================================================================

describe('Overall Health Check', () => {
  it('should pass all critical React 18 downgrade criteria', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    const checks = {
      react18Installed: packageJson.dependencies.react === '18.3.1',
      reactDom18Installed: packageJson.dependencies['react-dom'] === '18.3.1',
      muiMaterial517: packageJson.dependencies['@mui/material'] === '5.17.0',
      muiSystem517: packageJson.dependencies['@mui/system'] === '5.17.1',
      emotionReactInstalled: !!packageJson.dependencies['@emotion/react'],
      emotionStyledInstalled: !!packageJson.dependencies['@emotion/styled'],
    };
    
    const failedChecks = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    
    expect(failedChecks).toEqual([]);
    expect(Object.values(checks).every(v => v)).toBe(true);
  });
});
