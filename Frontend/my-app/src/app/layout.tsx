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
  description: "밥모임 투표 앱으로 함께 맛있는 음식을 선택해보세요!",
  openGraph: {
    title: "Bap! Momok? - 함께 맛있는 음식을 선택하세요",
    description: "밥모임 투표 앱으로 함께 맛있는 음식을 선택해보세요!",
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
      </body>
    </html>
  );
}
