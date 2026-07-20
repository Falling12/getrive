// Single source of truth for the landing page's testimonial quotes.
// Ships empty — Getrive has no real user quotes yet, and the landing page
// currently has no section rendering this array (the old SocialProof
// section was cut for being redundant filler while this stayed empty).
// Once real quotes exist, add them here and bring back a section that
// reads from this array — no fabricated social proof in the meantime.
export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  link?: string;
}

export const TESTIMONIALS: Testimonial[] = [];
