"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, AlertCircle, HelpCircle, Volume2,
  ChevronLeft, ChevronRight, Loader2, Clock, Eye,
} from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { speakWord as speakWordFn } from "@/lib/audio";
import { formatDateCN, shuffleArray } from "@/lib/utils";
import type { StudyWord, ReviewResult, TodayPlan } from "@/types";

export default function StudyPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<Record<string, ReviewResult>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shuffledWords, setShuffledWords] = useState<StudyWord[]>([]);
  const [studyPhase, setStudyPhase] = useState<"preview" | "learning" | "completed">("preview");
  const [timer, setTimer] = useState(0);
  const unknownWordIdsRef = useRef<Set<string>>(new Set());
  // unknownWords computed from results in render

  useEffect(() => {
    fetchTodayPlan();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (studyPhase !== "preview" || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) return 0;
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [studyPhase, timer]);

  const fetchTodayPlan = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/study/today");
      const json = await res.json();
      if (json.ok && json.data) {
        setPlan(json.data);
        const allW = [...json.data.newWords, ...json.data.reviewWords];
        if (allW.length > 0) {
          // Timer: 15s per word, min 60s, max 300s (5min)
          setTimer(Math.min(300, Math.max(60, allW.length * 15)));
          setShuffledWords(shuffleArray(allW));
          setStudyPhase("preview");
        }
      } else {
        setError(json.error || "无法加载学习计划");
      }
    } catch (e) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const allWords = plan ? [...plan.newWords, ...plan.reviewWords] : [];
  const currentWord = allWords[currentIndex];
  const totalCount = allWords.length;
  const reviewType = currentWord?.reviewType || "new";

  const startLearning = () => {
    setCurrentIndex(0);
    setStartTime(Date.now());
    setStudyPhase("learning");
    setCompleted(false);
  };

  const respond = useCallback(async (result: ReviewResult) => {
    if (!currentWord || responding) return;
    setResponding(true);
    const responseTime = Date.now() - startTime;

    try {
      const res = await fetch("/api/study/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: currentWord.id,
          result,
          responseTimeMs: responseTime,
          reviewType,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setResults((prev) => ({ ...prev, [currentWord.id]: result }));
        // Track unknown words
        if (result === "unknown") {
          setUnknownWordIds((prev) => new Set(prev).add(currentWord.id));
        }
        setShowAnswer(false);
        if (currentIndex < totalCount - 1) {
          setCurrentIndex((i) => i + 1);
          setStartTime(Date.now());
        } else {
          await completeSession();
          // unknownWords will be computed from results in render
          const unkWords = allWords.filter((w) => unknownWordIds.has(w.id) || result === "unknown" && w.id === currentWord.id);

          setStudyPhase("completed");
        }
      }
    } catch (e) {
      console.error("Review failed", e);
    } finally {
      setResponding(false);
    }
  }, [currentWord, currentIndex, totalCount, responding, startTime, reviewType, allWords]);

  const completeSession = async () => {
    try {
      await fetch("/api/study/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.error("Failed to complete session", e);
    }
  };

  const reviewUnknownWords = (unknownWordsList: StudyWord[]) => {
    setShuffledWords(shuffleArray(unknownWordsList));
    if (unknownWordsList.length === 0) return;
    const time = Math.min(300, Math.max(60, unknownWordsList.length * 15));
    setTimer(time);
    setUnknownWordIds(new Set());
    setStudyPhase("preview");
    setCompleted(false);
    setPlan({
      ...plan!,
      newWords: [],
      reviewWords: unknownWordsList,
      newCount: 0,
      reviewCount: unknownWordsList.length,
    });
  };

  const speakWord = () => {
    if (!currentWord) return;
    speakWordFn(currentWord.word);
  };

  const speakWordFromList = (word: StudyWord) => {
    speakWordFn(word.word);
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-ink font-medium">{error}</p>
        <button onClick={fetchTodayPlan} className="btn-primary mt-4">重试</button>
      </div>
    );
  }

  // ─── PREVIEW PHASE ──────────────────────────────────────
  if (studyPhase === "preview") {
    const words = shuffledWords.length > 0 ? shuffledWords : allWords;
    const timerDisplay = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, "0")}`;
    const timerPercent = timer > 0
      ? Math.min(100, Math.round((1 - timer / Math.max(1, words.length * 15)) * 100))
      : 0;

    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-ink mb-2">⏱ 限时背诵</h1>
          <p className="text-ink-secondary text-sm">
            快速浏览以下 {words.length} 个单词，记住它们！
          </p>
        </div>

        {/* Timer */}
        <div className="study-card mb-4 text-center py-6">
          <div className={`text-5xl font-bold mb-2 font-mono ${
            timer <= 10 ? "text-red-500 animate-pulse" : "text-primary-600"
          }`}>
            {timerDisplay}
          </div>
          <p className="text-sm text-ink-tertiary">
            {timer <= 10 ? "⏰ 时间快到了！" : "时间到后自动开始学习"}
          </p>
          <ProgressBar value={timerPercent} max={100} color={timer <= 10 ? "red" : "primary"} size="sm" />
        </div>

        {/* Word List */}
        <div className="study-card mb-4 max-h-[50vh] overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 gap-2">
            {words.map((w, idx) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-tertiary transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-tertiary w-5 text-right font-mono">{idx + 1}</span>
                  <div>
                    <span className="font-medium text-ink">{w.word}</span>
                    {w.phonetics && (
                      <span className="text-xs text-ink-tertiary ml-2">{w.phonetics}</span>
                    )}
                    <p className="text-xs text-ink-secondary mt-0.5">{w.meaning}</p>
                  </div>
                </div>
                <button
                  onClick={() => speakWordFromList(w)}
                  className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="发音"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={startLearning}
          className="btn-primary w-full gap-2 text-lg py-4"
        >
          {timer <= 0 ? "⏰ 时间到！开始学习" : "📖 开始学习"}
        </button>
      </div>
    );
  }

  // ─── LEARNING PHASE ─────────────────────────────────────
  if (studyPhase === "learning") {
    if (!plan || allWords.length === 0) {
      return (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-accent-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ink mb-2">今日学习已完成</h2>
          <p className="text-ink-secondary mb-6">所有单词都已复习完毕</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push("/reading")} className="btn-primary">
              开始阅读
            </button>
            <button onClick={() => router.push("/")} className="btn-secondary">
              返回首页
            </button>
          </div>
        </div>
      );
    }

    if (!currentWord) return <LoadingSpinner />;

    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-secondary">{currentIndex + 1} / {totalCount}</span>
            <span className="text-xs text-ink-tertiary">{reviewType === "new" ? "新词" : "复习"}</span>
          </div>
          <ProgressBar value={currentIndex + 1} max={totalCount} color="primary" size="sm" />
        </div>

        <div className="study-card mb-6">
          <div className="text-center py-8">
            <p className="text-3xl md:text-4xl font-bold text-ink mb-3 tracking-tight">
              {currentWord.word}
            </p>
            {currentWord.phonetics && (
              <p className="text-lg text-ink-secondary mb-2 font-mono">{currentWord.phonetics}</p>
            )}
            <button onClick={speakWord} className="btn-ghost mx-auto mb-4 gap-2">
              <Volume2 className="w-4 h-4" />发音
            </button>
          </div>

          {!showAnswer ? (
            <div className="text-center py-4">
              <button
                onClick={() => setShowAnswer(true)}
                className="btn-secondary w-full gap-2"
              >
                <HelpCircle className="w-4 h-4" />显示释义
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-4 space-y-3 animate-slide-up">
              <div className="grid grid-cols-2 gap-3">
                {currentWord.partOfSpeech && (
                  <div>
                    <p className="text-xs text-ink-tertiary mb-1">词性</p>
                    <p className="text-sm font-medium text-ink">{currentWord.partOfSpeech}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-ink-tertiary mb-1">中文释义</p>
                  <p className="text-base font-medium text-ink">{currentWord.meaning}</p>
                </div>
              </div>

              {currentWord.gaokaoMeaning && (
                <div>
                  <p className="text-xs text-ink-tertiary mb-1">高考常见意思</p>
                  <p className="text-sm text-primary-700 bg-primary-50 rounded px-2 py-1">{currentWord.gaokaoMeaning}</p>
                </div>
              )}

              {currentWord.examples && currentWord.examples.length > 0 && (
                <div>
                  <p className="text-xs text-ink-tertiary mb-1">高考例句</p>
                  <ul className="space-y-1">
                    {currentWord.examples.slice(0, 2).map((ex, i) => (
                      <li key={i} className="text-sm text-ink-secondary italic leading-relaxed">&quot;{ex}&quot;</li>
                    ))}
                  </ul>
                </div>
              )}

              {currentWord.collocations && currentWord.collocations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {currentWord.collocations.slice(0, 4).map((col, i) => (
                    <span key={i} className="tag-blue text-xs">{col}</span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                <button onClick={() => respond("known")} disabled={responding}
                  className="btn-success text-sm gap-1.5 py-2.5">
                  {responding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  认识
                </button>
                <button onClick={() => respond("blurred")} disabled={responding}
                  className="btn-secondary text-sm gap-1.5 py-2.5 border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                  <HelpCircle className="w-3.5 h-3.5" />模糊
                </button>
                <button onClick={() => respond("unknown")} disabled={responding}
                  className="btn-danger text-sm gap-1.5 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5" />不认识
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button onClick={() => { if (currentIndex > 0) setCurrentIndex((i) => i - 1); }}
            disabled={currentIndex === 0} className="btn-ghost gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" />上一个
          </button>
          <span className="text-xs text-ink-tertiary self-center">{reviewType === "new" ? "新词" : "复习"}</span>
          <button onClick={() => router.push("/")} className="btn-ghost gap-1 text-sm">
            退出<ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── COMPLETED PHASE ────────────────────────────────────
  if (studyPhase === "completed") {
    const known = Object.values(results).filter((r) => r === "known").length;
    const blurred = Object.values(results).filter((r) => r === "blurred").length;
    const unknown = Object.values(results).filter((r) => r === "unknown").length;
    const rate = totalCount > 0 ? Math.round((known / totalCount) * 100) : 0;
    const unknownWordsList = allWords.filter((w) =>
      Object.entries(results).some(([id, r]) => r === "unknown" && id === w.id)
    );
    const hasUnknown = unknownWordsList.length > 0;

    return (
      <div className="text-center py-12 animate-fade-in">
        <CheckCircle2 className="w-16 h-16 text-accent-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-ink mb-2">学习完成!</h2>
        <p className="text-ink-secondary mb-8">{formatDateCN(new Date())} 的学习任务已完成</p>

        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-4">
          <div className="study-card">
            <p className="text-2xl font-bold text-accent-600">{known}</p>
            <p className="text-xs text-ink-secondary">认识</p>
          </div>
          <div className="study-card">
            <p className="text-2xl font-bold text-yellow-600">{blurred}</p>
            <p className="text-xs text-ink-secondary">模糊</p>
          </div>
          <div className="study-card">
            <p className="text-2xl font-bold text-red-600">{unknown}</p>
            <p className="text-xs text-ink-secondary">不认识</p>
          </div>
        </div>

        <p className="text-lg font-semibold mb-6">
          认识率: <span className={rate >= 80 ? "text-accent-600" : "text-yellow-600"}>{rate}%</span>
        </p>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          {hasUnknown && (
            <button onClick={() => reviewUnknownWords(unknownWordsList)} className="btn-primary gap-2">
              <Eye className="w-4 h-4" />
              重新限时背诵 ({unknownWordsList.length}个不会的单词)
            </button>
          )}
          <button onClick={() => router.push("/reading")} className="btn-secondary">
            开始阅读训练
          </button>
          <button onClick={() => router.push("/")} className="btn-ghost">
            返回首页
          </button>
        </div>
      </div>
    );
  }
}
