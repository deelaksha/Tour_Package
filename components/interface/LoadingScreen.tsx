"use client";

import { BRAND } from "@/lib/config/brand";
export function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div className="loading" data-visible={visible} role="status" aria-live="polite" aria-hidden={!visible}>
      <p className="loading__mark">{BRAND.wordmark}</p>
      <span className="loading__bar" aria-hidden="true">
        <span />
      </span>
      <p className="loading__text">{visible ? "Building the route — Bengaluru to the coast" : "Ready"}</p>
    </div>
  );
}
