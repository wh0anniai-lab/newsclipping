import type { Article, PeriodDays } from "@/lib/types";
import { fetchGoogleNews } from "@/lib/sources/google";
import { fetchNaverNews, hasNaverCredentials, type NaverResult } from "@/lib/sources/naver";
import { getQuotaStatus, type QuotaStatus } from "@/lib/quota";
import { normalizeTitleKey } from "@/lib/text";

export interface CollectResult {
  articles: Article[];
  notices: string[];
  quota: (QuotaStatus & { ranOutDuringRun: boolean }) | null;
}

export async function collectArticles(
  keywords: string[],
  period: PeriodDays,
  cutoff: number,
): Promise<CollectResult> {
  const notices: string[] = [];
  const naverEnabled = hasNaverCredentials();

  // 한도가 이미 소진됐다면 네이버 호출을 아예 건너뛴다.
  const quotaBefore = naverEnabled ? await getQuotaStatus() : null;
  const naverUsable = naverEnabled && !quotaBefore?.exhausted;

  if (!naverEnabled) {
    notices.push(
      "네이버 검색 API 키(NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)가 설정되지 않아 구글 뉴스만 수집했습니다.",
    );
  }

  const tasks: Promise<Article[] | NaverResult>[] = [];
  for (const keyword of keywords) {
    tasks.push(fetchGoogleNews(keyword, period));
    if (naverUsable) tasks.push(fetchNaverNews(keyword, cutoff));
  }

  const settled = await Promise.allSettled(tasks);
  const all: Article[] = [];
  const failures = new Set<string>();
  let truncated = false;
  let quotaRanOut = false;
  for (const result of settled) {
    if (result.status === "rejected") {
      failures.add(result.reason instanceof Error ? result.reason.message : "수집 실패");
      continue;
    }
    if (Array.isArray(result.value)) {
      all.push(...result.value);
    } else {
      all.push(...result.value.articles);
      truncated ||= result.value.truncated;
      quotaRanOut ||= result.value.quotaExceeded;
    }
  }
  notices.push(...failures);


  if (truncated) {
    notices.push(
      "네이버 뉴스는 최신순 300건까지만 제공됩니다. 보도량이 많은 키워드는 기간 앞부분의 기사가 일부 빠질 수 있으니, " +
        "추이 그래프는 최근 며칠 위주로 읽어 주세요.",
    );
  }

  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped: Article[] = [];

  // 네이버(본문 요약 보유) 우선 → 동일 기사가 양쪽에 있으면 정보량이 많은 쪽을 남긴다.
  const ordered = [...all].sort((a, b) => {
    if (a.channel !== b.channel) return a.channel === "naver" ? -1 : 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  for (const article of ordered) {
    if (new Date(article.publishedAt).getTime() < cutoff) continue;
    if (seenLinks.has(article.link)) continue;
    const titleKey = `${normalizeTitleKey(article.title)}|${article.press}`;
    if (titleKey.length < 4) continue;
    if (seenTitles.has(titleKey)) continue;
    seenLinks.add(article.link);
    seenTitles.add(titleKey);
    deduped.push(article);
  }

  deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const quota = naverEnabled
    ? { ...(await getQuotaStatus()), ranOutDuringRun: quotaRanOut }
    : null;
  return { articles: deduped, notices, quota };
}
