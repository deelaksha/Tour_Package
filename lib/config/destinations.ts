/**
 * Tour content. Everything here is illustrative sample data for the homepage;
 * there is no live inventory, pricing or reservation system behind it.
 */
export interface Tour {
  id: string;
  name: string;
  origin: string;
  destination: string;
  region: string;
  duration: string;
  nights: number;
  type: string;
  groupSize: string;
  /** Illustrative sample price in INR per person — not a live quote. */
  samplePrice: number;
  highlights: string[];
  vibe: "coast" | "mountains" | "heritage";
  months: string;
}

export const ORIGIN = {
  name: "Bengaluru",
  coordinates: "12.9716° N, 77.5946° E",
};

export const FEATURED_TOUR: Tour = {
  id: "coastal-run",
  name: "The Coastal Run",
  origin: "Bengaluru",
  destination: "Karnataka Coast",
  region: "Udupi · Malpe",
  duration: "3 days · 2 nights",
  nights: 2,
  type: "Group adventure",
  groupSize: "6–12 travelers",
  samplePrice: 14999,
  highlights: [
    "Pre-dawn departure through the Western Ghats",
    "Sunset arrival on the Arabian Sea",
    "Free afternoon on the beach",
    "Private beach night with music and bonfire",
    "Door-to-door return to Bengaluru",
  ],
  vibe: "coast",
  months: "Oct – Mar",
};

export const DESTINATION = {
  title: "The Coast",
  coordinates: "13.3500° N, 74.7000° E",
  distance: "≈ 400 km by road",
  driveTime: "≈ 8 h with stops",
};

export const EXPEDITIONS: Tour[] = [
  FEATURED_TOUR,
  {
    id: "ghats-monsoon",
    name: "Monsoon Ghats Trail",
    origin: "Bengaluru",
    destination: "Chikkamagaluru",
    region: "Western Ghats",
    duration: "2 days · 1 night",
    nights: 1,
    type: "Trek & stay",
    groupSize: "8–14 travelers",
    samplePrice: 8999,
    highlights: ["Coffee estate homestay", "Ridge-line trek", "Waterfall stop"],
    vibe: "mountains",
    months: "Jun – Sep",
  },
  {
    id: "hampi-boulders",
    name: "Hampi Boulder Weekend",
    origin: "Bengaluru",
    destination: "Hampi",
    region: "Vijayanagara",
    duration: "3 days · 2 nights",
    nights: 2,
    type: "Heritage & sunrise",
    groupSize: "6–12 travelers",
    samplePrice: 11499,
    highlights: ["Sunrise on Matanga Hill", "Coracle ride", "Ruins by bicycle"],
    vibe: "heritage",
    months: "Nov – Feb",
  },
  {
    id: "gokarna-cliffs",
    name: "Gokarna Cliff Coast",
    origin: "Bengaluru",
    destination: "Gokarna",
    region: "Uttara Kannada",
    duration: "4 days · 3 nights",
    nights: 3,
    type: "Coastal trek",
    groupSize: "6–10 travelers",
    samplePrice: 17499,
    highlights: ["Five-beach cliff trek", "Kayak at dawn", "Beach camp night"],
    vibe: "coast",
    months: "Oct – Apr",
  },
];

export const formatPrice = (inr: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(inr);
