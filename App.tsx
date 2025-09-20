import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SearchResult, MediaType, LibraryItem } from './types';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { generateSearchQueries } from './services/geminiService';
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
    const accessToken = window.gapi.auth.getToken().access_token;
    const view = new window.google.picker.View(window.google.picker.ViewId.FOLDERS);
    view.setMimeTypes("application/vnd.google-apps.folder");
    
    const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setAppId(CLIENT_ID.split('-')[0])
        .setOAuthToken(accessToken)
        .setDeveloperKey(process.env.API_KEY) // You'll need to enable Picker API & provide key
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
        id: `web-${term}-${Date.now()}`,
        type: 'image',
        title: `Web Search: ${term}`,
        description: `An image from the web related to "${term}".`,
        tags: ['web', 'image', term],
        url: `https://picsum.photos/seed/${term}/800/600`,
    }));
    
    const combinedResults = [...libraryResults, ...webImageResults];
    const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.id, item])).values());

    setSearchResults(uniqueResults);
    setIsLoading(false);
  }, [driveFiles]);

  const handleFinalTranscript = useCallback((transcript: string) => {
    if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(async () => {
        setIsLoading(true);
        const queries = await generateSearchQueries(transcript);
        performSearch(queries);
    }, 1000);
  }, [performSearch]);

  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition(handleFinalTranscript);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualQuery.trim()) {
      performSearch(manualQuery.trim().split(' '));
    }
  };

  const Header = () => (
    <header className="p-4 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-transparent bg-clip-text">
          Cognitive Canvas
        </h1>
        {view === 'main' && selectedFolder && (
          <form onSubmit={handleManualSearch} className="flex-1 max-w-md relative">
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Manually search your library..."
              className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </form>
        )}
        <div className="flex items-center gap-4">
            {selectedFolder && (
                <nav>
                    <button 
                        onClick={() => setView('main')} 
                        className={`px-3 py-1 rounded-md text-sm ${view === 'main' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Dashboard
                    </button>
                    <button 
                        onClick={() => setView('library')} 
                        className={`px-3 py-1 rounded-md text-sm ${view === 'library' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        My Library
                    </button>
                </nav>
            )}
            {user && (
                <div className="flex items-center gap-2">
                    {selectedFolder && (
                      <div className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-800 px-2 py-1 rounded-md">
                        <DriveIcon className="w-4 h-4" />
                        <span>{selectedFolder.name}</span>
                      </div>
                    )}
                    <img src={user.picture} alt="user avatar" className="w-8 h-8 rounded-full" />
                    <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
                </div>
            )}
        </div>
      </div>
    </header>
  );

  const LibraryView = () => (
    <div className="p-8">
        <h2 className="text-3xl font-bold mb-2">My Media Library</h2>
        <p className="text-gray-400 mb-6">Showing items from your connected Google Drive folder: "{selectedFolder?.name}"</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {driveFiles.map(item => (
                <ResultCard key={item.id} result={item} onClick={setSelectedResult} />
            ))}
        </div>
    </div>
  );

  const MainView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 h-[calc(100vh-80px)]">
      {/* Left: Transcription */}
      <div className="flex flex-col bg-gray-800 rounded-lg p-6">
        <div className="flex-1 mb-4 overflow-y-auto">
          <p className="text-lg text-gray-300 whitespace-pre-wrap">{transcript || "Press the microphone to start speaking..."}</p>
        </div>
        <button
          onClick={isListening ? stopListening : startListening}
          className={`mt-auto w-20 h-20 rounded-full flex items-center justify-center self-center transition-colors duration-300 ${
            isListening ? 'bg-red-500 animate-pulse-fast' : 'bg-brand-blue hover:bg-brand-blue/80'
          }`}
        >
          <MicIcon className="w-8 h-8 text-white" />
        </button>
      </div>

      {/* Right: Results */}
      <div className="flex flex-col bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Contextual Results</h2>
        {isLoading && <div className="text-center p-4">Searching...</div>}
        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map(result => (
                <ResultCard key={result.id} result={result} onClick={setSelectedResult} />
              ))}
            </div>
          ) : (
            !isLoading && <div className="text-center text-gray-400 pt-10">Results will appear here as you speak.</div>
          )}
        </div>
      </div>
    </div>
  );
  
  const LoginView = () => {
    useEffect(() => {
        if(authStatus === 'unauthenticated' && window.google) {
            window.google.accounts.id.renderButton(
                document.getElementById('signInDiv'),
                { theme: 'outline', size: 'large' }
            );
        }
    }, [authStatus]);
    
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-transparent bg-clip-text mb-4">
              Welcome to Cognitive Canvas
            </h1>
            <p className="text-gray-400 max-w-xl mb-8">
              Your real-time voice assistant. Sign in with your Google account to get started and connect to your personal media library in Google Drive.
            </p>
            {authStatus === 'loading' && <div>Loading...</div>}
            {authStatus === 'error' && <div className="text-red-500">Could not load Google Sign-In. Please try again later.</div>}
            <div id="signInDiv"></div>
        </div>
    );
  };
  
  const ConnectFolderView = () => (
    <div className="flex flex-col items-center justify-center text-center p-4 h-[calc(100vh-80px)]">
      <h2 className="text-3xl font-bold text-white mb-3">One Last Step</h2>
      <p className="text-gray-400 max-w-lg mb-8">
        To personalize your experience, please connect a Google Drive folder. The app will search for relevant media within this folder as you speak.
      </p>
      <button 
        onClick={showPicker}
        className="inline-flex items-center gap-2 bg-brand-blue text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-blue/80 transition-colors"
      >
        <DriveIcon className="w-5 h-5" />
        Connect Google Drive Folder
      </button>
    </div>
  );

  if (!user) {
    return <LoginView />;
  }

  if (!selectedFolder) {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <Header />
            <ConnectFolderView />
        </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      {view === 'main' ? <MainView /> : <LibraryView />}
      <FullScreenModal result={selectedResult} onClose={() => setSelectedResult(null)} />
    </main>
  );
};

export default App;
