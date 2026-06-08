import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TabiTree",
  description: "みんなで作る、旅行マップ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TabiTree",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${nunito.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* 保存済みテーマカラーを描画前に適用（フラッシュ防止・全ルート共通） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('tabitree_theme_color')||localStorage.getItem('tabitree_map_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body className="flex flex-col bg-white">{children}</body>
    </html>
  );
}
