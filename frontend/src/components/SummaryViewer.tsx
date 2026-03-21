'use client';

import React, { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

export default function SummaryViewer({ docId }: { docId: string | null }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleGenerate = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/summary/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId }),
      });
      const data = await res.json();
      if (data.status === 'success') setSummary(data.summary);
    } catch {
      setSummary('Ошибка при генерации резюме.');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = async () => {
    if (!docId) return;
    setExporting(true);
    try {
      const res = await fetch(`${API}/api/export/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId }),
      });
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${docId.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Ошибка экспорта CSV');
    }
    setExporting(false);
  };

  if (!docId) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-400 text-sm">Загрузите документ для генерации резюме.</p>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <svg className="w-8 h-8 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <p className="text-slate-300 text-sm">Генерирую официальное резюме...</p>
    </div>
  );

  if (!summary) return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 text-3xl">📄</div>
      <div className="text-center">
        <h3 className="text-white font-semibold mb-1">Официальное Резюме</h3>
        <p className="text-slate-400 text-sm">Ключевые тезисы, выводы и рекомендации</p>
      </div>
      <div className="flex gap-3">
        <button onClick={handleGenerate}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity">
          Сгенерировать Резюме
        </button>
        <button onClick={handleExportCsv} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm text-green-300 transition-colors disabled:opacity-50">
          {exporting ? '⏳' : '📊'} Экспорт CSV
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-white font-semibold text-lg">Официальное Резюме</h2>
        <div className="flex gap-2">
          <button onClick={handleExportCsv} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-xs text-green-300 transition-colors disabled:opacity-50">
            {exporting ? '⏳ Экспорт...' : '📊 CSV'}
          </button>
          <button onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 transition-colors">
            {copied ? '✓ Скопировано' : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Копировать
              </>
            )}
          </button>
          <button onClick={() => setSummary(null)}
            className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-xs text-purple-300 transition-colors">
            Обновить
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-black/20 rounded-xl p-5 border border-white/10">
        <div className="prose prose-invert prose-sm max-w-none">
          {summary.split('\n').map((line, i) => {
            if (line.startsWith('## ')) return <h2 key={i} className="text-purple-300 font-semibold text-base mt-4 mb-2 first:mt-0">{line.slice(3)}</h2>;
            if (line.startsWith('# ')) return <h1 key={i} className="text-white font-bold text-lg mt-4 mb-2 first:mt-0">{line.slice(2)}</h1>;
            if (line.startsWith('- ') || line.startsWith('● ')) return <li key={i} className="text-slate-300 text-sm ml-4 mb-1 list-disc">{line.slice(2)}</li>;
            if (line.trim() === '') return <div key={i} className="h-2" />;
            return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
