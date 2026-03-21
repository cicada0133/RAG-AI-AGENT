'use client';

import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

const VOICES = [
  { id: 'ru-RU-DmitryNeural', label: 'Дмитрий (муж.)' },
  { id: 'ru-RU-SvetlanaNeural', label: 'Светлана (жен.)' },
  { id: 'ru-RU-DariyaNeural', label: 'Дарья (жен., тёплый)' },
];

// Pre-filled API base URL hints per known provider
const API_PRESETS = [
  { label: 'Gemini (Google)', base: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-2.0-flash' },
  { label: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'mistralai/mistral-small' },
  { label: 'Другой...', base: '', model: '' },
];

interface SettingsPanelProps {
  onVoiceChange: (voice: string) => void;
  selectedVoice: string;
}

export default function SettingsPanel({ onVoiceChange, selectedVoice }: SettingsPanelProps) {
  const [models, setModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [apiBase, setApiBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [mode, setMode] = useState<'local' | 'api'>('local');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/settings/models`)
      .then(r => r.json())
      .then(d => {
        setModels(d.models || []);
        setCurrentModel(d.current || '');
      })
      .catch(() => {});
  }, []);

  const handlePreset = (idx: number) => {
    setPreset(idx);
    setApiBase(API_PRESETS[idx].base);
    if (API_PRESETS[idx].model) setCurrentModel(API_PRESETS[idx].model);
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (mode === 'local') {
        body.model_name = currentModel;
        body.api_base = 'http://ollama:11434/v1';
        body.api_key = 'ollama';
      } else {
        body.api_base = apiBase;
        body.api_key = apiKey;
        body.model_name = currentModel;
      }
      await fetch(`${API}/api/settings/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl backdrop-blur-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-slate-300 uppercase tracking-wider hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Настройки AI
        </span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
          {/* Mode toggle: 2 options only */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Источник модели</label>
            <div className="flex gap-1 bg-black/20 rounded-lg p-1">
              <button onClick={() => setMode('local')}
                className={`flex-1 text-xs py-1.5 rounded-md transition-all ${mode === 'local' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                🖥 Локально
              </button>
              <button onClick={() => setMode('api')}
                className={`flex-1 text-xs py-1.5 rounded-md transition-all ${mode === 'api' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                🌐 API
              </button>
            </div>
          </div>

          {/* Local: Ollama model dropdown */}
          {mode === 'local' && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Модель (Ollama)</label>
              <select value={currentModel} onChange={e => setCurrentModel(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500">
                {models.length > 0 ? models.map(m => (
                  <option key={m} value={m}>{m}</option>
                )) : <option value={currentModel}>{currentModel || 'qwen2.5:7b'}</option>}
              </select>
              <p className="text-xs text-slate-600 mt-1">Запущен локально через Ollama</p>
            </div>
          )}

          {/* API: provider presets + URL + key + model */}
          {mode === 'api' && (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Провайдер</label>
                <select value={preset} onChange={e => handlePreset(Number(e.target.value))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500">
                  {API_PRESETS.map((p, i) => (
                    <option key={i} value={i}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">API URL</label>
                <input value={apiBase} onChange={e => setApiBase(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">API Key</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-... / AIza..."
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Модель</label>
                <input value={currentModel} onChange={e => setCurrentModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>
            </>
          )}

          {/* Voice */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Голос подкаста</label>
            <select value={selectedVoice} onChange={e => onVoiceChange(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500">
              {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>

          <button onClick={handleApply} disabled={saving}
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? 'Применяю...' : saved ? '✓ Применено!' : 'Применить'}
          </button>
        </div>
      )}
    </div>
  );
}
