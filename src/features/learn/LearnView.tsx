import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Check, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Sparkles, 
  Sliders, 
  FileCode, 
  Layers, 
  Clock, 
  Award,
  ArrowRight
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useWorkbench } from '../../store/workbenchStore';
import { LESSONS, LessonData, DEFAULT_FLASHCARDS } from '../../data/lessonsData';
import { db, DBFlashcard, DBProgress } from '../../lib/db';
import { 
  calculateSm2, 
  isCardDue, 
  createDefaultSm2Item, 
  Sm2Item, 
  QuickReviewRating, 
  RATING_TO_GRADE 
} from '../../lib/sm2SpacedRepetition';
import { FeatureContextProps } from '../types';

export const LearnView: React.FC<FeatureContextProps> = () => {
  const { t, language } = useI18n();
  const { openTab } = useWorkbench();

  // Top Section Mode: 'lessons' | 'flashcards' | 'code-reading'
  const [activeTab, setActiveTab] = useState<'lessons' | 'flashcards' | 'code-reading'>('lessons');

  // Currently Selected Lesson
  const [selectedLessonId, setSelectedLessonId] = useState<string>(LESSONS[0].id);
  const activeLesson: LessonData = useMemo(() => {
    return LESSONS.find((l) => l.id === selectedLessonId) || LESSONS[0];
  }, [selectedLessonId]);

  // User Progress state from IndexedDB
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  // Code Exercise selection & submit
  const [codeAnswer, setCodeAnswer] = useState<number | null>(null);
  const [codeSubmitted, setCodeSubmitted] = useState<boolean>(false);

  // Flashcards state from IndexedDB
  const [flashcards, setFlashcards] = useState<DBFlashcard[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [showAddCardModal, setShowAddCardModal] = useState<boolean>(false);

  // New card modal form
  const [newCardQ, setNewCardQ] = useState<string>('');
  const [newCardA, setNewCardA] = useState<string>('');
  const [newCardCat, setNewCardCat] = useState<string>('General');

  // Load progress and flashcards from IndexedDB on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load progress
        const prog = await db.get('progress', 'curriculum_master');
        if (prog && prog.completedLessons) {
          setCompletedLessonIds(prog.completedLessons);
        }

        // Load flashcards
        const cards = await db.getAll('flashcards');
        if (cards && cards.length > 0) {
          setFlashcards(cards);
        } else {
          // Seed default flashcards
          const now = Date.now();
          const seeded: DBFlashcard[] = DEFAULT_FLASHCARDS.map((df, idx) => ({
            ...df,
            ...createDefaultSm2Item(),
            interval: 1,
            repetition: 0,
            easeFactor: 2.5,
            nextReviewDate: now,
            updatedAt: now,
          }));
          for (const c of seeded) {
            await db.put('flashcards', c);
          }
          setFlashcards(seeded);
        }
      } catch (err) {
        console.error('Failed to load learn progress / flashcards from IndexedDB:', err);
      }
    };

    loadUserData();
  }, []);

  // Toggle lesson completion
  const handleToggleCompletion = async (lessonId: string) => {
    const isCompleted = completedLessonIds.includes(lessonId);
    const updated = isCompleted
      ? completedLessonIds.filter((id) => id !== lessonId)
      : [...completedLessonIds, lessonId];

    setCompletedLessonIds(updated);

    const progRecord: DBProgress = {
      id: 'curriculum_master',
      moduleId: 'curriculum',
      completedLessons: updated,
      score: updated.length * 10,
      lastAccessed: Date.now(),
    };
    await db.put('progress', progRecord);
  };

  // Launch interactive widget tool
  const handleLaunchWidget = (widgetId?: string) => {
    if (!widgetId) return;
    openTab(widgetId);
  };

  // Flashcards due for review today
  const dueCards = useMemo(() => {
    const now = Date.now();
    return flashcards.filter((card) => {
      const sm2Item: Sm2Item = {
        repetition: card.repetition ?? 0,
        intervalDays: card.interval ?? 1,
        easeFactor: card.easeFactor ?? 2.5,
        nextReviewDate: card.nextReviewDate ?? now,
      };
      return isCardDue(sm2Item, now);
    });
  }, [flashcards]);

  const currentReviewCard = dueCards[activeCardIndex] || dueCards[0];

  // Grade review with SM-2
  const handleReviewGrade = async (rating: QuickReviewRating) => {
    if (!currentReviewCard) return;

    const grade = RATING_TO_GRADE[rating];
    const now = Date.now();
    const currentItem: Sm2Item = {
      repetition: currentReviewCard.repetition ?? 0,
      intervalDays: currentReviewCard.interval ?? 1,
      easeFactor: currentReviewCard.easeFactor ?? 2.5,
      nextReviewDate: currentReviewCard.nextReviewDate ?? now,
    };

    const nextSm2 = calculateSm2(currentItem, grade, now);

    const updatedCard: DBFlashcard = {
      ...currentReviewCard,
      repetition: nextSm2.repetition,
      interval: nextSm2.intervalDays,
      easeFactor: nextSm2.easeFactor,
      nextReviewDate: nextSm2.nextReviewDate,
      lastReviewed: now,
      updatedAt: now,
    };

    await db.put('flashcards', updatedCard);

    setFlashcards((prev) =>
      prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    );

    setIsAnswerRevealed(false);
    if (activeCardIndex >= dueCards.length - 1) {
      setActiveCardIndex(0);
    }
  };

  // Create new flashcard
  const handleCreateFlashcard = async () => {
    if (!newCardQ.trim() || !newCardA.trim()) return;
    const now = Date.now();
    const newCard: DBFlashcard = {
      id: `fc_${now}`,
      deckId: 'user_created',
      question: newCardQ.trim(),
      answer: newCardA.trim(),
      category: newCardCat.trim() || 'General',
      repetition: 0,
      interval: 1,
      easeFactor: 2.5,
      nextReviewDate: now,
      updatedAt: now,
    };

    await db.put('flashcards', newCard);
    setFlashcards((prev) => [newCard, ...prev]);
    setNewCardQ('');
    setNewCardA('');
    setShowAddCardModal(false);
  };

  // Delete flashcard
  const handleDeleteCard = async (id: string) => {
    await db.delete('flashcards', id);
    setFlashcards((prev) => prev.filter((c) => c.id !== id));
  };

  const progressPercent = Math.round((completedLessonIds.length / LESSONS.length) * 100);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span>{t.learn.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.learn.description}</p>
        </div>

        {/* Global Progress Pill */}
        <div className="flex items-center gap-3 bg-neutral-900 border border-subtle px-3 py-1.5 rounded-lg text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Award className="w-4 h-4" />
            <span>{completedLessonIds.length}/{LESSONS.length} {t.learn.completed}</span>
          </div>
          <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
          <span className="text-secondary">{progressPercent}%</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-subtle">
        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'lessons'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{t.learn.tabLessons}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flashcards')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'flashcards'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.learn.tabFlashcards} ({dueCards.length} due)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('code-reading')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'code-reading'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>{t.learn.tabCodeExercises}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CURRICULUM & LESSONS */}
      {/* ========================================================================= */}
      {activeTab === 'lessons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Drawer: Lesson List */}
          <div className="lg:col-span-4 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary px-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.learn.curriculum}</span>
            </span>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {LESSONS.map((lesson) => {
                const isCompleted = completedLessonIds.includes(lesson.id);
                const isSelected = selectedLessonId === lesson.id;
                const title = language === 'fa' ? lesson.title.fa : lesson.title.en;

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setSelectedLessonId(lesson.id);
                      setCodeSubmitted(false);
                      setCodeAnswer(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-primary shadow-sm'
                        : 'bg-card hover:bg-neutral-800 border-subtle text-secondary'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-primary truncate">{lesson.order}. {title}</span>
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-2 mt-1">
                        <span className="capitalize">{lesson.category}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{lesson.estimatedMinutes} min</span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Lesson Viewer & Quizzes */}
          <div className="lg:col-span-8 space-y-6">
            {/* Lesson Title Banner */}
            <div className="bg-card border border-subtle rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold font-mono">
                    LESSON {activeLesson.order} // {activeLesson.category.toUpperCase()}
                  </div>
                  <h3 className="text-xl font-bold text-primary mt-0.5">
                    {language === 'fa' ? activeLesson.title.fa : activeLesson.title.en}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleCompletion(activeLesson.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                    completedLessonIds.includes(activeLesson.id)
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-neutral-900 border-subtle text-secondary hover:text-primary'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {completedLessonIds.includes(activeLesson.id) ? t.learn.completed : t.learn.markCompleted}
                  </span>
                </button>
              </div>

              <p className="text-xs text-secondary leading-relaxed">
                {language === 'fa' ? activeLesson.summary.fa : activeLesson.summary.en}
              </p>

              {/* Embedded Tool Launcher Pill */}
              {activeLesson.interactiveWidgetId && (
                <div className="pt-2 border-t border-subtle flex items-center justify-between">
                  <div className="text-xs text-secondary flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      {language === 'fa' ? activeLesson.interactiveWidgetTitle.fa : activeLesson.interactiveWidgetTitle.en}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLaunchWidget(activeLesson.interactiveWidgetId)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>{t.learn.launchWidget}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Markdown Lesson Content (Formulas cleanly rendered LTR) */}
            <div className="bg-card border border-subtle rounded-xl p-5 text-sm leading-relaxed space-y-4 text-primary font-sans">
              <div 
                className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{
                  __html: (language === 'fa' ? activeLesson.markdownContent.fa : activeLesson.markdownContent.en)
                    .replace(/\n\n/g, '<br/><br/>')
                    .replace(/### (.*?)\n/g, '<h4 class="text-sm font-bold text-emerald-400 mt-4 mb-1">$1</h4>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-semibold">$1</strong>')
                    .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-neutral-900 text-cyan-400 rounded font-mono code-ltr" dir="ltr">$1</code>')
                }}
              />
            </div>

            {/* Knowledge Check Quiz */}
            {activeLesson.quiz.length > 0 && (
              <div className="bg-card border border-subtle rounded-xl p-5 space-y-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>{t.learn.takeQuiz}</span>
                </span>

                {activeLesson.quiz.map((q) => {
                  const selectedOpt = quizAnswers[q.id];
                  const isDone = quizSubmitted[q.id];
                  const isCorrect = selectedOpt === q.correctIndex;
                  const qText = language === 'fa' ? q.question.fa : q.question.en;
                  const options = language === 'fa' ? q.options.fa : q.options.en;
                  const explanation = language === 'fa' ? q.explanation.fa : q.explanation.en;

                  return (
                    <div key={q.id} className="space-y-3 bg-neutral-950 p-4 rounded-xl border border-subtle">
                      <div className="text-xs font-semibold text-primary">{qText}</div>

                      <div className="space-y-1.5">
                        {options.map((opt, optIdx) => {
                          const isOptionSelected = selectedOpt === optIdx;
                          let btnStyle = 'bg-neutral-900 border-subtle text-secondary hover:text-primary';
                          if (isDone) {
                            if (optIdx === q.correctIndex) {
                              btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold';
                            } else if (isOptionSelected) {
                              btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-400';
                            }
                          } else if (isOptionSelected) {
                            btnStyle = 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold';
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={isDone}
                              onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                              className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {isDone && optIdx === q.correctIndex && <Check className="w-4 h-4 text-emerald-400" />}
                              {isDone && isOptionSelected && optIdx !== q.correctIndex && <X className="w-4 h-4 text-rose-400" />}
                            </button>
                          );
                        })}
                      </div>

                      {!isDone ? (
                        <button
                          type="button"
                          disabled={selectedOpt === undefined}
                          onClick={() => setQuizSubmitted((prev) => ({ ...prev, [q.id]: true }))}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Check Answer
                        </button>
                      ) : (
                        <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                          isCorrect ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                        }`}>
                          <div className="font-bold">
                            {isCorrect ? t.learn.quizCorrect : t.learn.quizIncorrect}
                          </div>
                          <div className="text-secondary leading-relaxed">{explanation}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Code-Reading Exercise (if present) */}
            {activeLesson.codeExercise && (
              <div className="bg-card border border-subtle rounded-xl p-5 space-y-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>
                    {language === 'fa' ? activeLesson.codeExercise.title.fa : activeLesson.codeExercise.title.en}
                  </span>
                </span>

                {/* Read-Only C Code Snippet with Syntax Styling */}
                <pre className="bg-neutral-950 p-4 rounded-xl border border-subtle text-xs font-mono text-cyan-300 code-ltr overflow-x-auto leading-relaxed" dir="ltr">
                  <code>{activeLesson.codeExercise.snippet}</code>
                </pre>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-primary">
                    {language === 'fa' ? activeLesson.codeExercise.question.fa : activeLesson.codeExercise.question.en}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(language === 'fa' ? activeLesson.codeExercise.options.fa : activeLesson.codeExercise.options.en).map((opt, idx) => {
                      const isSel = codeAnswer === idx;
                      let btnStyle = 'bg-neutral-900 border-subtle text-secondary';
                      if (codeSubmitted) {
                        if (idx === activeLesson.codeExercise!.correctIndex) {
                          btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold';
                        } else if (isSel) {
                          btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-400';
                        }
                      } else if (isSel) {
                        btnStyle = 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold';
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={codeSubmitted}
                          onClick={() => setCodeAnswer(idx)}
                          className={`p-2.5 rounded-lg border text-xs font-mono transition-colors text-center ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {!codeSubmitted ? (
                    <button
                      type="button"
                      disabled={codeAnswer === null}
                      onClick={() => setCodeSubmitted(true)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Verify Code Output
                    </button>
                  ) : (
                    <div className="p-3 rounded-lg bg-neutral-900 border border-subtle text-xs space-y-1 text-secondary">
                      <div className="font-semibold text-primary">{t.learn.explanation}:</div>
                      <div className="leading-relaxed">
                        {language === 'fa' ? activeLesson.codeExercise.explanation.fa : activeLesson.codeExercise.explanation.en}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Next / Previous Lesson Nav Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-subtle">
              {activeLesson.order > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    const prevL = LESSONS.find((l) => l.order === activeLesson.order - 1);
                    if (prevL) setSelectedLessonId(prevL.id);
                  }}
                  className="px-3 py-1.5 bg-input hover:bg-neutral-800 border border-subtle rounded-lg text-xs font-medium text-secondary hover:text-primary flex items-center gap-1.5 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{t.learn.prevLesson}</span>
                </button>
              ) : <div />}

              {activeLesson.order < LESSONS.length ? (
                <button
                  type="button"
                  onClick={() => {
                    const nextL = LESSONS.find((l) => l.order === activeLesson.order + 1);
                    if (nextL) setSelectedLessonId(nextL.id);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>{t.learn.nextLesson}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : <div />}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SPACED REPETITION FLASHCARDS (SM-2) */}
      {/* ========================================================================= */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Top Review Bar */}
          <div className="flex items-center justify-between bg-card border border-subtle p-4 rounded-xl">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                {t.learn.dailyReview}
              </span>
              <div className="text-sm font-bold text-primary mt-0.5">
                {dueCards.length} {t.learn.cardsDue}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddCardModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.learn.addCard}</span>
            </button>
          </div>

          {/* Active Card Interactive SM-2 Flip Box */}
          {dueCards.length > 0 && currentReviewCard ? (
            <div className="space-y-4">
              <div 
                onClick={() => setIsAnswerRevealed(!isAnswerRevealed)}
                className="cursor-pointer min-h-[220px] bg-gradient-to-br from-card to-neutral-900 border border-subtle hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col justify-between transition-all shadow-md group relative select-none"
              >
                <div className="flex items-center justify-between text-xs text-secondary font-mono">
                  <span className="px-2 py-0.5 rounded bg-neutral-800 border border-subtle">
                    {currentReviewCard.category}
                  </span>
                  <span>Card {activeCardIndex + 1} of {dueCards.length}</span>
                </div>

                <div className="my-6">
                  <div className="text-lg md:text-xl font-bold text-primary leading-relaxed">
                    {currentReviewCard.question}
                  </div>

                  {isAnswerRevealed && (
                    <div className="mt-6 pt-6 border-t border-subtle/60 text-emerald-400 font-medium text-base leading-relaxed">
                      {currentReviewCard.answer}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-muted flex items-center justify-between pt-2">
                  <span>Rep: {currentReviewCard.repetition ?? 0} · Interval: {currentReviewCard.interval ?? 1}d</span>
                  <span className="text-emerald-400 group-hover:underline">
                    {isAnswerRevealed ? 'Click to flip' : t.learn.showAnswer}
                  </span>
                </div>
              </div>

              {/* SM-2 Quality Rating Buttons */}
              {isAnswerRevealed ? (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReviewGrade('again')}
                    className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-center text-xs transition-colors"
                  >
                    <div className="font-bold text-rose-400">{t.learn.ratingAgain}</div>
                    <div className="text-[10px] text-secondary mt-0.5">Reset streak</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewGrade('hard')}
                    className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-center text-xs transition-colors"
                  >
                    <div className="font-bold text-amber-400">{t.learn.ratingHard}</div>
                    <div className="text-[10px] text-secondary mt-0.5">Substantial effort</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewGrade('good')}
                    className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center text-xs transition-colors"
                  >
                    <div className="font-bold text-emerald-400">{t.learn.ratingGood}</div>
                    <div className="text-[10px] text-secondary mt-0.5">Brief hesitation</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewGrade('easy')}
                    className="p-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-center text-xs transition-colors"
                  >
                    <div className="font-bold text-cyan-400">{t.learn.ratingEasy}</div>
                    <div className="text-[10px] text-secondary mt-0.5">Instant recall</div>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAnswerRevealed(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  {t.learn.showAnswer}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card border border-subtle rounded-2xl p-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-primary">{t.learn.noCardsDue}</h3>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                All scheduled flashcards for today have been reviewed. Return tomorrow or add new cards below.
              </p>
            </div>
          )}

          {/* Flashcard Catalog Table */}
          <div className="bg-card border border-subtle rounded-xl p-4 space-y-3 text-xs">
            <span className="font-semibold text-secondary uppercase tracking-wider text-[11px]">
              Flashcard Library ({flashcards.length} Total Cards)
            </span>

            <div className="divide-y divide-subtle/50 max-h-56 overflow-y-auto">
              {flashcards.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-primary truncate">{c.question}</div>
                    <div className="text-[11px] text-muted truncate mt-0.5">{c.answer}</div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-secondary shrink-0">
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-subtle">
                      I: {c.interval ?? 1}d
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(c.id)}
                      className="p-1 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Card Modal */}
          {showAddCardModal && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-card border border-subtle rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>{t.learn.addCard}</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-secondary">{t.learn.cardQuestion}</label>
                    <textarea
                      rows={2}
                      value={newCardQ}
                      onChange={(e) => setNewCardQ(e.target.value)}
                      placeholder="e.g. What is the formula for PWM frequency?"
                      className="w-full p-2 bg-input border border-subtle rounded-lg text-primary text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-secondary">{t.learn.cardAnswer}</label>
                    <textarea
                      rows={3}
                      value={newCardA}
                      onChange={(e) => setNewCardA(e.target.value)}
                      placeholder="e.g. f_clk / (PSC * (TOP + 1))"
                      className="w-full p-2 bg-input border border-subtle rounded-lg text-primary text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-secondary">Category / Tag</label>
                    <input
                      type="text"
                      value={newCardCat}
                      onChange={(e) => setNewCardCat(e.target.value)}
                      placeholder="Microcontrollers"
                      className="w-full px-2.5 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle">
                  <button
                    type="button"
                    onClick={() => setShowAddCardModal(false)}
                    className="px-3 py-1.5 text-xs text-secondary hover:text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateFlashcard}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Save Card
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CODE-READING LAB */}
      {/* ========================================================================= */}
      {activeTab === 'code-reading' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-card border border-subtle rounded-xl p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Embedded Systems Code-Reading Challenges
            </span>
            <p className="text-xs text-secondary mt-1">
              Read short C and register-manipulation snippets and deduce the exact hardware or memory output.
            </p>
          </div>

          <div className="space-y-4">
            {LESSONS.filter((l) => l.codeExercise).map((lesson) => {
              const ex = lesson.codeExercise!;
              const qText = language === 'fa' ? ex.question.fa : ex.question.en;
              const options = language === 'fa' ? ex.options.fa : ex.options.en;
              const explanation = language === 'fa' ? ex.explanation.fa : ex.explanation.en;

              return (
                <div key={lesson.id} className="bg-card border border-subtle rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                    <span className="font-bold">EXERCISE // {lesson.title.en}</span>
                    <span className="text-secondary">{lesson.category}</span>
                  </div>

                  <pre className="bg-neutral-950 p-3.5 rounded-lg border border-subtle text-xs font-mono text-cyan-300 code-ltr overflow-x-auto leading-relaxed" dir="ltr">
                    <code>{ex.snippet}</code>
                  </pre>

                  <div className="text-xs font-semibold text-primary">{qText}</div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    {options.map((opt, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border text-center font-bold ${
                          i === ex.correctIndex
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : 'bg-neutral-900 border-subtle text-secondary'
                        }`}
                      >
                        {opt} {i === ex.correctIndex && '(Answer)'}
                      </div>
                    ))}
                  </div>

                  <div className="bg-neutral-950 p-3 rounded-lg border border-subtle text-xs text-secondary leading-relaxed font-mono">
                    <span className="text-primary font-bold">Analysis: </span>
                    {explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
