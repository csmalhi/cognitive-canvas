import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SearchResult, MediaType, LibraryItem } from './types';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { generateSearchQueries, API_KEY } from './services/geminiService';
import { MicIcon, SearchIcon, DriveIcon } from './components/icons';
import { ResultCard } from './components/ResultCard';
import { FullScreenModal } from './components/FullScreenModal';
import { jwtDecode } from 'jwt-decode'; // Using a simple decoder for the JWT from Google

const CLIENT_ID = '679495081221-mpudno83nmp2146rshrueaff054735d7.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<'main' | 'library'>('main');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [driveFiles, setDriveFiles] = useState<LibraryItem[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authStatus, setAuthStatus] = useState('loading'); // loading, unauthenticated, authenticated
  const [selectedFolder, setSelectedFolder] = useState<{id: string, name: string} | null>(null);
  const tokenClient = useRef<any>(null);
  const signInContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const mapDriveFileToLibraryItem = (file: any): LibraryItem => {
    let type: MediaType = 'document';
    if (file.mimeType?.startsWith('image/')) type = 'image';
    else if (file.mimeType?.startsWith('video/')) type = 'video';
    else if (file.mimeType?.startsWith('audio/')) type = 'audio';
  
    return {
      id: `drive-${file.id}`,
      type: type,
      title: file.name,
      description: file.description || `A file from Google Drive.`,
      tags: ['drive', file.mimeType],
      url: type === 'image' && file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s800') : file.webViewLink,
      content: `Google Drive File: ${file.name}`
    };
  };

  const listDriveFiles = useCallback(async (folderId: string) => {
    if (!folderId) return;
    setIsLoading(true);
    try {
      const response = await window.gapi.client.drive.files.list({
        pageSize: 100,
        fields: 'files(id, name, mimeType, description, webViewLink, thumbnailLink)',
        q: `'${folderId}' in parents and trashed = false`,
      });
      const files = response.result.files.map(mapDriveFileToLibraryItem);
      setDriveFiles(files);
    } catch (error) {
      console.error('Error fetching Drive files:', error);
    }
    setIsLoading(false);
  }, []);

  const handleAuthCallback = useCallback(async (tokenResponse: any) => {
    if (tokenResponse.error) {
      console.error(tokenResponse.error);
      return;
    }
    window.gapi.client.setToken(tokenResponse);
    setIsAuthorized(true);
    // Check for a saved folder after authorization is confirmed
    const savedFolderJson = localStorage.getItem('cognitiveCanvasFolder');
    if (savedFolderJson) {
        const savedFolder = JSON.parse(savedFolderJson);
        setSelectedFolder(savedFolder);
        await listDriveFiles(savedFolder.id);
    }
  }, [listDriveFiles]);

  const handleCredentialResponse = useCallback((response: any) => {
    const userProfile = jwtDecode(response.credential);
    setUser(userProfile);
    setAuthStatus('authenticated');

    tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: handleAuthCallback,
    });
    tokenClient.current.requestAccessToken();
  }, [handleAuthCallback]);

  useEffect(() => {
    const gsiScript = document.createElement('script');
    gsiScript.src = 'https://accounts.google.com/gsi/client';
    gsiScript.async = true;
    gsiScript.defer = true;
    gsiScript.onload = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredentialResponse,
        });
        setAuthStatus('unauthenticated');
      } catch (error) {
        console.error("Error initializing Google Identity Services:", error);
        setAuthStatus('error');
      }
    };
    gsiScript.onerror = () => {
        console.error("Failed to load Google Identity Services script.");
        setAuthStatus('error');
    };
    document.body.appendChild(gsiScript);

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      try {
        window.gapi.load('client:picker', () => {
           window.gapi.client.init({
             discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
           }).catch(e => console.error('Error initializing GAPI client:', e));
        });
      } catch (error) {
        console.error("Error loading GAPI client:", error);
      }
    };
    gapiScript.onerror = () => {
        console.error("Failed to load Google API Client script.");
    };
    document.body.appendChild(gapiScript);

    return () => {
      document.body.removeChild(gsiScript);
      document.body.removeChild(gapiScript);
    }
  }, [handleCredentialResponse]);

  useEffect(() => {
    if (authStatus === 'unauthenticated' && signInContainerRef.current) {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.renderButton(
                signInContainerRef.current,
                {
                    type: 'standard',
                    shape: 'rectangular',
                    theme: 'outline',
                    text: 'signin_with',
                    size: 'large',
                    logo_alignment: 'left',
                }
            );
        }
    }
  }, [authStatus]);


  const handleLogout = () => {
    setUser(null);
    setIsAuthorized(false);
    setDriveFiles([]);
    setSearchResults([]);
    setSelectedFolder(null);
    localStorage.removeItem('cognitiveCanvasFolder');
    setAuthStatus('unauthenticated');
    window.google.accounts.id.disableAutoSelect();
  };

  const pickerCallback = (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const folder = data.docs[0];
      const folderData = { id: folder.id, name: folder.name };
      setSelectedFolder(folderData);
      localStorage.setItem('cognitiveCanvasFolder', JSON.stringify(folderData));
      listDriveFiles(folder.id);
    }
  };

  const showPicker = () => {
    if (!window.gapi || !isAuthorized) return;
    const token = window.gapi.client.getToken();
    if (!token) {
      console.error("Authentication token not found.");
      // Attempt to re-authorize
      tokenClient.current.requestAccessToken();
      return;
    }
    const accessToken = token.access_token;
    const view = new window.google.picker.View(window.google.picker.ViewId.FOLDERS);
    view.setMimeTypes("application/vnd.google-apps.folder");
    
    const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setAppId(CLIENT_ID.split('-')[0])
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .addView(view)
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
  };

  const performSearch = useCallback((terms: string[]) => {
    if (terms.length === 0) return;
    setIsLoading(true);

    const lowerCaseTerms = terms.map(t => t.toLowerCase());
    
    const libraryResults = driveFiles.filter(item => {
      return lowerCaseTerms.some(term => 
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        (item.content && item.content.toLowerCase().includes(term)) ||
        item.tags.some(tag => tag.toLowerCase().includes(term))
      );
    });

    const webImageResults: SearchResult[] = lowerCaseTerms.map(term => ({
      id: `web-${term}`,
      type: 'image',
      title: `Web Search: ${term}`,
      description: `An image from the web related to "${term}".`,
      tags: ['web', 'image', term],
      url: `https://picsum.photos/seed/${term}/400/300`,
    }));

    setSearchResults([...libraryResults, ...webImageResults]);
    setIsLoading(false);
  }, [driveFiles]);

  const onFinalTranscript = useCallback((transcript: string) => {
    if (transcript) {
      setIsLoading(true);
      generateSearchQueries(transcript)
        .then(queries => {
          if (queries.length > 0) {
            performSearch(queries);
          } else {
            setIsLoading(false);
          }
        })
        .catch(() => setIsLoading(false));
    }
  }, [performSearch]);

  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition(onFinalTranscript);
  
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualQuery.trim()) {
      performSearch(manualQuery.trim().split(' '));
    }
  };

  const debouncedManualSearch = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      if (query.trim()) {
        performSearch(query.trim().split(' '));
      } else {
        setSearchResults([]);
      }
    }, 500);
  };

  const handleManualQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualQuery(e.target.value);
    debouncedManualSearch(e.target.value);
  }

  const LoginView = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <h1 className="text-4xl font-bold mb-2">Cognitive Canvas</h1>
        <p className="text-gray-400 mb-8">Your real-time contextual assistant.</p>
        {authStatus === 'loading' && <p>Loading...</p>}
        {authStatus === 'error' && <p className="text-red-500">Error loading Google services. Please refresh.</p>}
        {authStatus === 'unauthenticated' && <div ref={signInContainerRef} />}
    </div>
  );

  if (!user) {
    return <LoginView />;
  }
  
  if (!selectedFolder) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-4">Connect Your Library</h1>
            <p className="text-gray-400 mb-8">Select a Google Drive folder to use as your personal library.</p>
            <button
                onClick={showPicker}
                disabled={!isAuthorized}
                className="inline-flex items-center gap-3 bg-brand-blue text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-blue/80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                <DriveIcon className="w-6 h-6" />
                Connect Google Drive Folder
            </button>
            <p className="text-sm text-gray-500 mt-4">{!isAuthorized ? 'Authorizing with Google Drive...' : 'Ready to connect.'}</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
       <header className="fixed top-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold from-brand-blue to-brand-purple bg-gradient-to-r bg-clip-text text-transparent">
              Cognitive Canvas
            </h1>
            <div className="flex items-center gap-2 text-sm bg-gray-800 px-3 py-1 rounded-full">
                <DriveIcon className="w-4 h-4 text-gray-400"/>
                <span className="text-gray-300">{selectedFolder.name}</span>
            </div>
        </div>
          <div className="flex items-center gap-4">
            {user && (
                <div className="flex items-center gap-2 text-sm">
                    <img src={user.picture} alt="user avatar" className="w-8 h-8 rounded-full" />
                    <span className="text-gray-300 hidden sm:inline">{user.given_name}</span>
                </div>
            )}
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 flex-1">
        <div className="flex justify-center mb-8">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-colors duration-300 ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-blue hover:bg-brand-blue/80'}`}
          >
            <MicIcon className="w-10 h-10" />
            {isListening && <div className="absolute inset-0 rounded-full bg-red-500/50 animate-pulse-fast"></div>}
          </button>
        </div>
        <p className="text-center min-h-6 mb-8 text-gray-400 italic">{transcript || "Click the mic and start talking..."}</p>

        <div className="relative mb-12">
          <form onSubmit={handleManualSearch}>
            <input
              type="text"
              value={manualQuery}
              onChange={handleManualQueryChange}
              placeholder="Or type your search here..."
              className="w-full bg-gray-800 border-2 border-gray-700 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent"
            />
          </form>
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
        </div>
        
        <div className="mb-4">
          <button onClick={() => setView('main')} className={`px-4 py-2 rounded-t-lg ${view === 'main' ? 'bg-gray-800' : 'bg-gray-700/50'}`}>Search Results</button>
          <button onClick={() => setView('library')} className={`px-4 py-2 rounded-t-lg ${view === 'library' ? 'bg-gray-800' : 'bg-gray-700/50'}`}>My Library</button>
        </div>

        <div className="bg-gray-800 p-4 rounded-b-lg rounded-tr-lg">
            {isLoading && <p className="text-center">Searching...</p>}
            {!isLoading && view === 'main' && searchResults.length === 0 && <p className="text-center text-gray-500">No search results yet. Speak or type to search.</p>}
            {!isLoading && view === 'library' && driveFiles.length === 0 && <p className="text-center text-gray-500">Your connected library is empty.</p>}
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {(view === 'main' ? searchResults : driveFiles).map((result) => (
                    <ResultCard key={result.id} result={result} onClick={setSelectedResult} />
                ))}
            </div>
        </div>
      </main>

      <FullScreenModal result={selectedResult} onClose={() => setSelectedResult(null)} />
    </div>
  );
};

export default App;