'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Bot, User, Send, Sparkles, LogIn, Plus, Trash2,
  MessageSquare, ChevronLeft, Loader2, LogOut,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

const SUGGESTED_QUESTIONS = [
  'Which model is cheapest for summarization tasks?',
  'How does Gemini Flash caching work?',
  'Compare GPT-4o vs Claude 3.5 Sonnet pricing',
  'What is the cost for 1M tokens on GPT-4o mini?',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssistantMode() {
  const { user, session, loading: authLoading, signOut } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Initialise ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true);
    resetToNewChat();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load session list when user logs in ────────────────────────────────────
  useEffect(() => {
    if (user && session) {
      loadSessions();
    } else {
      setSessions([]);
    }
  }, [user, session]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetToNewChat() {
    setSessionId('');
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI pricing assistant. I can help you compare LLM costs, understand pricing nuances, and find the most cost-effective model for your use case.\n\nWhat would you like to know?",
      timestamp: new Date(),
    }]);
  }

  // ── Load sessions from backend ─────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (!session?.access_token) return;
    setSessionsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/sessions`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setSessionsLoading(false);
    }
  }, [session?.access_token]);

  // ── Load a specific session's messages ─────────────────────────────────────
  async function loadSessionMessages(sid: string) {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${BACKEND}/api/sessions/${sid}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data: { messages: { id: string; role: string; content: string; created_at: string }[] } = await res.json();
      const loaded: Message[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(loaded.length ? loaded : []);
      setSessionId(sid);
      setSidebarOpen(false);
    } catch (e) {
      console.error('Failed to load session messages:', e);
    }
  }

  // ── Delete session ─────────────────────────────────────────────────────────
  async function deleteSession(sid: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!session?.access_token) return;
    try {
      await fetch(`${BACKEND}/api/sessions/${sid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      if (sessionId === sid) resetToNewChat();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function handleSendMessage(overrideMessage?: string) {
    const msg = overrideMessage ?? inputValue;
    if (!msg.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`${BACKEND}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: msg,
          session_id: sessionId || undefined,
          user_id: user?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail ?? 'Request failed');

      // Update session ID (backend may create a new one)
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        // Refresh sidebar list
        if (user) loadSessions();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response ?? 'No response received.',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Connection error: ${String(err)}. Please check that the backend is running on port 8000.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  // ─── Skeleton loading ──────────────────────────────────────────────────────
  if (!isMounted || authLoading) {
    return (
      <div className="flex flex-col gap-4 min-h-[500px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20">
        <div className="animate-pulse flex flex-col items-center">
          <Bot size={40} className="text-muted-foreground/40 mb-4" />
          <div className="h-4 w-32 bg-muted rounded mb-2" />
          <div className="h-3 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-0 h-[600px] relative">

      {/* ── Session Sidebar ── */}
      <div
        className={`absolute left-0 top-0 bottom-0 z-10 flex flex-col
          w-64 border-r border-border/60 bg-muted/30 rounded-l-xl
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:relative lg:w-56 lg:flex-shrink-0'}`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-3 border-b border-border/60">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</span>
          <div className="flex gap-1">
            <button
              onClick={resetToNewChat}
              title="New Chat"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex lg:hidden h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!user ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-3 py-8">
              <LogIn size={24} className="text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground mb-3">Sign in to save your chat history</p>
              <Link
                href="/auth"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
            </div>
          ) : sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-3 py-8">
              <MessageSquare size={24} className="text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSessionMessages(s.id)}
                className={`group w-full text-left flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 text-xs transition-colors ${sessionId === s.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.title}</p>
                  <p className="text-[10px] opacity-60 mt-0.5">{formatRelativeTime(s.updated_at)}</p>
                </div>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={11} />
                </button>
              </button>
            ))
          )}
        </div>

        {/* User info */}
        {user && (
          <div className="p-3 border-t border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Chat area ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Chat header */}
        <div className="flex items-center gap-3 pb-3 border-b border-border/60 mb-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <MessageSquare size={16} />
          </button>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" size={16} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">AI Pricing Assistant</h2>
            <p className="text-xs text-muted-foreground">Ask anything about LLM pricing or cost optimization.</p>
          </div>
          {!user && (
            <Link
              href="/auth"
              className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <LogIn size={12} />
              Sign in to save
            </Link>
          )}
          {user && (
            <button
              onClick={resetToNewChat}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Plus size={12} />
              New Chat
            </button>
          )}
        </div>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
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

        {/* Messages */}
        <div className="flex flex-col gap-4 flex-1 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-4 mb-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted border border-border/60 text-muted-foreground'
                  }`}
              >
                {message.role === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>
              <div
                className={`group relative max-w-[82%] rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'rounded-tr-sm bg-primary text-primary-foreground'
                    : 'rounded-tl-sm bg-card border border-border/60 text-foreground shadow-sm'
                  }`}
              >
                {message.role === 'assistant' ? (
                  <div className="chat-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
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

        {/* Input */}
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

        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Responses are AI-generated. Always verify pricing with official provider documentation.
        </p>
      </div>
    </div>
  );
}
