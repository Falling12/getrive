import { Outfit, Source_Code_Pro } from "next/font/google";

// Getrive's one dark/technical brand kit typography — shared by every
// section that uses `.theme-getrive` (see globals.css).
export const brandSans = Outfit({
  variable: "--font-brand-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const brandMono = Source_Code_Pro({
  variable: "--font-brand-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
