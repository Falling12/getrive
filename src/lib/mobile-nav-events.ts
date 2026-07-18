// Lets ProductTour ask the mobile nav drawer to open itself when a tour
// step needs to highlight a nav row that's tucked inside it (see
// mobile-nav-drawer.tsx and product-tour.tsx) — a plain DOM event rather
// than shared state/context, matching product-tour.tsx's existing
// plain-DOM-selector approach to reaching across component boundaries.
export const MOBILE_NAV_OPEN_EVENT = "getrive:mobile-nav-open";
