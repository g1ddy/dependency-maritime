import { render } from '@testing-library/react'
import { ThemeProvider, useTheme } from './theme-provider'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React, { useEffect } from 'react'

describe('ThemeProvider', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  })

  it('provides a stable context value across re-renders', () => {
    let contextValue1: any;
    let contextValue2: any;
    let renderCount = 0;

    const Consumer = () => {
      const value = useTheme();
      renderCount++;
      if (renderCount === 1) {
        contextValue1 = value;
      } else if (renderCount === 2) {
        contextValue2 = value;
      }
      return null;
    }

    const { rerender } = render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    )

    // Force re-render of Provider
    rerender(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    )

    expect(renderCount).toBeGreaterThanOrEqual(2);
    expect(contextValue1).toBeDefined();
    expect(contextValue2).toBeDefined();

    // This assertion fails if value is not memoized
    expect(contextValue1).toBe(contextValue2);
  })
})
