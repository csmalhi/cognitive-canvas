import React, { useState, useCallback, useEffect, useRef } from 'react';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { SearchResult, LibraryItem } from './types';
import { generateSearchQueries } from './services/geminiService';
import * as driveService from './services/googleDriveService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { ResultCard } from './components/ResultCard';
import { FullScreenModal } from './components/FullScreenModal';
import { MicIcon, SearchIcon, DriveIcon } from './components/icons';

interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

interface DriveFolder {
  id: string;
  name: string;
}

enum AppState {
  LOADING,
  LOGIN,
  PICKER,
  READY,
}

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [driveFolder, setDriveFolder] = useState<DriveFolder | null>(null);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginButtonContainerRef = useRef<HTMLDivElement>(null);

  // --- Initialization and Auth Flow ---
  useEffect(() => {
    const initialize = async () => {
      try {
        await driveService.initGapiClient();
        setAppState(AppState.LOGIN);
        
        const savedFolder = localStorage.getItem('driveFolder');
        if (savedFolder) {
          setDriveFolder(JSON.parse(savedFolder));
        }
      } catch (error) {
        console.error("Initialization Failed:", error);
        const errorMessage = (error as any)?.result?.error?.message || "Could not initialize Google services. Please check your network connection and API key configuration, then refresh the page.";
        setError(errorMessage);
        setAppState(AppState.LOGIN); // Proceed to login screen to show the error
      }
    };
    initialize();
  }, []);

  const handleCredentialResponse = useCallback((response: any) => {
    try {
      const decoded = jwtDecode<JwtPayload & UserProfile>(response.credential);
      const profile: UserProfile = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
      };
      setUserProfile(profile);
      
      driveService.initTokenClient(async (tokenResponse) => {
        if (tokenResponse.error) {
           setError(`Authorization error: ${tokenResponse.error_description}`);
           setAppState(AppState.LOGIN); // Go back to login on auth error
           return;
        }
        if (driveFolder) {
           handleFolderChosen(driveFolder);
        } else {
           setAppState(AppState.PICKER);
        }
      });

    } catch (e) {
      console.error('Login Error:', e);
      setError('Failed to process login. Please try again.');
    }
  }, [driveFolder]);

  useEffect(() => {
    if (appState === AppState.LOGIN && window.google) {
      window.google.accounts.id.initialize({
        client_id: driveService.GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      if (loginButtonContainerRef.current) {
        window.google.accounts.id.renderButton(
          loginButtonContainerRef.current,
          { theme: "outline", size: "large", type: 'standard' }
        );
      }
      window.google.accounts.id.prompt();
    }
  }, [appState, handleCredentialResponse]);

  const handleConnectFolder = () => {
    driveService.showPicker((doc) => {
      const folder = { id: doc.id, name: doc.name };
      handleFolderChosen(folder);
    });
  };

  const handleFolderChosen = async (folder: DriveFolder) => {
     localStorage.setItem('driveFolder', JSON.stringify(folder));
     setDriveFolder(folder);
     setAppState(AppState.LOADING); // Show loading while fetching files
     try {
       const files = await driveService.listDriveFiles(folder.id);
       setLibrary(files);
       setSearchResults(files);
       setAppState(AppState.READY);
     } catch(e) {
       console.error(e);
       setError("Could not fetch files from the selected folder.");
       setAppState(AppState.PICKER);
     }
  }

  const handleLogout = () => {
    setUserProfile(null);
    setDriveFolder(null);
    setLibrary([]);
    setSearchResults([]);
    localStorage.removeItem('driveFolder');
    window.google?.accounts.id.disableAutoSelect();
    setAppState(AppState.LOGIN);
  };
  

  // --- Search Logic ---
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults(library); // Show all if query is empty
      return;
    }

    setIsSearching(true);
    try {
      const keywords = await generateSearchQueries(searchQuery);
      if (keywords.length === 0) {
        keywords.push(...searchQuery.toLowerCase().split(' ').filter(word => word.length > 2));
      }
      const lowerCaseKeywords = keywords.map(k => k.toLowerCase());
      const results = library.filter(item => {
        const itemText = `${item.title} ${item.description || ''} ${item.tags.join(' ')}`.toLowerCase();
        return lowerCaseKeywords.some(keyword => itemText.includes(keyword));
      });
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, [library]);

  const handleSpeechResult = useCallback((transcript: string) => {
    setQuery(transcript);
    performSearch(transcript);
  }, [performSearch]);

  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition(handleSpeechResult);

  useEffect(() => { setQuery(transcript); }, [transcript]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleResultClick = (result: SearchResult) => setSelectedResult(result);
  const closeModal = () => setSelectedResult(null);


  // --- Render Logic ---
  if (appState === AppState.LOADING) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }
  
  if (appState === AppState.LOGIN) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h1 className="text-4xl font-bold mb-2">Cognitive Canvas</h1>
        <p className="text-gray-400 mb-8">Sign in to connect your personal library.</p>
        <div ref={loginButtonContainerRef}></div>
        {error && <p className="text-rose-500 mt-4 max-w-md">{error}</p>}
      </div>
    );
  }

  if (appState === AppState.PICKER) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <h1 className="text-4xl font-bold mb-2">Connect Your Library</h1>
            <p className="text-gray-400 mb-8">Select a Google Drive folder to use as your personal library.</p>
            <button
              onClick={handleConnectFolder}
              className="inline-flex items-center gap-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <DriveIcon className="w-6 h-6" />
              Connect Google Drive Folder
            </button>
             {error && <p className="text-rose-500 mt-4">{error}</p>}
        </div>
     )
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <nav className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="font-bold text-lg">Cognitive Canvas</div>
          {userProfile && driveFolder && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400 hidden sm:block">
                Library: <span className="font-medium text-gray-300">{driveFolder.name}</span>
              </div>
              <img src={userProfile.picture} alt="profile" className="w-8 h-8 rounded-full" />
              <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
            </div>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your library..."
              className="w-full pl-12 pr-12 py-3 bg-gray-800 border-2 border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <SearchIcon className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors ${isListening ? 'text-rose-500 animate-pulse' : ''}`}
              title={isListening ? 'Stop listening' : 'Start listening'}
            >
              <MicIcon className="w-6 h-6" />
            </button>
          </form>
        </div>

        {isSearching ? (
          <div className="text-center text-gray-400">Searching...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {searchResults.length > 0 ? (
              searchResults.map((result) => (
                <ResultCard key={result.id} result={result} onClick={handleResultClick} />
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 py-16">
                <p className="text-xl font-semibold mb-2">No results found.</p>
                <p>Try a different search term or check your selected folder.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <FullScreenModal result={selectedResult} onClose={closeModal} />
    </div>
  );
}

export default App;