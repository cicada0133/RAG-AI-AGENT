'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeId = 'dark' | 'xp' | 'cyber' | 'centrinvest';

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  preview: {
    bg: string;
    accent: string;
    text: string;
    border: string;
  };
}

export const THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Dark Glassmorphism',
    description: 'Современный тёмный интерфейс с эффектом матового стекла',
    preview: { bg: 'linear-gradient(135deg, #020510 60%, #2d1b69 100%)', accent: '#8b5cf6', text: '#c4b5fd', border: 'rgba(255,255,255,0.12)' },
  },
  {
    id: 'xp',
    name: 'Windows XP Classic',
    description: 'Ностальгический стиль Luna Blue из Windows XP (2001)',
    preview: { bg: 'linear-gradient(180deg, #0a246a 0%, #2479d4 50%, #3a6ea5 100%)', accent: '#2479d4', text: '#000000', border: '#919b9c' },
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Neon',
    description: 'Тёмный терминал с неоновой подсветкой и CRT-эффектом',
    preview: { bg: 'linear-gradient(135deg, #000 60%, #001a0d 100%)', accent: '#00ffaa', text: '#00ffaa', border: 'rgba(0,255,170,0.3)' },
  },
  {
    id: 'centrinvest',
    name: 'Банк Центр-Инвест',
    description: 'Корпоративный стиль банка Центр-Инвест — чистый, зелёный, профессиональный',
    preview: { bg: '#ffffff', accent: '#3d9900', text: '#1a1a1a', border: '#e0e0e0' },
  },
];

export interface WorkspaceConfig {
  accentColor: string;   // hex
  fontSize: 'sm' | 'md' | 'lg';
  sidebarVisible: boolean;
}

const DEFAULT_WORKSPACE: WorkspaceConfig = {
  accentColor: '',   // empty = use theme default
  fontSize: 'md',
  sidebarVisible: true,
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (id: ThemeId) => void;
  allThemes: Theme[];
  workspace: WorkspaceConfig;
  setWorkspace: (patch: Partial<WorkspaceConfig>) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES[0],
  setTheme: () => {},
  allThemes: THEMES,
  workspace: DEFAULT_WORKSPACE,
  setWorkspace: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('dark');
  const [workspace, setWorkspaceState] = useState<WorkspaceConfig>(DEFAULT_WORKSPACE);

  useEffect(() => {
    const savedTheme = localStorage.getItem('centralai-theme') as ThemeId | null;
    if (savedTheme && THEMES.find(t => t.id === savedTheme)) setThemeId(savedTheme);

    const savedWs = localStorage.getItem('centralai-workspace');
    if (savedWs) {
      try { setWorkspaceState({ ...DEFAULT_WORKSPACE, ...JSON.parse(savedWs) }); } catch {}
    }
  }, []);

  // Apply theme + workspace to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('centralai-theme', themeId);
  }, [themeId]);

  useEffect(() => {
    const root = document.documentElement;

    // Font size — data-fontsize lets CSS override Tailwind text-* classes
    root.setAttribute('data-fontsize', workspace.fontSize);

    // Accent color — inject a real <style> tag with substring selectors
    // This bypasses Tailwind v4 build-time compilation completely
    const styleId = 'centralai-accent-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    if (workspace.accentColor) {
      const ac = workspace.accentColor;
      const ac20 = ac + '33'; // ~20% opacity
      const ac35 = ac + '59'; // ~35% opacity
      const ac50 = ac + '80'; // ~50% opacity
      styleEl.textContent = `
        :root { --accent-primary: ${ac}; --accent-secondary: ${ac}; }
        [data-theme="dark"] [class*="text-purple"],
        [data-theme="dark"] [class*="text-indigo"] { color: ${ac} !important; }
        [data-theme="dark"] [class*="bg-purple-6"],
        [data-theme="dark"] [class*="bg-indigo-6"] { background-color: ${ac} !important; }
        [data-theme="dark"] [class*="from-purple"] { --tw-gradient-from: ${ac} !important; background-image: none; background-color: ${ac}; }
        [data-theme="dark"] [class*="bg-gradient"][class*="purple"] { background: linear-gradient(to right, ${ac}, ${ac}cc) !important; }
        [data-theme="dark"] [class*="border-purple"] { border-color: ${ac35} !important; }
        [data-theme="dark"] [class*="border-indigo"] { border-color: ${ac35} !important; }
        [data-theme="dark"] [class*="bg-purple-5"],
        [data-theme="dark"] [class*="bg-purple-6\/"] { background-color: ${ac20} !important; }
        [data-theme="dark"] [class*="ring-purple"] { --tw-ring-color: ${ac50} !important; }
        [data-theme="dark"] nav button[class*="text-white"] { color: #fff !important; }
      `;
    } else {
      styleEl.textContent = ':root { --accent-primary: #7c3aed; --accent-secondary: #4f46e5; }';
    }

    localStorage.setItem('centralai-workspace', JSON.stringify(workspace));
  }, [workspace]);

  const setTheme = useCallback((id: ThemeId) => setThemeId(id), []);
  const setWorkspace = useCallback((patch: Partial<WorkspaceConfig>) => {
    setWorkspaceState(prev => ({ ...prev, ...patch }));
  }, []);

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, allThemes: THEMES, workspace, setWorkspace }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
