'use client';

import React, { useState, useRef, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

interface Slide {
  id: number;
  layout: 'title' | 'bullets' | 'image' | 'quote' | 'end';
  title: string;
  subtitle: string;
  bullets: string[];
  accent: string;
  image_query: string;
  speaker_notes: string;
}

const ACCENT_GRADIENTS: Record<string, string> = {
  blue:   'from-blue-900 via-blue-800/70 to-slate-900',
  purple: 'from-purple-900 via-purple-800/70 to-slate-900',
  green:  'from-emerald-900 via-emerald-800/70 to-slate-900',
  red:    'from-red-900 via-red-800/70 to-slate-900',
  orange: 'from-orange-900 via-orange-800/70 to-slate-900',
  teal:   'from-teal-900 via-teal-800/70 to-slate-900',
};

const ACCENT_LIGHT: Record<string, string> = {
  blue: '#60a5fa', purple: '#a78bfa', green: '#34d399',
  red: '#f87171', orange: '#fb923c', teal: '#2dd4bf',
};

function SlideImage({ query, className }: { query: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const seed = query.replace(/\s+/g, '-').toLowerCase();
  // Use Unsplash Source API (free, no key needed)
  const src = `https://source.unsplash.com/800x500/?${encodeURIComponent(query)}&sig=${Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0))}`;

  if (error) return (
    <div className={`${className} flex items-center justify-center bg-slate-800/60 border border-white/10 text-slate-500 text-xs`}>
      🖼 {query}
    </div>
  );

  return (
    <div className={`${className} relative overflow-hidden bg-slate-800/60`}>
      {!loaded && <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs animate-pulse">Загрузка изображения...</div>}
      <img src={src} alt={query} className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)} onError={() => setError(true)} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
}

function SlideRenderer({ slide, editing, onEditField }: {
  slide: Slide;
  editing: boolean;
  onEditField: (field: string, value: string | string[]) => void;
}) {
  const grad = ACCENT_GRADIENTS[slide.accent] || ACCENT_GRADIENTS.purple;
  const ac = ACCENT_LIGHT[slide.accent] || '#a78bfa';

  const T = ({ value, field, cls, rows = 2 }: { value: string; field: string; cls: string; rows?: number }) =>
    editing ? (
      <textarea defaultValue={value} className={`${cls} bg-black/40 border border-white/30 rounded px-2 py-1 resize-none w-full outline-none focus:border-white/60`}
        onChange={e => onEditField(field, e.target.value)} rows={rows} />
    ) : <span className={cls}>{value}</span>;

  return (
    <div className={`w-full h-full bg-gradient-to-br ${grad} relative overflow-hidden flex flex-col`}>
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: ac }} />
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ac} 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />
      <div className="absolute bottom-4 right-5 text-white/25 text-xs font-mono">{slide.id}</div>

      {/* ── TITLE ── */}
      {slide.layout === 'title' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-16 py-12">
          <div className="w-12 h-1 mb-8 rounded-full" style={{ background: ac }} />
          <T value={slide.title} field="title" cls="text-white font-bold text-4xl leading-tight" rows={3} />
          {slide.subtitle && <T value={slide.subtitle} field="subtitle" cls="text-white/65 text-lg mt-4" rows={2} />}
        </div>
      )}

      {/* ── BULLETS ── */}
      {slide.layout === 'bullets' && (
        <div className="flex-1 flex flex-col px-12 py-10">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: ac }} />
            <T value={slide.title} field="title" cls="text-white font-bold text-2xl leading-tight" rows={2} />
          </div>
          <ul className="flex-1 space-y-4">
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: ac }} />
                {editing ? (
                  <input defaultValue={b} className="flex-1 bg-black/40 border border-white/20 rounded px-2 py-1 text-white/90 text-base outline-none"
                    onChange={e => { const n = [...slide.bullets]; n[i] = e.target.value; onEditField('bullets', n); }} />
                ) : <span className="text-white/90 text-base">{b}</span>}
              </li>
            ))}
            {editing && (
              <li>
                <button onClick={() => onEditField('bullets', [...slide.bullets, ''])}
                  className="ml-5 text-xs px-3 py-1 border border-white/20 rounded text-white/40 hover:text-white/70 transition-colors">
                  + Добавить пункт
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ── IMAGE ── */}
      {slide.layout === 'image' && (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-10 pt-8 pb-4 flex-shrink-0">
            <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ background: ac }} />
            <T value={slide.title} field="title" cls="text-white font-bold text-2xl" rows={2} />
          </div>
          {/* Main: image + bullets side by side */}
          <div className="flex-1 flex gap-0 overflow-hidden px-10 pb-8 gap-6">
            <SlideImage query={slide.image_query || slide.title} className="flex-1 rounded-xl" />
            {slide.bullets.length > 0 && (
              <ul className="w-56 flex-shrink-0 space-y-3 flex flex-col justify-center">
                {slide.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ac }} />
                    {editing ? (
                      <input defaultValue={b} className="flex-1 bg-black/30 border border-white/20 rounded px-1 py-0.5 text-white/85 text-sm outline-none"
                        onChange={e => { const n = [...slide.bullets]; n[i] = e.target.value; onEditField('bullets', n); }} />
                    ) : <span className="text-white/85 text-sm">{b}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── QUOTE ── */}
      {slide.layout === 'quote' && (
        <div className="flex-1 flex flex-col items-center justify-center px-16 py-12 text-center">
          <div className="text-6xl mb-6 opacity-40" style={{ color: ac }}>"</div>
          <T value={slide.bullets[0] || ''} field="quote_text" cls="text-white/90 text-xl italic leading-relaxed" rows={4} />
          <div className="mt-8 w-24 h-0.5 mx-auto" style={{ background: ac }} />
          <T value={slide.title} field="title" cls="text-white/55 text-sm mt-4 uppercase tracking-widest" />
        </div>
      )}

      {/* ── END ── */}
      {slide.layout === 'end' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-16 py-12">
          <div className="text-5xl mb-6">🎯</div>
          <T value={slide.title} field="title" cls="text-white font-bold text-4xl leading-tight" rows={3} />
          {slide.subtitle && <T value={slide.subtitle} field="subtitle" cls="text-white/65 text-lg mt-4" rows={2} />}
        </div>
      )}
    </div>
  );
}

export default function PresentationViewer({ docId }: { docId: string | null }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [slideCount, setSlideCount] = useState(8);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as Element)?.tagName === 'INPUT' || (e.target as Element)?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrentIdx(i => Math.min(i + 1, slides.length - 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCurrentIdx(i => Math.max(i - 1, 0));
      if (e.key === 'Escape') setEditingSlide(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slides.length]);

  const handleGenerate = async () => {
    if (!docId) return;
    setLoading(true);
    setSlides([]);
    try {
      const res = await fetch(`${API}/api/presentation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId, slide_count: slideCount }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSlides(data.slides);
        setTitle(data.title);
        setCurrentIdx(0);
        setEditingSlide(null);
      }
    } catch {}
    setLoading(false);
  };

  const handleEditField = (slideIdx: number, field: string, value: string | string[]) => {
    setSlides(prev => prev.map((s, i) => i === slideIdx ? { ...s, [field]: value } : s));
  };

  // *** BUG FIX: was using editingSlide === null check, now always uses currentIdx ***
  const handleAiEdit = async () => {
    if (!aiInstruction.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch(`${API}/api/presentation/edit-slide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: docId,
          slides,
          slide_index: currentIdx, // always use currentIdx, not editingSlide
          instruction: aiInstruction,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSlides(prev => prev.map((s, i) => i === currentIdx ? { ...data.slide, id: s.id } : s));
        setAiInstruction('');
      } else {
        setAiError(data.detail || 'Ошибка изменения слайда');
      }
    } catch {
      setAiError('Не удалось подключиться к серверу');
    }
    setAiLoading(false);
  };

  const handleExportHTML = () => {
    const content = slides.map((s, i) => {
      const isImage = s.layout === 'image' && s.image_query;
      return `
      <section style="page-break-after:always;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:linear-gradient(135deg,#1e1b4b,#0f172a);padding:60px;font-family:system-ui;color:white;text-align:${isImage ? 'left' : 'center'};">
        <h2 style="color:#a78bfa;font-size:2rem;margin-bottom:1rem;">${s.title}</h2>
        ${s.subtitle ? `<p style="color:#94a3b8;font-size:1.1rem;margin-bottom:1.5rem">${s.subtitle}</p>` : ''}
        ${isImage ? `<img src="https://source.unsplash.com/800x400/?${encodeURIComponent(s.image_query)}" style="max-width:100%;height:300px;object-fit:cover;border-radius:8px;margin-bottom:1rem;" loading="lazy"/>` : ''}
        ${s.bullets.length ? `<ul style="color:#e2e8f0;list-style:none;padding:0;text-align:left;">${s.bullets.map(b => `<li style="margin-bottom:.7rem">• ${b}</li>`).join('')}</ul>` : ''}
        <p style="position:fixed;bottom:1rem;right:1.5rem;color:#475569;font-size:.75rem;">${i + 1}/${slides.length}</p>
      </section>`;
    }).join('');
    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>${title}</title><style>@media print{section{page-break-after:always}}body{margin:0}</style></head><body style="background:#0f172a">${content}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title.replace(/[\/\\:*?"<>|]/g, '_')}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (!docId) return (
    <div className="flex items-center justify-center h-full"><p className="text-slate-400 text-sm">Загрузите документ для создания презентации.</p></div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-5xl animate-bounce">📊</div>
      <p className="text-white font-medium">Создаю презентацию...</p>
      <p className="text-slate-400 text-sm">AI генерирует слайды, подбирает изображения</p>
    </div>
  );

  if (slides.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-6xl">🎬</div>
      <div className="text-center">
        <h3 className="text-white font-bold text-xl mb-2">AI Презентация</h3>
        <p className="text-slate-400 text-sm max-w-xs">AI создаст профессиональные слайды с изображениями, темами и структурой. После — правь текст или скажи AI что изменить на конкретном слайде.</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Слайдов:</label>
          <select value={slideCount} onChange={e => setSlideCount(+e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 text-sm">
            {[5, 6, 7, 8, 10, 12, 15].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={handleGenerate}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity">
          🎬 Создать Презентацию
        </button>
      </div>
    </div>
  );

  const current = slides[currentIdx];
  const isEditing = editingSlide === currentIdx;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-slate-900/40 flex-shrink-0 flex-wrap">
        <h2 className="text-white font-semibold text-sm truncate max-w-xs">{title}</h2>
        <span className="text-slate-500 text-xs flex-shrink-0">{currentIdx + 1}/{slides.length}</span>
        <div className="flex-1" />
        <button onClick={() => setEditingSlide(isEditing ? null : currentIdx)}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${isEditing ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}>
          {isEditing ? '✓ Готово' : '✏ Редактировать'}
        </button>
        <button onClick={handleExportHTML} className="px-3 py-1.5 rounded-lg text-xs bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30">
          💾 HTML
        </button>
        <button onClick={handleGenerate} className="px-3 py-1.5 rounded-lg text-xs bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30">
          ↺ Пересоздать
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Thumbnails */}
        <div className="w-28 border-r border-white/10 overflow-y-auto flex-shrink-0 bg-black/30 p-1.5 space-y-1.5">
          {slides.map((s, i) => (
            <button key={i} onClick={() => setCurrentIdx(i)}
              className={`w-full aspect-video rounded overflow-hidden border-2 transition-all block ${i === currentIdx ? 'border-purple-400 ring-1 ring-purple-500/30' : 'border-white/10 hover:border-white/25'}`}>
              <div className={`w-full h-full bg-gradient-to-br ${ACCENT_GRADIENTS[s.accent] || ACCENT_GRADIENTS.purple} flex flex-col p-1.5 relative`}>
                {s.image_query && s.layout === 'image' && (
                  <div className="absolute inset-0 opacity-30">
                    <img src={`https://source.unsplash.com/120x70/?${encodeURIComponent(s.image_query)}`}
                      className="w-full h-full object-cover" alt="" loading="lazy" />
                  </div>
                )}
                <div className="relative text-white text-[5px] font-bold leading-tight truncate">{s.title}</div>
                <div className="relative mt-0.5" style={{ width: '70%', height: '2px', background: ACCENT_LIGHT[s.accent] || '#a78bfa', borderRadius: '1px' }} />
              </div>
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Slide canvas */}
          <div className="flex-1 p-5 min-h-0">
            <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <SlideRenderer
                slide={current}
                editing={isEditing}
                onEditField={(field, val) => handleEditField(currentIdx, field, val)}
              />
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex-shrink-0 border-t border-white/10 bg-slate-900/60 p-3 space-y-2">
            {/* Navigation dots */}
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentIdx(i => Math.max(i - 1, 0))} disabled={currentIdx === 0}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300 disabled:opacity-30">← Назад</button>
              <div className="flex-1 flex justify-center gap-1 overflow-x-hidden">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrentIdx(i)}
                    className={`h-2 rounded-full transition-all ${i === currentIdx ? 'w-5 bg-purple-400' : 'w-2 bg-white/20 hover:bg-white/40'}`} />
                ))}
              </div>
              <button onClick={() => setCurrentIdx(i => Math.min(i + 1, slides.length - 1))} disabled={currentIdx === slides.length - 1}
                className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300 disabled:opacity-30">Вперёд →</button>
            </div>

            {/* AI edit — FIXED: always targets currentIdx */}
            <div className="flex gap-2 items-center">
              <span className="flex-shrink-0 text-xs text-slate-500">💬 AI: слайд {currentIdx + 1}</span>
              <input value={aiInstruction} onChange={e => { setAiInstruction(e.target.value); setAiError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAiEdit()}
                placeholder={`Скажи AI что изменить на слайде ${currentIdx + 1}...`}
                className="flex-1 bg-slate-800/70 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50" />
              <button onClick={handleAiEdit} disabled={aiLoading || !aiInstruction.trim()}
                className="flex-shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/40 rounded-lg text-white text-xs transition-colors min-w-[80px] text-center">
                {aiLoading ? <span className="animate-pulse">...</span> : '« Изменить'}
              </button>
            </div>
            {aiError && <p className="text-red-400 text-xs pl-2">{aiError}</p>}
            {current.speaker_notes && (
              <p className="text-xs text-slate-600 italic truncate">📝 {current.speaker_notes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
