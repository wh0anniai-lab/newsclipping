"use client";

import type { CountItem } from "@/lib/types";

const LABELS: Record<string, string> = { naver: "네이버 뉴스", google: "구글 뉴스" };
const COLORS: Record<string, string> = { naver: "var(--series-3)", google: "var(--series-1)" };

interface Props {
  items: CountItem[];
}

export default function ChannelSplit({ items }: Props) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (total === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>데이터가 없습니다.</p>;
  }

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm">
        {items.map((item) => (
          <span key={item.label} style={{
            width: `${(item.value / total) * 100}%`,
            background: COLORS[item.label] ?? "var(--series-4)",
          }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: COLORS[item.label] ?? "var(--series-4)" }} />
            <span style={{ color: "var(--text-secondary)" }}>{LABELS[item.label] ?? item.label}</span>
            <span className="tabular ml-auto font-semibold">{item.value}건</span>
            <span className="tabular w-11 text-right text-xs" style={{ color: "var(--text-muted)" }}>
              {Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
