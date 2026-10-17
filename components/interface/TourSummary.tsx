import { FEATURED_TOUR, formatPrice } from "@/lib/config/destinations";

export function TourSummary({ compact = false }: { compact?: boolean }) {
  const t = FEATURED_TOUR;
  const rows: [string, string][] = [
    ["Starting point", t.origin],
    ["Destination", t.destination],
    ["Duration", t.duration],
    ["Tour type", t.type],
  ];
  return (
    <dl className={`tour-summary${compact ? " tour-summary--compact" : ""}`}>
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
      <div className="tour-summary__price">
        <dt>Sample price</dt>
        <dd>
          {formatPrice(t.samplePrice)} <span>per person · illustrative, not a live quote</span>
        </dd>
      </div>
    </dl>
  );
}
