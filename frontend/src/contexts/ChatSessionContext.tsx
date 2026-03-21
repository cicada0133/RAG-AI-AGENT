'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  response_time_ms: number;
  is_estimated: boolean;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  followups?: string[];
  tokenUsage?: TokenUsage;
}

export interface ChatSession {
  id: string;
  name: string;
  createdAt: number;
  messages: ChatMessage[];
  docId: string | null;
  docFilename: string | null;
}

interface ChatSessionContextValue {
  sessions: ChatSession[];
  activeSessionId: string;
  activeSession: ChatSession;
  createSession: (name?: string) => string;
  deleteSession: (id: string) => void;
  switchSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
  addMessage: (sessionId: string, msg: ChatMessage) => void;
}

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

const STORAGE_KEY = 'central_ai_chat_sessions';
const ACTIVE_KEY = 'central_ai_active_session';

function createEmptySession(name = 'Новый чат'): ChatSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    createdAt: Date.now(),
    messages: [],
    docId: null,
    docFilename: null,
  };
}

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window === 'undefined') return [createEmptySession()];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    return [createEmptySession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem(ACTIVE_KEY);
    return stored || '';
  });

  // Persist on changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  // Make sure we have a valid active session
  const validActiveId = sessions.find(s => s.id === activeSessionId)
    ? activeSessionId
    : sessions[0]?.id || '';

  const activeSession = sessions.find(s => s.id === validActiveId) || sessions[0];

  const createSession = useCallback((name = 'Новый чат') => {
    const session = createEmptySession(name);
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    return session.id;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        const newS = createEmptySession();
        setActiveSessionId(newS.id);
        return [newS];
      }
      if (id === validActiveId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  }, [validActiveId]);

  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const renameSession = useCallback((id: string, name: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, []);

  const updateSession = useCallback((id: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const addMessage = useCallback((sessionId: string, msg: ChatMessage) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, messages: [...s.messages, msg] } : s
    ));
  }, []);

  return (
    <ChatSessionContext.Provider value={{
      sessions,
      activeSessionId: validActiveId,
      activeSession,
      createSession,
      deleteSession,
      switchSession,
      renameSession,
      updateSession,
      addMessage,
    }}>
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSessions() {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) throw new Error('useChatSessions must be used within ChatSessionProvider');
  return ctx;
}
