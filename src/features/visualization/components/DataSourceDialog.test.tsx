import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { DataSourceDialog } from './DataSourceDialog';
import type { ICruiseResult } from '@/schema/dependency-cruiser';

// Polyfill Blob.prototype.text for jsdom
if (!Blob.prototype.text) {
  Blob.prototype.text = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(this);
    });
  };
}

// Mock data using vi.hoisted
const { mockSampleData, mockProjectData } = vi.hoisted(() => {
  const sample: ICruiseResult = {
    modules: [
      { source: 'src/App.tsx', dependencies: [] }
    ],
    summary: {
      error: 0,
      warn: 0,
      info: 0,
      totalCruised: 1,
      totalDependenciesCruised: 0,
      violations: []
    }
  };

  const project: ICruiseResult = {
    modules: [
      { source: 'src/main.tsx', dependencies: [] }
    ],
    summary: {
      error: 0,
      warn: 0,
      info: 0,
      totalCruised: 1,
      totalDependenciesCruised: 0,
      violations: []
    }
  };

  return { mockSampleData: sample, mockProjectData: project };
});

// Mock imports
vi.mock('../../../../sample-data/dependency-graph.json', () => ({
  default: mockSampleData
}));

vi.mock('../../../../config/dependency-graph.json', () => ({
  default: mockProjectData
}));

describe('DataSourceDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnDataLoaded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('renders correctly when open', () => {
    render(
      <DataSourceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onDataLoaded={mockOnDataLoaded}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Select Data Source')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: /Sample Data/i })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: /Project Graph/i })).toBeTruthy();
    expect(within(dialog).getByText(/Click to upload/i)).toBeTruthy();
  });

  it('loads sample data when clicked', () => {
    render(
      <DataSourceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onDataLoaded={mockOnDataLoaded}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Sample Data/i }));

    expect(mockOnDataLoaded).toHaveBeenCalledWith(mockSampleData);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('loads project data when clicked', () => {
    render(
      <DataSourceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onDataLoaded={mockOnDataLoaded}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Project Graph/i }));

    expect(mockOnDataLoaded).toHaveBeenCalledWith(mockProjectData);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('DataSourceDialog File Interactions', () => {
    const mockOnOpenChange = vi.fn();
    const mockOnDataLoaded = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      cleanup();
      document.body.innerHTML = '';
    });

    // Note: Direct file input simulation using fireEvent.change is flaky in JSDOM/React19 environment.
    // We rely on drag-and-drop tests to verify the file handling logic (parsing, validation, errors),
    // as it uses the same handleFile function internally.

    it('handles drag and drop of valid JSON', async () => {
        render(
          <DataSourceDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onDataLoaded={mockOnDataLoaded}
          />
        );

        const dialog = screen.getByRole('dialog');
        const dropZone = within(dialog).getByText(/Click to upload/i).closest('button');
        expect(dropZone).not.toBeNull();

        const file = new File([JSON.stringify(mockSampleData)], 'graph.json', { type: 'application/json' });

        fireEvent.dragEnter(dropZone!);
        expect(dropZone!.className).toContain('border-primary');

        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
                types: ['Files']
            }
        });

        await waitFor(() => {
             expect(mockOnDataLoaded).toHaveBeenCalledWith(mockSampleData);
        });
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('handles drag and drop of invalid JSON (Syntax Error)', async () => {
        render(
          <DataSourceDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onDataLoaded={mockOnDataLoaded}
          />
        );

        const dialog = screen.getByRole('dialog');
        const dropZone = within(dialog).getByText(/Click to upload/i).closest('button');
        expect(dropZone).not.toBeNull();
        const file = new File(['{ invalid json: '], 'invalid.json', { type: 'application/json' });

        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
                types: ['Files']
            }
        });

        const errorElement = await within(dialog).findByText('Invalid JSON');
        expect(errorElement).toBeTruthy();
        expect(mockOnDataLoaded).not.toHaveBeenCalled();
    });

    it('handles drag and drop with schema violation', async () => {
        render(
          <DataSourceDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onDataLoaded={mockOnDataLoaded}
          />
        );

        const dialog = screen.getByRole('dialog');
        const dropZone = within(dialog).getByText(/Click to upload/i).closest('button');
        expect(dropZone).not.toBeNull();

        // Missing 'modules' array
        const invalidData = { foo: 'bar' };
        const file = new File([JSON.stringify(invalidData)], 'schema-error.json', { type: 'application/json' });

        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
                types: ['Files']
            }
        });

        const errorElement = await within(dialog).findByText('Validation Error');
        expect(errorElement).toBeTruthy();
        expect(mockOnDataLoaded).not.toHaveBeenCalled();
    });
});
