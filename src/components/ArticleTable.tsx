"use client";

import { useMemo, useState } from "react";
import type { Article } from "@/lib/types";
import { formatKst } from "@/lib/text";
import { seriesColor } from "./charts/chartUtils";

const CHANNEL_LABEL: Record<string, string> = { naver: "네이버", google: "구글" };

interface Props {
  articles: Article[];
  keywords: string[];
  query: string;
  onQueryChange: (value: string) => void;
}

export default function ArticleTable({ articles, keywords, query, onQueryChange }: Props) {
  const [channel, setChannel] = useState<"all" | "naver" | "google">("all");
  const [visible, setVisible] = useState(30);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => {
      if (channel !== "all" && article.channel !== channel) return false;
      if (!needle) return true;
      return (
        article.title.toLowerCase().includes(needle) ||
        article.press.toLowerCase().includes(needle) ||
        article.description.toLowerCase().includes(needle)
      );
    });
  }, [articles, channel, query]);

  const channels: { key: "all" | "naver" | "google"; label: string }[] = [
    { key: "all", label: `전체 ${articles.length}` },
    { key: "naver", label: `네이버 ${articles.filter((a) => a.channel === "naver").length}` },
    { key: "google", label: `구글 ${articles.filter((a) => a.channel === "google").length}` },
  ];

  return (
    <section className="card" aria-label="클리핑 뉴스 목록">
      <header className="flex flex-wrap items-center gap-3 border-b px-5 py-4"
        style={{ borderColor: "var(--border)" }}>
        <h2 className="text-base font-bold">뉴스 목록</h2>

        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--surface-2)" }}>
          {channels.map((option) => (
            <button key={option.key} type="button"
              onClick={() => { setChannel(option.key); setVisible(30); }}
              aria-pressed={channel === option.key}
              className="tabular rounded-md px-3 py-1.5 text-xs font-semibold"
              style={{
                background: channel === option.key ? "var(--surface-1)" : "transparent",
                color: channel === option.key ? "var(--accent)" : "var(--text-secondary)",
              }}>
              {option.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => { onQueryChange(event.target.value); setVisible(30); }}
          placeholder="제목·언론사 검색"
          className="ml-auto w-full rounded-lg border px-3 py-2 text-xs outline-none focus:ring-2 sm:w-56"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs" style={{ color: "var(--text-muted)" }}>
              <th className="w-12 px-5 py-3 font-medium">#</th>
              <th className="w-28 px-2 py-3 font-medium">발행일</th>
              <th className="w-20 px-2 py-3 font-medium">채널</th>
              <th className="w-32 px-2 py-3 font-medium">언론사</th>
              <th className="px-2 py-3 font-medium">제목</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visible).map((article, index) => (
              <tr key={article.id} className="border-t align-top transition-colors hover:bg-[var(--surface-2)]"
                style={{ borderColor: "var(--grid)" }}>
                <td className="tabular px-5 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  {index + 1}
                </td>
                <td className="tabular px-2 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {formatKst(article.publishedAt)}
                </td>
                <td className="px-2 py-3">
                  <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: "var(--surface-2)",
                      color: article.channel === "naver" ? "var(--series-3)" : "var(--series-1)",
                    }}>
                    {CHANNEL_LABEL[article.channel]}
                  </span>
                </td>
                <td className="px-2 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {article.press}
                </td>
                <td className="px-2 py-3 pr-5">
                  <a href={article.link} target="_blank" rel="noreferrer noopener"
                    className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                    {article.title}
                  </a>
                  {article.description && (
                    <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      {article.description}
                    </p>
                  )}
                  {keywords.length > 1 && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px]"
                      style={{ color: "var(--text-muted)" }}>
                      <span className="inline-block h-2 w-2 rounded-sm"
                        style={{ background: seriesColor(keywords, article.keyword) }} />
                      {article.keyword}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          조건에 맞는 기사가 없습니다.
        </p>
      )}

      {visible < filtered.length && (
        <div className="border-t px-5 py-4 text-center" style={{ borderColor: "var(--border)" }}>
          <button type="button" onClick={() => setVisible((v) => v + 50)}
            className="rounded-lg border px-5 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            더 보기 ({filtered.length - visible}건 남음)
          </button>
        </div>
      )}
    </section>
  );
}
