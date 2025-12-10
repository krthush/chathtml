'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, Smartphone, Monitor, X, Save, Bold, Italic, Strikethrough, List, ListOrdered, Heading1, Heading2, Heading3, Heading4, Heading5, Image, Share2 } from 'lucide-react';

interface PreviewProps {
  code: string;
  onChange?: (newCode: string) => void;
}

type ViewMode = 'mobile' | 'desktop' | null;

interface ContextMenuPosition {
  x: number;
  y: number;
}

export default function Preview({ code, onChange }: PreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showShareUpdateModal, setShowShareUpdateModal] = useState(false);
  const [isUpdatingShare, setIsUpdatingShare] = useState(false);
  const [existingShareId, setExistingShareId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Setup iframe for editing (always editable)
  const setupEditableIframe = useCallback(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) return;

    // Make the body contenteditable
    const body = iframeDoc.body;
    if (body) {
      body.contentEditable = 'true';
      body.style.outline = 'none';
      body.style.cursor = 'text';
      
      // Listen for changes
      const handleInput = () => {
        const html = iframeDoc.documentElement.outerHTML;
        // Clean up the HTML by removing contenteditable attribute
        const cleanedHtml = html.replace(/\scontenteditable="true"/gi, '');
        setPendingHtml(cleanedHtml);
        setHasUnsavedChanges(true);
      };

      // Handle context menu
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        
        // Get the position relative to the viewport
        const iframeRect = iframe.getBoundingClientRect();
        setContextMenu({
          x: iframeRect.left + e.clientX,
          y: iframeRect.top + e.clientY
        });
      };

      // Close context menu on left click
      const handleClick = () => {
        setContextMenu(null);
      };

      body.addEventListener('input', handleInput);
      body.addEventListener('contextmenu', handleContextMenu);
      body.addEventListener('click', handleClick);
      
      // Cleanup
      return () => {
        body.removeEventListener('input', handleInput);
        body.removeEventListener('contextmenu', handleContextMenu);
        body.removeEventListener('click', handleClick);
      };
    }
  }, []);

  // Setup editable mode when iframe loads
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const handleLoad = () => {
      setupEditableIframe();
    };

    iframe.addEventListener('load', handleLoad);
    // Also try to setup immediately in case already loaded
    setupEditableIframe();

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [setupEditableIframe]);

  // Reset unsaved changes when code changes externally
  useEffect(() => {
    setHasUnsavedChanges(false);
    setPendingHtml(null);
  }, [code]);

  // Save changes
  const handleSave = () => {
    if (pendingHtml && onChange) {
      // Check if there's a share ID in the URL
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get('share');

      if (shareId) {
        // Show confirmation modal to update share link
        setExistingShareId(shareId);
        setShowShareUpdateModal(true);
      } else {
        // Just save locally
        saveLocally();
      }
    }
  };

  // Save locally only
  const saveLocally = () => {
    if (pendingHtml && onChange) {
      onChange(pendingHtml);
      setHasUnsavedChanges(false);
      setPendingHtml(null);
    }
  };

  // Update share link and save locally
  const updateShareAndSave = async () => {
    if (!existingShareId || !pendingHtml) return;

    setIsUpdatingShare(true);
    try {
      const response = await fetch(`/api/share/${existingShareId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: pendingHtml }),
      });

      if (response.ok) {
        // Save locally after successful share update
        saveLocally();
      } else {
        alert('Failed to update share link. Changes saved locally only.');
        saveLocally();
      }
    } catch (error) {
      console.error('Error updating shared code:', error);
      alert('Failed to update share link. Changes saved locally only.');
      saveLocally();
    } finally {
      setIsUpdatingShare(false);
      setShowShareUpdateModal(false);
      setExistingShareId(null);
    }
  };

  // Handle save without updating share
  const handleSaveLocalOnly = () => {
    setShowShareUpdateModal(false);
    setExistingShareId(null);
    saveLocally();
  };

  // Discard changes and reload
  const handleDiscard = () => {
    setHasUnsavedChanges(false);
    setPendingHtml(null);
    // Force iframe reload by updating key
    if (iframeRef.current) {
      iframeRef.current.srcdoc = code;
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  // Check if selection is already wrapped in a specific tag
  const isWrappedInTag = (tagName: string): Element | null => {
    if (!iframeRef.current) return null;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return null;

    const selection = iframeDoc.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    let node: Node | null = selection.anchorNode;
    
    // Traverse up the DOM tree to find if we're inside the specified tag
    while (node && node !== iframeDoc.body) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName.toLowerCase() === tagName.toLowerCase()) {
          return element;
        }
      }
      node = node.parentNode;
    }
    
    return null;
  };

  // Format selected text or insert at cursor
  const applyFormatting = (tagName: string, isBlock = false) => {
    if (!iframeRef.current) return;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    const selection = iframeDoc.getSelection();
    if (!selection) return;

    if (isBlock) {
      // For block elements like headings and lists
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        // Check if already in a heading or list
        const existingElement = isWrappedInTag(tagName);
        
        if (existingElement) {
          // Remove the formatting by replacing with text content
          const textNode = iframeDoc.createTextNode(existingElement.textContent || '');
          existingElement.parentNode?.replaceChild(textNode, existingElement);
        } else {
          if (tagName === 'ul' || tagName === 'ol') {
            // Create a bullet list or numbered list
            const list = iframeDoc.createElement(tagName);
            const li = iframeDoc.createElement('li');
            li.textContent = selectedText || 'List item';
            list.appendChild(li);
            
            range.deleteContents();
            range.insertNode(list);
          } else {
            // For headings
            const element = iframeDoc.createElement(tagName);
            element.textContent = selectedText || 'Heading';
            
            range.deleteContents();
            range.insertNode(element);
          }
        }
        
        // Trigger input event to mark as changed
        iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      // For inline elements like bold, italic, strikethrough
      const existingElement = isWrappedInTag(tagName);
      
      if (existingElement) {
        // Toggle off: unwrap the element
        const parent = existingElement.parentNode;
        if (parent) {
          // Replace the element with its text content
          const textNode = iframeDoc.createTextNode(existingElement.textContent || '');
          parent.replaceChild(textNode, existingElement);
          
          // Trigger input event
          iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else {
        // Toggle on: wrap with the element
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString();
          
          const element = iframeDoc.createElement(tagName);
          element.textContent = selectedText || 'Text';
          
          range.deleteContents();
          range.insertNode(element);
          
          // Trigger input event
          iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }

    setContextMenu(null);
  };

  // Insert image with URL
  const insertImage = () => {
    setContextMenu(null);
    setShowImagePrompt(true);
  };

  const handleImageInsert = () => {
    if (!imageUrl.trim()) return;
    
    if (!iframeRef.current) return;
    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    const selection = iframeDoc.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const img = iframeDoc.createElement('img');
    img.src = imageUrl;
    img.alt = 'Inserted image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    
    range.deleteContents();
    range.insertNode(img);
    
    // Trigger input event
    iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
    
    setShowImagePrompt(false);
    setImageUrl('');
  };

  // Context menu items
  const formatOptions = [
    { icon: Bold, label: 'Bold', action: () => applyFormatting('strong') },
    { icon: Italic, label: 'Italic', action: () => applyFormatting('em') },
    { icon: Strikethrough, label: 'Strikethrough', action: () => applyFormatting('s') },
    { icon: List, label: 'Bullet List', action: () => applyFormatting('ul', true) },
    { icon: ListOrdered, label: 'Numbered List', action: () => applyFormatting('ol', true) },
    { icon: Heading1, label: 'Heading 1', action: () => applyFormatting('h1', true) },
    { icon: Heading2, label: 'Heading 2', action: () => applyFormatting('h2', true) },
    { icon: Heading3, label: 'Heading 3', action: () => applyFormatting('h3', true) },
    { icon: Heading4, label: 'Heading 4', action: () => applyFormatting('h4', true) },
    { icon: Heading5, label: 'Heading 5', action: () => applyFormatting('h5', true) },
    { icon: Image, label: 'Insert Image', action: insertImage },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="h-14 px-4 bg-linear-to-r from-orange-500 via-rose-500 to-pink-600 border-b border-orange-500/20 flex items-center justify-between shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-wide">Live Preview</span>
          <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            Editable - Try Right Clicking!
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 mr-2 bg-white/20 rounded-xl px-3 py-1.5 backdrop-blur-sm">
              <span className="text-xs text-white font-medium">Unsaved changes</span>
              <button
                onClick={handleDiscard}
                className="text-xs text-white/80 hover:text-white underline"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-white text-orange-600 hover:bg-white/90 px-3 py-1 rounded-lg text-xs font-semibold transition-all shadow-lg"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </div>
          )}
          <button
            onClick={() => setViewMode('mobile')}
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all group backdrop-blur-sm"
            title="Mobile Preview"
          >
            <Smartphone className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className="hidden md:flex p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all group backdrop-blur-sm"
            title="Desktop Preview"
          >
            <Monitor className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      <div className="flex-1 relative bg-slate-50">
        <iframe
          ref={iframeRef}
          title="preview"
          srcDoc={code}
          className="w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-same-origin" // allow-same-origin needed for contenteditable
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-2xl border border-slate-200 py-1 z-50 min-w-[180px]"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`,
          }}
        >
          {formatOptions.map((option, index) => (
            <button
              key={index}
              onClick={option.action}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3 transition-colors"
            >
              <option.icon className="w-4 h-4 text-slate-500" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Image URL Prompt */}
      {showImagePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowImagePrompt(false); setImageUrl(''); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Insert Image</h3>
              <button
                onClick={() => { setShowImagePrompt(false); setImageUrl(''); }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Enter the URL of the image you want to insert:
            </p>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleImageInsert();
                }
              }}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowImagePrompt(false); setImageUrl(''); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImageInsert}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Update Confirmation Modal */}
      {showShareUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleSaveLocalOnly}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Update Share Link?</h3>
              <button
                onClick={handleSaveLocalOnly}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              This page has an existing share link. Would you like to update it with your changes?
            </p>
            <div className="space-y-3">
              <button
                onClick={updateShareAndSave}
                disabled={isUpdatingShare}
                className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-4 h-4" />
                {isUpdatingShare ? 'Updating...' : 'Yes, Update Share Link'}
              </button>
              <button
                onClick={handleSaveLocalOnly}
                disabled={isUpdatingShare}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                No, Save Locally Only
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Updating the share link will make your changes visible to anyone with the link.
            </p>
          </div>
        </div>
      )}

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

