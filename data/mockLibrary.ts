import { LibraryItem } from '../types';

export const mockLibrary: LibraryItem[] = [
  {
    id: 'img-001',
    type: 'image',
    title: 'Sunset over the mountains',
    description: 'A beautiful sunset with vibrant orange and purple colors over a mountain range.',
    tags: ['sunset', 'mountain', 'nature', 'landscape', 'orange'],
    url: 'https://images.unsplash.com/photo-1476610182240-cde68bb0a8b3?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: 'vid-001',
    type: 'video',
    title: 'Ocean Waves',
    description: 'Calm ocean waves crashing on a sandy beach.',
    tags: ['ocean', 'waves', 'beach', 'nature', 'relaxing'],
    url: 'https://example.com/ocean_waves.mp4',
  },
  {
    id: 'doc-001',
    type: 'document',
    title: 'Project Proposal',
    description: 'A detailed proposal for the new project initiative, outlining goals and milestones.',
    tags: ['project', 'proposal', 'document', 'work'],
    url: 'https://example.com/project_proposal.pdf',
    content: 'Project Proposal\n\n1. Introduction\n2. Goals\n3. Milestones\n4. Budget',
  },
  {
    id: 'img-002',
    type: 'image',
    title: 'City at Night',
    description: 'A bustling city street at night with neon lights and traffic.',
    tags: ['city', 'night', 'urban', 'lights', 'traffic'],
    url: 'https://images.unsplash.com/photo-1480714378408-67cf0d136b79?q=80&w=2070&auto=format&fit=crop',
  },
    {
    id: 'drive-doc-001',
    type: 'document',
    title: 'Meeting Notes - Q3 Planning',
    description: 'Notes from the Q3 strategic planning meeting, including action items.',
    tags: ['meeting', 'notes', 'planning', 'strategy', 'drive'],
    url: 'https://docs.google.com/document/d/example',
  },
  {
    id: 'aud-001',
    type: 'audio',
    title: 'Podcast Episode 5',
    description: 'An interview with a leading expert in renewable energy.',
    tags: ['podcast', 'interview', 'audio', 'energy'],
    url: 'https://example.com/podcast5.mp3',
  },
];
