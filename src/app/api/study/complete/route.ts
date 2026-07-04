import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDemoUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await ensureDemoUser();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = today.toISOString().split("T")[0];

    // Update or create study history
    await prisma.studyHistory.upsert({
      where: {
        userId_date: { userId: user.id, date: today },
      },
      update: {
        completed: true,
      },
      create: {
        userId: user.id,
        date: today,
        completed: true,
      },
    });

    // Update streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStudy = await prisma.studyHistory.findUnique({
      where: {
        userId_date: { userId: user.id, date: yesterday },
      },
    });

    const newStreak = yesterdayStudy ? user.studyDays + 1 : 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        studyDays: newStreak,
        lastStudyDate: today,
      },
    });

    return NextResponse.json({ ok: true, data: { completed: true, streak: newStreak } });
  } catch (error) {
    console.error("Complete error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
