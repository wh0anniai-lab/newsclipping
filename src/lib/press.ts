/** 도메인 → 언론사명 매핑 (네이버 API는 언론사명을 주지 않으므로 URL에서 추정한다) */
const HOST_TO_PRESS: Record<string, string> = {
  "chosun.com": "조선일보", "biz.chosun.com": "조선비즈", "joongang.co.kr": "중앙일보",
  "donga.com": "동아일보", "hani.co.kr": "한겨레", "khan.co.kr": "경향신문",
  "hankookilbo.com": "한국일보", "seoul.co.kr": "서울신문", "segye.com": "세계일보",
  "kmib.co.kr": "국민일보", "munhwa.com": "문화일보", "hankyung.com": "한국경제",
  "mk.co.kr": "매일경제", "sedaily.com": "서울경제", "fnnews.com": "파이낸셜뉴스",
  "edaily.co.kr": "이데일리", "mt.co.kr": "머니투데이", "news.mt.co.kr": "머니투데이",
  "asiae.co.kr": "아시아경제", "heraldcorp.com": "헤럴드경제", "etnews.com": "전자신문",
  "dt.co.kr": "디지털타임스", "zdnet.co.kr": "지디넷코리아", "bloter.net": "블로터",
  "yna.co.kr": "연합뉴스", "yonhapnewstv.co.kr": "연합뉴스TV", "newsis.com": "뉴시스",
  "news1.kr": "뉴스1", "kbs.co.kr": "KBS", "news.kbs.co.kr": "KBS", "imnews.imbc.com": "MBC",
  "sbs.co.kr": "SBS", "news.sbs.co.kr": "SBS", "ytn.co.kr": "YTN", "jtbc.co.kr": "JTBC",
  "news.jtbc.co.kr": "JTBC", "mbn.co.kr": "MBN", "tvchosun.com": "TV조선",
  "ichannela.com": "채널A", "wowtv.co.kr": "한국경제TV", "inews24.com": "아이뉴스24",
  "ddaily.co.kr": "디지털데일리", "aitimes.com": "AI타임스", "aitimes.kr": "인공지능신문",
  "theelec.kr": "디일렉", "sisajournal.com": "시사저널", "hankyung.co.kr": "한국경제",
  "ohmynews.com": "오마이뉴스", "pressian.com": "프레시안", "nocutnews.co.kr": "노컷뉴스",
  "moneys.co.kr": "머니S", "newdaily.co.kr": "뉴데일리", "ajunews.com": "아주경제",
  "g-enews.com": "글로벌이코노믹", "econovill.com": "이코노믹리뷰", "thelec.kr": "디일렉",
  "businesspost.co.kr": "비즈니스포스트", "sisain.co.kr": "시사IN", "kukinews.com": "쿠키뉴스",
  "newspim.com": "뉴스핌", "asiatoday.co.kr": "아시아투데이", "ftoday.co.kr": "파이낸셜투데이",
  "seoulfn.com": "서울파이낸스", "the-pr.co.kr": "더피알", "journalist.or.kr": "한국기자협회",
  "v.daum.net": "다음뉴스", "daum.net": "다음뉴스", "n.news.naver.com": "네이버뉴스",
  "news.naver.com": "네이버뉴스", "polinews.co.kr": "폴리뉴스", "sisajournal-e.com": "시사저널e",
  "electimes.com": "전기신문", "energy-news.co.kr": "에너지신문", "shinailbo.co.kr": "신아일보",
  "metroseoul.co.kr": "메트로신문", "ceoscoredaily.com": "CEO스코어데일리",
  "dailian.co.kr": "데일리안", "ebn.co.kr": "EBN", "topdaily.kr": "톱데일리",
  "asiatime.co.kr": "아시아타임즈", "beopbo.com": "법보신문", "etoday.co.kr": "이투데이",
  "tf.co.kr": "더팩트", "wikitree.co.kr": "위키트리", "gukjenews.com": "국제뉴스",
};

/** 구글 뉴스가 소스명 대신 도메인을 내려주는 경우를 정리한다. */
export function normalizePressName(name: string, fallbackUrl = ""): string {
  const trimmed = name.trim();
  if (!trimmed) return fallbackUrl ? pressFromHost(fallbackUrl) : "기타";
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmed)) {
    return pressFromHost(`https://${trimmed}`);
  }
  return trimmed;
}

export function pressFromHost(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "기타";
  }
  if (HOST_TO_PRESS[host]) return HOST_TO_PRESS[host];
  const parts = host.split(".");
  for (let i = 0; i < parts.length - 1; i += 1) {
    const candidate = parts.slice(i).join(".");
    if (HOST_TO_PRESS[candidate]) return HOST_TO_PRESS[candidate];
  }
  return host;
}
