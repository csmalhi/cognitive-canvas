// Fix: Removed triple-slash directive for jest-dom types, as this is now handled globally in vitest.setup.ts.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResultCard } from './ResultCard';
import { SearchResult } from '../types';

describe('ResultCard', () => {
  const mockOnClick = vi.fn();

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

  const localImageResult: SearchResult = {
    id: '2',
    type: 'image',
    title: 'Test Image',
    description: 'A local test image.',
    tags: [],
    url: 'http://example.com/image.jpg',
    source: 'local',
  };

  it('renders Google Drive file information correctly', () => {
    render(<ResultCard result={driveFileResult} onClick={mockOnClick} />);

    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('A test document from Google Drive.')).toBeInTheDocument();
    expect(screen.getByTitle('From Google Drive')).toBeInTheDocument();
    // Check for the specific icon from the URL
    const icons = screen.getAllByRole('img', { name: /file icon/i });
    expect(icons[0]).toHaveAttribute('src', 'http://example.com/icon.png');
  });

  it('renders local image information correctly', () => {
    render(<ResultCard result={localImageResult} onClick={mockOnClick} />);

    expect(screen.getByText('Test Image')).toBeInTheDocument();
    expect(screen.getByText('A local test image.')).toBeInTheDocument();
    expect(screen.queryByTitle('From Google Drive')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Test Image' })).toHaveAttribute('src', 'http://example.com/image.jpg');
  });

  it('calls onClick handler when clicked', () => {
    const { container } = render(<ResultCard result={localImageResult} onClick={mockOnClick} />);
    container.firstChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(mockOnClick).toHaveBeenCalledWith(localImageResult);
  });
});
