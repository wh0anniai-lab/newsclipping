export type PeriodDays = 7 | 14 | 30;

export type Channel = "naver" | "google";

export interface Article {
  id: string;
  title: string;
  link: string;
  description: string;
  /** ISO 8601 */
  publishedAt: string;
  press: string;
  channel: Channel;
  keyword: string;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  total: number;
  /** 키워드별 건수 */
  byKeyword: Record<string, number>;
}

export interface CountItem {
  label: string;
  value: number;
}

export interface HeatCell {
  keyword: string;
  date: string;
  value: number;
}

export interface Analytics {
  total: number;
  pressCount: number;
  dailyAverage: number;
  peak: { date: string; count: number } | null;
  daily: DailyPoint[];
  pressTop: CountItem[];
  channelSplit: CountItem[];
  keywordCloud: CountItem[];
  keywordTotals: CountItem[];
  heatmap: { keywords: string[]; dates: string[]; cells: HeatCell[] };
}

export interface ClippingSummary {
  /** 5문장 이내 */
  sentences: string[];
  topIssues: string[];
  engine: "claude" | "extractive";
}

export interface QuotaInfo {
  date: string;
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
  blockedByProvider: boolean;
  /** 이번 검색 도중에 한도가 소진됐는지 */
  ranOutDuringRun: boolean;
}

export interface ClippingResult {
  keywords: string[];
  period: PeriodDays;
  from: string;
  to: string;
  generatedAt: string;
  articles: Article[];
  summary: ClippingSummary;
  analytics: Analytics;
  notices: string[];
  /** 네이버 API 일일 호출량 (키가 없으면 null) */
  quota: QuotaInfo | null;
}
