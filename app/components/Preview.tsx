'use client';

import React, { useState } from 'react';
import { Eye, Smartphone, Monitor, X } from 'lucide-react';

interface PreviewProps {
  code: string;
}

type ViewMode = 'mobile' | 'desktop' | null;

export default function Preview({ code }: PreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(null);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-14 px-4 bg-gradient-to-r from-purple-600 to-purple-700 border-b border-purple-600 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-white" />
          <span className="text-sm font-bold text-white">Live Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('mobile')}
            className="p-2 hover:bg-purple-500 rounded-lg transition-colors group"
            title="Mobile Preview"
          >
            <Smartphone className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className="p-2 hover:bg-purple-500 rounded-lg transition-colors group"
            title="Desktop Preview"
          >
            <Monitor className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      <div className="flex-1 relative bg-slate-50">
        <iframe
          title="preview"
          srcDoc={code}
          className="w-full h-full border-none bg-white"
          sandbox="allow-scripts" // Be careful with this in production
        />
      </div>

      {/* Mobile Preview Modal */}
      {viewMode === 'mobile' && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setViewMode(null)}
        >
          <div 
            className="bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '375px', height: '667px' }}
          >
            <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Mobile Preview</span>
                <span className="text-xs text-gray-400">(375x667)</span>
              </div>
              <button
                onClick={() => setViewMode(null)}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="h-[calc(100%-44px)] bg-white">
              <iframe
                title="mobile-preview"
                srcDoc={code}
                className="w-full h-full border-none"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Preview Modal */}
      {viewMode === 'desktop' && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setViewMode(null)}
        >
          <div 
            className="bg-gray-900 rounded-lg shadow-2xl overflow-hidden max-w-[95vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '1440px', height: '900px' }}
          >
            <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Desktop Preview</span>
                <span className="text-xs text-gray-400">(1440x900)</span>
              </div>
              <button
                onClick={() => setViewMode(null)}
                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="h-[calc(100%-44px)] bg-white">
              <iframe
                title="desktop-preview"
                srcDoc={code}
                className="w-full h-full border-none"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

