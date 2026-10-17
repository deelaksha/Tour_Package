import { BRAND } from "@/lib/config/brand";
export function FinalCallToAction({ onPlanTrip }: { onPlanTrip: () => void }) {
  return (
    <footer className="footer">
      <div className="footer__cta">
        <h2 className="section__title">
          FIND YOUR PEOPLE.
          <br />
          LEAVE THE ORDINARY BEHIND.
        </h2>
        <button type="button" className="btn btn--primary" onClick={onPlanTrip}>
          Discover your next trip
        </button>
      </div>
      <div className="footer__base">
        <span className="nav__mark">{BRAND.wordmark}</span>
        <p>
          Concept homepage. Itineraries and prices are illustrative samples; there is no live inventory, reservation or
          payment system behind this page.
        </p>
      </div>
    </footer>
  );
}
