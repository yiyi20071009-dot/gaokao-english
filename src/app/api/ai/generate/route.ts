import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/auth";
import { analyzeReadingPerformance } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const user = await ensureDemoUser();
    const { type, articleId, answers, lookupWords } = await req.json();

    if (type === "analysis") {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
          questions: {
            select: {
              id: true,
              type: true,
              question: true,
              correctAnswer: true,
              explanation: true,
            },
          },
        },
      });

      if (!article) {
        return NextResponse.json({ ok: false, error: "Article not found" }, { status: 404 });
      }

      const analysis = await analyzeReadingPerformance(
        article.content,
        article.questions,
        answers || [],
        lookupWords || [],
      );

      if (analysis) {
        return NextResponse.json({ ok: true, data: analysis });
      }

      // Fallback analysis when AI is not available
      const errorTypes: string[] = [];
      const worstTypes: string[] = [];
      let correctCount = 0;

      const typeCount: Record<string, { correct: number; total: number }> = {};
      
      if (answers && article.questions) {
        article.questions.forEach((q, i) => {
          const ans = answers[i];
          if (!typeCount[q.type]) typeCount[q.type] = { correct: 0, total: 0 };
          typeCount[q.type].total++;
          if (ans?.isCorrect) {
            typeCount[q.type].correct++;
            correctCount++;
          }
        });
      }

      // Find worst type
      Object.entries(typeCount).forEach(([type, stats]) => {
        if (stats.total > 0 && stats.correct / stats.total < 0.5) {
          worstTypes.push(type);
          errorTypes.push(`${type}准确率低 (${stats.correct}/${stats.total})`);
        }
      });

      const typeLabels: Record<string, string> = {
        detail: "细节题", inference: "推断题", mainIdea: "主旨题",
        wordGuess: "词义猜测题", authorView: "作者观点题",
      };

      const recommendation = correctCount >= 4
        ? "表现不错！建议增加阅读量，尝试更高级难度的文章。继续扩大词汇量，特别是同义替换词。"
        : correctCount >= 3
        ? "基础尚可，但需要加强推理和作者观点题型的练习。建议每次阅读后仔细分析错题。"
        : "需要重点加强词汇基础。建议先回到单词学习模块，掌握当前薄弱词汇后再尝试阅读。";

      return NextResponse.json({
        ok: true,
        data: {
          weakWords: lookupWords?.slice(0, 10) || [],
          weakSentencePatterns: [],
          errorTypes: errorTypes.length > 0 ? errorTypes : ["无明显错误类型"],
          worstQuestionTypes: worstTypes.map((t) => typeLabels[t] || t),
          recommendation,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("AI generate error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
