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

  // Load code from localStorage on mount
  useEffect(() => {
    const savedCode = localStorage.getItem(STORAGE_KEY);
    if (savedCode) {
      setCode(savedCode);
    }
    setIsLoaded(true);
  }, []);

  // Save code to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, [code, isLoaded]);

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white">
      {/* Left Panel: Chat */}
      <div className="w-1/4 min-w-[300px] max-w-[400px] h-full">
        <Chat onCodeUpdate={setCode} currentCode={code} />
      </div>

      {/* Middle Panel: Editor */}
      <div className="w-1/3 min-w-[300px] h-full">
        <CodeEditor 
          code={code} 
          onChange={(newCode) => setCode(newCode || '')} 
        />
      </div>

      {/* Right Panel: Preview */}
      <div className="flex-1 h-full">
        <Preview code={code} onChange={setCode} />
      </div>
    </main>
  );
}
