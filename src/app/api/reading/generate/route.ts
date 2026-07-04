import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/auth";
import { generateReadingArticle, generateFallbackArticle } from "@/lib/openai";
import { formatDate } from "@/lib/utils";

export async function POST() {
  try {
    const user = await ensureDemoUser();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get recent learned words (last 3 days)
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const recentProgress = await prisma.wordProgress.findMany({
      where: {
        userId: user.id,
        updatedAt: { gte: threeDaysAgo },
        reviewCount: { gt: 0 },
      },
      include: { word: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    // Get user's current difficulty level
    const recentReviews = await prisma.wordProgress.findMany({
      where: {
        userId: user.id,
        reviewCount: { gt: 0 },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    const avgEase = recentReviews.reduce((s, r) => s + r.ease, 0) / Math.max(1, recentReviews.length);
    const difficulty = avgEase > 2.2 ? 6 : avgEase > 1.8 ? 4 : 3;

    // Check reading sessions for accuracy adjustment
    const recentSessions = await prisma.readingSession.findMany({
      where: {
        userId: user.id,
        completed: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const avgAccuracy = recentSessions.length > 0
      ? recentSessions.reduce((s, ses) => s + (ses.score ?? 0) / Math.max(1, ses.totalQuestions), 0) / recentSessions.length
      : 0.5;

    // Adjust difficulty based on performance
    const adjustedDifficulty = avgAccuracy > 0.8 ? Math.min(10, difficulty + 1)
      : avgAccuracy < 0.5 ? Math.max(1, difficulty - 1)
      : difficulty;

    // Get day range string
    const dayRange = `${Math.max(1, Math.floor((threeDaysAgo.getTime() - new Date("2026-06-20").getTime()) / (86400000)))}-${Math.max(1, Math.floor((today.getTime() - new Date("2026-06-20").getTime()) / (86400000)))}`;

    // Choose exam style
    const examStyles = ["全国新高考I卷", "全国新高考II卷", "浙江卷", "江苏卷"];
    const examStyle = examStyles[Math.floor(Math.random() * examStyles.length)];

    // Try AI generation
    const recentWords = recentProgress.map((p) => ({
      word: p.word.word,
      meaning: p.word.meaning,
      partOfSpeech: p.word.partOfSpeech,
    }));

    let articleTitle: string;
    let articleContent: string;
    let articleTopic: string | null;

    const aiResult = await generateReadingArticle(
      recentWords.slice(0, 50),
      adjustedDifficulty,
      dayRange,
      examStyle,
    );

    if (aiResult) {
      articleTitle = aiResult.title;
      articleContent = aiResult.content;
      articleTopic = null; // auto-detect from content
    } else {
      // Fallback
      articleContent = await generateFallbackArticle(recentWords.slice(0, 30), adjustedDifficulty);
      const lines = articleContent.split("\n");
      articleTitle = lines[0] || "Reading Practice";
      articleContent = lines.slice(1).join("\n").trim();
      articleTopic = "general";
    }

    const wordCount = articleContent.split(/\s+/).filter(Boolean).length;

    // Create the article
    const article = await prisma.article.create({
      data: {
        title: articleTitle,
        content: articleContent,
        wordCount,
        difficulty: adjustedDifficulty,
        source: aiResult ? "ai" : "fallback",
        sourceExam: examStyle,
        topic: articleTopic || "general",
        dayRange,
        vocabCoverage: aiResult?.vocab_coverage ?? null,
      },
    });

    // Create questions
    if (aiResult && aiResult.questions) {
      for (const q of aiResult.questions) {
        await prisma.question.create({
          data: {
            articleId: article.id,
            type: q.type,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            difficulty: adjustedDifficulty,
          },
        });
      }
    } else {
      // Generate default questions for fallback
      const defaultQuestions = [
        { type: "detail", question: "What is the main topic of the passage?", options: ["A. Education", "B. Technology", "C. Health", "D. Environment"], answer: "A" },
        { type: "inference", question: "What can be inferred from the passage?", options: ["A. Learning is easy", "B. Practice leads to improvement", "C. Everyone succeeds", "D. Results are immediate"], answer: "B" },
        { type: "mainIdea", question: "What is the best title for this passage?", options: ["A. The Importance of Learning", "B. Modern Technology", "C. Global Issues", "D. Cultural Differences"], answer: "A" },
        { type: "wordGuess", question: "The word 'practice' in the passage most likely means:", options: ["A. Theory", "B. Repeated exercise", "C. Examination", "D. Discussion"], answer: "B" },
        { type: "authorView", question: "What is the author's attitude toward learning?", options: ["A. Negative", "B. Neutral", "C. Positive", "D. Unclear"], answer: "C" },
      ];

      for (const q of defaultQuestions) {
        await prisma.question.create({
          data: {
            articleId: article.id,
            type: q.type,
            question: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.answer,
            difficulty: adjustedDifficulty,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: article.id,
        title: article.title,
        wordCount: article.wordCount,
        difficulty: article.difficulty,
      },
    });
  } catch (error) {
    console.error("Article generation error:", error);
    return NextResponse.json({ ok: false, error: "Generation failed" }, { status: 500 });
  }
}
