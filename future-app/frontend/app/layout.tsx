import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUTURE — חינוך פיננסי אישי | פנסיה והשקעות",
  description: "FUTURE עוזרת לך להבין את המצב הפיננסי שלך — פנסיה, קרן השתלמות והשקעות. ניתוח מבוסס AI, ללא עמלות וללא ניגוד עניינים.",
  keywords: "חינוך פיננסי, פנסיה, קרן השתלמות, השקעות, תכנון פיננסי, AI פיננסי",
  openGraph: {
    title: "FUTURE — חינוך פיננסי אישי",
    description: "תמונה ברורה של כל הכסף שלך — פנסיה, חסכונות והשקעות. שיחת היכרות ראשונה ללא עלות.",
    locale: "he_IL",
    type: "website",
  },
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
