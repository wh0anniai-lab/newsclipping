import { NextResponse } from "next/server";
import { collectArticles } from "@/lib/collect";
import { buildAnalytics } from "@/lib/analytics";
import { summarizeClipping } from "@/lib/summarize";
import { parseKeywords, parsePeriod } from "@/lib/request";
import { kstDayStartMs, toDateKey } from "@/lib/text";
import type { ClippingResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const payload = body as { keywords?: unknown; period?: unknown };
  const keywords = parseKeywords(payload.keywords);
  const period = parsePeriod(payload.period);

  if (keywords.length === 0) {
    return NextResponse.json({ error: "검색 키워드를 입력해 주세요." }, { status: 400 });
  }

  const cutoff = kstDayStartMs(period - 1);
  const from = toDateKey(new Date(cutoff).toISOString());
  const to = toDateKey(new Date().toISOString());

  try {
    const { articles, notices, quota } = await collectArticles(keywords, period, cutoff);
    const analytics = buildAnalytics(articles, keywords, from, to);
    const summary = await summarizeClipping(articles, keywords, period, analytics);

    const result: ClippingResult = {
      keywords,
      period,
      from,
      to,
      generatedAt: new Date().toISOString(),
      articles,
      summary,
      analytics,
      notices,
      quota,
    };
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "뉴스 수집 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
