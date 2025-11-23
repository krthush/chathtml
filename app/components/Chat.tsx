'use client';

import type { ModelMessage } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, CheckCircle2, Maximize2, X, ImagePlus } from 'lucide-react';

interface ImageAttachment {
  name: string;
  url: string;
}

interface ExtendedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: ImageAttachment[];
}

interface ChatProps {
  onCodeUpdate: (code: string) => void;
  currentCode: string;
}

export default function Chat({ onCodeUpdate, currentCode }: ChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalCode, setModalCode] = useState<{ code: string; lang: string } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<ImageAttachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedIndex = useRef<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
            onCodeUpdate(htmlCode);
            lastProcessedIndex.current = messages.length - 1;
          }
        }
      }
    }
  }, [messages, onCodeUpdate]);

  const handleSend = async () => {
    if ((!input.trim() && uploadedImages.length === 0) || isLoading) return;

    const userInput = input;
    const userImages = [...uploadedImages];
    setInput('');
    setUploadedImages([]);
    setIsLoading(true);

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
      <div className="h-14 px-4 bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-600 border-b border-purple-500/20 flex items-center gap-2 shadow-lg backdrop-blur-sm">
        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white tracking-wide">AI Assistant</span>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-r from-violet-400 to-fuchsia-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center mb-4 shadow-xl">
                <Bot className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">
              How can I help you today?
            </h3>
            <p className="text-slate-600 text-sm max-w-sm leading-relaxed">
              Ask me to create or modify HTML pages, and I'll help you build beautiful web content.
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
                  <Bot className="w-4.5 h-4.5 text-white" />
                </div>
              )}
              
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] shadow-md ${
                  message.role === 'user'
                    ? 'bg-linear-to-br from-violet-600 to-fuchsia-600 text-white shadow-purple-500/30'
                    : 'bg-white text-slate-800 border border-slate-200/50'
                }`}
              >
                {/* Display images if present */}
                {message.images && message.images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {message.images.map((image, imgIndex) => (
                      <div key={imgIndex} className="relative">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="max-w-[200px] max-h-[200px] object-cover rounded-lg border-2 border-white/20"
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

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
                  <User className="w-4.5 h-4.5 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-white border border-slate-200/50 shadow-md">
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
      <div className="border-t border-slate-200/50 bg-white/80 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          {/* Image Preview Area */}
          {uploadedImages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-slate-200"
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
          )}
          
          <div className="relative flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-lg border border-slate-200/50 focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-300 transition-all">
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
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              title="Upload images"
            >
              <ImagePlus className="w-4 h-4 text-slate-600" />
            </button>
            <input
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
              className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-[15px] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && uploadedImages.length === 0) || isLoading}
              className="w-9 h-9 rounded-xl bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:shadow-none"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
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
    <div className="text-[15px] leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const codeMatch = part.match(/```(\w+)?\n([\s\S]*?)```/);
          if (codeMatch) {
            const [, lang, code] = codeMatch;
            const trimmedCode = code.trim();
            return (
              <div key={i} className="my-3 -mx-1">
                <div 
                  className="bg-slate-900 text-slate-100 rounded-xl p-3 text-xs font-mono overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all group relative shadow-lg"
                  onClick={() => onCodeClick({ code: trimmedCode, lang: lang || 'code' })}
                >
                  {lang && (
                    <div className="text-slate-400 mb-2 text-[10px] uppercase font-bold flex items-center justify-between">
                      <span className="bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">{lang}</span>
                      <div className="flex items-center gap-1 text-slate-500 group-hover:text-purple-400 transition-colors">
                        <Maximize2 className="w-3 h-3" />
                        <span className="text-[9px]">Click to expand</span>
                      </div>
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap max-h-[150px] overflow-hidden relative">
                    {trimmedCode}
                    {trimmedCode.split('\n').length > 8 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-slate-900 to-transparent"></div>
                    )}
                  </pre>
                </div>
                {lang === 'html' && (
                  <div className="flex items-center gap-1 text-xs text-purple-600 mt-2 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
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