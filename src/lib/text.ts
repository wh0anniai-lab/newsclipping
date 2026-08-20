const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#039": "'",
  "#34": '"',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z#0-9]+);/g, (match, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const n = parseInt(code.slice(2), 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    if (/^#\d+$/.test(code)) {
      const n = parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code] ?? match;
  });
}

const INLINE_TAG = /<\/?(?:b|strong|em|i|u|span|mark)(?:\s[^>]*)?>/gi;

export function stripHtml(input: string): string {
  // 네이버 API는 검색어를 <b>로 감싸 준다. 공백 없이 지워야 "삼성전자와"가 "삼성전자 와"로 갈라지지 않는다.
  const withoutInline = input.replace(INLINE_TAG, "");
  return decodeEntities(withoutInline.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?)\]])/g, "$1")
    .trim();
}

/** 제목 끝에 남는 구분자 찌꺼기(" |", " -", " ::")를 털어낸다. */
export function cleanTitle(title: string): string {
  return title.replace(/[\s|\-–—:·]+$/g, "").trim();
}

/** 뉴스 제목에서 " - 언론사" 꼬리표를 분리한다 (구글 뉴스 형식). */
export function splitTitleAndPress(raw: string): { title: string; press: string } {
  const idx = raw.lastIndexOf(" - ");
  if (idx > 10 && raw.length - idx < 40) {
    return { title: cleanTitle(raw.slice(0, idx)), press: raw.slice(idx + 3).trim() };
  }
  return { title: cleanTitle(raw), press: "" };
}

/** 중복 판정을 위한 제목 정규화 키 */
export function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^0-9a-z가-힣]/g, "");
}

export function pressFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return "";
  }
}

const SENTENCE_END = /(?<=[.!?。])\s+|(?<=(?:다|요|음|함|됨|임)\.)\s+/;

export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);
}

/** 조사/접미어를 대략적으로 떼어낸 한국어 + 영문 토크나이저 */
const JOSA = /(으로써|으로서|에서는|에게서|이라고|라고는|까지도|부터는|으로|에서|에게|한테|보다|처럼|까지|부터|밖에|조차|마저|이나|라도|이란|라는|이라|와의|과의|의|가|이|은|는|을|를|에|과|와|도|만|로|랑|께|야)$/;

export const STOPWORDS = new Set([
  "기자", "뉴스", "속보", "단독", "종합", "사진", "영상", "무단", "전재", "배포", "금지", "오늘", "내일", "어제",
  "지난", "올해", "최근", "이날", "관련", "대한", "위해", "통해", "이번", "지난해", "가장", "대해", "따라", "밝혔다",
  "말했다", "전했다", "밝혔", "했다", "한다", "있다", "없다", "된다", "됐다", "이라며", "라며", "대비", "예정", "계획",
  "이라고", "한편", "그러나", "하지만", "때문", "동안", "경우", "the", "and", "for", "with", "that", "this", "from",
  "says", "said", "will", "have", "has", "was", "are", "you", "your", "its", "new", "news",
  "추진", "진행", "개최", "참여", "관계자", "지난달", "이달", "내년", "현재", "이후", "이상", "이하",
  "각각", "전년", "등을", "등이", "있는", "밝혔다는", "기준", "규모", "방침", "예상", "전망된다",
  "실시", "마련", "개선", "확인", "설명", "강조", "지적", "제기", "따르면", "이라는", "라는",
  "최대", "최소", "역대", "오는", "당시", "가운데", "대상", "가능", "필요", "중요", "다양",
]);

export function tokenize(text: string): string[] {
  const out: string[] = [];
  const raw = text.toLowerCase().match(/[가-힣]{2,}|[a-z]{3,}|\d{4}년|\d+(?:\.\d+)?%/g) ?? [];
  for (const t of raw) {
    let token = t;
    if (/^[가-힣]+$/.test(token) && token.length > 2) {
      token = token.replace(JOSA, "");
    }
    if (token.length < 2) continue;
    if (STOPWORDS.has(token)) continue;
    out.push(token);
  }
  return out;
}

export function toDateKey(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function formatKst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const s = kst.toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 16)}`;
}

/** KST 기준으로 `daysAgo`일 전 자정의 UTC 밀리초 */
export function kstDayStartMs(daysAgo: number): number {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const todayStartKst = Math.floor((Date.now() + KST_OFFSET) / 86400000) * 86400000;
  return todayStartKst - daysAgo * 86400000 - KST_OFFSET;
}

/** 받침 유무에 따라 조사를 고른다. (예: josa("대한항공", ["은", "는"])) */
export function josa(word: string, [withBatchim, withoutBatchim]: [string, string]): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return withoutBatchim;
  return (code - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim;
}

/** ess, kdi 같은 영문 약어는 대문자로 보여준다. */
export function displayToken(label: string): string {
  return /^[a-z]{2,5}$/.test(label) ? label.toUpperCase() : label;
}
