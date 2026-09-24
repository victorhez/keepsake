import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateGift } from "./CreateGift";

export const metadata: Metadata = {
  title: "Send a gift",
  description: "Wrap a piece of a real company in a card and send it as a link.",
};

export default function CreatePage() {
  return (
    <Suspense>
      <CreateGift />
    </Suspense>
  );
}
