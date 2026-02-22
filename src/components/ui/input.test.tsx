import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  afterEach(() => {
    cleanup();
  });

  it('should forward ref correctly', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} type="text" data-testid="input" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.tagName).toBe('INPUT');
  });

  it('should render with correct props', () => {
    render(<Input placeholder="Enter text" className="custom-class" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input.className).toContain('custom-class');
  });
});
