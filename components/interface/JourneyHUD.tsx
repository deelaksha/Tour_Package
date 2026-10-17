"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { effectiveBusS, journey } from "@/lib/animation/journeyStore";
import { JOURNEY_SCENES } from "@/lib/config/journeyScenes";
import { S_COAST, S_HOME, S_PICKUP } from "@/lib/config/route";
import { useJourneyScene } from "@/hooks/useJourneyScene";
import { storyClock } from "@/lib/utils/storyClock";
import { clamp } from "@/lib/utils/math";

/** Illustrative one-way distance shown on the HUD. */
const ONE_WAY_KM = 400;

/**
 * Route HUD. Location changes through React (rare); the route marker,
 * distance counter and clock are written straight to their nodes on the GSAP
 * ticker so scrolling never re-renders React.
 */
export function JourneyHUD() {
  const sceneIndex = useJourneyScene();
  const scene = JOURNEY_SCENES[sceneIndex];
  const marker = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const km = useRef<HTMLSpanElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const prompt = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastKm = -1;
    let lastClock = "";
    const tick = () => {
      const s = effectiveBusS();
      const out = clamp((s - S_PICKUP) / (S_COAST - S_PICKUP));
      const back = clamp((s - S_COAST) / (S_HOME - S_COAST));
      const route = (out + back) / 2;
      if (marker.current) marker.current.style.left = `${route * 100}%`;
      if (fill.current) fill.current.style.transform = `scaleX(${route})`;
      const k = Math.round((out + back) * ONE_WAY_KM);
      if (k !== lastKm && km.current) {
        km.current.textContent = String(k).padStart(3, "0");
        lastKm = k;
      }
      const c = storyClock(journey.time);
      if (c !== lastClock && clock.current) {
        clock.current.textContent = c;
        lastClock = c;
      }
      if (prompt.current) prompt.current.dataset.hidden = String(journey.time > 1.2);
    };
    gsap.ticker.add(tick);
    tick();
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <>
      <div className="hud" role="group" aria-label="Journey status">
        <div className="hud__cell">
          <span className="hud__label">Now</span>
          <span className="hud__value">{scene.location}</span>
        </div>
        <div className="hud__route" aria-hidden="true">
          <div className="hud__route-labels">
            <span>BLR</span>
            <span>COAST</span>
            <span>BLR</span>
          </div>
          <div className="hud__track">
            <span ref={fill} className="hud__fill" />
            <span className="hud__stop" style={{ left: "0%" }} />
            <span className="hud__stop" style={{ left: "50%" }} />
            <span className="hud__stop" style={{ left: "100%" }} />
            <span ref={marker} className="hud__marker" />
          </div>
        </div>
        <div className="hud__cell hud__cell--right">
          <span className="hud__label">
            KM <span ref={km}>000</span> / {ONE_WAY_KM * 2}
          </span>
          <span ref={clock} className="hud__value hud__value--mono">
            DAY 1 · 05:10
          </span>
        </div>
      </div>
      <div ref={prompt} className="scroll-prompt" data-hidden="false" aria-hidden="true">
        <span>Scroll to begin the journey</span>
        <i />
      </div>
    </>
  );
}
