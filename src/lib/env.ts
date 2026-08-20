/**
 * 환경변수 파서.
 *
 * 대시보드(Vercel 등)에서 값 없이 등록한 변수는 `undefined`가 아니라 빈 문자열로
 * 들어온다. `??`는 빈 문자열을 걸러내지 못해 `Number("")`가 0이 되므로,
 * 여기서 명시적으로 처리한다.
 */

/** 양수여야 의미가 있는 숫자 설정값 (한도, 포트 등) */
export function positiveNumberEnv(raw: string | undefined, fallback: number): number {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** 값이 실제로 채워져 있는지 (공백만 있는 경우도 비어 있는 것으로 본다) */
export function hasEnv(...names: string[]): boolean {
  return names.every((name) => Boolean(process.env[name]?.trim()));
}
