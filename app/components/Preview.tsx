'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, Smartphone, Monitor, X, Save, Bold, Italic, Strikethrough, List, ListOrdered, Heading1, Heading2, Heading3, Heading4, Heading5, Image, ImagePlus, Share2 } from 'lucide-react';

interface PreviewProps {
  code: string;
  onChange?: (newCode: string) => void;
}

type ViewMode = 'mobile' | 'desktop' | null;

interface ContextMenuPosition {
  x: number;
  y: number;
}

const MAX_IMAGE_URL_LENGTH = 2048;

function sanitizePastedHtmlRemoveImages(html: string) {
  if (!html) return html;

  // Remove common image-related tags. Keep everything else intact.
  let out = html
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '');

  // Remove inline base64 image URLs in style attributes (best-effort).
  out = out.replace(/url\(\s*['"]?\s*data:image\/[^'")]+['"]?\s*\)/gi, '');

  return out;
}

function replacePastedImagesWithPlaceholders(html: string, pasteId: string) {
  if (!html) return { html, placeholderCount: 0 };

  let idx = 0;
  const makePlaceholder = () => {
    idx += 1;
    // span is safe in most contexts and easy to query/replace later
    return `<span data-chathtml-img-ph="${idx}" data-chathtml-paste-id="${pasteId}" style="display:inline-block;min-width:1px;min-height:1em;"></span>`;
  };

  // Replace <picture> blocks first (they often wrap <img>)
  let out = html.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, () => makePlaceholder());
  // Replace <img ...>
  out = out.replace(/<img\b[^>]*>/gi, () => makePlaceholder());

  return { html: out, placeholderCount: idx };
}

function dataUrlToFile(dataUrl: string, filenameBase: string) {
  // Supports base64 and non-base64 data URLs.
  // Example: data:image/png;base64,iVBORw0...
  // Example: data:image/svg+xml,%3Csvg%20...%3E
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/i);
  if (!match) return null;
  const mime = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const dataPart = match[3] || '';

  let bytes: Uint8Array<ArrayBuffer>;
  if (isBase64) {
    const binary = atob(dataPart);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } else {
    // Data is URL-encoded
    const decoded = decodeURIComponent(dataPart);
    bytes = new TextEncoder().encode(decoded);
  }

  const extFromMime = (m: string) => {
    if (m.includes('png')) return 'png';
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
    if (m.includes('gif')) return 'gif';
    if (m.includes('webp')) return 'webp';
    if (m.includes('svg')) return 'svg';
    return 'bin';
  };

  const ext = extFromMime(mime);
  const file = new File([bytes], `${filenameBase}.${ext}`, { type: mime });
  return file;
}

function replaceDataImageTagsWithPlaceholders(html: string, pasteId: string) {
  if (!html) return { html, files: [] as File[] };

  let idx = 0;
  const files: File[] = [];

  const out = html.replace(/<img\b[^>]*>/gi, (full) => {
    const srcMatch = full.match(/\ssrc\s*=\s*(['"])(.*?)\1/i);
    const src = srcMatch?.[2] ?? '';
    if (!src || !src.startsWith('data:image/')) return full;

    idx += 1;
    const file = dataUrlToFile(src, `pasted-image-${idx}`);
    if (file) files.push(file);

    return `<span data-chathtml-img-ph="${idx}" data-chathtml-paste-id="${pasteId}" style="display:inline-block;min-width:1px;min-height:1em;"></span>`;
  });

  return { html: out, files };
}

export default function Preview({ code, onChange }: PreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingHtml, setPendingHtml] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showShareUpdateModal, setShowShareUpdateModal] = useState(false);
  const [isUpdatingShare, setIsUpdatingShare] = useState(false);
  const [existingShareId, setExistingShareId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const pasteNoticeTimeoutRef = useRef<number | null>(null);
  const savedSelectionRangeRef = useRef<Range | null>(null);
  const iframeCleanupRef = useRef<null | (() => void)>(null);

  const showNotice = useCallback((msg: string) => {
    setPasteNotice(msg);
    if (pasteNoticeTimeoutRef.current) {
      window.clearTimeout(pasteNoticeTimeoutRef.current);
    }
    pasteNoticeTimeoutRef.current = window.setTimeout(() => setPasteNotice(null), 4500);
  }, []);

  const captureSelectionRange = useCallback(() => {
    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc) return;
    const sel = iframeDoc.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    // Clone so it survives focus changes caused by modals.
    savedSelectionRangeRef.current = sel.getRangeAt(0).cloneRange();
  }, []);

  const restoreSelectionRange = useCallback(() => {
    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc) return;
    const sel = iframeDoc.getSelection();
    if (!sel) return;
    const range = savedSelectionRangeRef.current;
    if (!range) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  const insertHtmlAtCursor = useCallback((html: string) => {
    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc) return;
    restoreSelectionRange();

    // execCommand is deprecated but still widely supported for contentEditable in iframes.
    try {
      iframeDoc.execCommand('insertHTML', false, html);
    } catch {
      const selection = iframeDoc.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const wrapper = iframeDoc.createElement('div');
      wrapper.innerHTML = html;
      const frag = iframeDoc.createDocumentFragment();
      while (wrapper.firstChild) frag.appendChild(wrapper.firstChild);
      range.insertNode(frag);
    }

    iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
  }, [restoreSelectionRange]);

  const insertTextAtCursor = useCallback((text: string) => {
    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc) return;
    restoreSelectionRange();
    try {
      iframeDoc.execCommand('insertText', false, text);
    } catch {
      const selection = iframeDoc.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(iframeDoc.createTextNode(text));
    }
    iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
  }, [restoreSelectionRange]);

  const uploadImageToService = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error(`${file.name} is not an image file`);
    }
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch('/api/upload-image', { method: 'POST', body: formData });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }
    return (await response.json()) as { name: string; url: string };
  }, []);

  const insertUploadedImagesAtCursor = useCallback((items: Array<{ url: string; name: string }>) => {
    if (!items.length) return;
    const html = items
      .map(({ url, name }) => {
        const safeAlt = (name || 'Uploaded image').replace(/"/g, '&quot;');
        return `<img src="${url}" alt="${safeAlt}" style="max-width:100%;height:auto;" />`;
      })
      .join('<br/>');
    insertHtmlAtCursor(html);
  }, [insertHtmlAtCursor]);

  const replacePlaceholdersWithUploadedImages = useCallback((params: { pasteId: string; uploaded: Array<{ url: string; name: string }> }) => {
    const iframeDoc = iframeRef.current?.contentDocument;
    if (!iframeDoc) return;
    const nodes = Array.from(
      iframeDoc.querySelectorAll(`span[data-chathtml-img-ph][data-chathtml-paste-id="${params.pasteId}"]`)
    ) as HTMLSpanElement[];

    // Replace in DOM order with uploaded images.
    for (let i = 0; i < nodes.length; i++) {
      const ph = nodes[i];
      const item = params.uploaded[i];
      if (!item) {
        // No uploaded image for this placeholder -> remove placeholder
        ph.remove();
        continue;
      }
      const img = iframeDoc.createElement('img');
      img.src = item.url;
      img.alt = item.name || 'Uploaded image';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      ph.replaceWith(img);
    }

    // If there are more uploads than placeholders, insert remainder at cursor
    if (params.uploaded.length > nodes.length) {
      const remaining = params.uploaded.slice(nodes.length);
      insertUploadedImagesAtCursor(remaining);
    }

    iframeDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
  }, [insertUploadedImagesAtCursor]);

  const sanitizeHtmlEnforceImgUrlLength = useCallback((html: string) => {
    if (!html) return html;
    const tooLong: string[] = [];
    const out = html.replace(/<img\b([^>]*?)>/gi, (full) => {
      const srcMatch = full.match(/\ssrc\s*=\s*(['"])(.*?)\1/i);
      const src = srcMatch?.[2] ?? '';
      if (src && src.length > MAX_IMAGE_URL_LENGTH) {
        tooLong.push(src);
        return '';
      }
      return full;
    });
    if (tooLong.length) {
      showNotice(`Some pasted image URLs were too long and weren’t added (max ${MAX_IMAGE_URL_LENGTH} chars). Try “Upload Image” instead.`);
    }
    return out;
  }, [showNotice]);

  // Setup iframe for editing (always editable)
  const setupEditableIframe = useCallback(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) return;

    // Make the body contenteditable
    const body = iframeDoc.body;
    if (body) {
      // Cleanup old listeners if we re-initialize (e.g. srcdoc reload).
      if (iframeCleanupRef.current) {
        iframeCleanupRef.current();
        iframeCleanupRef.current = null;
      }

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

      // Paste: if images exist as files, paste everything else immediately, but replace image tags
      // with placeholders that get swapped with uploaded images once upload completes.
      const handlePaste = (e: ClipboardEvent) => {
        const cd = e.clipboardData;
        if (!cd) return;

        const imageFiles = Array.from(cd.items || [])
          .filter((it) => it.kind === 'file' && (it.type || '').startsWith('image/'))
          .map((it) => it.getAsFile())
          .filter(Boolean) as File[];

        const html = cd.getData('text/html');
        const text = cd.getData('text/plain');

        // If there are images in the clipboard, upload and replace pasted images.
        if (imageFiles.length) {
          e.preventDefault();
          captureSelectionRange();
          setIsUploadingImage(true);
          showNotice(`Uploading ${imageFiles.length === 1 ? 'image' : `${imageFiles.length} images`}… (we’ll insert them automatically)`);

          const pasteId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

          // Paste non-image content immediately (and keep image positions using placeholders when possible).
          if (html) {
            // If HTML contains <img>, replace them with placeholders so images can be swapped in-place.
            // IMPORTANT: Do NOT enforce URL length here. Pasted <img src="data:image/..."> is often very long,
            // but we will replace those images with uploaded URLs anyway.
            const { html: withPlaceholders } = replacePastedImagesWithPlaceholders(html, pasteId);
            insertHtmlAtCursor(withPlaceholders);
          } else if (text) {
            insertTextAtCursor(text);
          }

          (async () => {
            try {
              const uploaded: Array<{ name: string; url: string }> = [];
              for (const file of imageFiles) {
                const up = await uploadImageToService(file);
                if (up.url.length > MAX_IMAGE_URL_LENGTH) {
                  // Skip overly long URLs (should be rare, but guard anyway).
                  continue;
                }
                uploaded.push(up);
              }
              if (uploaded.length) {
                // Replace placeholders (if any) and insert remainder at cursor.
                replacePlaceholdersWithUploadedImages({ pasteId, uploaded });
                showNotice(`Inserted ${uploaded.length === 1 ? 'image' : `${uploaded.length} images`} into the preview.`);
              } else {
                showNotice(`No images were inserted. Try “Upload Image” (right click) or a smaller image URL.`);
              }
            } catch (err) {
              console.error('Paste upload failed:', err);
              showNotice('Could not upload pasted image(s). Use “Upload Image” (right click) instead.');
            } finally {
              setIsUploadingImage(false);
            }
          })();

          return;
        }

        // No image files: allow normal paste, but if HTML includes images, enforce URL limits.
        if (html && /<img\b/i.test(html)) {
          // Some apps put images into the clipboard only as HTML <img src="data:image/..."> (no file items).
          // In that case, we upload the data images and replace them with uploaded URLs.
          if (/src\s*=\s*(['"])data:image\//i.test(html)) {
            e.preventDefault();
            captureSelectionRange();
            setIsUploadingImage(true);
            showNotice('Uploading pasted image… (we’ll insert it automatically)');

            const pasteId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const { html: withPlaceholders, files } = replaceDataImageTagsWithPlaceholders(html, pasteId);

            // Also enforce URL length for any remaining non-data <img src="..."> tags.
            const cleaned = sanitizeHtmlEnforceImgUrlLength(withPlaceholders);
            insertHtmlAtCursor(cleaned);

            (async () => {
              try {
                const uploaded: Array<{ name: string; url: string }> = [];
                for (const file of files) {
                  const up = await uploadImageToService(file);
                  if (up.url.length > MAX_IMAGE_URL_LENGTH) continue;
                  uploaded.push(up);
                }
                if (uploaded.length) {
                  replacePlaceholdersWithUploadedImages({ pasteId, uploaded });
                  showNotice(`Inserted ${uploaded.length === 1 ? 'image' : `${uploaded.length} images`} into the preview.`);
                } else {
                  showNotice('No images were inserted. Try “Upload Image” (right click) instead.');
                }
              } catch (err) {
                console.error('Data image paste upload failed:', err);
                showNotice('Could not upload pasted image(s). Use “Upload Image” (right click) instead.');
              } finally {
                setIsUploadingImage(false);
              }
            })();

            return;
          }

          const cleaned = sanitizeHtmlEnforceImgUrlLength(html);
          if (cleaned !== html) {
            e.preventDefault();
            captureSelectionRange();
            insertHtmlAtCursor(cleaned);
          }
        }
      };

      // Drop: auto-upload image files and insert.
      const handleDrop = (e: DragEvent) => {
        const dt = e.dataTransfer;
        if (!dt) return;
        const files = Array.from(dt.files || []);
        const imageFiles = files.filter((f) => (f.type || '').startsWith('image/'));
        if (imageFiles.length) {
          e.preventDefault();
          captureSelectionRange();
          setIsUploadingImage(true);
          showNotice(`Uploading ${imageFiles.length === 1 ? 'image' : `${imageFiles.length} images`}…`);

          (async () => {
            try {
              const uploaded: Array<{ name: string; url: string }> = [];
              for (const file of imageFiles) {
                const up = await uploadImageToService(file);
                if (up.url.length > MAX_IMAGE_URL_LENGTH) continue;
                uploaded.push(up);
              }
              if (uploaded.length) {
                insertUploadedImagesAtCursor(uploaded);
                showNotice(`Inserted ${uploaded.length === 1 ? 'image' : `${uploaded.length} images`} into the preview.`);
              } else {
                showNotice(`No images were inserted. Try “Upload Image” (right click) instead.`);
              }
            } catch (err) {
              console.error('Drop upload failed:', err);
              showNotice('Could not upload dropped image(s). Use “Upload Image” (right click) instead.');
            } finally {
              setIsUploadingImage(false);
            }
          })();
        }
      };

      const handleDragOver = (e: DragEvent) => {
        const dt = e.dataTransfer;
        if (!dt) return;
        const files = Array.from(dt.items || []).filter((i) => i.kind === 'file');
        const hasImageFile = files.some((i) => (i.type || '').startsWith('image/'));
        if (hasImageFile) {
          e.preventDefault();
        }
      };

      body.addEventListener('input', handleInput);
      body.addEventListener('contextmenu', handleContextMenu);
      body.addEventListener('click', handleClick);
      body.addEventListener('paste', handlePaste as any);
      body.addEventListener('drop', handleDrop as any);
      body.addEventListener('dragover', handleDragOver as any);
      
      // Cleanup
      const cleanup = () => {
        body.removeEventListener('input', handleInput);
        body.removeEventListener('contextmenu', handleContextMenu);
        body.removeEventListener('click', handleClick);
        body.removeEventListener('paste', handlePaste as any);
        body.removeEventListener('drop', handleDrop as any);
        body.removeEventListener('dragover', handleDragOver as any);
      };
      iframeCleanupRef.current = cleanup;
      return cleanup;
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
      if (iframeCleanupRef.current) {
        iframeCleanupRef.current();
        iframeCleanupRef.current = null;
      }
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
    setImageError(null);
    captureSelectionRange();
    setShowImagePrompt(true);
  };

  const handleImageInsert = () => {
    if (!imageUrl.trim()) return;
    if (imageUrl.trim().length > MAX_IMAGE_URL_LENGTH) {
      setImageError(`Image URL is too long (max ${MAX_IMAGE_URL_LENGTH} characters). Consider using “Upload Image” instead.`);
      return;
    }
    
    if (!iframeRef.current) return;
    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    restoreSelectionRange();
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
    setImageError(null);
  };

  const handleUploadImageClick = () => {
    setImageError(null);
    captureSelectionRange();
    imageFileInputRef.current?.click();
  };

  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setImageError(null);
    try {
      const uploaded = await uploadImageToService(file);
      if (uploaded.url.length > MAX_IMAGE_URL_LENGTH) {
        setImageError(`Uploaded image URL is too long (max ${MAX_IMAGE_URL_LENGTH} characters).`);
        return;
      }
      insertHtmlAtCursor(`<img src="${uploaded.url}" alt="${uploaded.name.replace(/"/g, '&quot;')}" style="max-width:100%;height:auto;" />`);
      setShowImagePrompt(false);
      setImageUrl('');
      showNotice('Image uploaded and inserted into the preview.');
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      // Reset input so selecting same file again works
      if (e.target) e.target.value = '';
    }
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
    { icon: ImagePlus, label: 'Upload Image', action: handleUploadImageClick },
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
        {pasteNotice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-[90%]">
            <div className="bg-white/95 border border-slate-200 shadow-lg rounded-xl px-4 py-2 text-sm text-slate-700 backdrop-blur-sm">
              {pasteNotice}
            </div>
          </div>
        )}
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
            <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
              <span>Max URL length: {MAX_IMAGE_URL_LENGTH}</span>
              <span className={imageUrl.length > MAX_IMAGE_URL_LENGTH ? 'text-red-600 font-medium' : ''}>
                {imageUrl.length}/{MAX_IMAGE_URL_LENGTH}
              </span>
            </div>
            {imageError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {imageError}
              </div>
            )}
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadImageFile}
              className="hidden"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowImagePrompt(false); setImageUrl(''); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadImageClick}
                disabled={isUploadingImage}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Upload an image and insert it"
              >
                <ImagePlus className="w-4 h-4" />
                {isUploadingImage ? 'Uploading…' : 'Upload'}
              </button>
              <button
                onClick={handleImageInsert}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Insert
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Tip: You can also right click inside the preview and choose “Upload Image”.
            </p>
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

