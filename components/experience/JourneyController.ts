"use client";

import { type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { createJourneyTimeline } from "@/lib/animation/createJourneyTimeline";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Binds the master journey timeline to the pinned journey section. A single
 * ScrollTrigger scrubs the single timeline; useGSAP scopes and reverts the
 * context on unmount (and on StrictMode's double invoke), so no duplicate
 * timelines or triggers survive.
 */
export function useJourneyScroll(container: RefObject<HTMLElement | null>, enabled: boolean, reducedMotion: boolean) {
  useGSAP(
    () => {
      if (!enabled || !container.current) return;
      const tl = createJourneyTimeline();
      ScrollTrigger.create({
        trigger: container.current,
        start: "top top",
        end: "bottom bottom",
        scrub: reducedMotion ? true : 1.1,
        animation: tl,
      });
      // Layout can shift once fonts land; re-measure.
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: container, dependencies: [enabled, reducedMotion], revertOnUpdate: true },
  );
}
