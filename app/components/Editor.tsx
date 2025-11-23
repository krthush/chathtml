import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Code2 } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
}

export default function CodeEditor({ code, onChange }: CodeEditorProps) {
  const handleEditorChange = (value: string | undefined) => {
    onChange(value);
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
    <div className="h-full flex flex-col border-r border-slate-300">
        <div className="p-3 bg-gradient-to-r from-slate-700 to-slate-800 border-b border-slate-600 flex items-center gap-2 shadow-md">
            <Code2 className="w-5 h-5 text-white" />
            <span className="text-sm font-bold text-white">HTML Editor</span>
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

