import React, { useEffect } from 'react';
import { SearchResult } from '../types';
import { ImageIcon, VideoIcon, AudioIcon, FileIcon, DriveIcon } from './icons';

interface FullScreenModalProps {
  result: SearchResult | null;
  onClose: () => void;
}

const typeIconMap = {
    image: <ImageIcon className="w-16 h-16 text-blue-500" />,
    video: <VideoIcon className="w-16 h-16 text-rose-500" />,
    audio: <AudioIcon className="w-16 h-16 text-amber-500" />,
    document: <FileIcon className="w-16 h-16 text-emerald-500" />,
    other: <FileIcon className="w-16 h-16 text-gray-500" />,
  };

export const FullScreenModal: React.FC<FullScreenModalProps> = ({ result, onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!result) return null;
  
  const isDriveFile = result.source === 'drive';

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl max-w-4xl max-h-[90vh] w-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold truncate">{result.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none flex-shrink-0 ml-4">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {result.type === 'image' ? (
            <img src={result.url} alt={result.title} className="max-w-full max-h-[70vh] mx-auto object-contain rounded-md" />
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <div className="mb-4">
                  {isDriveFile && result.iconLink ? (
                    <img src={result.iconLink.replace('16', '128')} alt="file icon" className="w-32 h-32" />
                  ) : (
                    typeIconMap[result.type]
                  )}
                </div>
                <h3 className="text-lg text-white mb-2">{result.title}</h3>
                <p className="max-w-md mb-4">{result.description || 'No description available.'}</p>
                {result.content && (
                    <div className="bg-gray-900 p-4 rounded-md text-left w-full max-w-2xl text-sm">
                        <p className="font-mono whitespace-pre-wrap">{result.content}</p>
                    </div>
                )}
                {isDriveFile && result.webViewLink && (
                    <a 
                        href={result.webViewLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mt-4"
                    >
                        <DriveIcon className="w-5 h-5" />
                        Open in Google Drive
                    </a>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};