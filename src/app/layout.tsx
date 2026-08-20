import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "뉴스 클리핑 | 키워드 모니터링 & 분석",
  description:
    "네이버·구글 뉴스를 키워드로 수집해 요약·시각화하고, 엑셀 다운로드와 메일 발송까지 한 번에 처리합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
