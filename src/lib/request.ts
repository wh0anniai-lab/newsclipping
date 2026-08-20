import type { PeriodDays } from "@/lib/types";

export const PERIODS: PeriodDays[] = [7, 14, 30];
export const MAX_KEYWORDS = 5;

export function parseKeywords(input: unknown): string[] {
  const raw = Array.isArray(input) ? input.join("\n") : typeof input === "string" ? input : "";
  const list = raw
    .split(/[\n,]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && k.length <= 40);
  return [...new Set(list)].slice(0, MAX_KEYWORDS);
}

export function parsePeriod(input: unknown): PeriodDays {
  const n = Number(input);
  return (PERIODS as number[]).includes(n) ? (n as PeriodDays) : 7;
}
