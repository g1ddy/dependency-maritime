import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FileUploadZone } from './FileUploadZone';

describe('FileUploadZone', () => {
  const mockOnFileSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with default labels', () => {
    render(<FileUploadZone onFileSelect={mockOnFileSelect} />);
    expect(screen.getByText('Click to upload or drag and drop')).toBeTruthy();
    expect(screen.getByText('JSON files only')).toBeTruthy();
  });

  it('sets dragActive state on drag enter', () => {
    render(<FileUploadZone onFileSelect={mockOnFileSelect} />);
    const button = screen.getByRole('button');

    // Initial state
    expect(button.className).not.toContain('border-primary bg-primary/10');

    // Drag enter
    fireEvent.dragEnter(button, {
      dataTransfer: {
        types: ['Files'],
      },
    });

    expect(button.className).toContain('border-primary bg-primary/10');
  });

  it('does not set dragActive state on drag enter when no files are present', () => {
    render(<FileUploadZone onFileSelect={mockOnFileSelect} />);
    const button = screen.getByRole('button');

    // Drag enter with something else
    fireEvent.dragEnter(button, {
      dataTransfer: {
        types: ['text/plain'],
      },
    });

    expect(button.className).not.toContain('border-primary bg-primary/10');
  });

  it('unsets dragActive state on drag leave', () => {
    render(<FileUploadZone onFileSelect={mockOnFileSelect} />);
    const button = screen.getByRole('button');

    fireEvent.dragEnter(button, {
      dataTransfer: {
        types: ['Files'],
      },
    });
    expect(button.className).toContain('border-primary bg-primary/10');

    fireEvent.dragLeave(button);
    expect(button.className).not.toContain('border-primary bg-primary/10');
  });

  it('does not unset dragActive state on drag leave if moving to a child element', () => {
    render(<FileUploadZone onFileSelect={mockOnFileSelect} />);
    const button = screen.getByRole('button');
    const child = screen.getByText('Click to upload or drag and drop');

    // Drag enter button
    fireEvent.dragEnter(button, {
      dataTransfer: {
        types: ['Files'],
      },
    });
    expect(button.className).toContain('border-primary bg-primary/10');

    // When moving to a child:
    // 1. dragenter on child (bubbles to button)
    fireEvent.dragEnter(child, {
      dataTransfer: {
        types: ['Files'],
      },
    });
    // 2. dragleave on button
    fireEvent.dragLeave(button);

    expect(button.className).toContain('border-primary bg-primary/10');

    // Final drag leave (out of button)
    fireEvent.dragLeave(button);
    expect(button.className).not.toContain('border-primary bg-primary/10');
  });

  it('calls onFileSelect on drop', () => {
    render(<FileUploadZone onFileSelect={mockOnFileSelect} />);
    const button = screen.getByRole('button');
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    fireEvent.drop(button, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    expect(button.className).not.toContain('border-primary bg-primary/10');
  });

  it('does not call onFileSelect or change state when loading', () => {
    render(<FileUploadZone onFileSelect={mockOnFileSelect} loading={true} />);
    const button = screen.getByRole('button');
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    fireEvent.dragEnter(button, {
      dataTransfer: {
        types: ['Files'],
      },
    });
    expect(button.className).not.toContain('border-primary bg-primary/10');

    fireEvent.drop(button, {
      dataTransfer: {
        files: [file],
      },
    });
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('resets dragActive state if loading becomes true during drag', () => {
    const { rerender } = render(<FileUploadZone onFileSelect={mockOnFileSelect} loading={false} />);
    const button = screen.getByRole('button');

    fireEvent.dragEnter(button, {
      dataTransfer: {
        types: ['Files'],
      },
    });
    expect(button.className).toContain('border-primary bg-primary/10');

    // Rerender with loading=true
    rerender(<FileUploadZone onFileSelect={mockOnFileSelect} loading={true} />);
    expect(button.className).not.toContain('border-primary bg-primary/10');
  });
});
