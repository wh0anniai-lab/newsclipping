import type { Analytics } from "@/lib/types";

interface Props {
  analytics: Analytics;
  period: number;
}

export default function KpiTiles({ analytics, period }: Props) {
  const tiles = [
    { label: "수집 기사", value: `${analytics.total}`, unit: "건", hint: `최근 ${period}일` },
    { label: "보도 언론사", value: `${analytics.pressCount}`, unit: "곳", hint: "중복 제거 기준" },
    { label: "일평균 보도량", value: `${analytics.dailyAverage}`, unit: "건", hint: `${period}일 평균` },
    {
      label: "최다 보도일",
      value: analytics.peak ? analytics.peak.date.slice(5).replace("-", "/") : "-",
      unit: analytics.peak ? `${analytics.peak.count}건` : "",
      hint: "피크 시점",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="card px-5 py-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{tile.label}</p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold leading-none">{tile.value}</span>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{tile.unit}</span>
          </p>
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>{tile.hint}</p>
        </div>
      ))}
    </div>
  );
}
