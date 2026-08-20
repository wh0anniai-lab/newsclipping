import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * 네이버 검색 API 일일 호출량 가드.
 *
 * 카운터는 KST 자정에 자동으로 초기화된다. 이 앱이 보낸 호출만 세므로
 * 네이버 콘솔의 수치와 완전히 일치하지는 않는다. 네이버가 429를 돌려주면
 * 그것을 우선해 그날의 소진으로 기록한다.
 *
 * 저장 위치는 환경에 따라 다르다.
 *  - 로컬: `.data/naver-quota.json` — 서버를 재시작해도 유지된다.
 *  - 서버리스(Vercel): `/tmp` + 메모리 — 파일시스템이 읽기 전용이거나 인스턴스마다
 *    분리되므로 카운터는 인스턴스 단위로만 정확하다. 파일 입출력이 실패해도
 *    절대 예외를 던지지 않고 메모리 카운터로 계속 동작한다.
 *    여러 인스턴스에서 정확히 세려면 Redis 같은 공유 저장소가 필요하다.
 *    (그 경우에도 네이버가 429를 주면 즉시 차단되므로 한도를 크게 넘지는 않는다.)
 */

export const NAVER_DAILY_LIMIT = Number(process.env.NAVER_DAILY_LIMIT ?? 25_000);

/** 서버리스에서는 쓰기 가능한 유일한 경로가 /tmp 다. */
const STORE_PATH = process.env.VERCEL
  ? path.join("/tmp", "naver-quota.json")
  : path.join(process.cwd(), ".data", "naver-quota.json");

/** 파일을 못 쓰는 환경에서의 대체 카운터 */
let memory: QuotaFile | null = null;

interface QuotaFile {
  date: string;
  count: number;
  /** 네이버가 429를 반환해 조기 소진으로 판정한 시각 */
  blockedAt?: string;
}

export interface QuotaStatus {
  date: string;
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
  /** 네이버 응답(429)으로 확정된 소진인지 */
  blockedByProvider: boolean;
}

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function todayKst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function read(): Promise<QuotaFile> {
  const today = todayKst();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as QuotaFile;
    // 날짜가 바뀌면 카운터를 초기화한다.
    const file: QuotaFile =
      parsed.date === today
        ? { date: today, count: Number(parsed.count) || 0, blockedAt: parsed.blockedAt }
        : { date: today, count: 0 };
    memory = file;
    return file;
  } catch {
    // 파일이 없거나 읽을 수 없으면 메모리 카운터를 쓴다.
    if (memory?.date === today) return memory;
    const file: QuotaFile = { date: today, count: 0 };
    memory = file;
    return file;
  }
}

async function write(data: QuotaFile): Promise<void> {
  // 메모리를 먼저 갱신해 둔다 — 파일 쓰기가 실패해도 카운터는 살아 있어야 한다.
  memory = data;
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // 읽기 전용 파일시스템(서버리스) — 메모리 카운터만으로 계속 동작한다.
  }
}

// 병렬 요청이 카운터를 덮어쓰지 않도록 읽기-수정-쓰기를 직렬화한다.
let chain: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task);
  chain = next.catch(() => undefined);
  return next;
}

function toStatus(file: QuotaFile): QuotaStatus {
  const used = file.count;
  const blockedByProvider = Boolean(file.blockedAt);
  const remaining = Math.max(0, NAVER_DAILY_LIMIT - used);
  return {
    date: file.date,
    used,
    limit: NAVER_DAILY_LIMIT,
    remaining,
    exhausted: blockedByProvider || remaining <= 0,
    blockedByProvider,
  };
}

export async function getQuotaStatus(): Promise<QuotaStatus> {
  return serialize(async () => toStatus(await read()));
}

/**
 * 호출 1회를 예약한다. 한도를 넘으면 false를 돌려주고 카운터는 올리지 않는다.
 * 즉, 한도 초과 시 실제 네트워크 호출 자체가 일어나지 않는다.
 */
export async function reserveNaverCall(): Promise<boolean> {
  return serialize(async () => {
    const file = await read();
    if (file.blockedAt || file.count >= NAVER_DAILY_LIMIT) {
      await write(file);
      return false;
    }
    await write({ ...file, count: file.count + 1 });
    return true;
  });
}

/** 네이버가 429를 반환한 경우 — 남은 하루 동안 호출을 막는다. */
export async function markProviderExhausted(): Promise<void> {
  await serialize(async () => {
    const file = await read();
    await write({
      ...file,
      count: Math.max(file.count, NAVER_DAILY_LIMIT),
      blockedAt: file.blockedAt ?? new Date().toISOString(),
    });
  });
}

/** 오늘 사용량을 특정 값으로 맞춘다 (콘솔 실사용량과 동기화할 때). */
export async function setUsage(count: number): Promise<QuotaStatus> {
  return serialize(async () => {
    const file = await read();
    const next: QuotaFile = { date: file.date, count: Math.max(0, Math.floor(count)) };
    await write(next);
    return toStatus(next);
  });
}
