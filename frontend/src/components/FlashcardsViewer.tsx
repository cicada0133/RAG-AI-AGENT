'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

interface Card {
  question: string;
  answer: string;
}

interface QuizQuestion {
  question: string;
  correct: string;
  options: string[];   // 4 shuffled options
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildQuiz(cards: Card[]): QuizQuestion[] {
  return cards.map((card, i) => {
    const wrongPool = cards
      .filter((_, j) => j !== i)
      .map(c => c.answer);
    // Pick up to 3 distractors (may be fewer if not enough cards)
    const distractors = shuffle(wrongPool).slice(0, 3);
    const options = shuffle([card.answer, ...distractors]);
    return { question: card.question, correct: card.answer, options };
  });
}

// ──────────────────────────────────────────────────────────
// FLASHCARD MODE
// ──────────────────────────────────────────────────────────
function CardMode({ cards, onRegenerate }: { cards: Card[]; onRegenerate: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());

  const next = (mark?: 'known' | 'unknown') => {
    if (mark === 'known') setKnown(prev => new Set([...prev, currentIdx]));
    if (mark === 'unknown') setUnknown(prev => new Set([...prev, currentIdx]));
    setFlipped(false);
    setTimeout(() => setCurrentIdx(i => Math.min(i + 1, cards.length - 1)), 150);
  };
  const prev = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIdx(i => Math.max(i - 1, 0)), 150);
  };

  const card = cards[currentIdx];
  const progress = ((known.size + unknown.size) / cards.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>{currentIdx + 1} / {cards.length}</span>
          <span className="flex gap-3">
            <span className="text-green-400">✓ {known.size}</span>
            <span className="text-red-400">✗ {unknown.size}</span>
          </span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="w-full max-w-md h-52 cursor-pointer" style={{ perspective: '1000px' }}
        onClick={() => setFlipped(f => !f)}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
          style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ backfaceVisibility: 'hidden' }}
            className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 backdrop-blur-md">
            <span className="text-xs text-purple-400 uppercase tracking-wider font-semibold">Вопрос</span>
            <p className="text-white text-center font-medium text-lg leading-snug">{card.question}</p>
            <span className="text-xs text-slate-500 mt-auto">нажмите для ответа</span>
          </div>
          <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 backdrop-blur-md">
            <span className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">Ответ</span>
            <p className="text-white text-center text-base leading-snug">{card.answer}</p>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={prev} disabled={currentIdx === 0}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-30">
          ← Назад
        </button>
        {flipped && (
          <>
            <button onClick={() => next('unknown')}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-colors">
              ✗ Не знаю
            </button>
            <button onClick={() => next('known')}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-sm text-green-300 transition-colors">
              ✓ Знаю
            </button>
          </>
        )}
        {!flipped && (
          <button onClick={() => next()} disabled={currentIdx === cards.length - 1}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-30">
            Вперёд →
          </button>
        )}
        <button onClick={onRegenerate}
          className="px-4 py-2 border border-white/20 rounded-lg text-sm text-slate-200 hover:bg-white/10 hover:border-white/30 transition-all">
          ↺ Обновить
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// QUIZ / TEST MODE
// ──────────────────────────────────────────────────────────
function QuizMode({ cards, onRegenerate }: { cards: Card[]; onRegenerate: () => void }) {
  const [questions] = useState<QuizQuestion[]>(() => buildQuiz(cards));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<('correct' | 'wrong' | null)[]>(() => cards.map(() => null));
  const [done, setDone] = useState(false);

  const q = questions[currentIdx];

  const handleSelect = (opt: string) => {
    if (selected) return; // already answered
    setSelected(opt);
    const isCorrect = opt === q.correct;
    if (isCorrect) setScore(s => s + 1);
    setAnswers(prev => {
      const next = [...prev];
      next[currentIdx] = isCorrect ? 'correct' : 'wrong';
      return next;
    });
  };

  const handleNext = () => {
    if (currentIdx === questions.length - 1) {
      setDone(true);
    } else {
      setSelected(null);
      setCurrentIdx(i => i + 1);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelected(null);
    setScore(0);
    setAnswers(cards.map(() => null));
    setDone(false);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 80 ? '🏆 Отлично!' : pct >= 60 ? '✅ Хорошо' : '📚 Учите материал';
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-4xl">
          {pct >= 80 ? '🏆' : pct >= 60 ? '✅' : '📚'}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-1">{grade}</h2>
          <p className="text-slate-300">Правильных ответов: <span className="text-green-400 font-bold">{score}</span> из {questions.length}</p>
          <div className="mt-3 w-48 h-2 bg-white/10 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-slate-400 text-sm mt-2">{pct}%</p>
        </div>
        {/* Answer review */}
        <div className="w-full max-w-md max-h-40 overflow-y-auto space-y-1">
          {questions.map((qq, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${answers[i] === 'correct' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
              <span>{answers[i] === 'correct' ? '✓' : '✗'}</span>
              <span className="truncate">{qq.question}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={handleRestart}
            className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300">
            Пройти заново
          </button>
          <button onClick={onRegenerate}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-sm text-white font-medium">
            Новые вопросы
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      {/* Progress */}
      <div className="w-full max-w-lg">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Вопрос {currentIdx + 1} из {questions.length}</span>
          <span className="text-green-400">✓ {score} правильно</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <p className="text-xs text-purple-400 uppercase tracking-wider font-semibold mb-3">Вопрос</p>
        <p className="text-white font-medium text-lg leading-snug">{q.question}</p>
      </div>

      {/* Options */}
      <div className="w-full max-w-lg grid grid-cols-1 gap-3">
        {q.options.map((opt, i) => {
          const letter = ['A', 'B', 'C', 'D'][i];
          let style = 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20';
          if (selected) {
            if (opt === q.correct) style = 'bg-green-500/20 border-green-500/50 text-green-300';
            else if (opt === selected) style = 'bg-red-500/20 border-red-500/50 text-red-300';
            else style = 'bg-white/3 border-white/5 text-slate-500';
          }
          return (
            <button key={opt} onClick={() => handleSelect(opt)}
              className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-sm text-left transition-all ${style} ${!selected ? 'cursor-pointer' : 'cursor-default'}`}>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${selected && opt === q.correct ? 'bg-green-500 text-white' : selected && opt === selected ? 'bg-red-500 text-white' : 'bg-white/10 text-slate-300'}`}>
                {selected && opt === q.correct ? '✓' : selected && opt === selected ? '✗' : letter}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <button onClick={handleNext}
          className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-medium text-sm">
          {currentIdx === questions.length - 1 ? 'Завершить тест →' : 'Следующий вопрос →'}
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────
export default function FlashcardsViewer({ docId }: { docId: string | null }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'cards' | 'quiz'>('cards');

  const handleGenerate = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.cards?.length) {
        setCards(data.cards);
        setTab('cards');
      }
    } catch {}
    setLoading(false);
  };

  if (!docId) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-400 text-sm">Загрузите документ для генерации карточек.</p>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <svg className="w-8 h-8 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <p className="text-slate-300 text-sm">Генерирую карточки и вопросы теста...</p>
    </div>
  );

  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 text-3xl">🃏</div>
      <div className="text-center">
        <h3 className="text-white font-semibold mb-1">Карточки и Тест</h3>
        <p className="text-slate-400 text-sm">Вопрос-ответ + тест с 4 вариантами</p>
      </div>
      <button onClick={handleGenerate}
        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity">
        Сгенерировать
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex gap-1 p-3 border-b border-white/10">
        <button onClick={() => setTab('cards')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'cards' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          🃏 Карточки
        </button>
        <button onClick={() => setTab('quiz')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'quiz' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          📝 Тест
        </button>
        <span className="ml-auto text-xs text-slate-500 self-center">{cards.length} вопросов</span>
      </div>

      {/* Mode content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'cards'
          ? <CardMode cards={cards} onRegenerate={handleGenerate} />
          : <QuizMode cards={cards} onRegenerate={handleGenerate} />}
      </div>
    </div>
  );
}
