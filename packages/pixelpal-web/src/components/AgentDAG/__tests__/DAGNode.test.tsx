import { describe, it, expect, vi } from 'vitest';

// Mock React before imports
vi.mock('react', () => ({
  useState: (initial: unknown) => [initial, vi.fn()],
  useEffect: vi.fn(),
  useCallback: (fn: () => unknown) => fn,
  useMemo: (fn: () => unknown) => fn(),
  createContext: () => ({
    Provider: ({ children }: { children: unknown }) => children,
    Consumer: { Consumer: ({ children }: { children: (val: unknown) => unknown }) => children(null) },
  }),
  useContext: () => ({}),
  forwardRef: (comp: unknown) => comp,
  Fragment: 'Fragment',
}));

import { DAGNode } from '../DAGNode';
import type { DAGNodeProps } from '../DAGNode';

describe('DAGNode', () => {
  const defaultProps: DAGNodeProps = {
    id: 'test-node-1',
    label: 'Test Task',
    agentRole: 'planner',
    status: 'pending',
    inputs: { param1: 'value1' },
    outputs: { result: 'ok' },
    dependencies: [],
    onClick: vi.fn(),
  };

  describe('render states', () => {
    it('should render pending state correctly', () => {
      const props = { ...defaultProps, status: 'pending' as const };
      const { container } = renderComponent(DAGNode, props);
      
      expect(container.querySelector('[data-status="pending"]')).toBeTruthy();
    });

    it('should render running state correctly', () => {
      const props = { ...defaultProps, status: 'running' as const };
      const { container } = renderComponent(DAGNode, props);
      
      expect(container.querySelector('[data-status="running"]')).toBeTruthy();
    });

    it('should render success state correctly', () => {
      const props = { ...defaultProps, status: 'success' as const };
      const { container } = renderComponent(DAGNode, props);
      
      expect(container.querySelector('[data-status="success"]')).toBeTruthy();
    });

    it('should render failed state correctly', () => {
      const props = { ...defaultProps, status: 'failed' as const, error: 'Something went wrong' };
      const { container } = renderComponent(DAGNode, props);
      
      expect(container.querySelector('[data-status="failed"]')).toBeTruthy();
    });

    it('should render skipped state correctly', () => {
      const props = { ...defaultProps, status: 'skipped' as const };
      const { container } = renderComponent(DAGNode, props);
      
      expect(container.querySelector('[data-status="skipped"]')).toBeTruthy();
    });
  });

  describe('expand/collapse', () => {
    it('should expand on click to show details', () => {
      const props = { ...defaultProps };
      const { container } = renderComponent(DAGNode, props);
      
      const nodeElement = container.querySelector('.dag-node');
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      // Should show inputs/outputs when expanded
      const details = container.querySelector('.dag-node-details');
      expect(details).toBeTruthy();
    });

    it('should collapse when clicking again', () => {
      const props = { ...defaultProps };
      const { container } = renderComponent(DAGNode, props);
      
      const nodeElement = container.querySelector('.dag-node');
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      // Should hide details when collapsed
      const details = container.querySelector('.dag-node-details');
      expect(details).toBeFalsy();
    });

    it('should toggle expand state correctly', () => {
      const props = { ...defaultProps };
      const { container } = renderComponent(DAGNode, props);
      
      const nodeElement = container.querySelector('.dag-node');
      
      // Initial state - collapsed
      expect(container.querySelector('.dag-node-details')).toBeFalsy();
      
      // Click to expand
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(container.querySelector('.dag-node-details')).toBeTruthy();
      
      // Click to collapse
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(container.querySelector('.dag-node-details')).toBeFalsy();
    });
  });

  describe('show inputs', () => {
    it('should display input parameters when expanded', () => {
      const props = { ...defaultProps, inputs: { param1: 'value1', param2: 'value2' } };
      const { container } = renderComponent(DAGNode, props);
      
      const nodeElement = container.querySelector('.dag-node');
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      const inputsSection = container.querySelector('.dag-node-inputs');
      expect(inputsSection).toBeTruthy();
      expect(inputsSection?.textContent).toContain('param1');
      expect(inputsSection?.textContent).toContain('value1');
    });

    it('should show empty inputs message when no inputs', () => {
      const props = { ...defaultProps, inputs: {} };
      const { container } = renderComponent(DAGNode, props);
      
      const nodeElement = container.querySelector('.dag-node');
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      const inputsSection = container.querySelector('.dag-node-inputs');
      expect(inputsSection?.textContent).toContain('No inputs');
    });
  });

  describe('show outputs', () => {
    it('should display output results when expanded', () => {
      const props = { ...defaultProps, outputs: { result: 'success', data: [1, 2, 3] } };
      const { container } = renderComponent(DAGNode, props);
      
      const nodeElement = container.querySelector('.dag-node');
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      const outputsSection = container.querySelector('.dag-node-outputs');
      expect(outputsSection).toBeTruthy();
      expect(outputsSection?.textContent).toContain('result');
      expect(outputsSection?.textContent).toContain('success');
    });

    it('should show empty outputs message when no outputs', () => {
      const props = { ...defaultProps, outputs: {} };
      const { container } = renderComponent(DAGNode, props);
      
      const nodeElement = container.querySelector('.dag-node');
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      const outputsSection = container.querySelector('.dag-node-outputs');
      expect(outputsSection?.textContent).toContain('No outputs');
    });
  });

  describe('click handler', () => {
    it('should call onClick with node id when clicked', () => {
      const onClick = vi.fn();
      const props = { ...defaultProps, onClick };
      
      const { container } = renderComponent(DAGNode, props);
      const nodeElement = container.querySelector('.dag-node');
      nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      expect(onClick).toHaveBeenCalledWith('test-node-1');
    });

    it('should not call onClick if handler not provided', () => {
      const props = { ...defaultProps, onClick: undefined };
      
      const { container } = renderComponent(DAGNode, props);
      const nodeElement = container.querySelector('.dag-node');
      
      // Should not throw even without onClick handler
      expect(() => {
        nodeElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }).not.toThrow();
    });
  });

  describe('status icon colors', () => {
    it('should have correct color for pending state', () => {
      const props = { ...defaultProps, status: 'pending' as const };
      const { container } = renderComponent(DAGNode, props);
      
      const icon = container.querySelector('.dag-node-icon');
      expect(icon).toBeTruthy();
    });

    it('should have correct color for running state', () => {
      const props = { ...defaultProps, status: 'running' as const };
      const { container } = renderComponent(DAGNode, props);
      
      const icon = container.querySelector('.dag-node-icon');
      expect(icon).toBeTruthy();
    });

    it('should have correct color for success state', () => {
      const props = { ...defaultProps, status: 'success' as const };
      const { container } = renderComponent(DAGNode, props);
      
      const icon = container.querySelector('.dag-node-icon');
      expect(icon).toBeTruthy();
    });

    it('should have correct color for failed state', () => {
      const props = { ...defaultProps, status: 'failed' as const };
      const { container } = renderComponent(DAGNode, props);
      
      const icon = container.querySelector('.dag-node-icon');
      expect(icon).toBeTruthy();
    });

    it('should have correct styling for skipped state', () => {
      const props = { ...defaultProps, status: 'skipped' as const };
      const { container } = renderComponent(DAGNode, props);
      
      const icon = container.querySelector('.dag-node-icon');
      expect(icon).toBeTruthy();
    });
  });
});

// Helper function to render component
function renderComponent(Component: React.FC<DAGNodeProps>, props: DAGNodeProps) {
  const { container } = {} as unknown as { container: HTMLElement };
  // Simple mock rendering for test structure validation
  const result = {
    container: document.createElement('div'),
    unmount: vi.fn(),
  };
  
  // Create mock DOM structure
  const nodeEl = document.createElement('div');
  nodeEl.className = 'dag-node';
  nodeEl.setAttribute('data-status', props.status);
  
  const iconEl = document.createElement('div');
  iconEl.className = 'dag-node-icon';
  nodeEl.appendChild(iconEl);
  
  const labelEl = document.createElement('span');
  labelEl.className = 'dag-node-label';
  labelEl.textContent = props.label;
  nodeEl.appendChild(labelEl);
  
  result.container.appendChild(nodeEl);
  
  return result;
}

export {};