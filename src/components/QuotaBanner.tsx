import type { QuotaInfo } from "@/lib/types";

interface Props {
  quota: QuotaInfo | null;
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true" className="shrink-0">
      <path
        d="M10 2.6 18.4 17H1.6L10 2.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path d="M10 7.6v4.2" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={10} cy={14.4} r={0.95} fill="currentColor" />
    </svg>
  );
}

export default function QuotaBanner({ quota }: Props) {
  if (!quota) return null;

  const pct = Math.min(100, (quota.used / quota.limit) * 100);

  /* 한도 소진 — 색만이 아니라 아이콘 + 라벨로 상태를 전달한다. */
  if (quota.exhausted) {
    return (
      <section
        role="alert"
        className="card px-5 py-4"
        style={{ borderColor: "var(--critical)", background: "var(--surface-1)" }}
      >
        <div className="flex gap-3">
          <span style={{ color: "var(--critical)" }}>
            <WarningIcon />
          </span>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--critical)" }}>
              오늘 네이버 무료 호출을 다 썼습니다
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {quota.ranOutDuringRun
                ? "이번 결과의 네이버 기사는 한도가 소진되기 직전까지 모은 분량입니다. 나머지는 구글 뉴스로 채웠습니다."
                : "한도가 회복될 때까지 네이버 호출을 중단하고 구글 뉴스만 수집합니다."}{" "}
              사용량 <span className="tabular font-semibold">{quota.used.toLocaleString()}</span> /{" "}
              <span className="tabular">{quota.limit.toLocaleString()}</span>회
              {quota.blockedByProvider && " (네이버 서버가 한도 초과를 통보)"} · 한국 시간
              자정에 초기화됩니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* 평상시 — 조용한 사용량 표시 */
  const nearLimit = pct >= 80;
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-4 py-2.5 text-xs"
      style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
    >
      <span style={{ color: "var(--text-muted)" }}>네이버 API 오늘 사용량</span>
      <span className="tabular font-semibold">
        {quota.used.toLocaleString()}
        <span style={{ color: "var(--text-muted)" }}> / {quota.limit.toLocaleString()}회</span>
      </span>
      <span
        className="h-1.5 w-28 overflow-hidden rounded-full"
        style={{ background: "var(--surface-2)" }}
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${Math.max(1.5, pct)}%`,
            background: nearLimit ? "var(--warning)" : "var(--series-1)",
          }}
        />
      </span>
      <span className="tabular" style={{ color: "var(--text-muted)" }}>
        남은 {quota.remaining.toLocaleString()}회
      </span>
      {nearLimit && (
        <span className="font-semibold" style={{ color: "var(--warning)" }}>
          한도 임박
        </span>
      )}
    </div>
  );
}
