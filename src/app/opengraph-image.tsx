import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Keepsake: gift a real share in a link";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "Tokenized stocks, gift-wrapped", title: "Give someone a piece of the future." });
}
