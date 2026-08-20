import { buildFileName, buildWorkbook } from "@/lib/excel";
import type { ClippingResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let result: ClippingResult;
  try {
    result = (await request.json()) as ClippingResult;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!result?.articles || !Array.isArray(result.articles)) {
    return Response.json({ error: "내려받을 클리핑 결과가 없습니다." }, { status: 400 });
  }

  const buffer = await buildWorkbook(result);
  const fileName = buildFileName(result.keywords ?? [], result.period ?? 7);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        `attachment; filename="clipping.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": String(buffer.length),
    },
  });
}
