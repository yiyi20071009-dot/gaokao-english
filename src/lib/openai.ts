import OpenAI from "openai";
import { GeneratedArticle, AnalysisResult } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function generateReadingArticle(
  recentWords: Array<{ word: string; meaning: string; partOfSpeech?: string | null }>,
  difficulty: number,
  dayRange: string,
  targetExamStyle: string = "全国新高考I卷",
): Promise<GeneratedArticle | null> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-api-key-here") {
    return null;
  }
  const wordList = recentWords.map((w) => `${w.word} (${w.meaning})`).join(", ");
  const targetWordCount = difficulty <= 3 ? 250 : difficulty <= 6 ? 400 : 550;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `你是一位高考英语阅读命题专家。请生成一篇高考风格的英语阅读文章。
要求：
1. 文章长度：${targetWordCount}词左右
2. 风格：${targetExamStyle}
3. 主题选择：科技|环保|人物|文化|社会|心理 之一
4. 必须自然融入以下单词（覆盖至少80%）：
   ${wordList}
5. 每个单词在文中的出现必须自然，不能生硬堆砌
6. 如果无法自然使用某个单词，允许用同义表达替换，但记录替换情况
7. 最后生成5道阅读理解题：
   - 1道细节题 (detail)
   - 1道推断题 (inference)
   - 1道主旨题 (mainIdea)
   - 1道词义猜测题 (wordGuess)
   - 1道作者观点题 (authorView)
8. 每题4个选项(A,B,C,D)，标注正确答案和解析
9. 使用高考英语难度和词汇范围
请以JSON格式输出，包含字段：title, content, questions（数组，每个含 type, question, options, correctAnswer, explanation）, covered_words, vocab_coverage。`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 3000,
    });
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return result as GeneratedArticle;
  } catch (error) {
    console.error("AI generation failed:", error);
    return null;
  }
}

export async function analyzeReadingPerformance(
  articleContent: string,
  questions: Array<{ type: string; question: string; correctAnswer: string }>,
  answers: Array<{ questionId: string; userAnswer: string; isCorrect: boolean }>,
  lookedUpWords: string[],
): Promise<AnalysisResult | null> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-api-key-here") {
    return null;
  }
  const qaPairs = questions.map((q, i) =>
    `Q${i + 1} [${q.type}]: ${q.question}\n正确答案: ${q.correctAnswer}\n你的答案: ${answers[i]?.userAnswer}\n正确: ${answers[i]?.isCorrect}`
  ).join("\n\n");
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `你是高考英语阅读分析专家。分析学生的阅读表现，输出JSON格式分析报告。
包含字段：
- weakWords: 学生可能不认识的单词列表
- weakSentencePatterns: 学生薄弱的句型
- errorTypes: 错误类型分析
- worstQuestionTypes: 最差的题型
- recommendation: 下阶段学习建议（中文，100-200字）
文章内容：
${articleContent}
题目和回答：
${qaPairs}
查过的单词：${lookedUpWords.join(", ")}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 2000,
    });
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return result as AnalysisResult;
  } catch (error) {
    console.error("AI analysis failed:", error);
    return null;
  }
}
