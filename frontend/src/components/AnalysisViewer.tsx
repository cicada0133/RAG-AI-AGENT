'use client';

import React, { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

interface AnalysisSection {
  title: string;
  items: string[];
}

interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  response_time_ms?: number;
}

const SECTION_ICONS: Record<string, string> = {
  'Ключевые тезисы': '🎯',
  'Главные сущности': '🏢',
  'Финансовые показатели': '📊',
  'Риски и проблемы': '⚠️',
  'Выводы и рекомендации': '✅',
};

const SECTION_COLORS: Record<string, string> = {
  'Ключевые тезисы': 'border-purple-500/30 bg-purple-500/5',
  'Главные сущности': 'border-blue-500/30 bg-blue-500/5',
  'Финансовые показатели': 'border-green-500/30 bg-green-500/5',
  'Риски и проблемы': 'border-red-500/30 bg-red-500/5',
  'Выводы и рекомендации': 'border-emerald-500/30 bg-emerald-500/5',
};

const SECTION_TEXT: Record<string, string> = {
  'Ключевые тезисы': 'text-purple-400',
  'Главные сущности': 'text-blue-400',
  'Финансовые показатели': 'text-green-400',
  'Риски и проблемы': 'text-red-400',
  'Выводы и рекомендации': 'text-emerald-400',
};

export default function AnalysisViewer({ docId }: { docId: string | null }) {
  const [sections, setSections] = useState<AnalysisSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!docId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/analysis/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSections(data.sections || []);
        setTokenUsage(data.token_usage || null);
      } else {
        setError(data.detail || 'Ошибка анализа');
      }
    } catch {
      setError('Не удалось подключиться к бэкенду');
    }
    setLoading(false);
  };

  if (!docId) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-400 text-sm">Загрузите документ для анализа.</p>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative">
        <svg className="w-12 h-12 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-slate-200 font-medium">Анализирую документ...</p>
        <p className="text-slate-500 text-xs mt-1">Извлекаю сущности, риски, показатели</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-4xl">⚠️</div>
      <p className="text-red-400 text-sm">{error}</p>
      <button onClick={handleAnalyze} className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg text-sm text-purple-300">
        Повторить
      </button>
    </div>
  );

  if (sections.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="text-5xl">🔬</div>
      <div className="text-center">
        <h3 className="text-white font-semibold mb-1 text-lg">Анализ Документа</h3>
        <p className="text-slate-400 text-sm max-w-xs">Извлечение ключевых тезисов, сущностей, финансовых показателей, рисков и рекомендаций</p>
      </div>
      <button onClick={handleAnalyze}
        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity">
        Запустить Анализ
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
        <h2 className="text-white font-semibold text-lg">🔬 Анализ Документа</h2>
        <div className="flex items-center gap-3">
          {tokenUsage && (
            <div className="flex gap-3 text-xs text-slate-500">
              {tokenUsage.response_time_ms !== undefined && (
                <span>⏱ {(tokenUsage.response_time_ms / 1000).toFixed(1)}с</span>
              )}
              {tokenUsage.prompt_tokens && (
                <span>📥 {tokenUsage.prompt_tokens.toLocaleString()} токенов</span>
              )}
            </div>
          )}
          <button onClick={() => setSections([])}
            className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-300 transition-colors">
            Обновить
          </button>
        </div>
      </div>

      {/* Sections grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section, i) => {
            const icon = SECTION_ICONS[section.title] || '📋';
            const colorClass = SECTION_COLORS[section.title] || 'border-white/10 bg-white/5';
            const textClass = SECTION_TEXT[section.title] || 'text-slate-300';
            return (
              <div key={i} className={`border rounded-xl p-4 backdrop-blur-sm ${colorClass}`}>
                <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${textClass}`}>
                  <span>{icon}</span>
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-slate-300 text-sm">
                      <span className={`mt-0.5 flex-shrink-0 text-xs ${textClass}`}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
