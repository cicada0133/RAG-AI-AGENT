'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useChatSessions } from '@/contexts/ChatSessionContext';
import type { ChatMessage } from '@/contexts/ChatSessionContext';

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  response_time_ms: number;
  is_estimated: boolean;
}

interface Message {
  role: 'ai' | 'user';
  text: string;
  followups?: string[];
  tokenUsage?: TokenUsage;
}

interface SessionStats {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  messageCount: number;
  avgResponseMs: number;
  responseTimes: number[];
}

const WELCOME: ChatMessage = {
  role: 'ai',
  text: 'Здравствуйте! Я ваш AI-ассистент. Загрузите документ, чтобы задавать вопросы, строить карты знаний или слушать подкаст.',
};

export default function ChatLayout({ docId }: { docId: string | null }) {
  const { theme } = useTheme();
  const isXP = theme.id === 'xp';
  const { activeSession, activeSessionId, updateSession, addMessage } = useChatSessions();

  // Use session messages; show welcome if empty
  const messages: ChatMessage[] = activeSession.messages.length > 0
    ? activeSession.messages
    : [WELCOME];

  // Use docId from prop (passed by page.tsx) to keep session synced
  useEffect(() => {
    if (docId !== activeSession.docId) {
      updateSession(activeSessionId, { docId });
    }
  }, [docId, activeSessionId]); // eslint-disable-line

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0,
    messageCount: 0, avgResponseMs: 0, responseTimes: []
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Ваш браузер не поддерживает распознавание речи. Используйте Chrome.'); return; }
    if (isRecording) { recognitionRef.current?.stop(); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

  const generateFollowups = async (question: string, answer: string): Promise<string[]> => {
    try {
      const res = await fetch(`${API}/api/chat/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, doc_id: docId || undefined })
      });
      if (res.ok) {
        const data = await res.json();
        return data.followups || [];
      }
    } catch {}
    return [];
  };

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    addMessage(activeSessionId, { role: 'user', text: msg });
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, doc_id: docId || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        const tokenUsage: TokenUsage | undefined = data.token_usage;
        if (tokenUsage) {
          setSessionStats(prev => {
            const newTimes = [...prev.responseTimes, tokenUsage.response_time_ms];
            return {
              totalPromptTokens: prev.totalPromptTokens + tokenUsage.prompt_tokens,
              totalCompletionTokens: prev.totalCompletionTokens + tokenUsage.completion_tokens,
              totalTokens: prev.totalTokens + tokenUsage.total_tokens,
              messageCount: prev.messageCount + 1,
              avgResponseMs: Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length),
              responseTimes: newTimes,
            };
          });
        }
        const followups = await generateFollowups(msg, data.answer);
        addMessage(activeSessionId, { role: 'ai', text: data.answer, followups, tokenUsage });
      } else {
        addMessage(activeSessionId, { role: 'ai', text: 'Ошибка обработки запроса.' });
      }
    } catch {
      addMessage(activeSessionId, { role: 'ai', text: 'Не удалось подключиться к серверу.' });
    } finally {
      setLoading(false);
    }
  };

  // ── XP Theme ───────────────────────────────────────────
  if (isXP) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Tahoma, Arial, sans-serif', fontSize: '12px' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff' }}>
          {messages.map((msg, idx) => (
            <div key={idx}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                {msg.role === 'ai' && (
                  <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #245ecd, #3c81f3)', border: '1px solid #1a3a8f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 'bold', flexShrink: 0 }}>AI</div>
                )}
                <div style={{ maxWidth: '70%', padding: '6px 10px', background: msg.role === 'ai' ? '#ddeeff' : '#fffac8', border: `1px solid ${msg.role === 'ai' ? '#7f9db9' : '#c8a000'}`, color: '#000', lineHeight: '1.5' }}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div style={{ width: '24px', height: '24px', background: '#ece9d8', border: '1px solid #919b9c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '9px', fontWeight: 'bold', flexShrink: 0 }}>Вы</div>
                )}
              </div>
              {msg.followups && msg.followups.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', marginLeft: '32px' }}>
                  {msg.followups.map((fq, fi) => (
                    <button key={fi} onClick={() => handleSend(fq)} style={{ background: '#f0f5ff', border: '1px solid #7f9db9', padding: '2px 8px', fontSize: '10px', color: '#0a246a', fontFamily: 'Tahoma', cursor: 'pointer' }}>
                      💬 {fq}
                    </button>
                  ))}
                </div>
              )}
              {showAdvanced && msg.tokenUsage && (
                <div style={{ fontSize: '9px', color: '#888', marginTop: '2px', marginLeft: '32px' }}>
                  ↗ {msg.tokenUsage.prompt_tokens} ↘ {msg.tokenUsage.completion_tokens} ток · {(msg.tokenUsage.response_time_ms / 1000).toFixed(1)}с{msg.tokenUsage.is_estimated ? ' (оценка)' : ''}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #245ecd, #3c81f3)', border: '1px solid #1a3a8f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 'bold' }}>AI</div>
              <span style={{ color: '#555', fontStyle: 'italic' }}>Думаю...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ borderTop: '1px solid #919b9c', padding: '6px', background: '#ece9d8', display: 'flex', gap: '6px' }}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Введите вопрос..."
            style={{ flex: 1, background: '#fff', border: '1px solid #7f9db9', padding: '4px 8px', fontFamily: 'Tahoma', fontSize: '12px', color: '#000', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.2)' }} />
          <button onClick={startVoiceInput} title={isRecording ? 'Остановить' : 'Голосовой ввод'}
            style={{ background: isRecording ? '#dc2626' : '#d4d0c8', border: '2px solid', borderColor: '#fff #aca899 #aca899 #fff', padding: '3px 8px', cursor: 'pointer', fontSize: '13px', animation: isRecording ? 'pulse 1s infinite' : 'none' }}>
            {isRecording ? '⏹' : '🎤'}
          </button>
          <button onClick={() => handleSend()} disabled={loading || !input.trim()}
            style={{ background: 'linear-gradient(180deg,#e8e8e8,#d4d0c8)', border: '2px solid', borderColor: '#fff #aca899 #aca899 #fff', padding: '3px 16px', fontFamily: 'Tahoma', fontSize: '11px', color: '#000', boxShadow: '1px 1px 0 #000', cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1 }}>
            Отправить
          </button>
        </div>
      </div>
    );
  }

  // ── Dark / Cyber Theme ─────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Advanced stats panel */}
      {showAdvanced && (
        <div className="flex-shrink-0 border-b border-slate-700/50 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">⚗ Advanced — Статистика сессии</span>
            <button onClick={() => setShowAdvanced(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕ Закрыть</button>
          </div>
          {sessionStats.messageCount === 0 ? (
            <div className="text-xs text-slate-500 italic py-2">
              📊 Статистика появится после первого ответа AI. Задайте вопрос!
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Входящих токенов', val: sessionStats.totalPromptTokens.toLocaleString(), icon: '📥', color: 'text-blue-400' },
                  { label: 'Исходящих токенов', val: sessionStats.totalCompletionTokens.toLocaleString(), icon: '📤', color: 'text-purple-400' },
                  { label: 'Всего токенов', val: sessionStats.totalTokens.toLocaleString(), icon: '🔢', color: 'text-slate-200' },
                  { label: 'Ср. время ответа', val: sessionStats.avgResponseMs ? `${(sessionStats.avgResponseMs / 1000).toFixed(1)}с` : '—', icon: '⏱', color: 'text-green-400' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-lg mb-1">{stat.icon}</div>
                    <div className={`text-lg font-bold ${stat.color}`}>{stat.val || '0'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>Запросов: {sessionStats.messageCount}</span>
                <span>Стоимость ≈ ${((sessionStats.totalTokens / 1_000_000) * 0.075).toFixed(5)} (Gemini Pro)</span>
                <span>≈ ${((sessionStats.totalTokens / 1_000_000) * 1.50).toFixed(5)} (GPT-4o)</span>
                {sessionStats.responseTimes.length > 0 && (
                  <span className="text-yellow-600">⚠ Токены могут быть приблизительными для локальных моделей</span>
                )}
              </div>
              {messages.filter(m => m.role === 'ai' && m.tokenUsage).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-2">По сообщениям:</p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {messages.filter(m => m.role === 'ai' && m.tokenUsage).map((m, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="text-slate-600">#{i + 1}</span>
                        <span className="text-blue-400">↑{m.tokenUsage!.prompt_tokens}</span>
                        <span className="text-purple-400">↓{m.tokenUsage!.completion_tokens}</span>
                        <span className="text-green-400">⏱{(m.tokenUsage!.response_time_ms / 1000).toFixed(1)}с</span>
                        {m.tokenUsage!.is_estimated && <span className="text-yellow-600/60">~</span>}
                        <span className="text-slate-600 truncate flex-1">{m.text.slice(0, 50)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}


      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx}>
            <div className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold border ${msg.role === 'ai' ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-slate-700 border-slate-600 text-slate-200'}`}>
                {msg.role === 'ai' ? 'AI' : 'Вы'}
              </div>
              <div className={`px-4 py-3 text-sm leading-relaxed border ${
                msg.role === 'ai'
                  ? 'bg-slate-800/80 border-slate-700 text-slate-100 rounded-2xl rounded-tl-none'
                  : 'bg-purple-600/30 border-purple-500/40 text-slate-100 rounded-2xl rounded-tr-none'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {showAdvanced && msg.tokenUsage && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-3 text-xs text-slate-500">
                    <span>📥 {msg.tokenUsage.prompt_tokens}</span>
                    <span>📤 {msg.tokenUsage.completion_tokens}</span>
                    <span>⏱ {(msg.tokenUsage.response_time_ms / 1000).toFixed(1)}с</span>
                    {msg.tokenUsage.is_estimated && <span className="text-yellow-600/60">~оценка</span>}
                  </div>
                )}
              </div>
            </div>
            {msg.role === 'ai' && msg.followups && msg.followups.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 ml-11">
                {msg.followups.map((fq, fi) => (
                  <button key={fi} onClick={() => handleSend(fq)}
                    className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/30 hover:border-purple-400/50 rounded-full text-xs text-purple-300 hover:text-purple-200 transition-all">
                    💬 {fq}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-bold">AI</div>
            <div className="bg-slate-800/80 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              <span className="text-sm text-slate-400">Думаю...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-900/40">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <button onClick={() => setShowAdvanced(v => !v)}
            title="Advanced — статистика токенов"
            className={`flex-shrink-0 px-3 py-2.5 border rounded-xl text-xs font-medium transition-all ${showAdvanced ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/8'}`}>
            ⚗ Advanced
          </button>
          <div className="relative flex-1">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Задайте вопрос…"
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl py-3 pl-4 pr-24 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm" />
            {/* Mic button */}
            <button onClick={startVoiceInput} title={isRecording ? 'Остановить' : 'Голосовой ввод (нажмите)'}
              className={`absolute right-10 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isRecording ? 'bg-red-600 animate-pulse' : 'text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}>
              <svg className="w-4 h-4" fill={isRecording ? 'white' : 'none'} stroke={isRecording ? 'white' : 'currentColor'} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </div>
        {sessionStats.messageCount > 0 && (
          <div className="flex items-center gap-4 text-xs text-slate-600 mt-2 max-w-4xl mx-auto pl-[56px]">
            <span>Сессия: {sessionStats.totalTokens.toLocaleString()} токенов</span>
            <span>Запросов: {sessionStats.messageCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
