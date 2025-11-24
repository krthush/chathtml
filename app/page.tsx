'use client';

import { useState, useEffect } from 'react';
import Chat from './components/Chat';
import CodeEditor from './components/Editor';
import Preview from './components/Preview';

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
      const savedCode = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, [code, isLoaded, isLoadingShare]);

  // Show loading screen while fetching shared code
  if (isLoadingShare) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-lg font-medium text-slate-700">Loading shared code...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white">
      {/* Left Panel: Chat */}
      <div className="w-1/4 min-w-[300px] max-w-[400px] h-full">
        <Chat onCodeUpdate={setCode} currentCode={code} />
      </div>

      {/* Middle Panel: Editor */}
      <div className={`h-full transition-all duration-300 ${isEditorExpanded ? 'w-1/3 min-w-[300px]' : 'w-[60px]'}`}>
        <CodeEditor 
          code={code} 
          onChange={(newCode) => setCode(newCode || '')}
          isExpanded={isEditorExpanded}
          onToggleExpand={() => setIsEditorExpanded(!isEditorExpanded)}
        />
      </div>

      {/* Right Panel: Preview */}
      <div className="flex-1 h-full">
        <Preview code={code} onChange={setCode} />
      </div>
    </main>
  );
}
