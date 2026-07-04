"use client";

import { useState, useEffect } from "react";
import {
  Flame,
  BookOpen,
  Target,
  Eye,
  Brain,
  TrendingUp,
  Clock,
} from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { StatsOverview, StatsHistory } from "@/types";

export default function StatsPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [history, setHistory] = useState<StatsHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const json = await res.json();
      if (json.ok) {
        setOverview(json.data.overview);
        setHistory(json.data.history);
      }
    } catch (e) {
      console.error("Stats load failed", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!overview) {
    return (
      <div className="text-center py-16">
        <p className="text-ink-secondary">暂无学习数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink">学习数据</h1>
        <p className="text-ink-secondary text-sm mt-1">追踪你的进步轨迹</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="study-card text-center">
          <Flame className="w-5 h-5 text-orange-500 mx-auto mb-2" />
          <p className="stat-value text-orange-500">{overview.streak}</p>
          <p className="stat-label">连续天数</p>
        </div>
        <div className="study-card text-center">
          <BookOpen className="w-5 h-5 text-primary-500 mx-auto mb-2" />
          <p className="stat-value text-primary-500">{overview.totalWordsLearned}</p>
          <p className="stat-label">已学单词</p>
        </div>
        <div className="study-card text-center">
          <Brain className="w-5 h-5 text-accent-500 mx-auto mb-2" />
          <p className="stat-value text-accent-500">{Math.round(overview.recognitionRate * 100)}%</p>
          <p className="stat-label">认识率</p>
        </div>
        <div className="study-card text-center">
          <Target className="w-5 h-5 text-primary-600 mx-auto mb-2" />
          <p className="stat-value text-primary-600">{overview.totalWordsMastered}</p>
          <p className="stat-label">已掌握</p>
        </div>
      </div>

      {/* Reading Stats */}
      <div className="study-card">
        <h2 className="font-semibold text-ink mb-4">阅读数据</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="stat-value text-ink">{Math.round(overview.readingAccuracy * 100)}%</p>
            <p className="stat-label">阅读正确率</p>
          </div>
          <div>
            <p className="stat-value text-ink">{overview.avgWpm}</p>
            <p className="stat-label">阅读速度 (WPM)</p>
          </div>
          <div>
            <p className="stat-value text-ink">{Math.round(overview.forgettingRate * 100)}%</p>
            <p className="stat-label">遗忘率</p>
          </div>
        </div>
      </div>

      {/* Progress to 3500 */}
      <div className="study-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-ink">高考3500词进度</h2>
          <span className="text-sm text-ink-secondary">
            {overview.totalWordsLearned}/3500
          </span>
        </div>
        <ProgressBar
          value={overview.totalWordsLearned}
          max={3500}
          color="primary"
          size="md"
          showLabel
        />
      </div>

      {/* 30-Day Curve (simplified visualization) */}
      {history && history.dates.length > 0 && (
        <div className="study-card">
          <h2 className="font-semibold text-ink mb-4">最近30天学习曲线</h2>
          
          {/* Mini chart showing daily new words */}
          <div className="mb-6">
            <p className="text-xs text-ink-tertiary mb-2">每日新学单词</p>
            <div className="flex items-end gap-0.5 h-20">
              {history.newWords.slice(-30).map((count, i) => {
                const max = Math.max(...history.newWords.slice(-30), 1);
                const height = (count / max) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary-200 rounded-t hover:bg-primary-400 transition-colors relative group"
                    style={{ height: `${height}%`, minHeight: count > 0 ? "4px" : "1px" }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-ink-secondary opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recognition rate trend */}
          <div>
            <p className="text-xs text-ink-tertiary mb-2">认识率趋势</p>
            <div className="flex items-end gap-0.5 h-16">
              {history.knownRate.slice(-30).map((rate, i) => {
                const height = rate * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-accent-200 rounded-t hover:bg-accent-400 transition-colors relative group"
                    style={{ height: `${height}%`, minHeight: "2px" }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-ink-secondary opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {Math.round(rate * 100)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Study breakdown */}
      <div className="study-card">
        <h2 className="font-semibold text-ink mb-3">学习行为分析</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-secondary">总复习次数</span>
            <span className="font-medium">
              {history?.reviewWords.reduce((a, b) => a + b, 0) || 0}次
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-secondary">总学习时长</span>
            <span className="font-medium">
              {overview.totalStudySeconds > 3600
                ? `${Math.round(overview.totalStudySeconds / 3600)}小时`
                : `${Math.round(overview.totalStudySeconds / 60)}分钟`}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-secondary">每日平均新词</span>
            <span className="font-medium">
              {overview.totalWordsLearned > 0 && overview.streak > 0
                ? Math.round(overview.totalWordsLearned / overview.streak)
                : 0}词
            </span>
          </div>
        </div>
      </div>

      {/* Target check */}
      <div className="study-card bg-primary-50 border-primary-100">
        <h2 className="font-semibold text-primary-800 mb-2">目标追踪</h2>
        <p className="text-sm text-primary-700 leading-relaxed">
          目标: 高考英语140分
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm text-primary-600">
          <TrendingUp className="w-4 h-4" />
          <span>
            每日需学
            {Math.max(1, Math.round((3500 - overview.totalWordsLearned) / Math.max(1, 55 - overview.streak)))}
            个新单词以按时完成
          </span>
        </div>
      </div>
    </div>
  );
}
