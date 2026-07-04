import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return String(date.getFullYear()) + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

export function formatDateCN(date: Date): string {
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = days[d.getDay()];
  return `${month}月${day}日 星期${weekday}`;
}

export function getDayNumber(startDate: Date = new Date("2026-07-04")): number {
  const now = new Date();
  const diff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

export function daysUntil(target: Date = new Date("2026-08-28")): number {
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateReadingTime(words: number): number {
  return Math.max(1, Math.round(words / 200));
}
