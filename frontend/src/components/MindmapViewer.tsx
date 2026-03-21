'use client';

import React from 'react';

// A mock mindmap viewer for now, without react-flow dependencies to avoid breaking changes if not installed yet.
export default function MindmapViewer() {
  return (
    <div className="flex flex-col items-center justify-center p-8 h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
       <div className="bg-white/10 backdrop-blur border border-white/20 p-8 rounded-2xl max-w-md text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 -z-10 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-12 group-hover:rotate-0 transition-transform">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Interactive Mindmap</h3>
          <p className="text-slate-400 text-sm mb-6">
            Upload a document to extract critical insights and automatically build an interactive knowledge graph mapping concepts and dependencies.
          </p>
          <button className="px-6 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium transition-colors w-full flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
             <span>Generate Map</span>
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>
       </div>
    </div>
  );
}
