import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { readingId: string } }
) {
  try {
    const user = await ensureDemoUser();
    const article = await prisma.article.findUnique({
      where: { id: params.readingId },
      include: {
        questions: {
          select: {
            id: true,
            type: true,
            question: true,
            options: true,
            correctAnswer: true,
            explanation: true,
            difficulty: true,
            points: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!article) {
      return NextResponse.json({ ok: false, error: "Article not found" }, { status: 404 });
    }

    // Record session start
    let session = await prisma.readingSession.findFirst({
      where: {
        userId: user.id,
        articleId: article.id,
      },
    });

    if (!session) {
      session = await prisma.readingSession.create({
        data: {
          userId: user.id,
          articleId: article.id,
        },
      });
    }

    const questions = article.questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: JSON.parse(q.options || "[]"),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      points: q.points,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        id: article.id,
        title: article.title,
        content: article.content,
        wordCount: article.wordCount,
        difficulty: article.difficulty,
        topic: article.topic,
        sourceExam: article.sourceExam,
        questions,
        sessionId: session.id,
      },
    });
  } catch (error) {
    console.error("Article fetch error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
