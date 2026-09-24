import type { Metadata } from "next";
import { MyGifts } from "./MyGifts";

export const metadata: Metadata = {
  title: "My gifts",
  description: "Find, re-share or reclaim the gifts you’ve wrapped.",
};

export default function GiftsPage() {
  return <MyGifts />;
}
