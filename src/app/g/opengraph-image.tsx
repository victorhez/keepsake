import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "You’ve been sent a gift on Keepsake";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "Open it to see what’s inside", title: "Someone wrapped a gift for you." });
}
