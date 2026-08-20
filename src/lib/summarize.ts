import Anthropic from "@anthropic-ai/sdk";
import type { Analytics, Article, ClippingSummary, PeriodDays } from "@/lib/types";
import { displayToken, josa, tokenize } from "@/lib/text";

const MAX_ARTICLES_FOR_LLM = 80;
const CLUSTER_THRESHOLD = 0.42;

interface Cluster {
  rep: Article;
  tokens: Set<string>;
  presses: Set<string>;
  size: number;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared || 1);
}

/** 제목이 비슷한 기사를 하나의 이슈로 묶는다 (동일 사안의 중복 보도 정리). */
function clusterArticles(articles: Article[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const article of articles) {
    const tokens = new Set(tokenize(article.title));
    if (tokens.size < 2) continue;
    const match = clusters.find((c) => jaccard(c.tokens, tokens) >= CLUSTER_THRESHOLD);
    if (match) {
      match.size += 1;
      match.presses.add(article.press);
      for (const token of tokens) match.tokens.add(token);
    } else {
      clusters.push({ rep: article, tokens, presses: new Set([article.press]), size: 1 });
    }
  }
  return clusters.sort((a, b) => b.presses.size - a.presses.size || b.size - a.size);
}

function quote(title: string): string {
  return `'${title.replace(/^\[[^\]]*\]\s*/, "").trim()}'`;
}

/** LLM 키가 없어도 동작하는 규칙 기반 요약 */
export function extractiveSummary(
  articles: Article[],
  keywords: string[],
  period: PeriodDays,
  analytics: Analytics,
): ClippingSummary {
  const clusters = clusterArticles(articles);
  const sentences: string[] = [];

  sentences.push(
    `최근 ${period}일간 '${keywords.join(", ")}' 관련 기사 ${analytics.total}건이 ` +
      `언론사 ${analytics.pressCount}곳에서 수집됐다.`,
  );

  const [first, second, third] = clusters;
  if (first) {
    const title = quote(first.rep.title);
    sentences.push(
      `가장 많이 다뤄진 이슈는 ${title}${josa(first.rep.title, ["으로", "로"])}, ` +
        `${first.presses.size}개 매체가 보도했다.`,
    );
  }
  if (second) {
    const tail = third
      ? `${quote(second.rep.title)}(${second.presses.size}개 매체), ${quote(third.rep.title)}(${third.presses.size}개 매체)가`
      : `${quote(second.rep.title)}(${second.presses.size}개 매체)가`;
    sentences.push(`이어 ${tail} 뒤를 이었다.`);
  }

  if (analytics.peak) {
    const topPress = analytics.pressTop[0];
    const pressPart = topPress
      ? `${topPress.label}${josa(topPress.label, ["이", "가"])} ${topPress.value}건으로 가장 많이 다뤘다`
      : "특정 매체 집중도는 낮았다";
    sentences.push(
      `보도량은 ${analytics.peak.date}에 ${analytics.peak.count}건으로 정점을 찍었고, ` +
        `일평균 ${analytics.dailyAverage}건 수준이며 ${pressPart}.`,
    );
  }

  const related = analytics.keywordCloud.slice(0, 5).map((k) => displayToken(k.label));
  if (related.length > 0) {
    sentences.push(`이 기간 함께 언급된 연관 키워드는 ${related.join(", ")} 등이다.`);
  }

  return {
    sentences: sentences.slice(0, 5),
    topIssues: clusters.slice(0, 5).map((c) => c.rep.title),
    engine: "extractive",
  };
}

function parseJsonBlock(raw: string): { summary?: unknown; topIssues?: unknown } | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function summarizeClipping(
  articles: Article[],
  keywords: string[],
  period: PeriodDays,
  analytics: Analytics,
): Promise<ClippingSummary> {
  const fallback = extractiveSummary(articles, keywords, period, analytics);
  if (articles.length === 0 || !process.env.ANTHROPIC_API_KEY) return fallback;

  const digest = articles
    .slice(0, MAX_ARTICLES_FOR_LLM)
    .map((a, i) => {
      const date = a.publishedAt.slice(0, 10);
      const desc = a.description ? ` / ${a.description.slice(0, 160)}` : "";
      return `${i + 1}. [${date}][${a.press}] ${a.title}${desc}`;
    })
    .join("\n");

  const prompt =
    `다음은 '${keywords.join(", ")}' 키워드로 최근 ${period}일간 수집한 뉴스 클리핑 목록입니다. ` +
    `총 ${analytics.total}건, 언론사 ${analytics.pressCount}곳이며 ` +
    `${analytics.peak ? `${analytics.peak.date}에 ${analytics.peak.count}건으로 보도량이 가장 많았습니다.` : ""}\n\n` +
    `${digest}\n\n` +
    `전체 보도 흐름을 한국어로 정리해 주세요.\n` +
    `- summary: 5문장 이내. 각 문장은 완결된 문장이며, 목록 전체를 관통하는 핵심 이슈·수치·변화를 담습니다. ` +
    `첫 문장에는 수집 규모를, 이후 문장에는 가장 많이 보도된 이슈부터 순서대로 담아 주세요.\n` +
    `- topIssues: 이 기간의 주요 이슈 5개를 각각 30자 이내 구절로 정리합니다.\n` +
    `기사에 없는 내용을 추측해서 넣지 마세요.\n` +
    `아래 JSON 형식으로만 답하세요: {"summary": ["..."], "topIssues": ["..."]}`;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: "low" },
      system: "당신은 기업 홍보팀의 뉴스 클리핑 담당자입니다. 사실에 근거해 간결하게 정리합니다.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const parsed = parseJsonBlock(text);
    const sentences = Array.isArray(parsed?.summary)
      ? parsed.summary.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [];
    if (sentences.length === 0) return fallback;

    const topIssues = Array.isArray(parsed?.topIssues)
      ? parsed.topIssues.filter((s): s is string => typeof s === "string").slice(0, 5)
      : fallback.topIssues;

    return {
      sentences: sentences.slice(0, 5),
      topIssues: topIssues.length > 0 ? topIssues : fallback.topIssues,
      engine: "claude",
    };
  } catch (error) {
    console.error("Claude 요약 실패, 규칙 기반 요약으로 대체합니다:", error);
    return fallback;
  }
}
