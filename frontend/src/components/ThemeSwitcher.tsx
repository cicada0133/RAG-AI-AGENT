'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme, THEMES, type Theme, type ThemeId } from '@/contexts/ThemeContext';

const ACCENT_PRESETS = [
  { label: 'По умолчанию', color: '' },
  { label: 'Синий', color: '#2563eb' },
  { label: 'Зелёный', color: '#16a34a' },
  { label: 'Красный', color: '#dc2626' },
  { label: 'Оранжевый', color: '#ea580c' },
  { label: 'Розовый', color: '#db2777' },
];

function MiniThemeCard({ theme, isActive, onClick }: { theme: Theme; isActive: boolean; onClick: () => void }) {
  const isCyber = theme.id === 'cyber';
  const isXP = theme.id === 'xp';
  const isCi = theme.id === 'centrinvest';
  return (
    <button onClick={onClick}
      style={{
        border: isActive ? `2px solid ${theme.preview.accent}` : `1px solid ${theme.preview.border}`,
        borderRadius: isXP ? '2px' : isCyber ? '0' : '8px',
        overflow: 'hidden', background: 'transparent', padding: 0, cursor: 'pointer', outline: 'none',
        boxShadow: isActive ? `0 0 0 2px ${theme.preview.accent}55` : 'none',
        transition: 'transform 0.15s', width: '100%',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{ background: theme.preview.bg, padding: '6px 8px', minHeight: '52px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: theme.preview.accent, flexShrink: 0 }} />
          <span style={{ fontSize: '8px', fontWeight: 'bold', color: theme.preview.text, fontFamily: isXP ? 'Tahoma' : isCyber ? 'Courier New' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isCi ? 'ЦентрАИ' : theme.name}
          </span>
          {isActive && (
            <span style={{ marginLeft: 'auto', fontSize: '7px', background: theme.preview.accent, color: '#fff', padding: '1px 3px', borderRadius: '2px', flexShrink: 0 }}>✓</span>
          )}
        </div>
        <div style={{ fontSize: '7px', color: theme.preview.text, opacity: 0.6 }}>
          {theme.description.slice(0, 30)}…
        </div>
      </div>
    </button>
  );
}

export default function ThemeSwitcher() {
  const { theme, setTheme, allThemes, workspace, setWorkspace } = useTheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'themes' | 'customize'>('themes');
  const ref = useRef<HTMLDivElement>(null);

  const isXP = theme.id === 'xp';
  const isCyber = theme.id === 'cyber';
  const isCi = theme.id === 'centrinvest';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Styles
  const dropdownBg = isXP ? '#ece9d8' : isCyber ? '#0a0a0a' : isCi ? '#fff' : '#0f0c1e';
  const dropdownBorder = isXP ? '2px solid #919b9c' : isCyber ? '1px solid rgba(0,255,170,0.5)' : isCi ? '1px solid #d0d0d0' : '1px solid rgba(255,255,255,0.12)';
  const textColor = isXP ? '#000' : isCyber ? '#00ffaa' : isCi ? '#1a1a1a' : '#e2e8f0';
  const mutedColor = isXP ? '#666' : isCyber ? '#00aa77' : isCi ? '#666' : '#64748b';
  const fontFamily = isXP ? 'Tahoma, Arial' : isCyber ? 'Courier New' : isCi ? 'Arial, sans-serif' : 'inherit';
  const btnBg = isCi ? '#3d9900' : isXP ? 'linear-gradient(180deg,#e8e8e8,#d4d0c8)' : isCyber ? 'rgba(0,255,170,0.08)' : 'rgba(255,255,255,0.08)';
  const btnBorder = isXP ? '2px solid' : isCyber ? '1px solid rgba(0,255,170,0.4)' : isCi ? '1px solid #3d9900' : '1px solid rgba(255,255,255,0.15)';
  const btnText = isCi ? '#fff' : isXP ? '#000' : isCyber ? '#00ffaa' : '#e2e8f0';
  const btnRadius = isXP ? '2px' : isCyber ? '0' : isCi ? '6px' : '8px';
  const activeAccent = isCi ? 'rgba(61,153,0,0.15)' : isCyber ? 'rgba(0,255,170,0.15)' : isXP ? 'rgba(10,36,106,0.1)' : 'rgba(139,92,246,0.2)';
  const activeBorderColor = isCi ? '#3d9900' : isCyber ? 'rgba(0,255,170,0.5)' : isXP ? '#7f9db9' : 'rgba(139,92,246,0.4)';
  const activeColor = isCi ? '#3d9900' : isCyber ? '#00ffaa' : isXP ? '#0a246a' : '#a78bfa';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: btnBg, border: btnBorder,
          borderColor: isXP ? (open ? '#7f9db9' : '#fff #aca899 #aca899 #fff') : undefined,
          borderRadius: btnRadius, padding: isXP ? '2px 10px' : '5px 12px',
          color: btnText, fontSize: isXP ? '11px' : '12px', fontFamily,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          boxShadow: isXP ? '1px 1px 0 #000' : 'none',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/>
        </svg>
        {isXP ? 'Тема ▾' : isCyber ? '[TEMA]' : isCi ? '🌿 Тема' : 'Тема'}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: dropdownBg, border: dropdownBorder,
          borderRadius: isXP ? '0' : isCyber ? '0' : '12px',
          padding: '12px', width: '480px', maxWidth: '95vw',
          boxShadow: isXP ? '3px 3px 6px rgba(0,0,0,0.4)' : isCyber ? '0 0 20px rgba(0,255,170,0.15)' : '0 12px 40px rgba(0,0,0,0.6)',
          zIndex: 9999,
          animation: 'fadeSlideIn 0.15s ease',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', borderBottom: `1px solid ${isCi ? '#e5e5e5' : isCyber ? 'rgba(0,255,170,0.2)' : isXP ? '#919b9c' : 'rgba(255,255,255,0.08)'}`, paddingBottom: '8px' }}>
            {(['themes', 'customize'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? activeAccent : 'transparent',
                border: `1px solid ${tab === t ? activeBorderColor : 'transparent'}`,
                borderRadius: btnRadius, padding: '3px 10px', fontSize: '11px',
                color: tab === t ? activeColor : mutedColor,
                cursor: 'pointer', fontFamily, transition: 'all 0.12s',
              }}>
                {t === 'themes' ? '🎨 Темы' : '⚙ Настройки'}
              </button>
            ))}
            <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: mutedColor, cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>

          {/* Themes grid 2x2 */}
          {tab === 'themes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {allThemes.map(t => (
                <MiniThemeCard key={t.id} theme={t} isActive={theme.id === t.id}
                  onClick={() => { setTheme(t.id as ThemeId); setOpen(false); }} />
              ))}
            </div>
          )}

          {/* Customize */}
          {tab === 'customize' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: textColor, marginBottom: '6px', fontFamily }}>Цвет акцента</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {ACCENT_PRESETS.map(p => (
                    <button key={p.label} onClick={() => setWorkspace({ accentColor: p.color })} title={p.label}
                      style={{ width: p.color ? '22px' : 'auto', height: '22px', padding: p.color ? 0 : '0 8px', background: p.color || (isCi ? '#f5f5f5' : 'rgba(255,255,255,0.08)'), border: `2px solid ${workspace.accentColor === p.color ? (isCi ? '#3d9900' : '#6366f1') : 'transparent'}`, borderRadius: p.color ? '50%' : btnRadius, cursor: 'pointer', fontSize: '9px', color: textColor, fontFamily, transition: 'all 0.12s' }}>
                      {!p.color && 'Авто'}
                    </button>
                  ))}
                  <input type="color" value={workspace.accentColor || '#7c3aed'} onChange={e => setWorkspace({ accentColor: e.target.value })}
                    style={{ width: '22px', height: '22px', padding: '1px', border: '2px solid transparent', borderRadius: '50%', cursor: 'pointer', background: 'none' }} />
                </div>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: textColor, marginBottom: '6px', fontFamily }}>Размер текста</p>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {(['sm', 'md', 'lg'] as const).map(sz => (
                    <button key={sz} onClick={() => setWorkspace({ fontSize: sz })}
                      style={{ padding: '3px 10px', background: workspace.fontSize === sz ? activeAccent : 'transparent', border: `1px solid ${workspace.fontSize === sz ? activeBorderColor : 'transparent'}`, borderRadius: btnRadius, fontSize: sz === 'sm' ? '9px' : sz === 'md' ? '11px' : '13px', color: workspace.fontSize === sz ? activeColor : textColor, cursor: 'pointer', fontFamily }}>
                      {sz === 'sm' ? 'A' : sz === 'md' ? 'A' : 'A'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: textColor, fontFamily }}>Боковая панель</span>
                <button onClick={() => setWorkspace({ sidebarVisible: !workspace.sidebarVisible })}
                  style={{ padding: '3px 10px', background: workspace.sidebarVisible ? activeAccent : 'transparent', border: `1px solid ${workspace.sidebarVisible ? activeBorderColor : (isCi ? '#d0d0d0' : 'rgba(255,255,255,0.15)')}`, borderRadius: btnRadius, fontSize: '10px', color: workspace.sidebarVisible ? activeColor : mutedColor, cursor: 'pointer', fontFamily }}>
                  {workspace.sidebarVisible ? '✓ Видима' : '✗ Скрыта'}
                </button>
              </div>
              <button onClick={() => setWorkspace({ accentColor: '', fontSize: 'md', sidebarVisible: true })}
                style={{ alignSelf: 'flex-start', padding: '3px 10px', background: 'transparent', border: `1px solid ${isCi ? '#d0d0d0' : 'rgba(255,255,255,0.1)'}`, borderRadius: btnRadius, fontSize: '10px', color: mutedColor, cursor: 'pointer', fontFamily }}>
                Сбросить
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
