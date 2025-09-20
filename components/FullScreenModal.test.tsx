// Fix: Removed triple-slash directive for jest-dom types, as this is now handled globally in vitest.setup.ts.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FullScreenModal } from './FullScreenModal';
import { SearchResult } from '../types';

describe('FullScreenModal', () => {
  const mockOnClose = vi.fn();

  const driveFileResult: SearchResult = {
    id: '1',
    type: 'document',
    title: 'Test Document',
    description: 'A test document from Google Drive.',
    tags: [],
    url: 'http://example.com/doc',
    source: 'drive',
    iconLink: 'http://example.com/icon.png',
    webViewLink: 'http://example.com/view',
  };

  it('does not render when result is null', () => {
    const { container } = render(<FullScreenModal result={null} onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when a result is provided', () => {
    render(<FullScreenModal result={driveFileResult} onClose={mockOnClose} />);

    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('A test document from Google Drive.')).toBeInTheDocument();
    expect(screen.getByText('Open in Google Drive')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    render(<FullScreenModal result={driveFileResult} onClose={mockOnClose} />);
    
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Escape key is pressed', () => {
    render(<FullScreenModal result={driveFileResult} onClose={mockOnClose} />);
    
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
