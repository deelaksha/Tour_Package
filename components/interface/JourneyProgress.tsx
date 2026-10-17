"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { JOURNEY_SCENES } from "@/lib/config/journeyScenes";
import { journey } from "@/lib/animation/journeyStore";
import { useJourneyScene } from "@/hooks/useJourneyScene";
import { scrollToStoryTime } from "@/lib/animation/scrollToScene";

/** Vertical chapter rail: shows progress and lets visitors jump to any scene. */
export function JourneyProgress() {
  const sceneIndex = useJourneyScene();
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const tick = () => {
      if (bar.current) bar.current.style.transform = `scaleY(${journey.progress})`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <nav className="progress-rail" aria-label="Journey chapters">
      <span className="progress-rail__track" aria-hidden="true">
        <span ref={bar} className="progress-rail__bar" />
      </span>
      <ol>
        {JOURNEY_SCENES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              aria-current={i === sceneIndex ? "step" : undefined}
              onClick={() => scrollToStoryTime(s.start + 0.6)}
            >
              <span className="progress-rail__num">{String(i + 1).padStart(2, "0")}</span>
              <span className="progress-rail__label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
