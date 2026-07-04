import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await ensureDemoUser();
    const { articleId, timeSpent, score, totalQuestions, answers, lookupWords } = await req.json();

    if (!articleId) {
      return NextResponse.json({ ok: false, error: "Missing articleId" }, { status: 400 });
    }

    // Find the session
    let session = await prisma.readingSession.findFirst({
      where: {
        userId: user.id,
        articleId,
      },
    });

    if (!session) {
      return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    // Calculate WPM
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    const wpm = article && timeSpent > 0
      ? Math.round(article.wordCount / (timeSpent / 60))
      : null;

    // Update session
    await prisma.readingSession.update({
      where: { id: session.id },
      data: {
        endTime: new Date(),
        timeSpent,
        score,
        totalQuestions,
        wpm,
        completed: true,
        vocabLookups: lookupWords ? JSON.stringify(lookupWords) : undefined,
      },
    });

    // Save answers
    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        await prisma.readingAnswer.create({
          data: {
            sessionId: session.id,
            questionId: answer.questionId,
            userAnswer: answer.userAnswer,
            isCorrect: answer.isCorrect,
            timeSpent: answer.timeSpent || null,
            confidence: null,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, data: { score, totalQuestions, wpm } });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
