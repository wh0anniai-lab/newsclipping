import type { ClippingResult } from "@/lib/types";
import { formatKst } from "@/lib/text";

const CHANNEL_LABEL: Record<string, string> = { naver: "네이버", google: "구글" };

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function parseRecipients(input: unknown): string[] {
  const raw = typeof input === "string" ? input : Array.isArray(input) ? input.join(",") : "";
  return [...new Set(raw.split(/[,;\s]+/).map((v) => v.trim()).filter(Boolean))].slice(0, 10);
}

export function buildEmailHtml(result: ClippingResult): string {
  const { analytics, summary } = result;

  const summaryList = summary.sentences
    .map((s) => `<li style="margin-bottom:6px;line-height:1.7;">${escapeHtml(s)}</li>`)
    .join("");

  const kpis = [
    ["총 기사", `${analytics.total}건`],
    ["언론사", `${analytics.pressCount}곳`],
    ["일평균", `${analytics.dailyAverage}건`],
    ["최다 보도일", analytics.peak ? `${analytics.peak.date} (${analytics.peak.count}건)` : "-"],
  ]
    .map(
      ([label, value]) => `
      <td style="padding:12px 14px;border:1px solid #e1e0d9;border-radius:8px;background:#fcfcfb;">
        <div style="font-size:12px;color:#898781;">${label}</div>
        <div style="font-size:18px;font-weight:700;color:#0b0b0b;margin-top:4px;">${value}</div>
      </td>`,
    )
    .join('<td style="width:8px;"></td>');

  const pressRows = analytics.pressTop
    .slice(0, 5)
    .map((p) => {
      const max = analytics.pressTop[0]?.value || 1;
      const width = Math.max(4, Math.round((p.value / max) * 100));
      return `<tr>
        <td style="padding:4px 8px 4px 0;font-size:13px;color:#52514e;white-space:nowrap;">${escapeHtml(p.label)}</td>
        <td style="padding:4px 0;width:100%;">
          <div style="background:#2a78d6;height:10px;border-radius:4px;width:${width}%;"></div>
        </td>
        <td style="padding:4px 0 4px 8px;font-size:13px;color:#0b0b0b;font-weight:600;">${p.value}</td>
      </tr>`;
    })
    .join("");

  const rows = result.articles
    .slice(0, 60)
    .map(
      (a, i) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e1e0d9;font-size:12px;color:#898781;">${i + 1}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e1e0d9;font-size:12px;color:#898781;white-space:nowrap;">${formatKst(a.publishedAt).slice(0, 10)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e1e0d9;font-size:12px;color:#52514e;white-space:nowrap;">${escapeHtml(a.press)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e1e0d9;font-size:14px;">
          <a href="${escapeHtml(a.link)}" style="color:#1c5cab;text-decoration:none;font-weight:600;">${escapeHtml(a.title)}</a>
          <div style="font-size:11px;color:#898781;margin-top:2px;">${CHANNEL_LABEL[a.channel] ?? a.channel} · ${escapeHtml(a.keyword)}</div>
        </td>
      </tr>`,
    )
    .join("");

  const more = result.articles.length > 60
    ? `<p style="font-size:13px;color:#898781;">이 메일에는 상위 60건만 표시했습니다. 전체 ${result.articles.length}건은 첨부된 엑셀 파일에서 확인하세요.</p>`
    : "";

  return `<!doctype html>
<html lang="ko"><body style="margin:0;padding:24px;background:#f9f9f7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <div style="max-width:760px;margin:0 auto;background:#fcfcfb;border:1px solid rgba(11,11,11,0.10);border-radius:14px;padding:28px;">
    <p style="margin:0;font-size:12px;letter-spacing:0.08em;color:#898781;text-transform:uppercase;">News Clipping Report</p>
    <h1 style="margin:6px 0 4px;font-size:22px;color:#0b0b0b;">${escapeHtml(result.keywords.join(", "))}</h1>
    <p style="margin:0 0 20px;font-size:13px;color:#52514e;">${result.from} ~ ${result.to} (최근 ${result.period}일) · ${formatKst(result.generatedAt)} 생성</p>

    <div style="background:#eff4fb;border-left:4px solid #2a78d6;border-radius:8px;padding:16px 18px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:#1c5cab;margin-bottom:8px;">전체 요약 (5문장 이내)</div>
      <ol style="margin:0;padding-left:18px;font-size:14px;color:#0b0b0b;">${summaryList}</ol>
    </div>

    <table style="width:100%;border-collapse:separate;border-spacing:0;margin-bottom:22px;"><tr>${kpis}</tr></table>

    <div style="font-size:13px;font-weight:700;color:#0b0b0b;margin-bottom:8px;">언론사별 보도량 TOP 5</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${pressRows}</table>

    <div style="font-size:13px;font-weight:700;color:#0b0b0b;margin-bottom:8px;">클리핑 기사 목록</div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    ${more}

    <p style="margin-top:24px;font-size:12px;color:#898781;">본 메일은 뉴스 클리핑 시스템에서 자동 생성되었습니다.</p>
  </div>
</body></html>`;
}

export function buildEmailText(result: ClippingResult): string {
  const lines = [
    `뉴스 클리핑 리포트 - ${result.keywords.join(", ")}`,
    `${result.from} ~ ${result.to} (최근 ${result.period}일) / 총 ${result.analytics.total}건`,
    "",
    "[전체 요약]",
    ...result.summary.sentences.map((s, i) => `${i + 1}. ${s}`),
    "",
    "[기사 목록]",
    ...result.articles.slice(0, 60).map((a, i) => `${i + 1}. ${a.title} (${a.press}) ${a.link}`),
  ];
  return lines.join("\n");
}
