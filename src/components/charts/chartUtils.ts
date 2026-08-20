export const SERIES_VARS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
];

/** 엔티티(키워드)에 고정 색을 배정한다 — 필터로 순위가 바뀌어도 색은 따라가지 않는다. */
export function seriesColor(keywords: string[], keyword: string): string {
  const index = keywords.indexOf(keyword);
  return SERIES_VARS[index >= 0 ? index % SERIES_VARS.length : 0];
}

/** 축 눈금을 사람이 읽기 좋은 값으로 올림 */
export function niceMax(value: number, ticks = 4): number {
  if (value <= 0) return ticks;
  const rough = value / ticks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= rough) ?? 10;
  return step * mag * ticks;
}

export function formatDateLabel(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

/** 순차 램프 (0~1) — 한 색상 계열, 밝은→어두운 */
const SEQ = ["--seq-100", "--seq-200", "--seq-300", "--seq-450", "--seq-550", "--seq-650"];

export function sequentialColor(ratio: number): string {
  if (ratio <= 0) return "var(--surface-2)";
  const index = Math.min(SEQ.length - 1, Math.floor(ratio * SEQ.length));
  return `var(${SEQ[index]})`;
}
