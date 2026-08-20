import ExcelJS from "exceljs";
import type { ClippingResult } from "@/lib/types";
import { formatKst } from "@/lib/text";

const CHANNEL_LABEL: Record<string, string> = { naver: "네이버", google: "구글" };
const HEADER_FILL = "FF1C5CAB";
const LINK_COLOR = "FF2A78D6";

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  row.height = 24;
}

export async function buildWorkbook(result: ClippingResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "뉴스 클리핑";
  workbook.created = new Date();

  /* ── 1. 요약 리포트 ── */
  const summarySheet = workbook.addWorksheet("요약 리포트");
  summarySheet.columns = [{ width: 18 }, { width: 110 }];

  const titleRow = summarySheet.addRow(["뉴스 클리핑 요약 리포트"]);
  titleRow.font = { bold: true, size: 16 };
  titleRow.height = 28;
  summarySheet.mergeCells(titleRow.number, 1, titleRow.number, 2);
  summarySheet.addRow([]);

  const meta: [string, string][] = [
    ["검색 키워드", result.keywords.join(", ")],
    ["검색 기간", `${result.from} ~ ${result.to} (최근 ${result.period}일)`],
    ["수집 건수", `${result.analytics.total}건`],
    ["언론사 수", `${result.analytics.pressCount}곳`],
    ["일평균 보도량", `${result.analytics.dailyAverage}건`],
    ["최다 보도일", result.analytics.peak ? `${result.analytics.peak.date} (${result.analytics.peak.count}건)` : "-"],
    ["생성 일시", formatKst(result.generatedAt)],
    ["요약 엔진", result.summary.engine === "claude" ? "Claude (AI 요약)" : "추출식 요약"],
  ];
  for (const [label, value] of meta) {
    const row = summarySheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF4FB" } };
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" };
  }

  summarySheet.addRow([]);
  const summaryHeader = summarySheet.addRow(["전체 요약 (5문장 이내)", ""]);
  summaryHeader.getCell(1).font = { bold: true, size: 12 };
  result.summary.sentences.forEach((sentence, i) => {
    const row = summarySheet.addRow([`${i + 1}.`, sentence]);
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.height = 32;
  });

  if (result.summary.topIssues.length > 0) {
    summarySheet.addRow([]);
    const issueHeader = summarySheet.addRow(["주요 이슈 TOP 5", ""]);
    issueHeader.getCell(1).font = { bold: true, size: 12 };
    result.summary.topIssues.forEach((issue, i) => {
      summarySheet.addRow([`${i + 1}.`, issue]);
    });
  }

  /* ── 2. 뉴스 목록 (제목 클릭 시 원문 이동) ── */
  const listSheet = workbook.addWorksheet("뉴스 목록");
  listSheet.columns = [
    { header: "번호", key: "no", width: 6 },
    { header: "발행일시", key: "date", width: 18 },
    { header: "채널", key: "channel", width: 9 },
    { header: "언론사", key: "press", width: 16 },
    { header: "검색 키워드", key: "keyword", width: 14 },
    { header: "제목 (클릭 시 원문)", key: "title", width: 62 },
    { header: "요약", key: "desc", width: 60 },
    { header: "원문 URL", key: "url", width: 44 },
  ];
  styleHeader(listSheet.getRow(1));

  result.articles.forEach((article, index) => {
    const row = listSheet.addRow({
      no: index + 1,
      date: formatKst(article.publishedAt),
      channel: CHANNEL_LABEL[article.channel] ?? article.channel,
      press: article.press,
      keyword: article.keyword,
      title: { text: article.title, hyperlink: article.link, tooltip: article.link },
      desc: article.description,
      url: { text: article.link, hyperlink: article.link },
    });
    row.getCell("title").font = { color: { argb: LINK_COLOR }, underline: true };
    row.getCell("title").alignment = { wrapText: true, vertical: "middle" };
    row.getCell("url").font = { color: { argb: LINK_COLOR }, underline: true, size: 9 };
    row.getCell("desc").alignment = { wrapText: true, vertical: "middle" };
    row.height = 30;
  });
  listSheet.autoFilter = { from: "A1", to: `H${result.articles.length + 1}` };
  listSheet.views = [{ state: "frozen", ySplit: 1 }];

  /* ── 3. 통계 ── */
  const statsSheet = workbook.addWorksheet("통계");
  statsSheet.columns = [{ width: 16 }, { width: 12 }, { width: 4 }, { width: 20 }, { width: 12 }, { width: 4 }, { width: 20 }, { width: 12 }];

  statsSheet.addRow(["일자별 보도량", "건수", "", "언론사별 TOP 10", "건수", "", "연관 키워드 TOP 20", "빈도"]);
  styleHeader(statsSheet.getRow(1));

  const rows = Math.max(
    result.analytics.daily.length,
    result.analytics.pressTop.length,
    Math.min(result.analytics.keywordCloud.length, 20),
  );
  for (let i = 0; i < rows; i += 1) {
    const day = result.analytics.daily[i];
    const press = result.analytics.pressTop[i];
    const keyword = result.analytics.keywordCloud[i];
    statsSheet.addRow([
      day?.date ?? "", day?.total ?? "", "",
      press?.label ?? "", press?.value ?? "", "",
      i < 20 ? keyword?.label ?? "" : "", i < 20 ? keyword?.value ?? "" : "",
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function buildFileName(keywords: string[], period: number): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const key = keywords.join("_").replace(/[^0-9a-zA-Z가-힣_]/g, "").slice(0, 40) || "clipping";
  return `뉴스클리핑_${key}_최근${period}일_${stamp}.xlsx`;
}
