import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { wordId: string } }
) {
  try {
    const word = params.wordId.toLowerCase().trim();

    // Try exact match first
    let wordData = await prisma.word.findFirst({
      where: { word },
    });

    // Try case-insensitive search
    if (!wordData) {
      wordData = await prisma.word.findFirst({
        where: {
          word: { contains: word },
        },
      });
    }

    if (!wordData) {
      // Return a basic translation
      return NextResponse.json({
        ok: true,
        data: {
          word,
          meaning: `(${word})`,
          gaokaoMeaning: null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        word: wordData.word,
        meaning: wordData.meaning,
        gaokaoMeaning: wordData.gaokaoMeaning,
        phonetics: wordData.phonetics,
        partOfSpeech: wordData.partOfSpeech,
      },
    });
  } catch (error) {
    console.error("Word lookup error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
