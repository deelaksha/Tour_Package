"use client";

import Image from "next/image";
import { BRAND } from "@/lib/config/brand";
import { OVERLAY_COPY, type OverlayKey } from "@/lib/config/journeyScenes";
import { TourSummary } from "@/components/interface/TourSummary";
import { scrollToId } from "@/lib/animation/scrollToScene";

const CHAPTERS: OverlayKey[] = ["B", "C", "D", "E", "F", "G", "H"];

/** Stills rendered from the 3D journey itself (see scripts/capture-stills.mjs). */
const still = (key: OverlayKey) => `/stills/${key}.jpg`;

function SceneImage({ k, priority = false }: { k: OverlayKey; priority?: boolean }) {
  return <Image className="fallback__image" src={still(k)} alt="" fill sizes="100vw" priority={priority} />;
}

/**
 * The journey for browsers that cannot run WebGL: the same chapters and CTAs,
 * each over a still of its scene, so there is always a picture on screen.
 */
export function StoryFallback({ onPlanTrip }: { onPlanTrip: () => void }) {
  const hero = OVERLAY_COPY.A;
  const end = OVERLAY_COPY.I;
  return (
    <section id="journey" className="fallback" aria-label={`The ${BRAND.name} journey`}>
      <div className="fallback__scene fallback__scene--left">
        <SceneImage k="A" priority />
        <div className="fallback__copy">
          <p className="eyebrow eyebrow--brand">{BRAND.wordmark}</p>
          <p className="eyebrow">{hero.kicker}</p>
          <h1 className="headline">
            {hero.headline.map((l) => (
              <span key={l} className="headline__line">
                {l}
              </span>
            ))}
          </h1>
          <p className="overlay-body">{hero.body}</p>
          <div className="cta-row">
            <button type="button" className="btn btn--primary" onClick={() => scrollToId("chapter-B", false)}>
              Explore the journey
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => scrollToId("expeditions", false)}>
              View expeditions
            </button>
          </div>
          <p className="fallback__note">Your browser could not start 3D graphics, so the journey is shown as still scenes.</p>
        </div>
      </div>
      {CHAPTERS.map((k) => {
        const c = OVERLAY_COPY[k];
        return (
          <div key={k} id={`chapter-${k}`} className={`fallback__scene fallback__scene--${c.align}`}>
            <SceneImage k={k} />
            <div className="fallback__copy">
              <p className="eyebrow">{c.kicker}</p>
              <h2 className="headline headline--md">
                {c.headline.map((l) => (
                  <span key={l} className="headline__line">
                    {l}
                  </span>
                ))}
              </h2>
              <p className="overlay-body">{c.body}</p>
            </div>
          </div>
        );
      })}
      <div className="fallback__scene fallback__scene--left">
        <SceneImage k="I" />
        <div className="fallback__copy">
          <p className="eyebrow">{end.kicker}</p>
          <h2 className="headline">
            {end.headline.map((l) => (
              <span key={l} className="headline__line">
                {l}
              </span>
            ))}
          </h2>
          <p className="overlay-body">{end.body}</p>
          <TourSummary compact />
          <div className="cta-row">
            <button type="button" className="btn btn--primary" onClick={onPlanTrip}>
              Discover your next trip
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => scrollToId("packages", false)}>
              Explore tour packages
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
