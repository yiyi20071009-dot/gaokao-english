"use client";

import { speakText } from "@/lib/audio";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Volume2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
  Loader2,
  BookOpen,
} from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { ArticleData, QuestionData, AnalysisResult } from "@/types";

export default function ReadingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"reading" | "questions" | "analysis">("reading");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [lookupWords, setLookupWords] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({});
  const questionStartRef = useRef(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});

  const articleId = params.id;

  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      const res = await fetch(`/api/reading/${articleId}`);
      const json = await res.json();
      if (json.ok) setArticle(json.data);
      else setError(json.error || "文章不存在");
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = async (word: string) => {
    // Clean the word
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return;

    const key = `${cleanWord}_${Date.now()}`;
    setShowTranslation((prev) => {
      const newState = { ...prev };
      // Toggle this word's translation
      if (newState[word]) {
        delete newState[word];
      } else {
        newState[word] = true;
      }
      return newState;
    });

    if (!lookupWords.includes(cleanWord)) {
      setLookupWords((prev) => [...prev, cleanWord]);
    }

    // Fetch translation if not already cached
    if (!translations[cleanWord]) {
      try {
        const res = await fetch(`/api/words/${encodeURIComponent(cleanWord)}`);
        const json = await res.json();
        if (json.ok && json.data) {
          setTranslations((prev) => ({
            ...prev,
            [cleanWord]: json.data.meaning || json.data.gaokaoMeaning || cleanWord,
          }));
        }
      } catch (e) {
        // silently fail
      }
    }
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!article) return;

    let correct = 0;
    article.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) correct++;
    });
    setScore(correct);

    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    // Submit results
    try {
      await fetch("/api/reading/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          timeSpent,
          score: correct,
          totalQuestions: article.questions.length,
          answers: article.questions.map((q) => ({
            questionId: q.id,
            userAnswer: selectedAnswers[q.id] || "",
            isCorrect: selectedAnswers[q.id] === q.correctAnswer,
            timeSpent: questionTimes[q.id] || 0,
          })),
          lookupWords,
        }),
      });
    } catch (e) {
      console.error("Submit failed", e);
    }

    // Trigger AI analysis
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "analysis",
          articleId,
          answers: article.questions.map((q) => ({
            questionId: q.id,
            userAnswer: selectedAnswers[q.id] || "",
            isCorrect: selectedAnswers[q.id] === q.correctAnswer,
          })),
          lookupWords,
        }),
      });
      const json = await res.json();
      if (json.ok && json.data) setAnalysis(json.data);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const _legacySpeak = (text: string) => {
    if (!text || typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  if (loading) return <LoadingSpinner />;

  if (error || !article) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-ink font-medium">{error || "文章不存在"}</p>
        <button onClick={() => router.push("/reading")} className="btn-primary mt-4">
          返回阅读列表
        </button>
      </div>
    );
  }

  // ─── READING MODE ──────────────────────────────────────
  if (mode === "reading") {
    const paragraphs = article.content.split("\n").filter(Boolean);

    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <button
          onClick={() => router.push("/reading")}
          className="btn-ghost gap-1 mb-4 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          返回
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-ink">{article.title}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-ink-tertiary">
              <span>{article.wordCount}词</span>
              <span>{article.topic}</span>
              <button
                onClick={() => speakText(article.content.slice(0, 500))}
                className="btn-ghost gap-1 text-xs"
              >
                <Volume2 className="w-3 h-3" />
                朗读
              </button>
            </div>
          </div>
        </div>

        <div className="study-card mb-6">
          <p className="text-xs text-ink-tertiary mb-3">
            点击单词查看中文释义（再次点击隐藏）
          </p>
          <div className="reading-text">
            {paragraphs.map((para, pIdx) => (
              <p key={pIdx}>
                {para.split(/(\s+)/).map((token, tIdx) => {
                  const isWord = /^[a-zA-Z]/.test(token);
                  if (!isWord) return <span key={tIdx}>{token}</span>;

                  const show = showTranslation[token];
                  return (
                    <span
                      key={tIdx}
                      onClick={() => handleWordClick(token)}
                      className={show ? "word-translated" : "word-interactive"}
                      title={show && translations[token.toLowerCase()] ? translations[token.toLowerCase()] : undefined}
                    >
                      {token}
                      {show && translations[token.toLowerCase()] && (
                        <span className="text-xs text-primary-500 ml-1 font-normal">
                          ({translations[token.toLowerCase()]})
                        </span>
                      )}
                    </span>
                  );
                })}
              </p>
            ))}
          </div>
        </div>

        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 z-40">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setMode("questions")}
              className="btn-primary w-full gap-2 shadow-lg"
            >
              <BookOpen className="w-4 h-4" />
              开始答题
            </button>
          </div>
        </div>
        <div className="h-20" /> {/* spacing for fixed button */}
      </div>
    );
  }

  // ─── QUESTIONS MODE ────────────────────────────────────
  if (mode === "questions") {
    const typeLabels: Record<string, string> = {
      detail: "细节题",
      inference: "推断题",
      mainIdea: "主旨题",
      wordGuess: "词义猜测题",
      authorView: "作者观点题",
    };

    const allAnswered = article.questions.every((q) => selectedAnswers[q.id]);

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setMode("reading")} className="btn-ghost gap-1">
            <ChevronLeft className="w-4 h-4" />
            返回阅读
          </button>
          <h1 className="text-lg font-semibold">阅读理解题</h1>
        </div>

        <div className="space-y-6 mb-24">
          {article.questions.map((q, index) => (
            <div key={q.id} className="study-card">
              <div className="flex items-center gap-2 mb-3">
                <span className="tag-blue text-xs">{typeLabels[q.type] || q.type}</span>
                <span className="text-xs text-ink-tertiary">第{index + 1}题</span>
              </div>
              <p className="text-ink font-medium mb-4 leading-relaxed">
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oIdx) => {
                  const letter = String.fromCharCode(65 + oIdx);
                  const isSelected = selectedAnswers[q.id] === letter;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => {
                        if (!submitted) {
                          handleSelectAnswer(q.id, letter);
                          const elapsed = Date.now() - questionStartRef.current;
                          setQuestionTimes((prev) => ({
                            ...prev,
                            [q.id]: Math.round(elapsed / 1000),
                          }));
                          questionStartRef.current = Date.now();
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? "border-primary-400 bg-primary-50 text-primary-700"
                          : "border-gray-100 hover:border-gray-200 hover:bg-surface-tertiary"
                      } ${submitted ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <span className="font-medium mr-2">{letter}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  selectedAnswers[q.id] === q.correctAnswer
                    ? "bg-accent-50 text-accent-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  <p className="font-medium">
                    {selectedAnswers[q.id] === q.correctAnswer ? "正确!" : `错误. 正确答案: ${q.correctAnswer}`}
                  </p>
                  {q.explanation && (
                    <p className="mt-1 text-xs opacity-80">{q.explanation}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!submitted ? (
          <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 z-40">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={handleSubmit}
                disabled={!allAnswered}
                className={`btn-primary w-full gap-2 shadow-lg ${
                  !allAnswered ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {allAnswered ? "提交答案" : "请回答所有题目"}
              </button>
            </div>
          </div>
        ) : (
          <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 z-40">
            <div className="max-w-2xl mx-auto flex gap-2">
              <button
                onClick={() => setMode("analysis")}
                className="btn-primary flex-1 gap-2 shadow-lg"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4" />
                    查看分析
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        <div className="h-20" />
      </div>
    );
  }

  // ─── ANALYSIS MODE ─────────────────────────────────────
  if (mode === "analysis") {
    const totalQuestions = article.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    const typeLabels: Record<string, string> = {
      detail: "细节题", inference: "推断题", mainIdea: "主旨题",
      wordGuess: "词义猜测题", authorView: "作者观点题",
    };

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <button onClick={() => setMode("questions")} className="btn-ghost gap-1 mb-4 text-sm">
          <ChevronLeft className="w-4 h-4" />
          返回题目
        </button>

        <div className="study-card mb-6 text-center py-8">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            percentage >= 80 ? "bg-accent-100" : percentage >= 60 ? "bg-yellow-100" : "bg-red-100"
          }`}>
            <span className={`text-3xl font-bold ${
              percentage >= 80 ? "text-accent-600" : percentage >= 60 ? "text-yellow-600" : "text-red-600"
            }`}>
              {percentage}%
            </span>
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">阅读分析报告</h2>
          <p className="text-ink-secondary">
            {score}/{totalQuestions} 正确 | 用时 {(Date.now() - startTime) / 1000 > 60
              ? `${Math.floor((Date.now() - startTime) / 60000)}分`
              : `${Math.round((Date.now() - startTime) / 1000)}秒`}
          </p>
        </div>

        {/* Question breakdown */}
        <div className="study-card mb-4">
          <h3 className="font-semibold mb-3">各题详情</h3>
          <div className="space-y-3">
            {article.questions.map((q, idx) => (
              <div key={q.id} className="flex items-center gap-3">
                {selectedAnswers[q.id] === q.correctAnswer ? (
                  <CheckCircle2 className="w-5 h-5 text-accent-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{q.question}</p>
                  <p className="text-xs text-ink-tertiary">
                    {typeLabels[q.type] || q.type}
                    {selectedAnswers[q.id] !== q.correctAnswer && (
                      <span className="text-red-500 ml-2">
                        你选: {selectedAnswers[q.id]} | 正确: {q.correctAnswer}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        {analysis && (
          <div className="space-y-4">
            {analysis.weakWords.length > 0 && (
              <div className="study-card">
                <h3 className="font-semibold mb-2">薄弱词汇</h3>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.weakWords.map((w, i) => (
                    <span key={i} className="tag-red">{w}</span>
                  ))}
                </div>
              </div>
            )}

            {analysis.weakSentencePatterns.length > 0 && (
              <div className="study-card">
                <h3 className="font-semibold mb-2">薄弱句型</h3>
                <ul className="list-disc list-inside text-sm text-ink-secondary space-y-1">
                  {analysis.weakSentencePatterns.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.errorTypes.length > 0 && (
              <div className="study-card">
                <h3 className="font-semibold mb-2">错误类型</h3>
                <ul className="list-disc list-inside text-sm text-ink-secondary space-y-1">
                  {analysis.errorTypes.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.recommendation && (
              <div className="study-card border-l-4 border-primary-400">
                <h3 className="font-semibold mb-2">学习建议</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {analysis.recommendation}
                </p>
              </div>
            )}
          </div>
        )}

        {analyzing && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
            <p className="text-sm text-ink-secondary">AI正在分析你的阅读表现...</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={() => router.push("/study")} className="btn-primary flex-1">
            继续学单词
          </button>
          <button onClick={() => router.push("/reading")} className="btn-secondary flex-1">
            更多阅读
          </button>
        </div>
      </div>
    );
  }
}
