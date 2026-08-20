"use client";

import { useState } from "react";
import type { ClippingResult } from "@/lib/types";

interface Props {
  result: ClippingResult;
}

type Status = { kind: "idle" | "ok" | "error"; message?: string };

export default function ExportBar({ result }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function downloadExcel() {
    setDownloading(true);
    setStatus({ kind: "idle" });
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!response.ok) throw new Error("엑셀 생성에 실패했습니다.");

      const disposition = response.headers.get("Content-Disposition") ?? "";
      const encoded = /filename\*=UTF-8''([^;]+)/.exec(disposition)?.[1];
      const fileName = encoded ? decodeURIComponent(encoded) : "news-clipping.xlsx";

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus({ kind: "ok", message: `엑셀 파일을 내려받았습니다. (${result.articles.length}건)` });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "다운로드 실패" });
    } finally {
      setDownloading(false);
    }
  }

  async function sendEmail(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setStatus({ kind: "idle" });
    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, result }),
      });
      const data = (await response.json()) as { error?: string; sent?: number };
      if (!response.ok) throw new Error(data.error ?? "메일 발송에 실패했습니다.");
      setStatus({ kind: "ok", message: `${data.sent}명에게 클리핑 메일을 보냈습니다. (엑셀 첨부)` });
      setOpen(false);
      setTo("");
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "발송 실패" });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-sm font-bold">클리핑 결과 내보내기</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            엑셀의 기사 제목을 클릭하면 원본 뉴스로 바로 연결됩니다.
          </p>
        </div>

        <button type="button" onClick={downloadExcel} disabled={downloading}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--good)" }}>
          {downloading ? "생성 중…" : "엑셀 다운로드"}
        </button>

        <button type="button" onClick={() => { setOpen((v) => !v); setStatus({ kind: "idle" }); }}
          aria-expanded={open}
          className="rounded-lg border px-4 py-2.5 text-sm font-semibold"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
          메일 보내기
        </button>
      </div>

      {open && (
        <form onSubmit={sendEmail} className="mt-4 grid gap-3 rounded-lg p-4 sm:grid-cols-[1fr_1fr_auto]"
          style={{ background: "var(--surface-2)" }}>
          <label className="text-xs font-semibold">
            받는 사람
            <input type="text" required value={to} onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com (쉼표로 여러 명)"
              className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm font-normal outline-none focus:ring-2"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
          </label>
          <label className="text-xs font-semibold">
            제목 <span className="font-normal" style={{ color: "var(--text-muted)" }}>(선택)</span>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder={`[뉴스 클리핑] ${result.keywords.join(", ")}`}
              className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm font-normal outline-none focus:ring-2"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
          </label>
          <button type="submit" disabled={sending}
            className="self-end rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}>
            {sending ? "발송 중…" : "발송"}
          </button>
        </form>
      )}

      {status.kind !== "idle" && (
        <p className="mt-3 text-xs font-medium"
          style={{ color: status.kind === "ok" ? "var(--good)" : "var(--critical)" }}>
          {status.message}
        </p>
      )}
    </section>
  );
}
