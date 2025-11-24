import React, { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Code2, Upload, Download, ChevronLeft, FileText, Share2, X, Check } from 'lucide-react';

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const templates = [
    { name: 'Blank', file: 'blank.html', description: 'Simple starter template' },
    { name: 'Feature Launch', file: 'feature-launch.html', description: 'Suitable for newsletters too!' },
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

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.shareUrl);
        setShowShareModal(true);
      } else {
        alert('Failed to create share link');
      }
    } catch (error) {
      console.error('Error sharing code:', error);
      alert('Failed to create share link');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleCloseModal = () => {
    setShowShareModal(false);
    setCopied(false);
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

  // Share Modal (rendered for both views)
  const shareModal = showShareModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCloseModal}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Share Your Code</h3>
          <button
            onClick={handleCloseModal}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Anyone with this link can view and edit this HTML code:
        </p>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCopyUrl}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          This link will remain active and accessible to anyone who has it.
        </p>
      </div>
    </div>
  );

  // Collapsed view
  if (!isExpanded) {
    return (
      <>
        {shareModal}
      {/* Mobile: Horizontal Bar / Desktop: Vertical Bar */}
      <div className="h-full w-full flex md:flex-col border-b md:border-b-0 md:border-r border-slate-200/50 bg-linear-to-r md:bg-linear-to-b from-blue-600 via-cyan-600 to-teal-600">
        <div className="flex md:flex-col items-center gap-2 md:gap-4 px-3 py-2 md:px-0 md:pt-3 md:pb-6 w-full md:w-auto justify-center">
          <button
            onClick={onToggleExpand}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
            title="Open HTML Editor"
          >
            <Code2 className="w-5 h-5 text-white" />
          </button>
          <div className="h-px w-4 md:h-8 md:w-px bg-white/20"></div>
          <button
            onClick={handleUploadClick}
            className="p-2 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
            title="Upload HTML"
          >
            <Upload className="w-5 h-5 text-white" />
          </button>
          <div className="relative" ref={templateDropdownRef}>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-2 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
              title="Templates"
            >
              <FileText className="w-5 h-5 text-white" />
            </button>
            {showTemplates && (
              <div className="absolute top-full mt-2 md:left-full md:top-0 md:ml-2 md:mt-0 left-1/2 -translate-x-1/2 md:translate-x-0 bg-white rounded-lg shadow-xl border border-slate-200 py-2 w-64 z-[9999]">
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
            className="p-2 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
            title="Download HTML"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
          <div className="h-px w-4 md:h-8 md:w-px bg-white/20"></div>
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="p-2 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm disabled:opacity-50"
            title="Share Code"
          >
            <Share2 className="w-5 h-5 text-white" />
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
      </>
    );
  }

  // Expanded view
  return (
    <>
      {shareModal}
    <div className="h-full flex flex-col border-r border-slate-200/50">
        <div className="h-14 px-4 bg-linear-to-r from-blue-600 via-cyan-600 to-teal-600 border-b border-blue-500/20 flex items-center justify-between shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleExpand}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-all cursor-pointer"
                title="Close Editor"
              >
                <Code2 className="w-4 h-4 text-white" />
              </button>
              <span className="text-sm font-semibold text-white tracking-wide">HTML Editor</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleUploadClick}
                className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm"
                title="Upload HTML File"
              >
                <Upload className="w-4 h-4 text-white" />
              </button>
              <div className="relative" ref={templateDropdownRef}>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm"
                  title="Templates"
                >
                  <FileText className="w-4 h-4 text-white" />
                </button>
                {showTemplates && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 py-2 w-64 z-[9999]">
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
                onClick={handleShare}
                disabled={isSharing}
                className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm disabled:opacity-50"
                title="Share Code"
              >
                <Share2 className="w-4 h-4 text-white" />
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
    </>
  );
}

