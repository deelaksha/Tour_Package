"use client";

import { BRAND } from "@/lib/config/brand";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { T } from "@/lib/config/journeyScenes";
import { journey } from "@/lib/animation/journeyStore";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useWebGLSupport } from "@/hooks/useWebGLSupport";
import { useQualityPreset } from "@/hooks/useQualityPreset";
import { useJourneyScroll } from "./JourneyController";
import { SceneOverlay } from "@/components/interface/SceneOverlay";
import { JourneyHUD } from "@/components/interface/JourneyHUD";
import { JourneyProgress } from "@/components/interface/JourneyProgress";
import { LoadingScreen } from "@/components/interface/LoadingScreen";
import { StoryFallback } from "@/components/sections/StoryFallback";

const ExperienceCanvas = dynamic(() => import("./ExperienceCanvas"), { ssr: false });

/** How many times a lost WebGL context is recovered before showing the still story. */
const MAX_CONTEXT_RESTARTS = 2;

/** Story seconds of scroll per viewport height. */
const VH_PER_SECOND = 11;

export function TravelExperience({ onPlanTrip }: { onPlanTrip: () => void }) {
  const reducedMotion = useReducedMotion();
  const webgl = useWebGLSupport();
  const quality = useQualityPreset();
  // Each lost WebGL context remounts the canvas; only repeated losses fall back.
  const [contextLosses, setContextLosses] = useState(0);
  const contextLost = contextLosses > MAX_CONTEXT_RESTARTS;
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const section = useRef<HTMLElement>(null);

  const checking = webgl === null || quality === null;
  // Reduced motion keeps the 3D world: it simply moves only when the visitor scrolls.
  const cinematic = !checking && webgl && !contextLost;

  useJourneyScroll(section, !!cinematic, reducedMotion);

  // Stop rendering while the journey is scrolled out of view.
  useEffect(() => {
    if (!cinematic || !section.current) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(section.current);
    return () => io.disconnect();
  }, [cinematic]);

  // Pointer parallax input (no React state).
  useEffect(() => {
    if (!cinematic || reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      journey.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      journey.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [cinematic, reducedMotion]);

  // Opening reveal: the bus drives in and the camera cranes down, once.
  useEffect(() => {
    if (!ready) return;
    if (reducedMotion) {
      journey.intro = 1;
      return;
    }
    const tween = gsap.to(journey, { intro: 1, duration: 5, ease: "power2.out", delay: 0.2 });
    return () => {
      tween.kill();
    };
  }, [ready, reducedMotion]);

  const handleReady = useCallback(() => setReady(true), []);
  const handleContextLost = useCallback(() => {
    setReady(false);
    setContextLosses((n) => n + 1);
  }, []);

  if (!checking && !cinematic) {
    return (
      <StoryFallback onPlanTrip={onPlanTrip} />
    );
  }

  return (
    <section
      id="journey"
      ref={section}
      className="journey"
      style={{ height: `${Math.round(T.end * VH_PER_SECOND)}vh` }}
      aria-label={`The ${BRAND.name} journey: an animated story from Bengaluru through the Western Ghats to the Karnataka coast and back`}
    >
      <div className="journey-stage">
        {cinematic && quality && (
          <ExperienceCanvas
            key={contextLosses}
            quality={quality}
            reducedMotion={reducedMotion}
            active={active}
            onReady={handleReady}
            onContextLost={handleContextLost}
          />
        )}
        <div className="stage-shade" aria-hidden="true" />
        <SceneOverlay onPlanTrip={onPlanTrip} />
        <JourneyHUD />
        <JourneyProgress />
        <LoadingScreen visible={!ready} />
      </div>
    </section>
  );
}
