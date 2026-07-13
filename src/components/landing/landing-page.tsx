import { brandSans, brandMono } from "@/lib/fonts";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { AmbientGlow } from "@/components/landing/ambient-glow";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TrustSection } from "@/components/landing/trust-section";
import { FeatureHighlights } from "@/components/landing/feature-highlights";
import { SocialProof } from "@/components/landing/social-proof";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingAnalytics } from "@/components/analytics/landing-analytics";

// The public marketing surface — reuses the exact same .theme-getrive brand
// kit and fonts as the auth/onboarding flow (see (auth)/layout.tsx), plus a
// brighter --accent-glow and heavier scroll-triggered motion specific to
// this page (see globals.css) after iterating on the AIDesigner design.
export function LandingPage() {
  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive relative min-h-[100dvh] overflow-x-hidden bg-background font-sans text-foreground`}
    >
      <LandingAnalytics />
      <AuthBackdrop />
      <AmbientGlow />
      <LandingNav />
      <LandingHero />
      <ProblemSection />
      <HowItWorks />
      <TrustSection />
      <FeatureHighlights />
      <SocialProof />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
