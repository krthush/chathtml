import React, { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Code2, Upload, Download, ChevronLeft, FileText } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function CodeEditor({ code, onChange, isExpanded, onToggleExpand }: CodeEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  const templates = [
    { name: 'Blank', file: 'blank.html', description: 'Simple starter template' },
    { name: 'Feature Launch', file: 'feature-launch.html', description: 'Product feature announcement' },
    { name: 'Case Study', file: 'case-study.html', description: 'Creator partnership case study' },
  ];

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

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTemplateSelect = async (templateFile: string) => {
    try {
      const response = await fetch(`/api/templates/${templateFile}`);
      if (response.ok) {
        const content = await response.text();
        onChange(content);
        setShowTemplates(false);
      } else {
        alert('Failed to load template');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setShowTemplates(false);
      }
    };

    if (showTemplates) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTemplates]);

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

  // Collapsed view
  if (!isExpanded) {
    return (
      <div className="h-full flex flex-col border-r border-slate-200/50 bg-gradient-to-b from-blue-600 via-cyan-600 to-teal-600">
        <div className="flex flex-col items-center gap-4 pt-3 pb-6">
          <button
            onClick={onToggleExpand}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
            title="Open HTML Editor"
          >
            <Code2 className="w-5 h-5 text-white" />
          </button>
          <div className="w-px h-8 bg-white/20"></div>
          <div className="relative" ref={templateDropdownRef}>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-2 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
              title="Templates"
            >
              <FileText className="w-5 h-5 text-white" />
            </button>
            {showTemplates && (
              <div className="absolute left-full ml-2 top-0 bg-white rounded-lg shadow-xl border border-slate-200 py-2 w-64 z-50">
                <div className="px-3 py-2 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Templates</p>
                </div>
                {templates.map((template) => (
                  <button
                    key={template.file}
                    onClick={() => handleTemplateSelect(template.file)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="font-medium text-slate-900 text-sm">{template.name}</div>
                    <div className="text-xs text-slate-500">{template.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleUploadClick}
            className="p-2 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
            title="Upload HTML"
          >
            <Upload className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
            title="Download HTML"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm,text/html"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    );
  }

  // Expanded view
  return (
    <div className="h-full flex flex-col border-r border-slate-200/50">
        <div className="h-14 px-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 border-b border-blue-500/20 flex items-center justify-between shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white tracking-wide">HTML Editor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative" ref={templateDropdownRef}>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm"
                  title="Templates"
                >
                  <FileText className="w-4 h-4 text-white" />
                </button>
                {showTemplates && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 py-2 w-64 z-50">
                    <div className="px-3 py-2 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Templates</p>
                    </div>
                    {templates.map((template) => (
                      <button
                        key={template.file}
                        onClick={() => handleTemplateSelect(template.file)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <div className="font-medium text-slate-900 text-sm">{template.name}</div>
                        <div className="text-xs text-slate-500">{template.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm"
                title="Download HTML"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={handleUploadClick}
                className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm"
                title="Upload HTML File"
              >
                <Upload className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={onToggleExpand}
                className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm"
                title="Close Editor"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
            </div>
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

