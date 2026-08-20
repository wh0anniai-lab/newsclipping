"use client";

import type { PeriodDays } from "@/lib/types";

const PERIOD_OPTIONS: { value: PeriodDays; label: string }[] = [
  { value: 7, label: "1주일" },
  { value: 14, label: "2주일" },
  { value: 30, label: "1개월" },
];

interface Props {
  keywords: string;
  period: PeriodDays;
  loading: boolean;
  onKeywordsChange: (value: string) => void;
  onPeriodChange: (value: PeriodDays) => void;
  onSubmit: () => void;
}

export default function SearchPanel({
  keywords, period, loading, onKeywordsChange, onPeriodChange, onSubmit,
}: Props) {
  return (
    <form
      className="card p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
        <div>
          <label htmlFor="keywords" className="mb-2 block text-sm font-semibold">
            검색 키워드
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
              쉼표 또는 줄바꿈으로 최대 5개
            </span>
          </label>
          <textarea
            id="keywords"
            rows={2}
            value={keywords}
            onChange={(event) => onKeywordsChange(event.target.value)}
            placeholder="예: 생성형 AI, 반도체 수출"
            className="w-full resize-y rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:ring-2"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">검색 기간</legend>
          <div className="flex gap-1 rounded-lg p-1" style={{ background: "var(--surface-2)" }}>
            {PERIOD_OPTIONS.map((option) => {
              const active = option.value === period;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onPeriodChange(option.value)}
                  aria-pressed={active}
                  className="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
                  style={{
                    background: active ? "var(--surface-1)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className="h-[42px] rounded-lg px-7 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "수집 중…" : "뉴스 클리핑 시작"}
        </button>
      </div>
    </form>
  );
}
