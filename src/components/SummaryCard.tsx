import type { ClippingSummary } from "@/lib/types";

interface Props {
  summary: ClippingSummary;
  keywords: string[];
  from: string;
  to: string;
  total: number;
}

export default function SummaryCard({ summary, keywords, from, to, total }: Props) {
  return (
    <section
      className="card overflow-hidden"
      style={{ borderColor: "var(--accent)", borderWidth: 1 }}
      aria-label="전체 뉴스 요약"
    >
      <div className="px-6 py-5" style={{ background: "var(--accent-soft)" }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-base font-bold" style={{ color: "var(--accent)" }}>
            클리핑 뉴스 전체 요약
          </h2>
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: "var(--surface-1)", color: "var(--text-secondary)" }}>
            {summary.engine === "claude" ? "Claude AI 요약" : "추출식 요약"}
          </span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {keywords.join(", ")} · {from} ~ {to} · {total}건
          </span>
        </div>

        <ol className="mt-4 space-y-2.5">
          {summary.sentences.map((sentence, index) => (
            <li key={sentence} className="flex gap-3 text-[15px] leading-relaxed">
              <span
                className="tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: "var(--accent)" }}
              >
                {index + 1}
              </span>
              <span>{sentence}</span>
            </li>
          ))}
        </ol>
      </div>

      {summary.topIssues.length > 0 && (
        <div className="px-6 py-4">
          <p className="mb-2.5 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            주요 이슈 TOP {summary.topIssues.length}
          </p>
          <ul className="flex flex-wrap gap-2">
            {summary.topIssues.map((issue, index) => (
              <li key={issue}
                className="rounded-lg px-3 py-1.5 text-xs"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                <span className="tabular mr-1.5 font-bold" style={{ color: "var(--accent)" }}>
                  {index + 1}
                </span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
