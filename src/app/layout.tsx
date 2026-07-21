import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo";
import { isLocalDev } from "@/lib/limits";
import { brandSans, brandMono } from "@/lib/fonts";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { ConsentManager } from "@/components/analytics/consent-manager";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  keywords: [
    "reddit lead generation",
    "hacker news monitoring",
    "founder led sales",
    "cold outreach alternative",
    "product-market fit signals",
    "startup customer discovery",
  ],
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1211",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // brandSans/brandMono variables are only otherwise loaded inside
      // .theme-getrive subtrees (landing, legal, onboarding) — added here
      // too, on <html> itself, purely so the Silktide consent banner (a
      // sibling of the React tree, appended by the library directly to
      // document.body — see globals.css's #stcm-wrapper override) can
      // reference the brand fonts via inherited CSS custom properties.
      // Doesn't apply the .theme-getrive color palette anywhere new.
      className={`${geistSans.variable} ${geistMono.variable} ${brandSans.variable} ${brandMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Silktide Consent Manager (see consent-manager.tsx) — free,
            self-hosted, no account/site ID needed, unlike the Cookiebot
            approach this replaced. PostHog only starts, and Getrive's own
            signup-attribution capture (see lib/tracking-snippet.ts; the
            report half lives on /onboarding — see that layout) only runs,
            once a visitor accepts the relevant category — both are wired
            as onAccept callbacks inside consent-manager.tsx's init() call,
            not run unconditionally here like before. */}
        <ConsentManager />
        <PostHogProvider />
        {children}
        {isLocalDev && (
          <>
            {/* impeccable-live-start */}
            <script src="http://localhost:8400/live.js"></script>
            {/* impeccable-live-end */}
          </>
        )}
      </body>
    </html>
  );
}
