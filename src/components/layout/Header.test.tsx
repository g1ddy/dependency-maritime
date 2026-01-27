import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Header } from './Header';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as storeModule from '../../features/visualization/store';

// Mock the store
vi.mock('../../features/visualization/store', () => ({
  useGraphStore: vi.fn(),
}));

describe('Header', () => {
  const setGraphDataMock = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(storeModule.useGraphStore).mockImplementation((selector: any) => {
      return selector({
        setGraphData: setGraphDataMock,
      });
    });
  });

  it('renders without crashing', () => {
    render(<Header />);
    expect(screen.getByTestId('app-title')).toBeDefined();
  });

  it('uploads and parses a valid JSON file', async () => {
    const validData = {
      modules: [],
      summary: {
        violations: [],
        error: 0,
        warn: 0,
        info: 0,
        totalCruised: 0,
        totalDependenciesCruised: 0
      }
    };
    const file = new File([JSON.stringify(validData)], 'graph.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: async () => JSON.stringify(validData),
    });

    render(<Header />);

    // We assume the input will have this test-id
    const input = screen.getByTestId('file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(setGraphDataMock).toHaveBeenCalled();
    });
  });

  it('shows error dialog for invalid JSON content', async () => {
    const invalidJson = "{ invalid: json }";
    const file = new File([invalidJson], 'graph.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: async () => invalidJson,
    });

    render(<Header />);
    const input = screen.getByTestId('file-input');

    fireEvent.change(input, { target: { files: [file] } });

    // Expect a dialog to appear with some error message
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      // We check for some error text
      expect(screen.getByText(/Invalid JSON/i)).toBeTruthy();
    });
    expect(setGraphDataMock).not.toHaveBeenCalled();
  });

  it('shows error dialog for schema validation failure', async () => {
    // Valid JSON but missing required fields (empty object)
    const invalidSchema = {};
    const file = new File([JSON.stringify(invalidSchema)], 'graph.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: async () => JSON.stringify(invalidSchema),
    });

    render(<Header />);
    const input = screen.getByTestId('file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText(/Validation Error/i)).toBeTruthy();
    });
    expect(setGraphDataMock).not.toHaveBeenCalled();
  });
});
