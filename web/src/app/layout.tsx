import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import en from "../../messages/en.json";
import { defaultLocale } from "@/i18n/request";
import { SessionProvider } from "@/lib/session";
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

// Sign-in is checked in the browser against the API (every page waits for it), so Next.js's
// instant-navigation check can't see inside pages. It's switched off as its docs suggest.
export const instant = false;

export const viewport: Viewport = {
  themeColor: "#17452e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // dir becomes "rtl" when Urdu is added.
    <html lang={defaultLocale} dir="ltr" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="font-sans">
        <NextIntlClientProvider locale={defaultLocale} messages={en} timeZone="Asia/Karachi">
          {/* The shell reads the page address and who is signed in, which are only known in the browser. */}
          <Suspense fallback={null}>
            <SessionProvider>
              <AppShell>{children}</AppShell>
            </SessionProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
