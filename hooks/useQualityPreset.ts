"use client";

import { useEffect, useState } from "react";
import type { Quality } from "@/components/experience/JourneyScene";

/**
 * Picks a rendering preset once on mount: small screens and low-core devices
 * get fewer instances, no post-processing and no shadows. `?quality=low|high`
 * overrides the heuristic.
 */
export function useQualityPreset(): Quality | null {
  const [quality, setQuality] = useState<Quality | null>(null);
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("quality");
    if (param === "low" || param === "high") {
      setQuality(param);
      return;
    }
    const nav = navigator as Navigator & { deviceMemory?: number };
    const small = window.matchMedia("(max-width: 820px)").matches;
    const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    setQuality(small || weak ? "low" : "high");
  }, []);
  return quality;
}
