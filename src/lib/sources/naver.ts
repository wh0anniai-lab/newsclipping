import type { Article } from "@/lib/types";
import { pressFromHost } from "@/lib/press";
import { cleanTitle, stripHtml } from "@/lib/text";
import { markProviderExhausted, reserveNaverCall } from "@/lib/quota";

interface NaverItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

/**
 * 네이버 검색 API는 developers.naver.com에서 NAVER API HUB(ncloud)로 이관됐다.
 * 호스트와 인증 헤더만 다르고 요청 파라미터·응답 형식은 동일하므로 두 방식을 모두 지원한다.
 */
const ENDPOINTS = [
  {
    name: "hub" as const,
    url: "https://naverapihub.apigw.ntruss.com/search/v1/news",
    headers: (id: string, secret: string) => ({
      "X-NCP-APIGW-API-KEY-ID": id,
      "X-NCP-APIGW-API-KEY": secret,
    }),
  },
  {
    name: "legacy" as const,
    url: "https://openapi.naver.com/v1/search/news.json",
    headers: (id: string, secret: string) => ({
      "X-Naver-Client-Id": id,
      "X-Naver-Client-Secret": secret,
    }),
  },
];

/** 401을 만나면 다른 방식으로 한 번 더 시도하고, 성공한 방식을 기억한다. */
let preferred: (typeof ENDPOINTS)[number] | null = null;

/** 일일 호출 한도 소진 — 수집 실패와 구분해서 처리한다. */
export class NaverQuotaExceededError extends Error {
  constructor() {
    super("네이버 일일 호출 한도 소진");
    this.name = "NaverQuotaExceededError";
  }
}

export function hasNaverCredentials(): boolean {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}

async function errorMessage(res: Response): Promise<string> {
  let code = "";
  try {
    const body = (await res.json()) as {
      errorCode?: string;
      error?: { errorCode?: string };
    };
    code = body.errorCode ?? body.error?.errorCode ?? "";
  } catch {
    // 본문이 JSON이 아니면 상태 코드만 사용한다.
  }

  if (res.status === 401 || res.status === 403) {
    return (
      `네이버 뉴스 API 인증 실패 (${res.status}${code ? `, errorCode ${code}` : ""}). ` +
      "NAVER API HUB(console.ncloud.com/naver-api-hub/application)에서 발급한 " +
      "Client ID / Client Secret이 맞는지, 해당 애플리케이션에 '검색' API가 추가돼 있는지 확인해 주세요."
    );
  }
  return `네이버 뉴스 API 오류 (${res.status}${code ? `, errorCode ${code}` : ""}).`;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 3; // 최대 300건 (네이버 검색 API는 start ≤ 1000)

async function requestPage(
  keyword: string,
  start: number,
  id: string,
  secret: string,
): Promise<Response> {
  const query =
    `?query=${encodeURIComponent(keyword)}&display=${PAGE_SIZE}&start=${start}&sort=date`;

  const candidates = preferred ? [preferred] : ENDPOINTS;
  let lastResponse: Response | null = null;

  for (const endpoint of candidates) {
    // 한도를 넘으면 네트워크 호출 자체를 하지 않는다.
    if (!(await reserveNaverCall())) throw new NaverQuotaExceededError();

    const res = await fetch(`${endpoint.url}${query}`, {
      headers: endpoint.headers(id, secret),
      cache: "no-store",
    });
    if (res.ok) {
      preferred = endpoint;
      return res;
    }
    if (res.status === 429) {
      // 네이버가 직접 한도 초과를 알린 경우 — 우리 카운터보다 이쪽이 정확하다.
      await markProviderExhausted();
      throw new NaverQuotaExceededError();
    }
    // 인증 실패일 때만 다른 방식을 시도한다. 그 외 오류는 그대로 전달한다.
    if (res.status !== 401 && res.status !== 403) return res;
    lastResponse = res;
  }

  return lastResponse!;
}

export interface NaverResult {
  articles: Article[];
  /** 상한(300건)까지 받았는데도 기간 시작점에 못 닿은 경우 */
  truncated: boolean;
  /** 수집 도중 일일 호출 한도가 소진된 경우 */
  quotaExceeded: boolean;
}

export async function fetchNaverNews(keyword: string, cutoff: number): Promise<NaverResult> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { articles: [], truncated: false, quotaExceeded: false };

  const collected: Article[] = [];
  let truncated = false;
  let quotaExceeded = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const start = page * PAGE_SIZE + 1;

    let res: Response;
    try {
      res = await requestPage(keyword, start, clientId, clientSecret);
    } catch (error) {
      if (error instanceof NaverQuotaExceededError) {
        // 첫 페이지든 중간이든, 지금까지 모은 기사는 그대로 살린다.
        quotaExceeded = true;
        break;
      }
      throw error;
    }

    if (!res.ok) {
      if (page === 0) throw new Error(await errorMessage(res));
      break;
    }

    const data = (await res.json()) as { items?: NaverItem[] };
    const items = data.items ?? [];
    if (items.length === 0) break;

    let reachedCutoff = false;
    for (const item of items) {
      const published = new Date(item.pubDate);
      const time = published.getTime();
      if (Number.isNaN(time)) continue;
      if (time < cutoff) {
        reachedCutoff = true;
        continue;
      }
      const link = item.originallink || item.link;
      collected.push({
        id: `n:${link}`,
        title: cleanTitle(stripHtml(item.title)),
        link,
        description: stripHtml(item.description),
        publishedAt: published.toISOString(),
        press: pressFromHost(item.originallink || item.link),
        channel: "naver",
        keyword,
      });
    }

    // sort=date 이므로 컷오프에 도달하면 이후 페이지는 모두 더 오래된 기사다.
    if (reachedCutoff || items.length < PAGE_SIZE) break;

    // 마지막 페이지까지 왔는데도 기간 시작점에 못 닿았다면 오래된 기사가 잘린 것이다.
    if (page === MAX_PAGES - 1) truncated = true;
  }

  return { articles: collected, truncated, quotaExceeded };
}
