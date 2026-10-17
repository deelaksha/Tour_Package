"use client";

import { JOURNEY_SCENES, OVERLAY_COPY, T, type OverlayKey } from "@/lib/config/journeyScenes";
import { DESTINATION, ORIGIN } from "@/lib/config/destinations";
import { useJourneyScene } from "@/hooks/useJourneyScene";
import { scrollToId, scrollToStoryTime } from "@/lib/animation/scrollToScene";
import { TourSummary } from "./TourSummary";

const KEYS = Object.keys(OVERLAY_COPY) as OverlayKey[];

/** Scene typography. Every block is in the DOM; only the active one is visible and focusable. */
export function SceneOverlay({ onPlanTrip }: { onPlanTrip: () => void }) {
  const sceneIndex = useJourneyScene();
  const active = JOURNEY_SCENES[sceneIndex].overlay;

  return (
    <div className="overlay" aria-live="polite">
      {KEYS.map((key) => {
        const copy = OVERLAY_COPY[key];
        const isActive = key === active;
        const Heading = key === "A" ? "h1" : "h2";
        return (
          <article
            key={key}
            className={`overlay-block overlay-block--${copy.align} overlay-block--${key}`}
            data-active={isActive}
            aria-hidden={!isActive}
            inert={!isActive}
          >
            <p className="eyebrow">{copy.kicker}</p>
            <Heading className={key === "E" ? "headline headline--xl" : "headline"}>
              {copy.headline.map((line, i) => (
                <span key={line} className="headline__line" style={{ transitionDelay: `${0.08 * i + 0.1}s` }}>
                  {line}
                </span>
              ))}
            </Heading>
            <p className="overlay-body">{copy.body}</p>

            {key === "A" && (
              <>
                <div className="cta-row">
                  <button type="button" className="btn btn--primary" onClick={() => scrollToStoryTime(T.pickupStart + 1.5)}>
                    Explore the journey
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => scrollToId("expeditions")}>
                    View expeditions
                  </button>
                </div>
                <p className="route-chip" aria-label="Route: Bengaluru to the coast and back to Bengaluru">
                  <span>BENGALURU</span>
                  <i aria-hidden="true">→</i>
                  <span>THE COAST</span>
                  <i aria-hidden="true">→</i>
                  <span>BENGALURU</span>
                </p>
              </>
            )}

            {key === "E" && (
              <dl className="meta-list">
                <div>
                  <dt>Coordinates</dt>
                  <dd>{DESTINATION.coordinates}</dd>
                </div>
                <div>
                  <dt>From {ORIGIN.name}</dt>
                  <dd>{DESTINATION.distance}</dd>
                </div>
                <div>
                  <dt>Water</dt>
                  <dd>Arabian Sea</dd>
                </div>
              </dl>
            )}

            {key === "I" && (
              <>
                <TourSummary compact />
                <div className="cta-row">
                  <button type="button" className="btn btn--primary" onClick={onPlanTrip}>
                    Discover your next trip
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => scrollToId("packages")}>
                    Explore tour packages
                  </button>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
