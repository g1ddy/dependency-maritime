import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { DataSourceDialog, MAX_FILE_SIZE, MAX_MODULES, MAX_DEPENDENCIES } from './DataSourceDialog';
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
  const sample = {
    modules: [
      { source: 'src/App.tsx', dependencies: [], valid: true, dependents: [] }
    ],
    summary: {
      error: 0,
      warn: 0,
      info: 0,
      ignore: 0,
      totalCruised: 1,
      totalDependenciesCruised: 0,
      violations: [],
      optionsUsed: {}
    }
  } as unknown as ICruiseResult;

  const project = {
    modules: [
      { source: 'src/main.tsx', dependencies: [], valid: true, dependents: [] }
    ],
    summary: {
      error: 0,
      warn: 0,
      info: 0,
      ignore: 0,
      totalCruised: 1,
      totalDependenciesCruised: 0,
      violations: [],
      optionsUsed: {}
    }
  } as unknown as ICruiseResult;

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

  it('loads sample data when clicked', async () => {
    render(
      <DataSourceDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onDataLoaded={mockOnDataLoaded}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Sample Data/i }));

    await waitFor(() => {
      expect(mockOnDataLoaded).toHaveBeenCalledWith(mockSampleData, undefined);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
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

    await waitFor(() => {
        expect(mockOnDataLoaded).toHaveBeenCalledWith(mockProjectData, expect.anything());
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

describe('DataSourceDialog File Interactions', () => {
    const mockOnOpenChange = vi.fn();
    const mockOnDataLoaded = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(console, 'error').mockImplementation(() => {});
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

        const file = new File([''], 'huge.json', { type: 'application/json' });
        Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 });

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

    it('rejects graph that exceeds complexity limits', async () => {
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

        // Create a large graph
        const modules = new Array(MAX_MODULES + 1).fill(null).map((_, i) => ({
            source: `src/file_${i}.ts`,
            dependencies: [],
            valid: true,
            dependents: []
        }));

        const largeData = {
            modules,
            summary: {
                error: 0, warn: 0, info: 0, ignore: 0, totalCruised: modules.length, totalDependenciesCruised: 0, violations: [], optionsUsed: {}
            }
        };

        const file = new File([JSON.stringify(largeData)], 'complex.json', { type: 'application/json' });

        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
                types: ['Files']
            }
        });

        const errorElement = await within(dialog).findByText('Graph Too Complex');
        expect(errorElement).toBeTruthy();
        expect(mockOnDataLoaded).not.toHaveBeenCalled();
    });

    it('rejects graph that exceeds dependency limits', async () => {
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

        // Create a graph with many dependencies
        // We simulate a single module with MAX_DEPENDENCIES + 1 dependencies
        const manyDependencies = new Array(MAX_DEPENDENCIES + 1).fill(null).map((_, i) => ({
             module: `dep${i}`,
             resolved: `src/dep${i}.ts`,
             coreModule: false,
             followable: true,
             couldNotResolve: false,
             dependencyTypes: ["local"],
             circular: false,
             dynamic: false,
             exoticallyRequired: false,
             protocol: 'file:',
             mimeType: '',
             instability: 0,
             valid: true,
             moduleSystem: 'es6'
        }));

        const modules = [{
            source: 'src/hub.ts',
            dependencies: manyDependencies,
            valid: true,
            dependents: []
        }];

        const largeData = {
            modules,
            summary: {
                error: 0, warn: 0, info: 0, ignore: 0, totalCruised: 1, totalDependenciesCruised: manyDependencies.length, violations: [], optionsUsed: {}
            }
        };

        const file = new File([JSON.stringify(largeData)], 'many-deps.json', { type: 'application/json' });

        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
                types: ['Files']
            }
        });

        const errorElement = await within(dialog).findByText('Graph Too Complex');
        expect(errorElement).toBeTruthy();
        expect(mockOnDataLoaded).not.toHaveBeenCalled();
    });
});
