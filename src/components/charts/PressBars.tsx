"use client";

import type { CountItem } from "@/lib/types";

interface Props {
  items: CountItem[];
  /** 항목별 고정 색 (미지정 시 단일 계열색) */
  colorFor?: (label: string) => string;
}

export default function PressBars({ items, colorFor }: Props) {
  const max = Math.max(1, ...items.map((i) => i.value));

  if (items.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>데이터가 없습니다.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3">
          <span className="truncate text-xs" style={{ color: "var(--text-secondary)" }}
            title={item.label}>
            {item.label}
          </span>
          <span className="block h-2.5 rounded-sm" style={{ background: "var(--surface-2)" }}>
            <span className="block h-2.5 rounded-sm transition-[width] duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: colorFor ? colorFor(item.label) : "var(--series-1)",
              }} />
          </span>
          <span className="tabular text-right text-xs font-semibold">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
