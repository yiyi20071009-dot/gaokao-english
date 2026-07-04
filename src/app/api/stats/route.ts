import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/auth";
import type { StatsOverview, StatsHistory } from "@/types";

export async function GET() {
  try {
    const user = await ensureDemoUser();

    // Streak
    const streak = user.studyDays || 0;

    // Total words learned
    const totalWordsLearned = await prisma.wordProgress.count({
      where: { userId: user.id, reviewCount: { gt: 0 } },
    });

    // Total words mastered
    const totalWordsMastered = await prisma.wordProgress.count({
      where: { userId: user.id, status: "mastered" },
    });

    // Recognition rate
    const allProgress = await prisma.wordProgress.findMany({
      where: { userId: user.id, reviewCount: { gt: 0 } },
    });
    const recognitionRate = allProgress.length > 0
      ? allProgress.filter((p) => p.status === "mastered" || p.status === "reviewing").length / allProgress.length
      : 0;

    // Reading stats
    const readingSessions = await prisma.readingSession.findMany({
      where: { userId: user.id, completed: true },
    });
    const totalReadingSessions = readingSessions.length;
    const totalCorrect = readingSessions.reduce((s, ses) => s + (ses.score ?? 0), 0);
    const totalQuestions = readingSessions.reduce((s, ses) => s + ses.totalQuestions, 0);
    const readingAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;
    const avgWpm = readingSessions.length > 0
      ? Math.round(readingSessions.reduce((s, r) => s + (r.wpm ?? 0), 0) / readingSessions.length)
      : 0;

    // Forgetting rate (words that had lapses)
    const totalWithLapses = allProgress.filter((p) => p.lapses > 0).length;
    const forgettingRate = allProgress.length > 0 ? totalWithLapses / allProgress.length : 0;

    // Total study time
    const studyHistory = await prisma.studyHistory.findMany({
      where: { userId: user.id },
    });
    const totalStudySeconds = studyHistory.reduce((s, h) => s + h.totalTime, 0);

    // 30-day history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentHistory = await prisma.studyHistory.findMany({
      where: {
        userId: user.id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    const history: StatsHistory = {
      dates: recentHistory.map((h) => h.date.toISOString().split("T")[0]),
      newWords: recentHistory.map((h) => h.newWords),
      reviewWords: recentHistory.map((h) => h.reviewWords),
      knownRate: recentHistory.map((h) =>
        (h.knownCount + h.blurredCount) > 0
          ? h.knownCount / (h.knownCount + h.blurredCount + h.unknownCount)
          : 0
      ),
      readingScores: [],
    };

    const overview: StatsOverview = {
      streak,
      totalWordsLearned,
      totalWordsMastered,
      recognitionRate,
      readingAccuracy,
      avgWpm,
      forgettingRate,
      totalStudySeconds,
    };

    return NextResponse.json({
      ok: true,
      data: { overview, history },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
