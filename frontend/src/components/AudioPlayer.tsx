'use client';

import React, { useState, useRef, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

const VOICES: Record<string, string> = {
  'ru-RU-DmitryNeural': 'Дмитрий (муж.)',
  'ru-RU-SvetlanaNeural': 'Светлана (жен.)',
  'ru-RU-DariyaNeural': 'Дарья (тёплая)',
  'ru-RU-AnatolyNeural': 'Анатолий (авт.)',
  'en-US-GuyNeural': 'Guy (англ.)',
  'en-US-JennyNeural': 'Jenny (англ.)',
  'en-GB-RyanNeural': 'Ryan (брит.)',
};
const TONES = ['научный', 'популярный', 'разговорный', 'деловой'];

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ docId }: { docId: string | null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);

  // Settings
  const [mode, setMode] = useState<'monologue' | 'dialogue'>('monologue');
  const [tone, setTone] = useState('научный');
  const [voice, setVoice] = useState('ru-RU-DmitryNeural');
  const [voiceB, setVoiceB] = useState('ru-RU-SvetlanaNeural');
  const [rate, setRate] = useState(0);   // -50 to +100, percent
  const [pitch, setPitch] = useState(0); // -20 to +20, Hz
  const [showSettings, setShowSettings] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    if (audioRef.current.duration)
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value);
    setProgress(pct);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (pct / 100) * audioRef.current.duration;
    }
  };

  const skip = (sec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + sec));
    }
  };

  const handleGenerate = async () => {
    if (!docId) return;
    setLoading(true);
    setAudioUrl(null);
    setScript(null);
    setProgress(0);
    setCurrentTime(0);
    try {
      const rateStr = `${rate >= 0 ? '+' : ''}${rate}%`;
      const pitchStr = `${pitch >= 0 ? '+' : ''}${pitch}Hz`;
      const res = await fetch(`${API}/api/podcast/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId, tone, voice, voice_b: voiceB, mode, rate: rateStr, pitch: pitchStr })
      });
      const json = await res.json();
      if (json.status === 'success' && json.data.audio_url) {
        setAudioUrl(`${API}${json.data.audio_url}`);
        setScript(json.data.script || null);
        setIsPlaying(true);
        setShowSettings(false);
      } else {
        alert('Ошибка генерации подкаста');
      }
    } catch {
      alert('Ошибка сети при генерации подкаста');
    } finally {
      setLoading(false);
    }
  };

  if (!docId) {
    return (
      <div className="w-full max-w-xl mx-auto flex items-center justify-center p-8 rounded-2xl border border-white/10 bg-white/5">
        <p className="text-slate-400 text-sm">Загрузите документ для генерации подкаста.</p>
      </div>
    );
  }

  const accentGradient = mode === 'dialogue'
    ? 'from-pink-500 via-purple-500 to-indigo-500'
    : 'from-purple-600 to-indigo-600';

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 bg-gradient-to-r ${accentGradient} bg-opacity-20`}
        style={{ background: mode === 'dialogue' ? 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(124,58,237,0.12))' : 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.12))' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-base">
              {mode === 'dialogue' ? '🎙 Диалог-подкаст' : '🎙 Монолог-подкаст'}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {mode === 'dialogue'
                ? `${VOICES[voice]} & ${VOICES[voiceB]}`
                : VOICES[voice]}
              {audioUrl && ` · ${tone}`}
            </p>
          </div>
          <div className="flex gap-2">
            {audioUrl && (
              <button onClick={() => setShowScript(v => !v)}
                className="text-xs px-2 py-1 rounded-lg border border-white/20 text-slate-300 hover:bg-white/10 transition-colors">
                {showScript ? 'Скрыть' : '📋 Текст'}
              </button>
            )}
            <button onClick={() => setShowSettings(v => !v)}
              className="text-xs px-2 py-1 rounded-lg border border-white/20 text-slate-300 hover:bg-white/10 transition-colors">
              ⚙
            </button>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-6 py-4 border-b border-white/10 bg-slate-900/40 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button onClick={() => setMode('monologue')}
              className="flex-1 py-2 text-xs rounded-lg border transition-all font-medium"
              style={{ background: mode === 'monologue' ? 'rgba(124,58,237,0.2)' : 'transparent', borderColor: mode === 'monologue' ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)', color: mode === 'monologue' ? '#a78bfa' : '#94a3b8' }}>
              🎤 Монолог
            </button>
            <button onClick={() => setMode('dialogue')}
              className="flex-1 py-2 text-xs rounded-lg border transition-all font-medium"
              style={{ background: mode === 'dialogue' ? 'rgba(236,72,153,0.15)' : 'transparent', borderColor: mode === 'dialogue' ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.1)', color: mode === 'dialogue' ? '#f9a8d4' : '#94a3b8' }}>
              🗣 Диалог (2 голоса)
            </button>
          </div>

          {/* Voices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">{mode === 'dialogue' ? 'Голос Алексей' : 'Голос'}</label>
              <select value={voice} onChange={e => setVoice(e.target.value)}
                className="w-full text-xs rounded-lg px-2 py-1.5 bg-slate-800 border border-white/10 text-slate-200">
                {Object.entries(VOICES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {mode === 'dialogue' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Голос Мария</label>
                <select value={voiceB} onChange={e => setVoiceB(e.target.value)}
                  className="w-full text-xs rounded-lg px-2 py-1.5 bg-slate-800 border border-white/10 text-slate-200">
                  {Object.entries(VOICES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Tone */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Стиль изложения</label>
            <div className="flex gap-1.5 flex-wrap">
              {TONES.map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className="text-xs px-2.5 py-1 rounded-full border transition-all"
                  style={{ background: tone === t ? 'rgba(124,58,237,0.2)' : 'transparent', borderColor: tone === t ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)', color: tone === t ? '#a78bfa' : '#64748b' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Rate & Pitch sliders */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 flex justify-between mb-1">
                <span>⚡ Скорость</span>
                <span className="text-slate-300">{rate >= 0 ? '+' : ''}{rate}%</span>
              </label>
              <input type="range" min={-50} max={100} value={rate} onChange={e => setRate(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer" />
            </div>
            <div>
              <label className="text-xs text-slate-400 flex justify-between mb-1">
                <span>🎵 Тон/Тембр</span>
                <span className="text-slate-300">{pitch >= 0 ? '+' : ''}{pitch}Hz</span>
              </label>
              <input type="range" min={-20} max={20} value={pitch} onChange={e => setPitch(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer" />
            </div>
          </div>
        </div>
      )}

      {/* Script panel */}
      {showScript && script && (
        <div className="px-6 py-4 border-b border-white/10 bg-slate-900/30 max-h-48 overflow-y-auto">
          <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Текст подкаста</p>
          {mode === 'dialogue' ? (
            // Render dialogue with colored names
            script.split('\n').filter(l => l.trim()).map((line, i) => {
              const isAlex = line.startsWith('[Алексей]');
              const isMaria = line.startsWith('[Мария]');
              return (
                <p key={i} className="text-xs leading-relaxed mb-2">
                  {(isAlex || isMaria) ? (
                    <>
                      <span style={{ color: isAlex ? '#a78bfa' : '#f9a8d4', fontWeight: 600 }}>
                        {isAlex ? 'Алексей' : 'Мария'}:{' '}
                      </span>
                      <span className="text-slate-300">{line.split(':').slice(1).join(':').trim()}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">{line}</span>
                  )}
                </p>
              );
            })
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{script}</p>
          )}
        </div>
      )}

      {/* Player body */}
      <div className="px-6 py-5">
        {audioUrl ? (
          <div className="space-y-4">
            {/* Seekbar */}
            <div className="space-y-1">
              <input type="range" min={0} max={100} step={0.1} value={progress} onChange={handleSeek}
                className="w-full accent-purple-500 cursor-pointer h-1" style={{ accentColor: '#8b5cf6' }} />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{fmtTime(currentTime)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-5">
              <button onClick={() => skip(-10)} className="text-slate-400 hover:text-white transition-colors text-xs flex flex-col items-center gap-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
                <span style={{ fontSize: '9px' }}>-10с</span>
              </button>

              <button onClick={() => setIsPlaying(v => !v)}
                className="w-14 h-14 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
                {isPlaying
                  ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" /></svg>
                  : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                }
              </button>

              <button onClick={() => skip(10)} className="text-slate-400 hover:text-white transition-colors text-xs flex flex-col items-center gap-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" /></svg>
                <span style={{ fontSize: '9px' }}>+10с</span>
              </button>
            </div>

            {/* Re-generate */}
            <button onClick={() => { setAudioUrl(null); setShowSettings(true); }}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1">
              ↺ Перегенерировать с другими настройками
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <svg className="w-8 h-8 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-slate-300 text-sm">
              {mode === 'dialogue' ? 'Генерирую диалог двух ведущих…' : 'Генерирую монолог…'}
            </p>
            <p className="text-slate-500 text-xs">Синтез речи Edge-TTS</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
              <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <button onClick={handleGenerate}
              className={`px-6 py-2.5 bg-gradient-to-r ${accentGradient} rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-lg`}>
              {mode === 'dialogue' ? '🗣 Создать диалог-подкаст' : '🎤 Создать монолог-подкаст'}
            </button>
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { setIsPlaying(false); setProgress(100); }}
        className="hidden"
      />
    </div>
  );
}
