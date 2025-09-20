
import { LibraryItem } from '../types';

export const mockLibrary: LibraryItem[] = [
  {
    id: '1',
    type: 'image',
    title: 'Apple Picking Day',
    description: 'A photo from our trip to the apple orchard last fall.',
    tags: ['fruit', 'apples', 'orchard', 'family', 'fall'],
    url: 'https://picsum.photos/seed/apple/800/600',
  },
  {
    id: '2',
    type: 'document',
    title: 'Grocery List Q3',
    description: 'Quarterly planning for grocery store runs.',
    tags: ['shopping', 'groceries', 'planning', 'food'],
    url: '#',
    content: 'Remember to buy more apples and especially bananas for smoothies. Also need to check the store for new organic options.'
  },
  {
    id: '3',
    type: 'image',
    title: 'Beach Sunset',
    description: 'Beautiful sunset over the ocean.',
    tags: ['beach', 'sunset', 'ocean', 'vacation'],
    url: 'https://picsum.photos/seed/beach/800/600',
  },
  {
    id: '4',
    type: 'video',
    title: 'Project Alpha Presentation',
    description: 'Final presentation recording for Project Alpha.',
    tags: ['work', 'project', 'presentation', 'tech'],
    url: '#',
    content: 'In this presentation, we discuss the core architecture... and the benefits of our approach.'
  },
  {
    id: '5',
    type: 'audio',
    title: 'Brainstorming Session',
    description: 'Audio recording of the initial brainstorming for the new marketing campaign.',
    tags: ['work', 'marketing', 'brainstorming', 'ideas'],
    url: '#',
    content: 'What if we target a new demographic? Maybe focus on healthy eating, like apples and bananas.'
  },
  {
    id: '6',
    type: 'image',
    title: 'Local Supermarket',
    description: 'Photo of the produce aisle at the local store.',
    tags: ['store', 'shopping', 'groceries', 'produce'],
    url: 'https://picsum.photos/seed/store/800/600',
  },
    {
    id: '7',
    type: 'image',
    title: 'Banana Tree',
    description: 'A banana tree in Hawaii.',
    tags: ['fruit', 'banana', 'tree', 'hawaii'],
    url: 'https://picsum.photos/seed/banana/800/600',
  },
];
