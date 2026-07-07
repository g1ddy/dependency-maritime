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
});
