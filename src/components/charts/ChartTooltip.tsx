"use client";

import type { ReactNode } from "react";

interface Props {
  /** 컨테이너 기준 가로 위치 (%) */
  left: number;
  /** 컨테이너 기준 세로 위치 (%) */
  top: number;
  children: ReactNode;
}

export default function ChartTooltip({ left, top, children }: Props) {
  const flip = left > 62;
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[9rem] rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(${flip ? "-100%" : "0"}, -50%) translateX(${flip ? "-10px" : "10px"})`,
        background: "var(--surface-1)",
        borderColor: "var(--border)",
        color: "var(--text-primary)",
      }}
    >
      {children}
    </div>
  );
}
