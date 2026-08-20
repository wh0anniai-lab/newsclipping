"use client";

import { useState } from "react";
import type { DailyPoint } from "@/lib/types";
import ChartTooltip from "./ChartTooltip";
import { formatDateLabel, niceMax, seriesColor } from "./chartUtils";

const W = 900;
const H = 260;
const PAD = { top: 18, right: 16, bottom: 34, left: 40 };

interface Props {
  daily: DailyPoint[];
  keywords: string[];
  peak: { date: string; count: number } | null;
}

export default function TrendChart({ daily, keywords, peak }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(1, ...daily.map((d) => d.total)));
  const slot = plotW / Math.max(1, daily.length);
  const barW = Math.max(4, Math.min(34, slot - 6));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(max * r));
  const labelEvery = Math.ceil(daily.length / 12);

  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const point = hover !== null ? daily[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label="일자별 보도량 추이">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)}
              stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end" fontSize={11}
              fill="var(--text-muted)" className="tabular">{tick}</text>
          </g>
        ))}

        {daily.map((day, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          let cursorY = PAD.top + plotH;
          const active = hover === i;
          return (
            <g key={day.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}>
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH}
                fill={active ? "var(--surface-2)" : "transparent"} />
              {keywords.map((keyword) => {
                const value = day.byKeyword[keyword] ?? 0;
                if (value <= 0) return null;
                const h = (value / max) * plotH;
                cursorY -= h;
                return (
                  <rect key={keyword} x={x} y={cursorY} width={barW}
                    height={Math.max(1, h - (keywords.length > 1 ? 2 : 0))}
                    rx={4} fill={seriesColor(keywords, keyword)}
                    opacity={hover === null || active ? 1 : 0.45} />
                );
              })}
              {i % labelEvery === 0 && (
                <text x={PAD.left + slot * i + slot / 2} y={H - 12} textAnchor="middle"
                  fontSize={11} fill="var(--text-muted)" className="tabular">
                  {formatDateLabel(day.date)}
                </text>
              )}
            </g>
          );
        })}

        {peak && (() => {
          const index = daily.findIndex((d) => d.date === peak.date);
          if (index < 0) return null;
          return (
            <text x={PAD.left + slot * index + slot / 2} y={y(peak.count) - 7}
              textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-secondary)"
              className="tabular">
              최다 {peak.count}
            </text>
          );
        })()}

        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH}
          stroke="var(--baseline)" strokeWidth={1} />
      </svg>

      {point && (
        <ChartTooltip
          left={((PAD.left + slot * hover! + slot / 2) / W) * 100}
          top={40}
        >
          <div className="font-semibold">{point.date}</div>
          <div className="tabular" style={{ color: "var(--text-secondary)" }}>
            합계 {point.total}건
          </div>
          {keywords.length > 1 && (
            <ul className="mt-1 space-y-0.5">
              {keywords.map((keyword) => (
                <li key={keyword} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full"
                    style={{ background: seriesColor(keywords, keyword) }} />
                  <span style={{ color: "var(--text-secondary)" }}>{keyword}</span>
                  <span className="tabular ml-auto">{point.byKeyword[keyword] ?? 0}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartTooltip>
      )}

      {keywords.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"
          style={{ color: "var(--text-secondary)" }}>
          {keywords.map((keyword) => (
            <li key={keyword} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: seriesColor(keywords, keyword) }} />
              {keyword}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
