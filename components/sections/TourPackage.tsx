import { EXPEDITIONS, FEATURED_TOUR, formatPrice } from "@/lib/config/destinations";
import { TourSummary } from "@/components/interface/TourSummary";

export function TourPackage({ onPlanTrip }: { onPlanTrip: () => void }) {
  return (
    <>
      <section id="packages" className="section package" aria-labelledby="packages-title">
        <div className="section__head">
          <p className="eyebrow">Tour package</p>
          <h2 id="packages-title" className="section__title">
            {FEATURED_TOUR.name.toUpperCase()}
          </h2>
          <p className="section__lede">The journey you just scrolled through, as a real itinerary.</p>
        </div>
        <div className="package__grid" id={`tour-${FEATURED_TOUR.id}`}>
          <TourSummary />
          <div className="package__highlights">
            <h3>Included moments</h3>
            <ul>
              {FEATURED_TOUR.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <p className="fineprint">Group size {FEATURED_TOUR.groupSize}. All prices on this page are illustrative samples.</p>
            <button type="button" className="btn btn--primary" onClick={onPlanTrip}>
              Discover your next trip
            </button>
          </div>
        </div>
      </section>
      <section id="expeditions" className="section expeditions" aria-labelledby="expeditions-title">
        <div className="section__head">
          <p className="eyebrow">Expeditions</p>
          <h2 id="expeditions-title" className="section__title">
            MORE ROADS
            <br />
            OUT OF BENGALURU
          </h2>
        </div>
        <ul className="expedition-list">
          {EXPEDITIONS.map((t, i) => (
            <li key={t.id} id={t.id === FEATURED_TOUR.id ? undefined : `tour-${t.id}`} className="expedition">
              <span className="expedition__num">{String(i + 1).padStart(2, "0")}</span>
              <div className="expedition__main">
                <h3>{t.name}</h3>
                <p>
                  {t.origin} → {t.destination} · {t.region}
                </p>
                <ul className="expedition__tags">
                  {t.highlights.slice(0, 3).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
              <dl className="expedition__meta">
                <div>
                  <dt>Duration</dt>
                  <dd>{t.duration}</dd>
                </div>
                <div>
                  <dt>Season</dt>
                  <dd>{t.months}</dd>
                </div>
                <div>
                  <dt>Sample price</dt>
                  <dd>{formatPrice(t.samplePrice)}*</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <p className="fineprint">*Illustrative sample prices per person — not live quotes.</p>
      </section>
    </>
  );
}
