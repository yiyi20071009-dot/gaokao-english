import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/auth";
import { calculateDailyLoad } from "@/lib/sm2";
import { formatDate, getDayNumber, daysUntil, shuffleArray } from "@/lib/utils";
import type { StudyWord } from "@/types";

export async function GET() {
  try {
    const user = await ensureDemoUser();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    const dayNumber = getDayNumber();

    // Calculate recognition rate from recent words
    const recentProgress = await prisma.wordProgress.findMany({
      where: {
        userId: user.id,
        reviewCount: { gt: 0 },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    const recognitionRate = recentProgress.length > 0
      ? recentProgress.filter((w) => w.status === "mastered" || w.status === "reviewing").length / recentProgress.length
      : 0;

    const totalLearned = await prisma.wordProgress.count({
      where: { userId: user.id, reviewCount: { gt: 0 } },
    });

    const streak = user.studyDays || 0;

    // Calculate daily load
    const load = calculateDailyLoad(streak, recognitionRate);

    // ── New words ──────────────────────────────────────────
    // Find words the user hasn't learned yet
    const existingProgress = await prisma.wordProgress.findMany({
      where: { userId: user.id },
      select: { wordId: true },
    });
    const learnedWordIds = new Set(existingProgress.map((p) => p.wordId));

    const availableNewWords = await prisma.word.findMany({
      where: { id: { notIn: Array.from(learnedWordIds) } },
      orderBy: { frequency: "asc" },
      take: load.newWords,
    });

    const newWords: StudyWord[] = availableNewWords
      .filter((w) => !learnedWordIds.has(w.id))
      .map((w) => ({
        id: w.id,
        word: w.word,
        phonetics: w.phonetics,
        partOfSpeech: w.partOfSpeech,
        meaning: w.meaning,
        gaokaoMeaning: w.gaokaoMeaning,
        examples: parseJsonField(w.examples),
        collocations: parseJsonField(w.collocations),
        synonyms: parseJsonField(w.synonyms),
        antonyms: parseJsonField(w.antonyms),
        imageUrl: w.imageUrl,
        status: "new",
        reviewType: "new",
      }));

    // ── Review words ───────────────────────────────────────
    const dueReviews = await prisma.reviewSchedule.findMany({
      where: {
        userId: user.id,
        due: true,
        scheduledDate: { lte: today },
      },
      include: { word: true },
      orderBy: { scheduledDate: "asc" },
      take: load.maxReviews,
    });

    const reviewWords: StudyWord[] = dueReviews.map((r) => ({
      id: r.word.id,
      word: r.word.word,
      phonetics: r.word.phonetics,
      partOfSpeech: r.word.partOfSpeech,
      meaning: r.word.meaning,
      gaokaoMeaning: r.word.gaokaoMeaning,
      examples: parseJsonField(r.word.examples),
      collocations: parseJsonField(r.word.collocations),
      synonyms: parseJsonField(r.word.synonyms),
      antonyms: parseJsonField(r.word.antonyms),
      imageUrl: r.word.imageUrl,
      status: "reviewing",
      reviewType: "review",
    }));

    // Update study history counts
    await prisma.studyHistory.upsert({
      where: {
        userId_date: { userId: user.id, date: today },
      },
      update: {
        newWords: newWords.length,
        reviewWords: reviewWords.length,
      },
      create: {
        userId: user.id,
        date: today,
        newWords: newWords.length,
        reviewWords: reviewWords.length,
      },
    });


    // Count actual words studied today from word progress
    const todayLearned = await prisma.wordProgress.count({
      where: { userId: user.id, updatedAt: { gte: today } },
    });
    const todayPlanned = newWords.length + reviewWords.length;
    const completed = false;

    return NextResponse.json({
      ok: true,
      data: {
        dayNumber,
        date: todayStr,
        streak,
        newWords,
        reviewWords,
        newCount: newWords.length,
        reviewCount: reviewWords.length,
        completed,
        recognitionRate,
        totalLearned,
        todayLearned,
        todayPlanned,
        daysUntilExam: daysUntil(),
      },
    });
  } catch (error) {
    console.error("Today plan error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

function parseJsonField(field: string | null): string[] | null {
  if (!field) return null;
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
