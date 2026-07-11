import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo";
import { isLocalDev } from "@/lib/limits";
import { captureSnippetBody } from "@/lib/tracking-snippet";
import { PostHogProvider } from "@/components/analytics/posthog-provider";

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogProvider />
        {children}
        {/* Getrive dogfoods its own signup-attribution feature (Option B —
            see project settings) on getrive itself: this is the capture half,
            running on every page so a visitor arriving via a tagged reply
            link (?utm_content=<TrackedLink id>) gets remembered across the
            visit. The report half lives on /onboarding, Getrive's own
            post-signup landing page — see that layout. beforeInteractive
            (only usable in the root layout) is the closest match to the
            plain synchronous <script> a founder pastes onto their own site —
            runs before hydration, so a fast bounce still gets captured. */}
        <Script
          id="getrive-attr-capture"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: captureSnippetBody() }}
        />
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
