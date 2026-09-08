import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ملتزم | لا تدفع غرامة تأخير مرة ثانية",
  description:
    "ملتزم يتابع لك كل تجديدات منشأتك — السجل التجاري، رخصة بلدي، شهادة الزكاة، السعودة، التأمينات، رخص العمل والإقامات — وينبهك قبل الاستحقاق بوقت كافٍ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${arabic.variable} antialiased`}>{children}</body>
    </html>
  );
}
