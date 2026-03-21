'use client';

import React, { useState, useRef } from 'react';
import ChatLayout from '@/components/ChatLayout';
import FlowGraph from '@/components/FlowGraph';
import AudioPlayer from '@/components/AudioPlayer';
import SettingsPanel from '@/components/SettingsPanel';
import SummaryViewer from '@/components/SummaryViewer';
import FlashcardsViewer from '@/components/FlashcardsViewer';
import AnalysisViewer from '@/components/AnalysisViewer';
import PresentationViewer from '@/components/PresentationViewer';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useTheme } from '@/contexts/ThemeContext';
import { useChatSessions } from '@/contexts/ChatSessionContext';


const TABS = [
  { id: 'chat',         label: '\u{1F4AC} \u0427\u0430\u0442' },
  { id: 'analysis',    label: '\u{1F52C} \u0410\u043D\u0430\u043B\u0438\u0437' },
  { id: 'summary',     label: '\u{1F4C4} \u0418\u0437\u043B\u043E\u0436\u0435\u043D\u0438\u0435' },
  { id: 'presentation',label: '\u{1F4CA} \u041F\u0440\u0435\u0437\u0435\u043D\u0442\u0430\u0446\u0438\u044F' },
  { id: 'mindmap',     label: '\u{1F5FA} \u041A\u0430\u0440\u0442\u0430 \u0437\u043D\u0430\u043D\u0438\u0439' },
  { id: 'podcast',     label: '\u{1F3D9} \u041F\u043E\u0434\u043A\u0430\u0441\u0442' },
  { id: 'flashcards',  label: '\u{1F0CF} \u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0438' },
];


export default function Home() {
  const { theme, workspace } = useTheme();
  const isXP = theme.id === 'xp';
  const isCyber = theme.id === 'cyber';
  const isCi = theme.id === 'centrinvest';
  const { sessions, activeSessionId, activeSession, createSession, deleteSession, switchSession, updateSession } = useChatSessions();

  // Derive docId from active session — changes automatically when switching chats
  const docId = activeSession.docId;
  const docFilename = activeSession.docFilename;

  const [activeTab, setActiveTab] = useState('chat');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('ru-RU-DmitryNeural');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/api/documents/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        updateSession(activeSessionId, { docId: data.doc_id, docFilename: file.name });
      } else alert('Ошибка: ' + data.detail);
    } catch { alert('Не удалось подключиться к бэкенду'); }
    finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearDoc = () => updateSession(activeSessionId, { docId: null, docFilename: null });


  const renderContent = () => {
    switch (activeTab) {
      case 'chat':         return <ChatLayout docId={docId} />;
      case 'analysis':     return <AnalysisViewer docId={docId} />;
      case 'summary':      return <SummaryViewer docId={docId} />;
      case 'presentation': return <PresentationViewer docId={docId} />;
      case 'mindmap':      return <div className="w-full h-full"><FlowGraph docId={docId} /></div>;
      case 'podcast':      return <div className="flex items-center justify-center h-full p-6"><AudioPlayer docId={docId} /></div>;
      case 'flashcards':   return <FlashcardsViewer docId={docId} />;
      default: return null;
    }
  };

  // ── Centrinvest Bank Theme ──────────────────────────────
  if (isCi) {
    const CIG = '#3d9900';
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Arial, Helvetica, sans-serif', color: '#1a1a1a' }}>
        <header style={{ background: '#fff', borderBottom: `3px solid ${CIG}`, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '22px' }}>🌿</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: CIG, letterSpacing: '0.5px' }}>БАНК ЦЕНТР-ИНВЕСТ</div>
                <div style={{ fontSize: '10px', color: '#888' }}>AI ПЛАТФОРМА</div>
              </div>
            </div>
            <nav style={{ display: 'flex', flex: 1, height: '60px', overflowX: 'auto' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className="theme-btn"
                  style={{ background: 'none', border: 'none', borderBottom: activeTab === t.id ? `3px solid ${CIG}` : '3px solid transparent', padding: '0 12px', height: '60px', fontSize: '12px', color: activeTab === t.id ? CIG : '#555', fontWeight: activeTab === t.id ? '700' : '400', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: 'Arial' }}>
                  {t.label}
                </button>
              ))}
            </nav>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.docx,.txt" />
              <button onClick={() => fileInputRef.current?.click()} className="theme-btn"
                style={{ border: `1px solid ${CIG}`, borderRadius: '4px', padding: '6px 14px', fontSize: '12px', color: CIG, background: 'none', cursor: 'pointer', fontFamily: 'Arial', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = CIG; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = CIG; }}>
                {isUploading ? '⏳' : '📂 Открыть'}
              </button>
              <ThemeSwitcher />
            </div>
          </div>
        </header>
        {docId && (
          <div style={{ background: '#e8f5e0', borderBottom: '1px solid #c8e6b0', padding: '6px 20px', fontSize: '12px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: CIG, fontWeight: 'bold' }}>✓</span>
              <span>Активный документ: <strong>{docFilename}</strong></span>
              <button onClick={handleClearDoc} className="theme-btn" style={{ marginLeft: 'auto', background: 'none', border: '1px solid #ccc', borderRadius: '3px', padding: '2px 8px', fontSize: '11px', color: '#888', cursor: 'pointer', fontFamily: 'Arial' }}>✕ Убрать</button>
            </div>
          </div>
        )}
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 20px', display: 'flex', gap: '16px', minHeight: 'calc(100vh - 90px)' }}>
          {workspace.sidebarVisible && (
            <aside style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderTop: `3px solid ${CIG}`, borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #eee', fontSize: '12px', fontWeight: '700', color: '#333' }}>📁 База знаний</div>
                <div style={{ padding: '12px' }}>
                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${CIG}55`, borderRadius: '4px', padding: '16px 8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f5fff0'; (e.currentTarget as HTMLDivElement).style.borderColor = CIG; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.borderColor = `${CIG}55`; }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{isUploading ? '⏳' : '📄'}</div>
                    <div style={{ fontSize: '11px', color: CIG, fontWeight: '600' }}>{isUploading ? 'Загружаю...' : 'Загрузить документ'}</div>
                    <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>PDF, DOCX, TXT</div>
                  </div>
                  {docId && (
                    <div style={{ marginTop: '10px', padding: '8px', background: '#f0fae8', border: '1px solid #c8e6b0', borderRadius: '3px' }}>
                      <div style={{ fontSize: '11px', color: CIG, fontWeight: '700' }}>✓ Загружен</div>
                      <div style={{ fontSize: '11px', color: '#333', marginTop: '2px', wordBreak: 'break-word' }}>{docFilename}</div>
                      <button onClick={handleClearDoc} className="theme-btn" style={{ marginTop: '6px', width: '100%', background: '#fff', border: '1px solid #ddd', borderRadius: '3px', padding: '3px', fontSize: '11px', color: '#888', cursor: 'pointer', fontFamily: 'Arial' }}>Очистить</button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #eee', fontSize: '12px', fontWeight: '700', color: '#333' }}>⚙ Настройки AI</div>
                <div style={{ padding: '10px' }}><SettingsPanel onVoiceChange={setSelectedVoice} selectedVoice={selectedVoice} /></div>
              </div>
            </aside>
          )}
          <section style={{ flex: 1, background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ background: '#fafafa', borderBottom: '1px solid #e8e8e8', padding: '8px 14px', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: '700', color: '#333' }}>
              {TABS.find(t => t.id === activeTab)?.label}
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: docId ? CIG : '#bbb' }}>
                {docId ? '● Документ активен' : '○ Нет документа'}
              </span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>{renderContent()}</div>
          </section>
        </main>
        <footer style={{ background: '#fff', borderTop: '1px solid #eee', padding: '10px 20px', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
          © 2024 Банк Центр-Инвест AI Платформа — Устойчивое развитие 🌿
        </footer>
      </div>
    );
  }

  // ── Cyber Theme Layout ─────────────────────────────────
  if (isCyber) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'Courier New, monospace', color: '#00ffaa' }}>
        <div style={{ borderBottom: '1px solid rgba(0,255,170,0.3)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,255,170,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⬡</span>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#00ffaa', letterSpacing: '2px' }}>ЦЕНТР_АИ</span>
            <span style={{ fontSize: '10px', color: '#007a55', padding: '1px 6px', border: '1px solid rgba(0,255,170,0.2)' }}>v2.0</span>
          </div>
          <div style={{ display: 'flex', gap: '2px', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="theme-btn"
                style={{ background: activeTab === tab.id ? 'rgba(0,255,170,0.12)' : 'transparent', border: activeTab === tab.id ? '1px solid rgba(0,255,170,0.5)' : '1px solid transparent', padding: '4px 10px', color: activeTab === tab.id ? '#00ffaa' : '#00aa77', fontSize: '10px', cursor: 'pointer', fontFamily: 'Courier New', letterSpacing: '0.5px' }}>
                {tab.label}
              </button>
            ))}
          </div>
          <ThemeSwitcher />
        </div>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {workspace.sidebarVisible && (
            <div style={{ width: '220px', borderRight: '1px solid rgba(0,255,170,0.2)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', background: 'rgba(0,255,170,0.02)' }}>
              <div style={{ fontSize: '9px', color: '#007a55', letterSpacing: '2px', borderBottom: '1px solid rgba(0,255,170,0.15)', paddingBottom: '4px' }}>// ДОКУМЕНТЫ</div>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.docx,.txt" />
              <button onClick={() => fileInputRef.current?.click()} className="theme-btn"
                style={{ background: 'rgba(0,255,170,0.05)', border: '1px solid rgba(0,255,170,0.4)', color: '#00ffaa', padding: '6px', fontSize: '10px', cursor: 'pointer', fontFamily: 'Courier New', textAlign: 'left', letterSpacing: '0.5px' }}>
                {isUploading ? '> LOADING...' : '> LOAD_FILE.exe'}
              </button>
              {docId && (
                <div style={{ border: '1px solid rgba(0,255,170,0.2)', padding: '6px', fontSize: '9px' }}>
                  <div style={{ color: '#00ffaa', marginBottom: '3px' }}>// ACTIVE:</div>
                  <div style={{ color: '#00cc88', wordBreak: 'break-all' }}>{docFilename}</div>
                  <button onClick={handleClearDoc} className="theme-btn" style={{ marginTop: '4px', background: 'none', border: '1px solid rgba(255,0,170,0.3)', color: '#ff00aa', padding: '2px 6px', fontSize: '9px', cursor: 'pointer', fontFamily: 'Courier New' }}>[ CLEAR ]</button>
                </div>
              )}
              <div style={{ fontSize: '9px', color: '#007a55', letterSpacing: '2px', borderBottom: '1px solid rgba(0,255,170,0.15)', paddingBottom: '4px', marginTop: '4px' }}>// СИСТЕМА</div>
              <SettingsPanel onVoiceChange={setSelectedVoice} selectedVoice={selectedVoice} />
            </div>
          )}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{renderContent()}</div>
        </div>
      </div>
    );
  }

  // ── XP Theme Layout ────────────────────────────────────
  if (isXP) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1a3a8f 0%, #2563ab 100%)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'Tahoma, Arial, sans-serif' }}>
        <div style={{ background: 'linear-gradient(180deg, #245ecd 0%, #3c81f3 40%, #245ecd 100%)', padding: '0', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #1a3a8f', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', height: '30px' }}>
          <button className="theme-btn" style={{ background: 'linear-gradient(180deg, #57a818 0%, #46a010 50%, #3a8a0c 100%)', border: '1px solid #2a6a00', borderRadius: '0 12px 12px 0', padding: '2px 14px 2px 8px', color: '#fff', fontWeight: 'bold', fontSize: '13px', fontFamily: 'Tahoma', cursor: 'pointer', height: '28px', boxShadow: '1px 0 4px rgba(0,0,0,0.4)' }}>
            <span style={{ marginRight: '4px' }}>🏁</span> Пуск
          </button>
          <div style={{ height: '22px', width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
          <span style={{ color: '#fff', fontSize: '11px', fontFamily: 'Tahoma' }}>Central AI</span>
          <div style={{ flex: 1 }} />
          <ThemeSwitcher />
          <div style={{ color: '#fff', fontSize: '11px', fontFamily: 'Tahoma', padding: '0 8px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
            {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div style={{ flex: 1, background: '#ece9d8', border: '2px solid', borderColor: '#fff #919b9c #919b9c #fff', boxShadow: '3px 3px 8px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'linear-gradient(90deg, #0a246a 0%, #2479d4 50%, #3a6ea5 100%)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>🖥</span>
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', fontFamily: 'Tahoma', flexGrow: 1 }}>Central AI — Платформа анализа знаний</span>
            {['─', '□', '×'].map((c, i) => (
              <button key={i} className="theme-btn" style={{ background: 'linear-gradient(180deg,#e0e0e0,#c0bbaf)', border: '2px solid', borderColor: '#fff #aca899 #aca899 #fff', width: '18px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Tahoma', boxShadow: '1px 1px 0 #000' }}>{c}</button>
            ))}
          </div>
          <div style={{ background: '#ece9d8', borderBottom: '1px solid #919b9c', padding: '2px 8px', display: 'flex', gap: '8px' }}>
            {['Файл', 'Вид', 'Справка'].map(m => (
              <span key={m} style={{ fontSize: '11px', color: '#000', cursor: 'default', padding: '1px 4px', fontFamily: 'Tahoma' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0a246a'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000'; }}>{m}</span>
            ))}
          </div>
          <div style={{ background: '#ece9d8', borderBottom: '1px solid #919b9c', padding: '3px 6px', display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="theme-btn"
                style={{ background: activeTab === tab.id ? 'linear-gradient(180deg,#dbe8f8,#c5d9f1)' : 'linear-gradient(180deg,#e8e8e8,#d4d0c8)', border: '2px solid', borderColor: activeTab === tab.id ? '#7f9db9' : '#fff #aca899 #aca899 #fff', padding: '2px 8px', fontSize: '10px', color: '#000', fontFamily: 'Tahoma', cursor: 'pointer', boxShadow: activeTab === tab.id ? 'inset 1px 1px 2px rgba(0,0,0,0.2)' : '1px 1px 0 #000' }}>
                {tab.label}
              </button>
            ))}
            <div style={{ height: '20px', width: '1px', background: '#919b9c', margin: '0 4px' }} />
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.docx,.txt" />
            <button onClick={() => fileInputRef.current?.click()} className="theme-btn"
              style={{ background: 'linear-gradient(180deg,#e8e8e8,#d4d0c8)', border: '2px solid', borderColor: '#fff #aca899 #aca899 #fff', padding: '2px 10px', fontSize: '11px', color: '#000', fontFamily: 'Tahoma', cursor: 'pointer', boxShadow: '1px 1px 0 #000' }}>
              {isUploading ? '⏳' : '📂 Открыть файл...'}
            </button>
            {docId && (
              <>
                <span style={{ fontSize: '11px', color: '#0a246a', fontFamily: 'Tahoma' }}>📄 {docFilename}</span>
                <button onClick={handleClearDoc} className="theme-btn" style={{ background: 'linear-gradient(180deg,#e8e8e8,#d4d0c8)', border: '2px solid', borderColor: '#fff #aca899 #aca899 #fff', padding: '2px 8px', fontSize: '10px', color: '#c00', fontFamily: 'Tahoma', cursor: 'pointer', boxShadow: '1px 1px 0 #000' }}>✕</button>
              </>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {workspace.sidebarVisible && (
              <div style={{ width: '220px', background: '#e3e0d4', borderRight: '1px solid #919b9c', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                <div style={{ background: 'linear-gradient(180deg,#0a246a,#2479d4)', color: '#fff', padding: '3px 8px', fontSize: '11px', fontFamily: 'Tahoma', fontWeight: 'bold' }}>Задачи панели</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span onClick={() => fileInputRef.current?.click()} style={{ display: 'block', padding: '2px 6px', cursor: 'pointer', fontSize: '11px', color: '#0000cc', fontFamily: 'Tahoma', textDecoration: 'underline' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#cc0000'} onMouseLeave={e => e.currentTarget.style.color = '#0000cc'}>▶ Загрузить документ</span>
                </div>
                <div style={{ background: 'linear-gradient(180deg,#0a246a,#2479d4)', color: '#fff', padding: '3px 8px', fontSize: '11px', fontFamily: 'Tahoma', fontWeight: 'bold', marginTop: '4px' }}>Подробности</div>
                {docId ? (
                  <div style={{ background: '#fff', border: '1px solid #7f9db9', padding: '6px', fontSize: '10px', fontFamily: 'Tahoma', color: '#000', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontWeight: 'bold', color: '#0a246a', marginBottom: '3px' }}>📄 {docFilename}</div>
                    <div style={{ color: '#006600', fontSize: '9px' }}>● Активен в контексте</div>
                    <button onClick={handleClearDoc} className="theme-btn" style={{ marginTop: '4px', background: 'linear-gradient(180deg,#e8e8e8,#d4d0c8)', border: '2px solid', borderColor: '#fff #aca899 #aca899 #fff', padding: '1px 6px', fontSize: '9px', color: '#c00', cursor: 'pointer', fontFamily: 'Tahoma' }}>Очистить</button>
                  </div>
                ) : (
                  <div style={{ background: '#fff', border: '1px solid #7f9db9', padding: '6px', fontSize: '10px', fontFamily: 'Tahoma', color: '#666', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.1)' }}>Файл не выбран</div>
                )}
                <SettingsPanel onVoiceChange={setSelectedVoice} selectedVoice={selectedVoice} />
              </div>
            )}
            <div style={{ flex: 1, background: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{renderContent()}</div>
          </div>
          <div style={{ background: '#ece9d8', borderTop: '1px solid #919b9c', padding: '2px 8px', display: 'flex', gap: '12px', fontSize: '10px', color: '#000', fontFamily: 'Tahoma' }}>
            <span>Готово</span>
            <div style={{ width: '1px', background: '#919b9c', margin: '0 2px' }} />
            <span>{docId ? `Документ: ${docFilename}` : 'Нет активного документа'}</span>
            <div style={{ flex: 1 }} />
            <span>Central AI v2.0</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Dark Glassmorphism Layout ──────────────────────────
  return (
    <div className="min-h-screen text-slate-100" style={{ background: 'var(--bg-app)' }}>
      <div className="fixed inset-0 -z-10" style={{ background: 'var(--radial-bg)' }} />

      <header className="border-b sticky top-0 z-50 backdrop-blur-md" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: 'var(--logo-bg)' }}>C</div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'var(--accent-text-gradient, linear-gradient(to right, #c4b5fd, #818cf8))' }}>Центр АИ</h1>
          </div>
          <nav className="flex flex-wrap gap-1 p-1 rounded-lg border min-w-0" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'var(--border-main)' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                style={{ background: activeTab === tab.id ? 'var(--bg-active-tab)' : 'transparent' }}>
                {tab.label}
              </button>
            ))}
          </nav>
          <ThemeSwitcher />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 h-[calc(100vh-4rem)] flex gap-6">
        {workspace.sidebarVisible && (
          <aside className="w-72 flex flex-col gap-4 overflow-y-auto flex-shrink-0">
            <div className="border rounded-xl p-5 backdrop-blur-md" style={{ background: 'var(--bg-sidebar-card)', borderColor: 'var(--border-main)' }}>
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">База знаний</h2>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept=".pdf,.docx,.txt" />
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer group transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {isUploading
                    ? <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-primary, #8b5cf6)' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    : <svg className="w-6 h-6" style={{ color: 'var(--text-accent, #a78bfa)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>}
                </div>
                <p className="text-sm font-medium text-slate-400">{isUploading ? 'Загружаю...' : 'Загрузить документ'}</p>
                <p className="text-xs text-slate-600 mt-1">PDF, DOCX, TXT</p>
              </div>
              {docId && (
                <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                    <span className="text-xs text-green-300 font-medium truncate">{docFilename}</span>
                  </div>
                  <button onClick={handleClearDoc} className="text-xs text-slate-500 hover:text-red-400 transition-colors mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    Очистить базу знаний
                  </button>
                </div>
              )}
            </div>

            {/* Chat sessions */}
            <div className="border rounded-xl p-4 backdrop-blur-md" style={{ background: 'var(--bg-sidebar-card)', borderColor: 'var(--border-main)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">💬 Чаты</h2>
                <button onClick={() => { createSession(); setActiveTab('chat'); }}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
                  title="Новый чат">
                  + Новый
                </button>
              </div>
              <div className="flex flex-col gap-1" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center gap-2 group"
                    style={{ borderRadius: '6px', padding: '5px 8px', background: s.id === activeSessionId ? 'rgba(139,92,246,0.15)' : 'transparent', border: s.id === activeSessionId ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.1s' }}
                    onClick={() => { switchSession(s.id); setActiveTab('chat'); }}>
                    <span style={{ fontSize: '9px', color: s.id === activeSessionId ? '#a78bfa' : '#64748b' }}>💬</span>
                    <span className="flex-1 truncate" style={{ fontSize: '11px', color: s.id === activeSessionId ? '#e2e8f0' : '#94a3b8' }}>
                      {s.name}{s.messages.length > 0 ? ` (${s.messages.length})` : ''}
                    </span>
                    {sessions.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ fontSize: '10px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                        title="Удалить">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <SettingsPanel onVoiceChange={setSelectedVoice} selectedVoice={selectedVoice} />
          </aside>

        )}

        <section className="flex-1 border rounded-xl backdrop-blur-md flex flex-col overflow-hidden min-w-0" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
          {renderContent()}
        </section>
      </main>
    </div>
  );
}
