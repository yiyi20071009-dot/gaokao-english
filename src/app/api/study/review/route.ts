import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/auth";
import { processReview } from "@/lib/sm2";
import type { ReviewResult } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const user = await ensureDemoUser();
    const { wordId, result, responseTimeMs, reviewType } = await req.json();

    if (!wordId || !result) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    // Get or create word progress
    let progress = await prisma.wordProgress.findUnique({
      where: {
        userId_wordId: { userId: user.id, wordId },
      },
    });

    if (!progress) {
      progress = await prisma.wordProgress.create({
        data: {
          userId: user.id,
          wordId,
          status: "learning",
          ease: 2.5,
          interval: 0,
          repetitions: 0,
        },
      });
    }

    // Apply SM-2 algorithm
    const sm2 = processReview(
      result as ReviewResult,
      progress.ease,
      progress.interval,
      progress.repetitions,
      responseTimeMs || undefined,
    );

    // Determine new status
    let newStatus = progress.status;
    if (result === "known" && sm2.repetitions >= 5) {
      newStatus = "mastered";
    } else if (result === "known" && sm2.repetitions >= 1) {
      newStatus = "reviewing";
    } else if (result === "unknown") {
      newStatus = "learning";
    }

    // Update word progress
    await prisma.wordProgress.update({
      where: { id: progress.id },
      data: {
        ease: sm2.ease,
        interval: sm2.interval,
        repetitions: sm2.repetitions,
        status: newStatus,
        lastReviewDate: new Date(),
        nextReviewDate: sm2.nextReviewDate,
        totalReviewTime: { increment: responseTimeMs || 0 },
        reviewCount: { increment: 1 },
        lapses: result === "unknown" ? { increment: 1 } : undefined,
      },
    });

    // Update or create review schedule
    await prisma.reviewSchedule.upsert({
      where: {
        userId_wordId: { userId: user.id, wordId },
      },
      update: {
        scheduledDate: sm2.nextReviewDate,
        interval: sm2.interval,
        ease: sm2.ease,
        repetitions: sm2.repetitions,
        due: sm2.interval === 0 || sm2.nextReviewDate <= new Date(),
      },
      create: {
        userId: user.id,
        wordId,
        scheduledDate: sm2.nextReviewDate,
        interval: sm2.interval,
        ease: sm2.ease,
        repetitions: sm2.repetitions,
        due: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        nextReviewDate: sm2.nextReviewDate,
        interval: sm2.interval,
        ease: sm2.ease,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
