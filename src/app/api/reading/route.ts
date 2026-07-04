import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await ensureDemoUser();

    const articles = await prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get reading sessions to check completion
    const sessions = await prisma.readingSession.findMany({
      where: { userId: user.id },
    });
    const sessionMap = new Map(sessions.map((s) => [s.articleId, s]));

    const result = articles.map((a) => {
      const session = sessionMap.get(a.id);
      return {
        id: a.id,
        title: a.title,
        wordCount: a.wordCount,
        difficulty: a.difficulty,
        topic: a.topic,
        createdAt: a.createdAt.toISOString(),
        completed: session?.completed ?? false,
        score: session?.score ?? null,
        totalQuestions: session?.totalQuestions ?? 5,
      };
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error("Reading list error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
