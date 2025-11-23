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
      <div className="h-14 px-4 bg-linear-to-r from-orange-500 via-rose-500 to-pink-600 border-b border-orange-500/20 flex items-center justify-between shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-wide">Live Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('mobile')}
            className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm"
            title="Mobile Preview"
          >
            <Smartphone className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className="p-2 hover:bg-white/20 rounded-lg transition-all group backdrop-blur-sm"
            title="Desktop Preview"
          >
            <Monitor className="w-4 h-4 text-white" />
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewMode(null)}
        >
          <div 
            className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-700"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '375px', height: '667px' }}
          >
            <div className="flex items-center justify-between p-3 bg-linear-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-semibold text-white">Mobile Preview</span>
                <span className="text-xs text-slate-400">(375x667)</span>
              </div>
              <button
                onClick={() => setViewMode(null)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewMode(null)}
        >
          <div 
            className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-w-[95vw] max-h-[90vh] border border-slate-700"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '1440px', height: '900px' }}
          >
            <div className="flex items-center justify-between p-3 bg-linear-to-r from-slate-800 to-slate-900 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-semibold text-white">Desktop Preview</span>
                <span className="text-xs text-slate-400">(1440x900)</span>
              </div>
              <button
                onClick={() => setViewMode(null)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
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

