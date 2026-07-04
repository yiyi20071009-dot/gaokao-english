/**
 * SM-2 Spaced Repetition Algorithm
 * Based on Piotr Wozniak's SM-2 algorithm, optimized for Gaokao English
 *
 * Three response levels:
 * - "known":   recall was correct and confident  → quality 4-5
 * - "blurred": recall was correct but required effort → quality 2-3
 * - "unknown": recall failed → quality 0-1
 */
import { ReviewResult, SM2Result } from "@/types";

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const DEFAULT_EASE = 2.5;

export interface SM2Params {
  ease?: number;
  interval?: number;
  repetitions?: number;
  quality: number;
}

function mapResultToQuality(result: ReviewResult, responseTimeMs?: number): number {
  const baseMap: Record<ReviewResult, number> = {
    known: 5,
    blurred: 3,
    unknown: 0,
  };
  let quality = baseMap[result];
  if (responseTimeMs !== undefined && quality > 0) {
    if (responseTimeMs < 2000) quality = Math.min(5, quality + 0.5);
    else if (responseTimeMs > 10000) quality = Math.max(1, quality - 0.5);
  }
  return quality;
}

export function calculateSM2(params: SM2Params): SM2Result {
  const { ease = DEFAULT_EASE, interval = 0, repetitions = 0, quality } = params;
  let newEase = ease;
  let newInterval: number;
  let newRepetitions: number;
  let newQuality = quality;

  if (quality >= 4) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 3;
    else newInterval = Math.round(interval * ease);
    newRepetitions = repetitions + 1;
  } else if (quality >= 2) {
    newInterval = Math.max(1, Math.round(interval * 0.5));
    newRepetitions = 0;
    newQuality = 0;
  } else {
    newInterval = 0;
    newRepetitions = 0;
  }

  if (newQuality >= 2) {
    newEase = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    newEase = ease - 0.2;
  }

  newEase = Math.max(MIN_EASE, Math.min(MAX_EASE, newEase));
  newInterval = Math.min(180, newInterval);

  const nextReviewDate = new Date();
  if (newInterval === 0) {
    nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 30);
  } else {
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  }

  return {
    ease: Math.round(newEase * 100) / 100,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
  };
}

export function processReview(
  result: ReviewResult,
  currentEase: number,
  currentInterval: number,
  currentRepetitions: number,
  responseTimeMs?: number,
): SM2Result {
  const quality = mapResultToQuality(result, responseTimeMs);
  return calculateSM2({
    ease: currentEase,
    interval: currentInterval,
    repetitions: currentRepetitions,
    quality,
  });
}

export function getReviewLabel(interval: number): string {
  if (interval === 0) return "30分钟后";
  if (interval === 1) return "明天";
  if (interval <= 3) return `${interval}天后`;
  if (interval <= 7) return `${interval}天后`;
  if (interval <= 15) return `${interval}天后`;
  if (interval <= 30) return `${interval}天后`;
  return `${interval}天后`;
}

export function calculateDailyLoad(
  streak: number,
  recognitionRate: number,
): { newWords: number; maxReviews: number } {
  let newWords = 20;
  if (streak >= 7 && recognitionRate >= 0.8) newWords = 30;
  else if (streak >= 14 && recognitionRate >= 0.85) newWords = 40;
  else if (streak >= 21 && recognitionRate >= 0.9) newWords = 50;
  else if (recognitionRate < 0.5) newWords = 10;
  else if (recognitionRate < 0.6) newWords = 15;
  return { newWords, maxReviews: 150 };
}
