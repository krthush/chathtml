'use client';

import type { ModelMessage } from 'ai';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, CheckCircle2, Maximize2, X, ImagePlus, FileText, Save, Plus, Brain, Undo2 } from 'lucide-react';

interface ImageAttachment {
  name: string;
  url: string;
}

interface ExtendedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: ImageAttachment[];
}

interface CustomTemplate {
  name: string;
  url: string;
  uploadedAt: string;
}

interface ChatProps {
  onCodeUpdate: (code: string) => void;
  currentCode: string;
}

interface CodeHistory {
  messageIndex: number;
  codeSnapshot: string;
  timestamp: number;
}

export default function Chat({ onCodeUpdate, currentCode }: ChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalCode, setModalCode] = useState<{ code: string; lang: string } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<ImageAttachment[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'claude' | 'gpt'>('claude');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [messagesWithCode, setMessagesWithCode] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedIndex = useRef<number>(-1);
  const currentCodeRef = useRef<string>(currentCode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templateDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with currentCode
  useEffect(() => {
    currentCodeRef.current = currentCode;
  }, [currentCode]);

  const defaultTemplates = [
    { name: 'Blank', file: 'blank.html', description: 'Simple starter template', isDefault: true },
    { name: 'Feature Launch', file: 'feature-launch.html', description: 'Suitable for newsletters too!', isDefault: true },
    { name: 'Blog', file: 'blog.html', description: 'Suitable for blogs', isDefault: true },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Local storage helpers for code history
  const saveCodeSnapshot = useCallback((messageIndex: number, code: string) => {
    const history: CodeHistory = {
      messageIndex,
      codeSnapshot: code,
      timestamp: Date.now()
    };
    localStorage.setItem(`code-history-${messageIndex}`, JSON.stringify(history));
    setMessagesWithCode(prev => new Set(prev).add(messageIndex));
  }, []);

  const getCodeSnapshot = useCallback((messageIndex: number): string | null => {
    const stored = localStorage.getItem(`code-history-${messageIndex}`);
    if (stored) {
      const history: CodeHistory = JSON.parse(stored);
      return history.codeSnapshot;
    }
    return null;
  }, []);

  const clearCodeSnapshot = useCallback((messageIndex: number) => {
    localStorage.removeItem(`code-history-${messageIndex}`);
    setMessagesWithCode(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageIndex);
      return newSet;
    });
  }, []);

  const hasCodeSnapshot = useCallback((messageIndex: number): boolean => {
    return messagesWithCode.has(messageIndex);
  }, [messagesWithCode]);

  // Format template name for display (capitalize and remove dashes)
  const formatTemplateName = (name: string) => {
    return name
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const maxHeight = 128; // max-h-32 in pixels
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = maxHeight + 'px';
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.height = scrollHeight + 'px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  // Upload image to Vercel Blob and get URL
  const uploadImageToService = async (file: File): Promise<ImageAttachment> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error(`${file.name} is not an image file`);
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    return {
      name: data.name,
      url: data.url,
    };
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    try {
      const imagePromises = Array.from(files).map(file => uploadImageToService(file));
      const images = await Promise.all(imagePromises);
      setUploadedImages(prev => [...prev, ...images]);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setIsLoading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove an uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Fetch custom templates on mount
  useEffect(() => {
    fetchCustomTemplates();
  }, []);

  // Load code history from localStorage on mount
  useEffect(() => {
    const indices = new Set<number>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('code-history-')) {
        const index = parseInt(key.replace('code-history-', ''));
        if (!isNaN(index)) {
          indices.add(index);
        }
      }
    }
    setMessagesWithCode(indices);
  }, []);

  // Clean up localStorage entries for messages that no longer exist
  useEffect(() => {
    const currentMessageCount = messages.length;
    messagesWithCode.forEach(index => {
      if (index >= currentMessageCount) {
        clearCodeSnapshot(index);
      }
    });
  }, [messages.length, messagesWithCode, clearCodeSnapshot]);

  const fetchCustomTemplates = async () => {
    try {
      const response = await fetch('/api/templates/custom');
      if (response.ok) {
        const data = await response.json();
        setCustomTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching custom templates:', error);
    }
  };

  // Handle template selection (default templates)
  const handleTemplateSelect = async (templateFile: string) => {
    try {
      const response = await fetch(`/api/templates/${templateFile}`);
      if (response.ok) {
        const content = await response.text();
        onCodeUpdate(content);
        setShowTemplates(false);
      } else {
        alert('Failed to load template');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    }
  };

  // Handle custom template selection
  const handleCustomTemplateSelect = async (templateUrl: string) => {
    try {
      const response = await fetch(templateUrl);
      if (response.ok) {
        const content = await response.text();
        onCodeUpdate(content);
        setShowTemplates(false);
      } else {
        alert('Failed to load template');
      }
    } catch (error) {
      console.error('Error loading custom template:', error);
      alert('Failed to load template');
    }
  };

  // Save current code as template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/templates/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          content: currentCode,
        }),
      });

      if (response.ok) {
        await fetchCustomTemplates();
        setShowSaveModal(false);
        setTemplateName('');
        alert('Template saved successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete custom template
  const handleDeleteTemplate = async (templateUrl: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/custom?url=${encodeURIComponent(templateUrl)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCustomTemplates();
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  // Update existing custom template with current code
  const handleUpdateTemplate = async (templateName: string, displayName: string) => {
    if (!confirm(`Are you sure you want to overwrite "${displayName}" with your current code?`)) {
      return;
    }

    try {
      const response = await fetch('/api/templates/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          content: currentCode,
        }),
      });

      if (response.ok) {
        await fetchCustomTemplates();
        alert('Template updated successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setShowTemplates(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    if (showTemplates || showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTemplates, showModelDropdown]);

  // Extract HTML code from AI messages and update editor
  useEffect(() => {
    if (messages.length > 0 && lastProcessedIndex.current < messages.length - 1) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage && lastMessage.role === 'assistant') {
        const content = lastMessage.content;
        
        // Look for HTML code blocks
        const codeBlockRegex = /```html\n([\s\S]*?)```/g;
        const matches = [...content.matchAll(codeBlockRegex)];
        
        if (matches.length > 0) {
          // Get the last HTML code block (most recent)
          const lastMatch = matches[matches.length - 1];
          const htmlCode = lastMatch[1].trim();
          
          if (htmlCode) {
            const messageIndex = messages.length - 1;
            // Save snapshot before applying new code (use ref to avoid dependency)
            saveCodeSnapshot(messageIndex, currentCodeRef.current);
            onCodeUpdate(htmlCode);
            lastProcessedIndex.current = messageIndex;
          }
        }
      }
    }
  }, [messages, onCodeUpdate, saveCodeSnapshot]);

  // Handle undo for a specific message
  const handleUndo = useCallback((messageIndex: number) => {
    const snapshot = getCodeSnapshot(messageIndex);
    if (snapshot) {
      onCodeUpdate(snapshot);
      
      // Clear this snapshot and all subsequent ones
      for (let i = messageIndex; i < messages.length; i++) {
        clearCodeSnapshot(i);
      }
      
      // Remove the user's message, assistant message, and all subsequent messages
      // messageIndex is the assistant message, so messageIndex - 1 is the user's prompt
      const removeFromIndex = messageIndex > 0 ? messageIndex - 1 : messageIndex;
      setMessages(prevMessages => prevMessages.slice(0, removeFromIndex));
      
      // Reset lastProcessedIndex to reprocess if needed
      lastProcessedIndex.current = removeFromIndex - 1;
    }
  }, [getCodeSnapshot, clearCodeSnapshot, onCodeUpdate, messages.length]);

  const handleSend = async () => {
    if ((!input.trim() && uploadedImages.length === 0) || isLoading) return;

    const userInput = input;
    const userImages = [...uploadedImages];
    setInput('');
    setUploadedImages([]);
    setIsLoading(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }

    // Create user message with images
    const userMessage: ExtendedMessage = {
      role: 'user',
      content: userInput,
      images: userImages.length > 0 ? userImages : undefined,
    };

    setMessages(currentMessages => [
      ...currentMessages,
      userMessage,
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...messages, userMessage],
          currentCode: currentCode,
          model: selectedModel,
        }),
      });

      const { messages: newMessages } = await response.json();

      setMessages(currentMessages => [
        ...currentMessages,
        ...newMessages,
      ]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <div className="h-12 md:h-14 px-3 md:px-4 bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-600 border-b border-purple-500/20 flex items-center justify-between shadow-lg backdrop-blur-sm relative z-50">
        <div className="flex items-center gap-2">
          <div className="p-1 md:p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
            <Sparkles className="w-3 md:w-4 h-3 md:h-4 text-white" />
          </div>
          <span className="text-xs md:text-sm font-semibold text-white tracking-wide">AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Model Switcher */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all group backdrop-blur-sm flex items-center gap-1.5"
              title="Switch Model"
            >
              <Brain className="w-3 md:w-4 h-3 md:h-4 text-white" />
              <span className="hidden md:inline text-xs text-white/90">
                {selectedModel === 'claude' ? 'Claude' : 'GPT'}
              </span>
            </button>
            {showModelDropdown && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-56 z-50">
                <button
                  onClick={() => {
                    setSelectedModel('claude');
                    setShowModelDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors ${
                    selectedModel === 'claude' ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedModel === 'claude' ? 'bg-purple-600' : 'bg-transparent border border-slate-300'
                    }`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 text-sm">Claude Sonnet 4.5</div>
                      <div className="text-xs text-slate-500">Anthropic</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setSelectedModel('gpt');
                    setShowModelDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors ${
                    selectedModel === 'gpt' ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedModel === 'gpt' ? 'bg-purple-600' : 'bg-transparent border border-slate-300'
                    }`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 text-sm">GPT-5 Mini</div>
                      <div className="text-xs text-slate-500">OpenAI</div>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
          
          {/* Templates Button */}
          <div className="relative" ref={templateDropdownRef}>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all group backdrop-blur-sm"
              title="Templates"
            >
              <FileText className="w-3 md:w-4 h-3 md:h-4 text-white" />
            </button>
            {showTemplates && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 py-2 w-72 z-50 max-h-96 overflow-y-auto">
              <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Templates</p>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded transition-colors"
                  title="Save current code as template"
                >
                  <Plus className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
              
              {/* Default Templates */}
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Default</p>
              </div>
              {defaultTemplates.map((template) => (
                <button
                  key={template.file}
                  onClick={() => handleTemplateSelect(template.file)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="font-medium text-slate-900 text-sm">{template.name}</div>
                  <div className="text-xs text-slate-500">{template.description}</div>
                </button>
              ))}

              {/* Custom Templates */}
              {customTemplates.length > 0 && (
                <>
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 mt-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Custom</p>
                  </div>
                  {customTemplates.map((template) => (
                    <div
                      key={template.url}
                      className="group relative flex items-center hover:bg-slate-50 transition-colors"
                    >
                      <button
                        onClick={() => handleCustomTemplateSelect(template.url)}
                        className="flex-1 text-left px-3 py-2"
                      >
                        <div className="font-medium text-slate-900 text-sm pr-14">{formatTemplateName(template.name)}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(template.uploadedAt).toLocaleDateString()}
                        </div>
                      </button>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateTemplate(template.name, formatTemplateName(template.name));
                          }}
                          className="p-1 hover:bg-purple-100 rounded transition-all"
                          title="Save current code to this template"
                        >
                          <Save className="w-3.5 h-3.5 text-purple-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.url, formatTemplateName(template.name));
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-all"
                          title="Delete template"
                        >
                          <X className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto relative z-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-8">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-r from-violet-400 to-fuchsia-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative w-12 md:w-16 h-12 md:h-16 rounded-2xl bg-linear-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center mb-3 md:mb-4 shadow-xl">
                <Bot className="w-6 md:w-8 h-6 md:h-8 text-white" />
              </div>
            </div>
            <h3 className="text-base md:text-xl font-bold bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-1 md:mb-2">
              How can I help you today?
            </h3>
            <p className="text-slate-600 text-xs md:text-sm max-w-sm leading-relaxed">
              Ask me to create or modify HTML pages, and I'll help you build beautiful web content.
            </p>
            <p className="text-slate-500 text-[10px] md:text-xs max-w-sm leading-relaxed mt-2 flex items-center gap-1 justify-center">
              <ImagePlus className="w-3 h-3" />
              <span>I can analyze images you upload!</span>
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-2 md:px-4 py-3 md:py-6 space-y-2 md:space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
            >
              <div
                className={`flex gap-2 md:gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-6 md:w-8 h-6 md:h-8 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
                    <Bot className="w-3 md:w-4.5 h-3 md:h-4.5 text-white" />
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5 md:gap-2 max-w-[80%]">
                  <div
                    className={`rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 shadow-md ${
                      message.role === 'user'
                        ? 'bg-linear-to-br from-violet-600 to-fuchsia-600 text-white shadow-purple-500/30'
                        : 'bg-white text-slate-800 border border-slate-200/50'
                    }`}
                  >
                    {/* Display images if present */}
                    {message.images && message.images.length > 0 && (
                      <div className="mb-1.5 md:mb-2 flex flex-wrap gap-1.5 md:gap-2">
                        {message.images.map((image, imgIndex) => (
                          <div key={imgIndex} className="relative">
                            <img
                              src={image.url}
                              alt={image.name}
                              className="max-w-[120px] md:max-w-[200px] max-h-[120px] md:max-h-[200px] object-cover rounded-lg border-2 border-white/20"
                            />
                            <div className={`text-[9px] px-2 py-0.5 mt-1 rounded ${
                              message.role === 'user' 
                                ? 'bg-white/20 text-white' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {image.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Display text content */}
                    <MessageContent 
                      content={message.content} 
                      role={message.role}
                      onCodeClick={setModalCode}
                    />
                  </div>
                  
                  {/* Undo button for assistant messages that applied code */}
                  {message.role === 'assistant' && hasCodeSnapshot(index) && (
                    <button
                      onClick={() => handleUndo(index)}
                      className="self-start flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-medium text-slate-600 hover:text-violet-600 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-lg md:rounded-xl transition-all shadow-sm hover:shadow"
                      title="Undo changes from this message"
                    >
                      <Undo2 className="w-3 md:w-3.5 h-3 md:h-3.5" />
                      <span>Undo changes</span>
                    </button>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-6 md:w-8 h-6 md:h-8 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
                    <User className="w-3 md:w-4.5 h-3 md:h-4.5 text-white" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 md:gap-3 justify-start">
              <div className="w-6 md:w-8 h-6 md:h-8 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="w-3 md:w-4.5 h-3 md:h-4.5 text-white" />
              </div>
              <div className="rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 bg-white border border-slate-200/50 shadow-md">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-linear-to-r from-violet-500 to-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-linear-to-r from-violet-500 to-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-linear-to-r from-violet-500 to-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200/50 bg-white/80 backdrop-blur-sm p-2 md:p-4">
        <div className="max-w-3xl mx-auto">
          {/* Image Preview Area */}
          {uploadedImages.length > 0 && (
            <div className="mb-2 md:mb-3">
              <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2">
                {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-16 md:w-20 h-16 md:h-20 object-cover rounded-lg border-2 border-slate-200"
                      />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 rounded-b-lg truncate">
                      {image.name}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] md:text-xs text-purple-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>AI will analyze {uploadedImages.length === 1 ? 'this image' : 'these images'}</span>
              </div>
            </div>
          )}
          
          <div className="relative flex items-center gap-1.5 md:gap-2 bg-white rounded-xl md:rounded-2xl px-2 md:px-4 py-2 md:py-3 shadow-lg border border-slate-200/50 focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-300 transition-all">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-7 md:w-9 h-7 md:h-9 rounded-lg md:rounded-xl bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              title="Upload images"
            >
              <ImagePlus className="w-3.5 md:w-4 h-3.5 md:h-4 text-slate-600" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me anything..."
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm md:text-[15px] disabled:opacity-50 resize-none max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && uploadedImages.length === 0) || isLoading}
              className="w-7 md:w-9 h-7 md:h-9 rounded-lg md:rounded-xl bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:shadow-none"
            >
              <Send className="w-3.5 md:w-4 h-3.5 md:h-4 text-white" />
            </button>
          </div>
          <p className="text-[10px] md:text-xs text-slate-400 text-center mt-1 md:mt-2 hidden md:block">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>

      {/* Code Modal */}
      {modalCode && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModalCode(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent uppercase">{modalCode.lang}</div>
                <span className="text-xs text-slate-500">Full Code</span>
              </div>
              <button
                onClick={() => setModalCode(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 hover:text-slate-700" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-900">
              <pre className="text-slate-100 text-sm font-mono whitespace-pre-wrap">
                {modalCode.code}
              </pre>
            </div>
            <div className="p-4 border-t border-slate-200 bg-linear-to-r from-slate-50 to-white flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(modalCode.code);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow"
              >
                Copy Code
              </button>
              <button
                onClick={() => setModalCode(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-violet-600 to-fuchsia-600 rounded-xl hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-lg shadow-purple-500/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowSaveModal(false);
            setTemplateName('');
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-linear-to-r from-purple-50 to-white">
              <h3 className="text-lg font-semibold bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Save as Template
              </h3>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setTemplateName('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    handleSaveTemplate();
                  }
                }}
                placeholder="e.g., My Landing Page"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 bg-white"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-2">
                Your current HTML code will be saved as a reusable template.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setTemplateName('');
                }}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={isSaving || !templateName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-violet-600 to-fuchsia-600 rounded-lg hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component to render message content with code blocks
function MessageContent({ 
  content, 
  role, 
  onCodeClick 
}: { 
  content: string; 
  role: string;
  onCodeClick: (code: { code: string; lang: string }) => void;
}) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return (
    <div className="text-xs md:text-[15px] leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const codeMatch = part.match(/```(\w+)?\n([\s\S]*?)```/);
          if (codeMatch) {
            const [, lang, code] = codeMatch;
            const trimmedCode = code.trim();
            return (
              <div key={i} className="my-2 md:my-3 -mx-1">
                <div 
                  className="bg-slate-900 text-slate-100 rounded-lg md:rounded-xl p-2 md:p-3 text-[10px] md:text-xs font-mono overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all group relative shadow-lg"
                  onClick={() => onCodeClick({ code: trimmedCode, lang: lang || 'code' })}
                >
                  {lang && (
                    <div className="text-slate-400 mb-1.5 md:mb-2 text-[9px] md:text-[10px] uppercase font-bold flex items-center justify-between">
                      <span className="bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">{lang}</span>
                      <div className="flex items-center gap-0.5 md:gap-1 text-slate-500 group-hover:text-purple-400 transition-colors">
                        <Maximize2 className="w-2.5 md:w-3 h-2.5 md:h-3" />
                        <span className="text-[8px] md:text-[9px] hidden md:inline">Click to expand</span>
                      </div>
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap max-h-[100px] md:max-h-[150px] overflow-hidden relative">
                    {trimmedCode}
                    {trimmedCode.split('\n').length > 8 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-slate-900 to-transparent"></div>
                    )}
                  </pre>
                </div>
                {lang === 'html' && (
                  <div className="flex items-center gap-1 text-[10px] md:text-xs text-purple-600 mt-1.5 md:mt-2 font-medium">
                    <CheckCircle2 className="w-2.5 md:w-3 h-2.5 md:h-3" />
                    <span>Code updated in editor</span>
                  </div>
                )}
              </div>
            );
          }
        }
        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
      })}
    </div>
  );
}