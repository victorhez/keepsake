import type { Metadata } from "next";
import { OpenGift } from "./OpenGift";

export const metadata: Metadata = {
  title: "You’ve been sent a gift",
  description: "Someone wrapped a piece of a real company for you. Open it to see what’s inside.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function GiftPage() {
  return <OpenGift />;
}
