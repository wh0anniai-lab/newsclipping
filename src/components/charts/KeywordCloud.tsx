"use client";

import type { CountItem } from "@/lib/types";
import { displayToken } from "@/lib/text";

interface Props {
  items: CountItem[];
  onSelect?: (keyword: string) => void;
}

export default function KeywordCloud({ items, onSelect }: Props) {
  if (items.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>데이터가 없습니다.</p>;
  }

  const max = items[0].value;
  const min = items[items.length - 1].value;


  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      {items.map((item, rank) => {
        // 빈도는 글자 크기가 전달하고, 색은 상위/중위/하위 3단계만 강조한다.
        const ratio = max === min ? 1 : (item.value - min) / (max - min);
        const size = 13 + Math.round(Math.sqrt(ratio) * 19);
        const color =
          rank < 5 ? "var(--accent)" : rank < 15 ? "var(--text-primary)" : "var(--text-muted)";
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect?.(item.label)}
            title={`${displayToken(item.label)} · ${item.value}건`}
            className="rounded transition-opacity hover:opacity-60 focus:outline-none focus-visible:ring-2"
            style={{
              fontSize: `${size}px`,
              lineHeight: 1.15,
              fontWeight: rank < 5 ? 700 : rank < 15 ? 600 : 500,
              color,
            }}
          >
            {displayToken(item.label)}
            <span className="tabular ml-1 align-super text-[10px] font-normal"
              style={{ color: "var(--text-muted)" }}>{item.value}</span>
          </button>
        );
      })}
    </div>
  );
}
