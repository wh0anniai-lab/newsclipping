"use client";

import { useState } from "react";
import type { Analytics } from "@/lib/types";
import { displayToken } from "@/lib/text";
import { formatDateLabel, sequentialColor } from "./chartUtils";

interface Props {
  heatmap: Analytics["heatmap"];
}

export default function IssueHeatmap({ heatmap }: Props) {
  const [hover, setHover] = useState<{ keyword: string; date: string; value: number } | null>(null);
  const { keywords, dates, cells } = heatmap;

  if (keywords.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>데이터가 없습니다.</p>;
  }

  const max = Math.max(1, ...cells.map((c) => c.value));
  const byKey = new Map(cells.map((c) => [`${c.keyword}|${c.date}`, c.value]));
  const labelEvery = Math.ceil(dates.length / 10);

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid gap-[2px]"
            style={{ gridTemplateColumns: `6.5rem repeat(${dates.length}, minmax(0, 1fr))` }}>
            {keywords.map((keyword) => (
              <div key={keyword} className="contents">
                <div className="flex items-center truncate pr-2 text-xs"
                  style={{ color: "var(--text-secondary)" }} title={keyword}>
                  {displayToken(keyword)}
                </div>
                {dates.map((date) => {
                  const value = byKey.get(`${keyword}|${date}`) ?? 0;
                  return (
                    <div
                      key={date}
                      className="h-6 rounded-[3px]"
                      style={{ background: sequentialColor(value / max) }}
                      onMouseEnter={() => setHover({ keyword, date, value })}
                      onMouseLeave={() => setHover(null)}
                      title={`${keyword} · ${date} · ${value}건`}
                    />
                  );
                })}
              </div>
            ))}
            <div />
            {dates.map((date, i) => (
              <div key={date} className="tabular pt-1 text-center text-[10px]"
                style={{ color: "var(--text-muted)" }}>
                {i % labelEvery === 0 ? formatDateLabel(date) : ""}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{hover ? `${hover.keyword} · ${hover.date} · ${hover.value}건` : "적음"}</span>
        <span className="flex gap-[2px]">
          {[0.05, 0.25, 0.45, 0.65, 0.85, 1].map((ratio) => (
            <span key={ratio} className="h-3 w-6 rounded-[2px]"
              style={{ background: sequentialColor(ratio) }} />
          ))}
        </span>
        <span className="tabular">많음 ({max}건)</span>
      </div>
    </div>
  );
}
