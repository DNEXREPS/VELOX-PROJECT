import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toast";
import { AuthBridge } from "@/lib/auth";
import { HtmlLang } from "@/lib/i18n";
import { AccountPrompt } from "@/components/auth/AccountPrompt";

export const metadata: Metadata = {
  title: { default: "VELOX — Ride Smarter", template: "%s · VELOX" },
  description: "VELOX is a cycling intelligence platform: discover bicycles, explore brands and components, configure custom builds with compatibility checks, and get smart upgrade recommendations.",
  applicationName: "VELOX",
};

export const viewport: Viewport = { themeColor: "#090B0E", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-lime focus:px-3 focus:py-2 focus:text-ink-950">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <Toaster />
        <AccountPrompt />
        <AuthBridge />
        <HtmlLang />
      </body>
    </html>
  );
}
