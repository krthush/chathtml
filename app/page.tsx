'use client';

import { useState, useEffect } from 'react';
import Chat from './components/Chat';
import CodeEditor from './components/Editor';
import Preview from './components/Preview';
import { getString, setString, migrateLocalStorageKeyToIdb } from './lib/clientStorage';

const INITIAL_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.5;
        }
        h1 { color: #2563eb; }
    </style>
</head>
<body>
    <h1>Hello World</h1>
    <p>Welcome to your new page. Ask the AI to make changes!</p>
</body>
</html>`;

const STORAGE_KEY = 'chathtml-code';

export default function Home() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingShare, setIsLoadingShare] = useState(true);
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  // Load code from localStorage or shared link on mount
  useEffect(() => {
    const loadCode = async () => {
      // If a previous version used localStorage, migrate once to avoid quota issues.
      await migrateLocalStorageKeyToIdb(STORAGE_KEY);

      // Check if there's a share ID in the URL
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get('share');

      if (shareId) {
        // Load shared code
        setIsLoadingShare(true);
        try {
          const response = await fetch(`/api/share/${shareId}`);
          if (response.ok) {
            const data = await response.json();
            setCode(data.code);
            setIsLoadingShare(false);
            setIsLoaded(true);
            return;
          }
        } catch (error) {
          console.error('Error loading shared code:', error);
          // Fall through to load from localStorage
        }
      }

      // Load from localStorage if no share ID or if loading failed
      setIsLoadingShare(false);
      const savedCode = await getString(STORAGE_KEY);
      if (savedCode) {
        setCode(savedCode);
      }
      setIsLoaded(true);
    };

    loadCode();
  }, []);

  // Save code to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && !isLoadingShare) {
      const t = window.setTimeout(() => {
        void setString(STORAGE_KEY, code);
      }, 400);
      return () => window.clearTimeout(t);
    }
  }, [code, isLoaded, isLoadingShare]);

  // Show loading screen while fetching shared code
  if (isLoadingShare) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-linear-to-br from-blue-50 to-cyan-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-lg font-medium text-slate-700">Loading shared code...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-white">
      {/* Mobile: Top Panel / Desktop: Left Panel - Chat */}
      <div className="h-[30vh] md:h-full w-full md:w-1/4 md:min-w-[300px] md:max-w-[400px]">
        <Chat onCodeUpdate={setCode} currentCode={code} />
      </div>

      {/* Mobile: Horizontal Bar / Desktop: Middle Panel - Editor */}
      <div className={`
        transition-all duration-300
        ${isEditorExpanded 
          ? 'h-[40vh] w-full md:h-full md:w-1/3 md:min-w-[300px]' 
          : 'h-[50px] w-full md:h-full md:w-[60px]'
        }
      `}>
        <CodeEditor 
          code={code} 
          onChange={(newCode) => setCode(newCode || '')}
          isExpanded={isEditorExpanded}
          onToggleExpand={() => setIsEditorExpanded(!isEditorExpanded)}
        />
      </div>

      {/* Mobile: Bottom Panel / Desktop: Right Panel - Preview */}
      <div className="flex-1 h-full w-full md:flex-1">
        <Preview code={code} onChange={setCode} />
      </div>
    </main>
  );
}
