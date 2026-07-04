"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Newspaper,
  Sparkles,
  ChevronRight,
  Clock,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatDateCN } from "@/lib/utils";

interface ArticleItem {
  id: string;
  title: string;
  wordCount: number;
  difficulty: number;
  topic: string | null;
  createdAt: string;
  completed: boolean;
  score: number | null;
  totalQuestions: number;
}

export default function ReadingPage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/reading");
      const json = await res.json();
      if (json.ok) setArticles(json.data || []);
    } catch (e) {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const generateNewArticle = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/reading/generate", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        window.location.href = `/reading/${json.data.id}`;
      } else {
        setError(json.error || "生成失败，请稍后重试");
        setGenerating(false);
      }
    } catch (e) {
      setError("网络错误");
      setGenerating(false);
    }
  };

  const difficultyLabel = (d: number) => {
    if (d <= 3) return { label: "简单", color: "tag-green" };
    if (d <= 6) return { label: "中等", color: "tag-yellow" };
    return { label: "困难", color: "tag-red" };
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">阅读训练</h1>
          <p className="text-ink-secondary text-sm mt-1">
            每3天AI自动生成一篇高考风格阅读
          </p>
        </div>
        <button
          onClick={generateNewArticle}
          disabled={generating}
          className="btn-primary gap-2"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              生成新文章
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {articles.length === 0 ? (
        <div className="text-center py-16">
          <Newspaper className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ink mb-2">还没有阅读文章</h2>
          <p className="text-ink-secondary mb-6">
            先学习一些单词，然后点击按钮生成阅读文章
          </p>
          <Link href="/study" className="btn-primary">
            先去学单词
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => {
            const diff = difficultyLabel(article.difficulty);
            return (
              <Link
                key={article.id}
                href={`/reading/${article.id}`}
                className="study-card flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Newspaper className="w-5 h-5 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-ink truncate group-hover:text-primary-600 transition-colors">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-ink-tertiary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.wordCount}词
                    </span>
                    <span className={diff.color}>{diff.label}</span>
                    {article.topic && <span className="tag-gray">{article.topic}</span>}
                    {article.completed && article.score !== null && (
                      <span className="tag-green">
                        {article.score}/{article.totalQuestions}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-tertiary group-hover:text-ink transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
