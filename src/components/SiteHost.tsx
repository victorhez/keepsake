"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The current host, so examples show the domain the app is actually served from. */
export function SiteHost({ fallback = "keepsake" }: { fallback?: string }) {
  const host = useSyncExternalStore(subscribe, () => window.location.host, () => fallback);
  return <>{host}</>;
}
