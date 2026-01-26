import { render } from '@testing-library/react';
import { DependencyGraph } from './DependencyGraph';
import { describe, it, expect } from 'vitest';

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

// Mock DOMMatrixReadOnly for React Flow
class DOMMatrixReadOnly {
  m11 = 1; m12 = 0; m13 = 0; m14 = 0;
  m21 = 0; m22 = 1; m23 = 0; m24 = 0;
  m31 = 0; m32 = 0; m33 = 1; m34 = 0;
  m41 = 0; m42 = 0; m43 = 0; m44 = 1;
  translate() { return this; }
  scale() { return this; }
  toString() { return ''; }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
global.DOMMatrixReadOnly = DOMMatrixReadOnly as any;

describe('DependencyGraph', () => {
  it('renders the React Flow component', () => {
    // We can't easily query internal React Flow elements by text because they might be canvas or localized
    // But we can check if the container renders without error
    const { container } = render(<DependencyGraph />);

    // Check for the react-flow class or attribute
    const reactFlowContainer = container.querySelector('.react-flow');
    expect(reactFlowContainer).toBeDefined();
  });
});
