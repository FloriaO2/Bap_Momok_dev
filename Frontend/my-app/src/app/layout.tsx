import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bap! Momok? - 함께 맛있는 음식을 선택하세요",
  description: "Bap! Momok? 투표 앱으로 함께 맛있는 음식을 선택해보세요!",
  openGraph: {
    title: "Bap! Momok? - 함께 맛있는 음식을 선택하세요",
    description: "Bap! Momok? 투표 앱으로 함께 맛있는 음식을 선택해보세요!",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Bap! Momok?",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bap! Momok? - 함께 맛있는 음식을 선택하세요",
    description: "Bap! Momok? 투표 앱으로 함께 맛있는 음식을 선택해보세요!",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 카카오맵 로그인 체크 에러 무시
              const originalFetch = window.fetch;
              window.fetch = function(...args) {
                const url = args[0];
                if (typeof url === 'string' && url.includes('place.map.kakao.com/place/is-login-user/')) {
                  // 카카오맵 로그인 체크 요청은 에러를 무시하고 빈 응답 반환
                  return Promise.resolve(new Response('{}', {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                  }));
                }
                return originalFetch.apply(this, args);
              };

              // XMLHttpRequest도 가로채기
              const originalXHROpen = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(method, url, ...args) {
                if (typeof url === 'string' && url.includes('place.map.kakao.com/place/is-login-user/')) {
                  // 카카오맵 로그인 체크 요청은 무시
                  this.abort();
                  return;
                }
                return originalXHROpen.apply(this, [method, url, ...args]);
              };

              // 콘솔 에러도 필터링
              const originalConsoleError = console.error;
              console.error = function(...args) {
                const message = args.join(' ');
                if (message.includes('place.map.kakao.com/place/is-login-user/') && 
                    message.includes('400 (Bad Request)')) {
                  // 카카오맵 로그인 체크 에러는 무시
                  return;
                }
                return originalConsoleError.apply(this, args);
              };
            `,
          }}
        />
      </body>
    </html>
  );
}
