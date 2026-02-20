'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  'Which model is cheapest for summarization tasks?',
  'How does Gemini Flash caching work?',
  'Compare GPT-4o vs Claude 3.5 Sonnet pricing',
  'What is the cost for 1M tokens on GPT-4o mini?',
];

export function AssistantMode() {
  const [isMounted, setIsMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMounted(true);
    setSessionId(`session_${Date.now()}`);
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content:
          "Hello! I'm your AI pricing assistant. I can help you compare LLM costs, understand pricing nuances, and find the most cost-effective model for your use case.\n\nWhat would you like to know?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage ?? inputValue;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/pricing/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend, sessionId }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.success
          ? data.message
          : `I encountered an error: ${data.error}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Connection error: ${String(error)}. Please check that the backend is running.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-4 min-h-[500px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20">
        <div className="animate-pulse flex flex-col items-center">
          <Bot size={40} className="text-muted-foreground/40 mb-4" />
          <div className="h-4 w-32 bg-muted rounded mb-2"></div>
          <div className="h-3 w-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-4.5 w-4.5 text-primary" size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">AI Pricing Assistant</h2>
          <p className="text-xs text-muted-foreground">
            Ask anything about LLM pricing, model comparisons, or cost optimization.
          </p>
        </div>
      </div>

      {/* Suggested questions — only show when only the welcome message is present */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSendMessage(q)}
              className="rounded-full border border-border/70 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex flex-col gap-4 min-h-[340px] max-h-[420px] overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted border border-border/60 text-muted-foreground'
                }`}
            >
              {message.role === 'user' ? <User size={13} /> : <Bot size={13} />}
            </div>

            {/* Bubble */}
            <div
              className={`group relative max-w-[82%] rounded-2xl px-4 py-3 ${message.role === 'user'
                ? 'rounded-tr-sm bg-primary text-primary-foreground'
                : 'rounded-tl-sm bg-card border border-border/60 text-foreground shadow-sm'
                }`}
            >
              {message.role === 'assistant' ? (
                <div className="chat-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{message.content}</p>
              )}
              <span
                className={`mt-1.5 block text-[10px] ${message.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  }`}
              >
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground">
              <Bot size={13} />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border/60 bg-card px-4 py-3 shadow-sm">
              {[0, 0.15, 0.3].map((delay, i) => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce-dot"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            placeholder="Ask about pricing, models, or cost optimization… (Enter to send, Shift+Enter for new line)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={2}
            className="resize-none rounded-xl border-border/60 bg-card pr-4 text-sm leading-relaxed focus:border-primary/50 focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          />
        </div>
        <Button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputValue.trim()}
          size="icon"
          className="h-[72px] w-11 flex-shrink-0 rounded-xl shadow-sm"
          aria-label="Send message"
        >
          <Send size={16} />
        </Button>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Responses are AI-generated. Always verify pricing with official provider documentation.
      </p>
    </div>
  );
}
