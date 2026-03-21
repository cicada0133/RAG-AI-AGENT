'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  NodeProps,
  Handle,
  Position,
  Connection,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ── Types ──────────────────────────────────────────────────
interface NodeData {
  label: string;
  content?: string;
  isRoot?: boolean;
}

interface PopupState {
  nodeId: string;
  label: string;
  content: string;
  x: number;
  y: number;
  aiAnswer?: string;
  aiLoading?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

// ── Custom Node Component ───────────────────────────────────
function InteractiveNode({ data, id }: NodeProps) {
  const nodeData = data as unknown as NodeData;
  const isRoot = nodeData.isRoot;
  return (
    <div
      className="interactive-node"
      style={{
        background: isRoot
          ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
          : 'rgba(30, 41, 59, 0.95)',
        border: isRoot ? 'none' : '1px solid rgba(139,92,246,0.4)',
        borderRadius: '10px',
        padding: '10px 14px',
        minWidth: '120px',
        maxWidth: '180px',
        textAlign: 'center',
        cursor: 'pointer',
        boxShadow: isRoot
          ? '0 4px 20px rgba(124,58,237,0.4)'
          : '0 2px 10px rgba(0,0,0,0.3)',
        transition: 'transform 0.15s, box-shadow 0.15s',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '600', lineHeight: '1.3' }}>
        {nodeData.label}
      </div>
      {nodeData.content && (
        <div style={{
          marginTop: '4px',
          width: '6px', height: '6px',
          borderRadius: '50%',
          background: '#a78bfa',
          margin: '4px auto 0',
          opacity: 0.7,
        }} title="Нажмите для просмотра содержимого" />
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { interactive: InteractiveNode };

// ── Main Component ──────────────────────────────────────────
export default function FlowGraph({ docId }: { docId: string | null }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [aiInput, setAiInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    if (!docId) return;
    const fetchGraph = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/mindmap/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_id: docId })
        });
        const data = await res.json();
        if (data.nodes && data.edges) {
          setNodes(data.nodes.map((n: any, i: number) => ({
            ...n,
            type: 'interactive',
            position: n.position || { x: (i % 3) * 240 + 100, y: Math.floor(i / 3) * 160 + 50 },
            data: { ...n.data, isRoot: i === 0 },
          })));
          setEdges(data.edges.map((e: any, i: number) => ({
            ...e,
            id: e.id || `e${i}`,
            animated: true,
            style: { stroke: '#8b5cf6', strokeWidth: 1.5 }
          })));
        }
      } catch (err) {
        console.error('Failed to fetch graph', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, [docId, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: any, node: any) => {
    const data = node.data as NodeData;
    const content = data.content || 'Нажмите "Спросить ИИ" чтобы узнать подробности этого раздела.';
    setAiInput('');
    setPopup({
      nodeId: node.id,
      label: data.label,
      content,
      x: 0, y: 0,
      aiAnswer: undefined,
      aiLoading: false,
    });
  }, []);

  const askAI = async (question?: string) => {
    if (!popup || !docId) return;
    const q = question || `Расскажи подробнее о разделе "${popup.label}" из документа`;
    setPopup(prev => prev ? { ...prev, aiLoading: true, aiAnswer: undefined } : null);
    try {
      const res = await fetch(`${API}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, doc_id: docId })
      });
      const data = await res.json();
      setPopup(prev => prev ? { ...prev, aiLoading: false, aiAnswer: data.answer || 'Нет ответа' } : null);
    } catch {
      setPopup(prev => prev ? { ...prev, aiLoading: false, aiAnswer: 'Ошибка подключения к серверу.' } : null);
    }
  };

  const closePopup = () => { setPopup(null); setAiInput(''); };

  if (!docId) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-slate-400 text-sm">Загрузите документ для карты знаний.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4">
        <svg className="w-8 h-8 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-slate-400 text-sm">Генерация карты знаний…</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full relative" style={{ minHeight: '500px' }}>
      {/* Header */}
      <div className="absolute top-3 left-3 z-10 px-3 py-1.5 bg-slate-900/80 backdrop-blur border border-white/10 rounded-lg text-white text-xs font-medium shadow-xl">
        🗺 Карта знаний · <span className="text-purple-400">кликните на узел для просмотра</span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
      >
        <Controls className="bg-slate-800 border-slate-700" />
        <MiniMap nodeStrokeColor="#8b5cf6" nodeColor="#1e293b" maskColor="rgba(15,23,42,0.7)" className="bg-slate-900 border border-slate-700" />
        <Background color="#334155" gap={16} />
      </ReactFlow>

      {/* Node popup */}
      {popup && (
        <>
          {/* Backdrop */}
          <div
            onClick={closePopup}
            style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
          />
          {/* Panel */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 30, width: '420px', maxWidth: '90%', maxHeight: '80%', overflowY: 'auto',
            background: 'rgba(15,12,30,0.97)', border: '1px solid rgba(139,92,246,0.35)',
            borderRadius: '16px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                <h3 style={{ color: '#e2e8f0', fontWeight: '700', fontSize: '15px', margin: 0 }}>{popup.label}</h3>
              </div>
              <button onClick={closePopup} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>

            {/* Content */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
              <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.65', margin: 0 }}>{popup.content}</p>
            </div>

            {/* AI answer */}
            {popup.aiAnswer && (
              <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
                <div style={{ color: '#a78bfa', fontSize: '11px', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🤖 Ответ ИИ</div>
                <p style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.65', margin: 0 }}>{popup.aiAnswer}</p>
              </div>
            )}

            {popup.aiLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#94a3b8', fontSize: '13px' }}>
                <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                ИИ думает…
              </div>
            )}

            {/* Custom question input */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && aiInput.trim() && askAI(aiInput)}
                placeholder={`Спросить о "${popup.label.slice(0, 25)}…"`}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 10px', color: '#e2e8f0', fontSize: '12px', outline: 'none' }}
              />
              <button
                onClick={() => aiInput.trim() && askAI(aiInput)}
                disabled={!aiInput.trim() || popup.aiLoading}
                style={{ background: '#7c3aed', border: 'none', borderRadius: '8px', padding: '7px 12px', color: '#fff', fontSize: '12px', cursor: 'pointer', opacity: (!aiInput.trim() || popup.aiLoading) ? 0.5 : 1 }}
              >→</button>
            </div>

            {/* Quick buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => askAI()} disabled={popup.aiLoading}
                style={{ padding: '5px 12px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '20px', color: '#a78bfa', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s' }}>
                🤖 Расскажи подробнее
              </button>
              <button onClick={() => askAI(`Приведи примеры по теме "${popup.label}"`)} disabled={popup.aiLoading}
                style={{ padding: '5px 12px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '20px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
                📌 Примеры
              </button>
              <button onClick={() => askAI(`Почему "${popup.label}" это важно в документе?`)} disabled={popup.aiLoading}
                style={{ padding: '5px 12px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '20px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
                💡 Почему важно?
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .interactive-node:hover { transform: scale(1.04); box-shadow: 0 4px 20px rgba(124,58,237,0.35) !important; }
      `}</style>
    </div>
  );
}
