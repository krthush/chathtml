'use client';

import type { ModelMessage } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, CheckCircle2, Maximize2, X } from 'lucide-react';

interface ChatProps {
  onCodeUpdate: (code: string) => void;
  currentCode: string;
}

export default function Chat({ onCodeUpdate, currentCode }: ChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ModelMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalCode, setModalCode] = useState<{ code: string; lang: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedIndex = useRef<number>(-1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract HTML code from AI messages and update editor
  useEffect(() => {
    if (messages.length > 0 && lastProcessedIndex.current < messages.length - 1) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage && lastMessage.role === 'assistant') {
        const content = typeof lastMessage.content === 'string' 
          ? lastMessage.content 
          : lastMessage.content
              .filter(part => part.type === 'text')
              .map(part => part.text)
              .join('\n');
        
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
    if (!input.trim() || isLoading) return;

    const userInput = input;
    setInput('');
    setIsLoading(true);

    setMessages(currentMessages => [
      ...currentMessages,
      { role: 'user', content: userInput },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userInput }],
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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-14 px-4 bg-linear-to-r from-emerald-600 to-emerald-700 border-b border-emerald-600 flex items-center gap-2 shadow-md">
        <Sparkles className="w-5 h-5 text-white" />
        <span className="text-sm font-bold text-white">AI Chat</span>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 shadow-lg">
              <Bot className="w-9 h-9 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              How can I help you today?
            </h3>
            <p className="text-gray-500 text-sm max-w-sm">
              Ask me to create or modify HTML pages, and I'll help you build beautiful web content.
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex gap-4 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {typeof message.content === 'string' ? (
                  <MessageContent 
                    content={message.content} 
                    role={message.role}
                    onCodeClick={setModalCode}
                  />
                ) : (
                  message.content
                    .filter(part => part.type === 'text')
                    .map((part, partIndex) => (
                      <MessageContent 
                        key={partIndex} 
                        content={part.text} 
                        role={message.role}
                        onCodeClick={setModalCode}
                      />
                    ))
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-gray-100">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-center gap-2 bg-gray-100 rounded-3xl px-4 py-2 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message ChatHTML..."
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-[15px] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            Press Enter to send, Shift + Enter for new line
          </p>
        </div>
      </div>

      {/* Code Modal */}
      {modalCode && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setModalCode(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-gray-900 uppercase">{modalCode.lang}</div>
                <span className="text-xs text-gray-500">Full Code</span>
              </div>
              <button
                onClick={() => setModalCode(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-900">
              <pre className="text-gray-100 text-sm font-mono whitespace-pre-wrap">
                {modalCode.code}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(modalCode.code);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Copy Code
              </button>
              <button
                onClick={() => setModalCode(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
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
                  className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs font-mono overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all group relative"
                  onClick={() => onCodeClick({ code: trimmedCode, lang: lang || 'code' })}
                >
                  {lang && (
                    <div className="text-gray-400 mb-2 text-[10px] uppercase font-bold flex items-center justify-between">
                      <span>{lang}</span>
                      <div className="flex items-center gap-1 text-gray-500 group-hover:text-emerald-400 transition-colors">
                        <Maximize2 className="w-3 h-3" />
                        <span className="text-[9px]">Click to expand</span>
                      </div>
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap max-h-[150px] overflow-hidden relative">
                    {trimmedCode}
                    {trimmedCode.split('\n').length > 8 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-gray-900 to-transparent"></div>
                    )}
                  </pre>
                </div>
                {lang === 'html' && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 mt-2 font-medium">
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