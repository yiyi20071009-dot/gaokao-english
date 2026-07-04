"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDateCN, getDayNumber, daysUntil, cn } from "@/lib/utils";
import {
  Flame,
  BookOpen,
  CheckCircle2,
  Target,
  Calendar,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface TodayData {
  dayNumber: number;
  date: string;
  streak: number;
  newCount: number;
  reviewCount: number;
  completed: boolean;
  recognitionRate: number;
  totalLearned: number;
  daysUntilExam: number;
}

export default function HomePage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/study/today");
        const json = await res.json();
        if (json.ok) setData(json.data);
      } catch (e) {
        console.error("Failed to load today data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!data) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 text-ink-tertiary mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-ink mb-2">无法加载学习数据</h2>
        <p className="text-ink-secondary mb-4">请确保已初始化数据库</p>
      </div>
    );
  }

  const totalWords = data.todayPlanned || (data.newCount + data.reviewCount || 1);
  const completedWords = data.todayLearned ?? 0;
  const progressMax = Math.max(totalWords, completedWords);
  const progressValue = Math.min(completedWords, progressMax);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink">
            Day {data.dayNumber}
          </h1>
          <p className="text-ink-secondary mt-1">{formatDateCN(new Date(data.date))}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-accent-600 font-semibold">
            <Flame className="w-5 h-5" />
            <span className="text-lg">{data.streak}天</span>
          </div>
          <p className="text-xs text-ink-tertiary mt-1">连续学习</p>
        </div>
      </div>

      {/* Exam Countdown */}
      <div className="study-card flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <Target className="w-6 h-6 text-red-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-ink-secondary">距高考英语考试</p>
          <p className="text-2xl font-bold text-red-500">{data.daysUntilExam}天</p>
        </div>
        <ProgressBar
          value={3500 - (3500 - data.totalLearned)}
          max={3500}
          color="accent"
          size="sm"
          showLabel={false}
        />
      </div>

      {/* Today's Plan */}
      <div className="study-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-ink">今日学习计划</h2>
          {data.completed && (
            <span className="tag-green ml-auto text-xs">已完成</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-primary-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-primary-600">{data.newCount}</p>
            <p className="text-sm text-primary-700 mt-1">新单词</p>
          </div>
          <div className="bg-accent-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-accent-600">{data.reviewCount}</p>
            <p className="text-sm text-accent-700 mt-1">复习单词</p>
          </div>
        </div>

        {!data.completed && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-ink-secondary mb-1">
              <span>今日进度</span>
              <span>{completedWords}/{totalWords}</span>
            </div>
            <ProgressBar
              value={progressValue}
              max={progressMax}
              color="primary"
            />
          </div>
        )}

        <div className="flex gap-3">
          {!data.completed ? (
            <>
              <Link href="/study" className="btn-primary flex-1 gap-2">
                <BookOpen className="w-4 h-4" />
                {data.newCount > 0 ? "开始学习" : "复习单词"}
              </Link>
              {data.totalLearned > 0 && (
                <Link href="/reading" className="btn-secondary gap-2">
                  <Sparkles className="w-4 h-4" />
                  阅读
                </Link>
              )}
            </>
          ) : (
            <Link href="/stats" className="btn-secondary flex-1 gap-2">
              <CheckCircle2 className="w-4 h-4" />
              查看今日数据
            </Link>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="study-card text-center">
          <p className="stat-value text-primary-500">{data.totalLearned}</p>
          <p className="stat-label">已学单词</p>
        </div>
        <div className="study-card text-center">
          <p className="stat-value text-accent-500">
            {Math.round(data.recognitionRate * 100)}%
          </p>
          <p className="stat-label">认识率</p>
        </div>
        <div className="study-card text-center">
          <p className="stat-value text-yellow-500">{data.dayNumber}</p>
          <p className="stat-label">学习天数</p>
        </div>
        <div className="study-card text-center">
          <p className="stat-value text-ink">
            {Math.max(0, 3500 - data.totalLearned)}
          </p>
          <p className="stat-label">剩余单词</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/reading"
          className="study-card flex items-center justify-between group"
        >
          <div>
            <NewspaperIcon className="w-5 h-5 text-primary-500 mb-1" />
            <p className="font-medium text-sm">阅读训练</p>
            <p className="text-xs text-ink-tertiary">AI生成高考阅读</p>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-tertiary group-hover:text-ink transition-colors" />
        </Link>
        <Link
          href="/stats"
          className="study-card flex items-center justify-between group"
        >
          <div>
            <BarChartIcon className="w-5 h-5 text-accent-500 mb-1" />
            <p className="font-medium text-sm">学习数据</p>
            <p className="text-xs text-ink-tertiary">查看进步曲线</p>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-tertiary group-hover:text-ink transition-colors" />
        </Link>
      </div>
    </div>
  );
}

function NewspaperIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
    </svg>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
