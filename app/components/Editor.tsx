import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Code2, Upload } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
}

export default function CodeEditor({ code, onChange }: CodeEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditorChange = (value: string | undefined) => {
    onChange(value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's an HTML file
      if (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          onChange(content);
        };
        reader.readAsText(file);
      } else {
        alert('Please upload an HTML file (.html or .htm)');
      }
    }
    // Reset the input so the same file can be uploaded again if needed
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
      // Configure editor settings if needed
      monaco.editor.defineTheme('my-theme', {
          base: 'vs',
          inherit: true,
          rules: [],
          colors: {
              'editor.background': '#fafafa',
          }
      });
      monaco.editor.setTheme('my-theme');
      editor.updateOptions({
        minimap: { enabled: false },
        wordWrap: 'on',
        padding: { top: 16, bottom: 16 },
        fontSize: 14,
        lineHeight: 22,
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
      });
  };

  return (
    <div className="h-full flex flex-col border-r border-slate-200/50">
        <div className="h-14 px-4 bg-linear-to-r from-blue-600 via-cyan-600 to-teal-600 border-b border-blue-500/20 flex items-center justify-between shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white tracking-wide">HTML Editor</span>
            </div>
            <button
              onClick={handleUploadClick}
              className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm"
              title="Upload HTML File"
            >
              <Upload className="w-4 h-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              onChange={handleFileUpload}
              className="hidden"
            />
        </div>
        <div className="flex-1 relative bg-slate-50">
             <Editor
                height="100%"
                defaultLanguage="html"
                value={code}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                    fontSize: 14,
                    formatOnType: true,
                    formatOnPaste: true,
                }}
            />
        </div>
    </div>
  );
}

