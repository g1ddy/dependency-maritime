import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Header } from './Header';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Header', () => {
  const onDataLoadedMock = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Header onDataLoaded={onDataLoadedMock} />);
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
      value: async () => Promise.resolve(JSON.stringify(validData)),
    });

    render(<Header onDataLoaded={onDataLoadedMock} />);

    // We assume the input will have this test-id
    const input = screen.getByTestId('file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onDataLoadedMock).toHaveBeenCalledWith(validData);
    });
  });

  it('shows error dialog for invalid JSON content', async () => {
    const invalidJson = "{ invalid: json }";
    const file = new File([invalidJson], 'graph.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: async () => Promise.resolve(invalidJson),
    });

    render(<Header onDataLoaded={onDataLoadedMock} />);
    const input = screen.getByTestId('file-input');

    fireEvent.change(input, { target: { files: [file] } });

    // Expect a dialog to appear with some error message
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      // We check for some error text
      expect(screen.getByText(/Invalid JSON/i)).toBeTruthy();
    });
    expect(onDataLoadedMock).not.toHaveBeenCalled();
  });

  it('shows error dialog for schema validation failure', async () => {
    // Valid JSON but missing required fields (empty object)
    const invalidSchema = {};
    const file = new File([JSON.stringify(invalidSchema)], 'graph.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: async () => Promise.resolve(JSON.stringify(invalidSchema)),
    });

    render(<Header onDataLoaded={onDataLoadedMock} />);
    const input = screen.getByTestId('file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText(/Validation Error/i)).toBeTruthy();
    });
    expect(onDataLoadedMock).not.toHaveBeenCalled();
  });
});
