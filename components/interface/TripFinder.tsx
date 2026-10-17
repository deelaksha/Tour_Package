"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EXPEDITIONS, formatPrice, type Tour } from "@/lib/config/destinations";
import { scrollToId } from "@/lib/animation/scrollToScene";

type Vibe = Tour["vibe"] | "any";
type Length = "any" | "short" | "long";

/**
 * "Discover your next trip": filters the sample expeditions on the page and
 * takes the visitor to the matching package. No booking backend is implied.
 */
export function TripFinder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [vibe, setVibe] = useState<Vibe>("any");
  const [length, setLength] = useState<Length>("any");

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const results = useMemo(
    () =>
      EXPEDITIONS.filter((t) => (vibe === "any" || t.vibe === vibe) && (length === "any" || (length === "short" ? t.nights <= 2 : t.nights >= 2))),
    [vibe, length],
  );

  const viewTour = (id: string) => {
    onClose();
    window.setTimeout(() => scrollToId(`tour-${id}`), 60);
  };

  return (
    <dialog
      ref={dialog}
      className="finder"
      aria-labelledby="finder-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="finder__inner">
        <header className="finder__head">
          <p className="eyebrow">Trip finder</p>
          <h2 id="finder-title">Discover your next trip</h2>
          <button type="button" className="finder__close" onClick={onClose} aria-label="Close trip finder">
            ×
          </button>
        </header>
        <form className="finder__form" onSubmit={(e) => e.preventDefault()}>
          <fieldset>
            <legend>What are you craving?</legend>
            {(["any", "coast", "mountains", "heritage"] as Vibe[]).map((v) => (
              <label key={v} className="chip">
                <input type="radio" name="vibe" value={v} checked={vibe === v} onChange={() => setVibe(v)} />
                <span>{v === "any" ? "Anything" : v[0].toUpperCase() + v.slice(1)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>How long?</legend>
            {(
              [
                ["any", "Any length"],
                ["short", "Weekend (≤ 2 nights)"],
                ["long", "2+ nights"],
              ] as [Length, string][]
            ).map(([v, label]) => (
              <label key={v} className="chip">
                <input type="radio" name="length" value={v} checked={length === v} onChange={() => setLength(v)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </form>
        <p className="finder__count" aria-live="polite">
          {results.length} {results.length === 1 ? "expedition matches" : "expeditions match"}
        </p>
        <ul className="finder__results">
          {results.map((t) => (
            <li key={t.id}>
              <div>
                <strong>{t.name}</strong>
                <span>
                  {t.origin} → {t.destination} · {t.duration}
                </span>
              </div>
              <span className="finder__price">from {formatPrice(t.samplePrice)}*</span>
              <button type="button" className="btn btn--small" onClick={() => viewTour(t.id)}>
                View package
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="finder__empty">No sample expedition fits that combination yet — try “Anything”.</li>}
        </ul>
        <p className="fineprint">*Illustrative sample prices per person. This homepage does not take live bookings.</p>
      </div>
    </dialog>
  );
}
