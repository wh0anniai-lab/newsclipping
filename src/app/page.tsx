"use client";

import { useState } from "react";
import SearchPanel from "@/components/SearchPanel";
import SummaryCard from "@/components/SummaryCard";
import KpiTiles from "@/components/KpiTiles";
import ArticleTable from "@/components/ArticleTable";
import ExportBar from "@/components/ExportBar";
import QuotaBanner from "@/components/QuotaBanner";
import TrendChart from "@/components/charts/TrendChart";
import PressBars from "@/components/charts/PressBars";
import ChannelSplit from "@/components/charts/ChannelSplit";
import KeywordCloud from "@/components/charts/KeywordCloud";
import IssueHeatmap from "@/components/charts/IssueHeatmap";
import { seriesColor } from "@/components/charts/chartUtils";
import type { ClippingResult, PeriodDays } from "@/lib/types";

function Panel({ title, hint, children }: {
  title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <header className="mb-4">
        <h2 className="text-sm font-bold">{title}</h2>
        {hint && <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export default function Home() {
  const [keywords, setKeywords] = useState("");
  const [period, setPeriod] = useState<PeriodDays>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClippingResult | null>(null);
  const [tableQuery, setTableQuery] = useState("");

  async function runSearch() {
    if (!keywords.trim()) {
      setError("검색 키워드를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setTableQuery("");
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, period }),
      });
      const data = (await response.json()) as ClippingResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "뉴스 수집에 실패했습니다.");
      setResult(data);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
          NEWS CLIPPING
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">뉴스 클리핑 &amp; 이슈 분석</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          네이버·구글 뉴스를 키워드로 수집해 요약하고, 보도 흐름을 시각화합니다.
          결과는 엑셀로 내려받거나 메일로 바로 보낼 수 있습니다.
        </p>
      </header>

      <SearchPanel
        keywords={keywords}
        period={period}
        loading={loading}
        onKeywordsChange={setKeywords}
        onPeriodChange={setPeriod}
        onSubmit={runSearch}
      />

      {error && (
        <p className="mt-4 rounded-lg px-4 py-3 text-sm font-medium"
          style={{ background: "var(--surface-1)", color: "var(--critical)", border: "1px solid var(--border)" }}>
          {error}
        </p>
      )}

      {loading && (
        <div className="mt-6 space-y-3" aria-live="polite">
          <div className="card pulse h-28" />
          <div className="grid gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="card pulse h-24" />)}
          </div>
          <div className="card pulse h-72" />
          <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
            뉴스를 수집하고 요약하는 중입니다…
          </p>
        </div>
      )}

      {!loading && result && result.articles.length === 0 && (
        <p className="card mt-6 px-5 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          해당 기간에 수집된 기사가 없습니다. 키워드나 기간을 바꿔 다시 시도해 보세요.
        </p>
      )}

      {!loading && result && result.articles.length > 0 && (
        <div className="mt-6 space-y-4">
          <QuotaBanner quota={result.quota} />

          {result.notices.length > 0 && (
            <ul className="rounded-lg px-4 py-3 text-xs"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {result.notices.map((notice) => <li key={notice}>· {notice}</li>)}
            </ul>
          )}

          <SummaryCard
            summary={result.summary}
            keywords={result.keywords}
            from={result.from}
            to={result.to}
            total={result.analytics.total}
          />

          <KpiTiles analytics={result.analytics} period={result.period} />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Panel title="일자별 보도량 추이"
                hint={result.keywords.length > 1 ? "키워드별 누적 막대 · 막대에 마우스를 올리면 상세" : "막대에 마우스를 올리면 상세"}>
                <TrendChart daily={result.analytics.daily} keywords={result.keywords}
                  peak={result.analytics.peak} />
              </Panel>
            </div>
            <Panel title="채널 구성" hint="네이버 · 구글 수집 비중">
              <ChannelSplit items={result.analytics.channelSplit} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="언론사별 보도량 TOP 10" hint="중복 기사 제거 후 집계">
              <PressBars items={result.analytics.pressTop} />
            </Panel>
            <Panel title="연관 키워드" hint="글자 크기는 등장 빈도 · 클릭하면 목록이 필터링됩니다">
              <KeywordCloud items={result.analytics.keywordCloud} onSelect={setTableQuery} />
            </Panel>
          </div>

          <Panel title="이슈 흐름 히트맵"
            hint="상위 연관 키워드가 어느 날짜에 몰렸는지 보여줍니다">
            <IssueHeatmap heatmap={result.analytics.heatmap} />
          </Panel>

          {result.keywords.length > 1 && (
            <Panel title="키워드별 총 보도량" hint="검색 키워드 간 노출량 비교">
              <PressBars items={result.analytics.keywordTotals}
                colorFor={(label) => seriesColor(result.keywords, label)} />
            </Panel>
          )}

          <ExportBar result={result} />

          <ArticleTable
            articles={result.articles}
            keywords={result.keywords}
            query={tableQuery}
            onQueryChange={setTableQuery}
          />
        </div>
      )}

      <footer className="mt-10 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        구글 뉴스 RSS · 네이버 검색 API 기반 · 기사 저작권은 각 언론사에 있습니다.
      </footer>
    </main>
  );
}
