import { DESTINATION, FEATURED_TOUR, ORIGIN } from "@/lib/config/destinations";

const ITINERARY = [
  { day: "Day 1", title: "Departure & the Ghats", text: "05:40 pickup at Terminal 01, Bengaluru. Highway breakfast, the Western Ghats by late morning, and a sunset arrival on the coast." },
  { day: "Day 2", title: "The coast, unhurried", text: "A free beach day — swim, wander, photograph. In the evening, a private beach night with music and a bonfire." },
  { day: "Day 3", title: "Overnight return", text: "Board after midnight, sleep through the ghats, and wake up back in Bengaluru with door-to-door drop-offs." },
];

export function DestinationDetails() {
  return (
    <section id="destination" className="section destination" aria-labelledby="destination-title">
      <div className="section__head">
        <p className="eyebrow">Destination</p>
        <h2 id="destination-title" className="section__title">
          {DESTINATION.title.toUpperCase()}
        </h2>
        <p className="section__lede">
          {FEATURED_TOUR.region}, on the Arabian Sea — reached through the forests of the Western Ghats.
        </p>
      </div>
      <dl className="stats">
        <div>
          <dt>From</dt>
          <dd>{ORIGIN.name}</dd>
          <span>{ORIGIN.coordinates}</span>
        </div>
        <div>
          <dt>To</dt>
          <dd>{FEATURED_TOUR.destination}</dd>
          <span>{DESTINATION.coordinates}</span>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{DESTINATION.distance}</dd>
          <span>{DESTINATION.driveTime}</span>
        </div>
        <div>
          <dt>Best months</dt>
          <dd>{FEATURED_TOUR.months}</dd>
          <span>Post-monsoon to spring</span>
        </div>
      </dl>
      <ol className="itinerary">
        {ITINERARY.map((d) => (
          <li key={d.day}>
            <span className="itinerary__day">{d.day}</span>
            <h3>{d.title}</h3>
            <p>{d.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
