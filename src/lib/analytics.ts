import type { Analytics, Article, CountItem, DailyPoint, HeatCell } from "@/lib/types";
import { tokenize, toDateKey } from "@/lib/text";

function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function topCounts(counter: Map<string, number>, limit: number): CountItem[] {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function buildAnalytics(
  articles: Article[],
  keywords: string[],
  fromDate: string,
  toDate: string,
): Analytics {
  const dates = dateRange(fromDate, toDate);
  const dailyMap = new Map<string, DailyPoint>(
    dates.map((date) => [date, { date, total: 0, byKeyword: Object.fromEntries(keywords.map((k) => [k, 0])) }]),
  );

  const pressCounter = new Map<string, number>();
  const channelCounter = new Map<string, number>();
  const keywordCounter = new Map<string, number>();
  const tokenCounter = new Map<string, number>();
  const tokenByDate = new Map<string, Map<string, number>>();

  // 검색어 자체는 연관 키워드에서 제외한다.
  const queryTokens = new Set(keywords.flatMap((k) => tokenize(k)).concat(keywords.map((k) => k.toLowerCase())));

  for (const article of articles) {
    const date = toDateKey(article.publishedAt);
    const point = dailyMap.get(date);
    if (point) {
      point.total += 1;
      point.byKeyword[article.keyword] = (point.byKeyword[article.keyword] ?? 0) + 1;
    }

    pressCounter.set(article.press, (pressCounter.get(article.press) ?? 0) + 1);
    channelCounter.set(article.channel, (channelCounter.get(article.channel) ?? 0) + 1);
    keywordCounter.set(article.keyword, (keywordCounter.get(article.keyword) ?? 0) + 1);

    const tokens = new Set(tokenize(`${article.title} ${article.description}`));
    for (const token of tokens) {
      if (queryTokens.has(token)) continue;
      tokenCounter.set(token, (tokenCounter.get(token) ?? 0) + 1);
      if (!tokenByDate.has(token)) tokenByDate.set(token, new Map());
      const perDate = tokenByDate.get(token)!;
      perDate.set(date, (perDate.get(date) ?? 0) + 1);
    }
  }

  const daily = dates.map((date) => dailyMap.get(date)!);
  const peakPoint = daily.reduce<DailyPoint | null>(
    (best, cur) => (!best || cur.total > best.total ? cur : best),
    null,
  );

  const keywordCloud = topCounts(tokenCounter, 30);
  const heatKeywords = keywordCloud.slice(0, 8).map((k) => k.label);
  const cells: HeatCell[] = [];
  for (const keyword of heatKeywords) {
    const perDate = tokenByDate.get(keyword);
    for (const date of dates) {
      cells.push({ keyword, date, value: perDate?.get(date) ?? 0 });
    }
  }

  return {
    total: articles.length,
    pressCount: pressCounter.size,
    dailyAverage: dates.length ? Math.round((articles.length / dates.length) * 10) / 10 : 0,
    peak: peakPoint && peakPoint.total > 0 ? { date: peakPoint.date, count: peakPoint.total } : null,
    daily,
    pressTop: topCounts(pressCounter, 10),
    channelSplit: topCounts(channelCounter, 2),
    keywordCloud,
    keywordTotals: keywords.map((k) => ({ label: k, value: keywordCounter.get(k) ?? 0 })),
    heatmap: { keywords: heatKeywords, dates, cells },
  };
}
