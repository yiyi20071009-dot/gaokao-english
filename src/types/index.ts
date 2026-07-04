// ─── Word Review Result ──────────────────────────────────
export type ReviewResult = "known" | "blurred" | "unknown";

// ─── SM-2 Algorithm Result ───────────────────────────────
export interface SM2Result {
  ease: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
}

// ─── Study Session State ─────────────────────────────────
export interface StudyWord {
  id: string;
  word: string;
  phonetics: string | null;
  partOfSpeech: string | null;
  meaning: string;
  gaokaoMeaning: string | null;
  examples: string[] | null;
  collocations: string[] | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  imageUrl: string | null;
  status: string;
  reviewType: "new" | "review";
}

export interface TodayPlan {
  date: string;
  dayNumber: number;
  newWords: StudyWord[];
  reviewWords: StudyWord[];
  newCount: number;
  reviewCount: number;
  completed: boolean;
  streak: number;
}

// ─── Reading ─────────────────────────────────────────────
export interface ArticleData {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  difficulty: number;
  topic: string | null;
  sourceExam: string | null;
  questions: QuestionData[];
}

export interface QuestionData {
  id: string;
  type: "detail" | "inference" | "mainIdea" | "wordGuess" | "authorView";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
  difficulty: number;
  points: number;
}

export interface ReadingSessionData {
  id: string;
  articleId: string;
  startTime: Date;
  endTime: Date | null;
  timeSpent: number | null;
  score: number | null;
  totalQuestions: number;
  wpm: number | null;
  completed: boolean;
}

// ─── Statistics ──────────────────────────────────────────
export interface StatsOverview {
  streak: number;
  totalWordsLearned: number;
  totalWordsMastered: number;
  recognitionRate: number;
  readingAccuracy: number;
  avgWpm: number;
  forgettingRate: number;
  totalStudySeconds: number;
}

export interface StatsHistory {
  dates: string[];
  newWords: number[];
  reviewWords: number[];
  knownRate: number[];
  readingScores: number[];
}

export interface StatsWeekday {
  labels: string[];
  minutes: number[];
  words: number[];
}

// ─── API Response wrappers ──────────────────────────────
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StudyCompleteResult {
  userId: string;
  date: string;
  newLearned: number;
  reviewed: number;
  knownCount: number;
  blurredCount: number;
  unknownCount: number;
  totalTime: number;
}

// ─── AI Generation ──────────────────────────────────────
export interface GeneratedArticle {
  title: string;
  content: string;
  questions: Array<{
    type: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
  covered_words: string[];
  vocab_coverage: number;
}

export interface AnalysisResult {
  weakWords: string[];
  weakSentencePatterns: string[];
  errorTypes: string[];
  worstQuestionTypes: string[];
  recommendation: string;
}
