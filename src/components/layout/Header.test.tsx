import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Header } from './Header';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Header', () => {
  const onOpenDataSourceMock = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Header onOpenDataSource={onOpenDataSourceMock} />);
    expect(screen.getByTestId('app-title')).toBeDefined();
  });

  it('calls onOpenDataSource when upload button is clicked', () => {
    render(<Header onOpenDataSource={onOpenDataSourceMock} />);
    const uploadButton = screen.getByLabelText('Upload/Select Data Source');
    fireEvent.click(uploadButton);
    expect(onOpenDataSourceMock).toHaveBeenCalled();
  });
});
