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

// Mock dynamic import of complexity metrics
// Since the component uses `await import(...)`, we can't easily spy on it without intercepting the module loading.
// However, since it's an external file, we can trust that in the test environment (where it likely doesn't exist or we don't mock it),
// it throws or returns undefined.
// But `DataSourceDialog.tsx` has a try/catch.
// For the test "loads project data", we should expect `undefined` as the second argument unless we can mock the dynamic import successfully.
// To keep it simple and robust, we'll verify it's called with *some* second argument (likely undefined here).

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

    // Expect undefined for the second argument (complexity metrics)
    expect(mockOnDataLoaded).toHaveBeenCalledWith(mockSampleData, undefined);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('loads project data when clicked', async () => {
    render(
      <DataSourceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onDataLoaded={mockOnDataLoaded}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Project Graph/i }));

    // Wait for the async operation
    await waitFor(() => {
        expect(mockOnDataLoaded).toHaveBeenCalledWith(mockProjectData, expect.anything());
    });
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
             // Expect mockSampleData AND explicitly undefined as second arg, or expect.anything() if we don't care.
             // Given the implementation passes undefined for upload, we expect undefined.
             expect(mockOnDataLoaded).toHaveBeenCalledWith(mockSampleData, undefined);
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

    it('displays error when file is too large', async () => {
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

        // Create a fake file with size > 50MB
        // We don't need actual content, just the size property mocked
        const file = new File([''], 'huge.json', { type: 'application/json' });
        Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 + 1 });

        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
                types: ['Files']
            }
        });

        const errorElement = await within(dialog).findByText('File Too Large');
        expect(errorElement).toBeTruthy();
        expect(mockOnDataLoaded).not.toHaveBeenCalled();
    });
});
