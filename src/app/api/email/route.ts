import nodemailer from "nodemailer";
import { buildEmailHtml, buildEmailText, isValidEmail, parseRecipients } from "@/lib/mail";
import { buildFileName, buildWorkbook } from "@/lib/excel";
import type { ClippingResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user, pass },
  };
}

export async function POST(request: Request) {
  let body: { to?: unknown; subject?: unknown; result?: ClippingResult };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const recipients = parseRecipients(body.to);
  if (recipients.length === 0) {
    return Response.json({ error: "받는 사람 이메일 주소를 입력해 주세요." }, { status: 400 });
  }
  const invalid = recipients.filter((r) => !isValidEmail(r));
  if (invalid.length > 0) {
    return Response.json({ error: `이메일 형식이 올바르지 않습니다: ${invalid.join(", ")}` }, { status: 400 });
  }

  const result = body.result;
  if (!result?.articles?.length) {
    return Response.json({ error: "보낼 클리핑 결과가 없습니다." }, { status: 400 });
  }

  const config = smtpConfig();
  if (!config) {
    return Response.json(
      {
        error:
          "메일 발송 설정이 없습니다. .env.local에 SMTP_HOST, SMTP_USER, SMTP_PASS를 설정한 뒤 다시 시도해 주세요.",
      },
      { status: 501 },
    );
  }

  const subject =
    typeof body.subject === "string" && body.subject.trim()
      ? body.subject.trim().slice(0, 150)
      : `[뉴스 클리핑] ${result.keywords.join(", ")} (${result.from} ~ ${result.to})`;

  try {
    const transporter = nodemailer.createTransport(config);
    const workbook = await buildWorkbook(result);

    await transporter.sendMail({
      from: process.env.MAIL_FROM || config.auth.user,
      to: recipients.join(", "),
      subject,
      text: buildEmailText(result),
      html: buildEmailHtml(result),
      attachments: [
        {
          filename: buildFileName(result.keywords, result.period),
          content: workbook,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return Response.json({ ok: true, sent: recipients.length, recipients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "메일 발송에 실패했습니다.";
    return Response.json({ error: `메일 발송 실패: ${message}` }, { status: 502 });
  }
}
