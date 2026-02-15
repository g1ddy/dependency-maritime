import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { DataSourceDialog } from './DataSourceDialog';
import Papa from 'papaparse';
import type { CsvRow } from '../types';

// Mock the store
const mockSetData = vi.fn();
const mockSetLoading = vi.fn();
const mockIsLoading = false;

vi.mock('../store', () => ({
  useRelationshipStore: () => ({
    setData: mockSetData,
    setLoading: mockSetLoading,
    isLoading: mockIsLoading,
  }),
}));

// Mock Papa Parse
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
  },
}));

// Mock sample CSV import
vi.mock('../../../../sample-data/class_visualization.csv?raw', () => ({
  default: 'Source,Target,Target_Domain,Relationship_Weight\nA,B,Core,5',
}));

// Polyfill FileReader for jsdom
class MockFileReader {
  onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;

  readAsText(file: File) {
    // Simulate async behavior
    setTimeout(() => {
        if (file.name === 'error.csv') {
            this.onerror?.();
        } else {
            this.result = 'Source,Target,Target_Domain,Relationship_Weight\nC,D,UI,3';
            this.onload?.({ target: { result: this.result } } as ProgressEvent<FileReader>);
        }
    }, 0);
  }
}
vi.stubGlobal('FileReader', MockFileReader);

describe('Relationship DataSourceDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly', () => {
    render(<DataSourceDialog open={true} onOpenChange={mockOnOpenChange} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Select Data Source')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: /Sample Data/i })).toBeTruthy();
    expect(within(dialog).getByText(/Class Visualization/i)).toBeTruthy();
  });

  it('loads sample data', async () => {
    // Setup Papa.parse mock for success
    const papaParseMock = Papa.parse as unknown as ReturnType<typeof vi.fn>;
    papaParseMock.mockImplementation((_csv: string, config: Papa.ParseConfig<CsvRow>) => {
        if (config.complete) {
            config.complete({
                data: [{ Source: 'A', Target: 'B', Target_Domain: 'Core', Relationship_Weight: 5, Relationship: 'Depends' } as unknown as CsvRow],
                errors: [],
                meta: { delimiter: ',', linebreak: '\n', aborted: false, truncated: false, cursor: 0 }
            }, undefined);
        }
    });

    render(<DataSourceDialog open={true} onOpenChange={mockOnOpenChange} />);
    const sampleBtn = screen.getByRole('button', { name: /Sample Data/i });
    fireEvent.click(sampleBtn);

    expect(mockSetLoading).toHaveBeenCalledWith(true);
    await waitFor(() => {
        expect(mockSetData).toHaveBeenCalled();
        expect(mockSetLoading).toHaveBeenCalledWith(false);
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('handles file upload success', async () => {
    const papaParseMock = Papa.parse as unknown as ReturnType<typeof vi.fn>;
    papaParseMock.mockImplementation((_csv: string, config: Papa.ParseConfig<CsvRow>) => {
        if (config.complete) {
            config.complete({
                data: [{ Source: 'C', Target: 'D', Target_Domain: 'UI', Relationship_Weight: 3, Relationship: 'Depends' } as unknown as CsvRow],
                errors: [],
                meta: { delimiter: ',', linebreak: '\n', aborted: false, truncated: false, cursor: 0 }
            }, undefined);
        }
    });

    render(<DataSourceDialog open={true} onOpenChange={mockOnOpenChange} />);
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });

    // Simulate file selection via input (GenericDataSourceDialog connects FileUploadZone)
    // Dialog content is portalled, so we query document
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
        expect(mockSetData).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('displays error on parsing failure', async () => {
      const papaParseMock = Papa.parse as unknown as ReturnType<typeof vi.fn>;
      papaParseMock.mockImplementation((_csv: string, config: Papa.ParseConfig<CsvRow>) => {
          if (config.complete) {
              config.complete({
                  data: [],
                  errors: [{ message: 'Bad CSV format', type: 'Quotes', code: 'MissingQuotes', row: 0, index: 0 }],
                  meta: { delimiter: ',', linebreak: '\n', aborted: false, truncated: false, cursor: 0 }
              }, undefined);
          }
      });

      render(<DataSourceDialog open={true} onOpenChange={mockOnOpenChange} />);
      const file = new File(['bad content'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
          expect(screen.getByText('Parsing Error')).toBeTruthy();
          expect(screen.getByText(/Bad CSV format/)).toBeTruthy();
      });
      expect(mockSetData).not.toHaveBeenCalled();
  });
});
