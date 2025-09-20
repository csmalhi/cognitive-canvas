import React from 'react';
import { SearchResult } from '../types';
import { ImageIcon, VideoIcon, AudioIcon, FileIcon, DriveIcon } from './icons';

interface ResultCardProps {
  result: SearchResult;
  onClick: (result: SearchResult) => void;
}

const typeIconMap = {
  image: <ImageIcon className="w-6 h-6 text-brand-blue" />,
  video: <VideoIcon className="w-6 h-6 text-rose-500" />,
  audio: <AudioIcon className="w-6 h-6 text-amber-500" />,
  document: <FileIcon className="w-6 h-6 text-emerald-500" />,
};

export const ResultCard: React.FC<ResultCardProps> = ({ result, onClick }) => {
  const isDriveFile = result.id.startsWith('drive-');

  return (
    <div
      className="bg-gray-800 rounded-lg overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-brand-purple/20 hover:-translate-y-1"
      onClick={() => onClick(result)}
    >
      <div className="relative aspect-video">
        {result.type === 'image' ? (
          <img src={result.url} alt={result.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            {typeIconMap[result.type]}
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
         {isDriveFile && (
          <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1 z-10" title="From Google Drive">
            <DriveIcon className="w-4 h-4 text-gray-700"/>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
            {typeIconMap[result.type]}
            <h3 className="font-semibold text-sm truncate text-gray-200 group-hover:text-white transition-colors">{result.title}</h3>
        </div>
        <p className="text-xs text-gray-400 line-clamp-2">{result.description}</p>
      </div>
    </div>
  );
};