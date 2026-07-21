import { renderGuideOgImage, ogImageSize, ogImageContentType } from "@/lib/og-image";
import { getGuide } from "@/lib/guides";

const guide = getGuide("cold-outreach-alternative")!;

export const alt = guide.title;
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function Image() {
  return renderGuideOgImage(guide.title, guide.description);
}
