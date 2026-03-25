import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUTURE — פיננסים",
  description: "חינוך פיננסי מבוסס AI וניתוח השקעות",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
