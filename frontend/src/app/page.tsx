'use client';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<Array<{id: number; text: string; isUser: boolean}>>([
    { id: 1, text: "Hello! I'm Claude, your AI assistant. How can I help you today?", isUser: false }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: "I understand you're looking for assistance. I'm here to help with any questions you might have. What would you like to discuss?",
        isUser: false
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header - Claude.ai style */}
      <header className="flex items-center px-4 py-6 border-b border-border/20 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center flex-1">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 10h14"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground/90">Claude</h1>
              <p className="text-sm text-muted">Your AI assistant</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="p-2 rounded-full hover:bg-muted/20 transition-colors claude-focus-ring">
            <svg className="w-5 h-5 text-muted/70 hover:text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </button>
          <button className="p-2 rounded-full hover:bg-muted/20 transition-colors claude-focus-ring">
            <svg className="w-5 h-5 text-muted/70 hover:text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
        <div className="space-y-2">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} max-w-[80%]`}>
              {message.isUser ? (
                <div className="claude-message-user">
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <span className="mt-1 inline-block text-xs text-muted/60">
                    Delivered
                  </span>
                </div>
              ) : (
                <div className="claude-message-assistant">
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start max-w-[80%]">
              <div className="claude-message-loading">
                <div className="h-4 w-16 rounded bg-muted/20 mb-2"></div>
                <div className="h-4 w-24 rounded bg-muted/20"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Claude.ai style */}
      <div className="flex items-center px-4 py-4 border-t border-border/20 bg-background/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex w-full items-center space-x-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Claude anything..."
            className="claude-input"
            rows={1}
          ></textarea>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`
              ${!input.trim() || isLoading
                ? 'claude-button-secondary pointer-events-none opacity-50'
                : 'claude-button-primary'}
              claude-hover-lift
              claude-press-feedback
              claude-focus-ring`}
          >
            {!isLoading ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5l7 7-7 7"/>
              </svg>
            ) : (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}