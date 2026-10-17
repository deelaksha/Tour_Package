import { T } from "@/lib/config/journeyScenes";

/** Illustrative local time for each story beat: [story seconds, minutes since day-1 midnight]. */
const DAY = 24 * 60;
const KEYS: [number, number][] = [
  [0, 5 * 60 + 10],
  [T.depart, 5 * 60 + 40],
  [T.scenicStart, 9 * 60 + 15],
  [T.coastStop, 17 * 60 + 50],
  [T.celebrationStart, DAY + 19 * 60 + 30],
  [T.returnDepart, DAY + 23 * 60 + 50],
  [T.homeStop, 2 * DAY + 7 * 60 + 30],
  [T.end, 2 * DAY + 7 * 60 + 45],
];

export function storyClock(time: number) {
  let i = 0;
  while (i < KEYS.length - 2 && time > KEYS[i + 1][0]) i++;
  const [t0, m0] = KEYS[i];
  const [t1, m1] = KEYS[i + 1];
  const k = Math.min(1, Math.max(0, (time - t0) / (t1 - t0)));
  const minutes = Math.round(m0 + (m1 - m0) * k);
  const day = Math.floor(minutes / 1440) + 1;
  const hh = Math.floor((minutes % 1440) / 60);
  const mm = minutes % 60;
  return `DAY ${day} · ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
