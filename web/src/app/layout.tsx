import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { AppShell } from "@/components/AppShell";
import en from "../../messages/en.json";
import { defaultLocale } from "@/i18n/request";
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
  title: "SellEase",
  description: "Furniture sales, factory ordering and finance for ABC Furniture",
};

export const viewport: Viewport = {
  themeColor: "#17452e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // dir becomes "rtl" when Urdu is added.
    <html lang={defaultLocale} dir="ltr" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="font-sans">
        <NextIntlClientProvider locale={defaultLocale} messages={en} timeZone="Asia/Karachi">
          <AppShell>{children}</AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
