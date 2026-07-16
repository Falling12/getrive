// Single source of truth for the landing page's testimonial quotes.
// Ships empty — Getrive has no real user quotes yet (see social-proof.tsx's
// own comment: no fabricated social proof). Add entries here once real
// quotes exist; SocialProof renders nothing extra until this array is
// non-empty, so there's no placeholder state to swap out later.
export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  link?: string;
}

export const TESTIMONIALS: Testimonial[] = [];
