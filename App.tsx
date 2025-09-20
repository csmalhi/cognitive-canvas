import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SearchIcon, MicIcon, DriveIcon } from './components/icons';
import { ResultCard } from './components/ResultCard';
import { FullScreenModal } from './components/FullScreenModal';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { generateSearchQueries } from './services/geminiService';
import { mockLibrary } from './data/mockLibrary';
import { SearchResult, LibraryItem } from './types';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { GOOGLE_CLIENT_ID, GOOGLE_API_KEY, GOOGLE_DRIVE_SCOPE } from './config';

interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

interface DriveFolder {
  id: string;
  name: string;
}

// Global gapi/gis types for TypeScript
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const App: React.FC = () => {
  // App State
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Auth & Drive State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isGisReady, setIsGisReady] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [driveFolder, setDriveFolder] = useState<DriveFolder | null>(null);
  const [driveFiles, setDriveFiles] = useState<LibraryItem[]>([]);

  // Refs
  const signInButtonRef = useRef<HTMLDivElement>(null);

  // --- Search Logic ---
  const performSearch = useCallback((searchQuery: string) => {
    setIsInitialLoad(false);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    const allItems = [...mockLibrary, ...driveFiles];
    const results = allItems.filter(item =>
      item.title.toLowerCase().includes(lowerCaseQuery) ||
      item.description.toLowerCase().includes(lowerCaseQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
    );
    setSearchResults(results);
  }, [driveFiles]);

  const handleSmartSearch = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    const keywords = await generateSearchQueries(text);
    let finalQuery = text;
    if (keywords.length > 0) {
      finalQuery = keywords.join(' ');
      setQuery(finalQuery);
    }
    performSearch(finalQuery);
    setIsLoading(false);
  }, [performSearch]);

  const handleFinalTranscript = useCallback((transcript: string) => {
    setQuery(transcript);
    handleSmartSearch(transcript);
  }, [handleSmartSearch]);

  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition(handleFinalTranscript);

  useEffect(() => {
    if (isListening) return;
    const handler = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query, isListening, performSearch]);

  useEffect(() => {
    if (isListening) {
      setQuery(transcript);
    }
  }, [transcript, isListening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSmartSearch(query);
  };

  // --- Auth & Drive Logic ---

  // 1. Load Google API Scripts
  useEffect(() => {
    const gapiUrl = 'https://apis.google.com/js/api.js';
    const gisUrl = 'https://accounts.google.com/gsi/client';

    const gapiScript = document.createElement('script');
    gapiScript.src = gapiUrl;
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => window.gapi.load('client:picker', () => setIsGapiReady(true));
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = gisUrl;
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => setIsGisReady(true);
    document.body.appendChild(gisScript);

    return () => {
      document.body.removeChild(gapiScript);
      document.body.removeChild(gisScript);
    };
  }, []);

  // 2. Initialize Google Identity Services (Sign-in)
  useEffect(() => {
    if (!isGisReady) return;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleAuthCallback,
      });

      if (signInButtonRef.current) {
        window.google.accounts.id.renderButton(signInButtonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
        });
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: (tokenResponse: any) => {
            if (tokenResponse.error) {
                console.error("Authorization error:", tokenResponse.error);
                setIsAuthorizing(false);
            } else {
                 window.gapi.client.setToken(tokenResponse);
                 setIsAuthorizing(false);
                 // Load saved folder from localStorage after successful authorization
                const savedFolder = localStorage.getItem('driveFolder');
                if (savedFolder) {
                  const folder = JSON.parse(savedFolder);
                  setDriveFolder(folder);
                  fetchDriveFiles(folder.id);
                }
            }
        },
      });
      setTokenClient(client);

    } catch (error) {
      console.error("Error initializing Google Identity Services:", error);
    }
  }, [isGisReady]);

  // 3. Authorize Google Drive after user signs in
  useEffect(() => {
    if (userProfile && tokenClient && isGapiReady) {
      const gapiToken = window.gapi.client.getToken();
      if (!gapiToken) {
        setIsAuthorizing(true);
        tokenClient.requestAccessToken();
      } else {
         const savedFolder = localStorage.getItem('driveFolder');
         if (savedFolder) {
            const folder = JSON.parse(savedFolder);
            setDriveFolder(folder);
            fetchDriveFiles(folder.id);
         }
      }
    }
  }, [userProfile, tokenClient, isGapiReady]);

  const handleAuthCallback = (response: any) => {
    try {
      const decoded: JwtPayload & { name: string; email: string; picture: string } = jwtDecode(response.credential);
      setUserProfile({
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
      });
    } catch (error) {
      console.error("Error decoding JWT:", error);
    }
  };

  const handleLogout = () => {
    setUserProfile(null);
    setDriveFolder(null);
    setDriveFiles([]);
    localStorage.removeItem('driveFolder');
    window.google?.accounts.id.disableAutoSelect();
  };

  const showPicker = () => {
    const token = window.gapi.client.getToken();
    if (!token) {
        console.error("Picker requires an access token.");
        tokenClient.requestAccessToken(); // Re-auth if token is missing
        return;
    }
    const view = new window.google.picker.View(window.google.picker.ViewId.FOLDERS);
    view.setMimeTypes("application/vnd.google-apps.folder");
    
    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
      .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
      .setOAuthToken(token.access_token)
      .addView(view)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setCallback(handlePickerCallback)
      .build();
    picker.setVisible(true);
  };

  const handlePickerCallback = (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const folder = data.docs[0];
      const selectedFolder = { id: folder.id, name: folder.name };
      setDriveFolder(selectedFolder);
      localStorage.setItem('driveFolder', JSON.stringify(selectedFolder));
      fetchDriveFiles(folder.id);
    }
  };

    const mapDriveFileToSearchResult = (file: any): LibraryItem => {
        let type: LibraryItem['type'] = 'document';
        if (file.mimeType.startsWith('image/')) type = 'image';
        else if (file.mimeType.startsWith('video/')) type = 'video';
        else if (file.mimeType.startsWith('audio/')) type = 'audio';

        return {
            id: `drive-${file.id}`,
            type: type,
            title: file.name,
            description: `A ${type} file from Google Drive.`,
            tags: ['drive', type, ...file.name.toLowerCase().split(/[\s\.]+/)],
            url: file.webViewLink,
        };
    };

  const fetchDriveFiles = async (folderId: string) => {
    setIsLoading(true);
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, webViewLink, iconLink)',
        pageSize: 100
      });
      const files = response.result.files.map(mapDriveFileToSearchResult);
      setDriveFiles(files);
    } catch (error) {
      console.error("Error fetching files from Google Drive:", error);
      // If token expired, try to re-authenticate
      if ((error as any).status === 401) {
          tokenClient.requestAccessToken();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Logic ---

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <h1 className="text-4xl font-bold mb-2">Cognitive Canvas</h1>
        <p className="text-gray-400 mb-8">Your intelligent media assistant.</p>
        <div ref={signInButtonRef}></div>
      </div>
    );
  }

  if (!driveFolder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 text-center">
        <img src={userProfile.picture} alt="User" className="w-20 h-20 rounded-full mb-4 border-2 border-brand-purple" />
        <h1 className="text-3xl font-bold mb-2">Welcome, {userProfile.name}!</h1>
        <p className="text-gray-400 mb-8 max-w-md">To get started, connect a Google Drive folder to use as your personal media library.</p>
        {isAuthorizing ? (
            <p className="text-gray-400 italic">Authorizing with Google Drive...</p>
        ) : (
            <button
            onClick={showPicker}
            className="inline-flex items-center gap-3 bg-gray-800 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
            >
            <DriveIcon className="w-6 h-6" />
            Connect Google Drive Folder
            </button>
        )}
         <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-300 mt-8">Logout</button>
      </div>
    );
  }


  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <style>{`
        .from-brand-purple { --tw-gradient-from: #8B5CF6; --tw-gradient-to: rgba(139, 92, 246, 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
        .to-brand-blue { --tw-gradient-to: #3B82F6; }
        .text-brand-blue { color: #3B82F6; }
        .bg-brand-blue { background-color: #3B82F6; }
        .hover\\:bg-brand-blue\\/80:hover { background-color: rgba(59, 130, 246, 0.8); }
        .border-brand-purple { border-color: #8B5CF6; }
        .hover\\:shadow-brand-purple\\/20:hover { box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.1), 0 4px 6px -2px rgba(139, 92, 246, 0.05); }
        .bg-red-500 { background-color: #EF4444; }
      `}</style>
      <FullScreenModal result={selectedResult} onClose={() => setSelectedResult(null)} />
      
      <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3">
           <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-sm text-gray-400">
               <DriveIcon className="w-5 h-5 text-brand-blue" />
               <span>{driveFolder.name}</span>
             </div>
             <div className="flex items-center gap-3">
               <img src={userProfile.picture} alt={userProfile.name} className="w-8 h-8 rounded-full border-2 border-gray-700" />
               <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
             </div>
           </div>
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-blue">
              Cognitive Canvas
            </h1>
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe what you're looking for..."
                className="w-full bg-gray-800 border-2 border-gray-700 rounded-full py-3 pl-12 pr-20 text-white focus:outline-none focus:border-brand-purple transition-colors"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <SearchIcon className="w-6 h-6 text-gray-400" />
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 animate-pulse-fast' : 'bg-gray-700 hover:bg-gray-600'}`}
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                >
                  <MicIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : isInitialLoad ? (
          <div className="text-center text-gray-400 py-10">
            <p>Search your library or use your voice to find what you need.</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {searchResults.map((result) => (
              <ResultCard key={result.id} result={result} onClick={setSelectedResult} />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-10">
            <p>No results found for "{query}". Try a different search.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
