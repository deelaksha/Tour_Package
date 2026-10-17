"use client";

import { BRAND } from "@/lib/config/brand";
import { useEffect, useRef, useState } from "react";
import { scrollToId } from "@/lib/animation/scrollToScene";

const LINKS = [
  { id: "journey", label: "Journey" },
  { id: "destination", label: "Destination" },
  { id: "packages", label: "Packages" },
  { id: "expeditions", label: "Expeditions" },
];

export function Navigation({ onPlanTrip }: { onPlanTrip: () => void }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.dataset.menuOpen = "true";
    return () => {
      document.removeEventListener("keydown", onKey);
      delete document.body.dataset.menuOpen;
    };
  }, [open]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (id === "journey") window.scrollTo({ top: 0, behavior: "smooth" });
    else scrollToId(id);
  };

  return (
    <header className="nav">
      <a href="#journey" className="nav__mark" onClick={go("journey")} aria-label={`${BRAND.name} — back to the start of the journey`}>
        {BRAND.wordmark}
      </a>
      <nav aria-label="Primary" className="nav__links">
        {LINKS.map((l) => (
          <a key={l.id} href={`#${l.id}`} onClick={go(l.id)}>
            {l.label}
          </a>
        ))}
      </nav>
      <button type="button" className="btn btn--small nav__cta" onClick={onPlanTrip}>
        Plan a trip
      </button>
      <button
        ref={toggle}
        type="button"
        className="nav__toggle"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <i aria-hidden="true" />
        <i aria-hidden="true" />
      </button>
      <div id="mobile-menu" className="mobile-menu" data-open={open} inert={!open}>
        <nav aria-label="Mobile">
          {LINKS.map((l, i) => (
            <a key={l.id} ref={i === 0 ? firstLink : undefined} href={`#${l.id}`} onClick={go(l.id)}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {l.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setOpen(false);
            onPlanTrip();
          }}
        >
          Plan a trip
        </button>
      </div>
    </header>
  );
}
