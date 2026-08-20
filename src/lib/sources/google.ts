import { XMLParser } from "fast-xml-parser";
import type { Article, PeriodDays } from "@/lib/types";
import { normalizePressName, pressFromHost } from "@/lib/press";
import { splitTitleAndPress, stripHtml } from "@/lib/text";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { "#text"?: string; "@_url"?: string };
}

function sourceName(item: RssItem): { name: string; url: string } {
  const s = item.source;
  if (typeof s === "string") return { name: s, url: "" };
  if (s && typeof s === "object") return { name: s["#text"] ?? "", url: s["@_url"] ?? "" };
  return { name: "", url: "" };
}

export async function fetchGoogleNews(keyword: string, period: PeriodDays): Promise<Article[]> {
  const query = `${keyword} when:${period}d`;
  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=ko&gl=KR&ceid=KR%3Ako`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsClipping/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`구글 뉴스 응답 오류 (${res.status})`);

  const xml = await res.text();
  const doc = parser.parse(xml);
  const rawItems = doc?.rss?.channel?.item;
  const items: RssItem[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return items.flatMap((item) => {
    const link = typeof item.link === "string" ? item.link : "";
    if (!link) return [];
    const rawTitle = stripHtml(String(item.title ?? ""));
    if (!rawTitle) return [];
    const { title, press: pressFromTitle } = splitTitleAndPress(rawTitle);
    const src = sourceName(item);
    const press = normalizePressName(src.name || pressFromTitle, src.url) ||
      (src.url ? pressFromHost(src.url) : "기타");
    const published = item.pubDate ? new Date(item.pubDate) : new Date();

    return [{
      id: `g:${link}`,
      title,
      link,
      // 구글 뉴스 RSS의 description은 링크 마크업뿐이라 본문 요약이 없다.
      description: "",
      publishedAt: (Number.isNaN(published.getTime()) ? new Date() : published).toISOString(),
      press,
      channel: "google" as const,
      keyword,
    }];
  });
}
