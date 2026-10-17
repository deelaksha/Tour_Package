import gsap from "gsap";
import { T } from "@/lib/config/journeyScenes";
import { S_COAST, S_HOME, S_PICKUP } from "@/lib/config/route";
import { SHOT_SCHEDULE } from "@/lib/config/cameraPoses";
import { ATMOSPHERE_SCHEDULE } from "@/lib/config/atmosphere";
import { JOURNEY_SCENES } from "@/lib/config/journeyScenes";
import { journey, setJourneyTime, type JourneyChannels } from "./journeyStore";

/**
 * The master journey timeline. One paused GSAP timeline animates every
 * scroll-driven channel; ScrollTrigger scrubs it. Characters read the
 * timeline's playhead (journey.time) and evaluate their own deterministic
 * scripts, so nothing here needs per-object ScrollTriggers.
 */
export function createJourneyTimeline(ch: JourneyChannels = journey.channels) {
  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "none" },
    onUpdate() {
      setJourneyTime(this.time(), this.progress());
    },
  });

  JOURNEY_SCENES.forEach((s) => tl.addLabel(s.id, s.start));

  // Bus: parked → departs → brakes at the coast; later the full return leg.
  tl.fromTo(ch, { busS: S_PICKUP }, { busS: S_COAST, duration: T.coastStop - T.depart, ease: "power1.inOut", immediateRender: false }, T.depart);
  tl.to(ch, { busS: S_HOME, duration: T.homeStop - T.returnDepart, ease: "power1.inOut" }, T.returnDepart);

  // Door cycles.
  const door = (to: number, at: number) => tl.to(ch, { door: to, duration: 0.8, ease: "power2.inOut" }, at);
  door(1, T.doorOpen1);
  door(0, T.doorClose1);
  door(1, T.doorOpen2);
  door(0, T.doorClose2);
  door(1, T.doorOpen3);

  // Headlights.
  tl.to(ch, { headlights: 1, duration: 0.5 }, T.headlightsOn);
  tl.to(ch, { headlights: 0.15, duration: 1.2 }, T.coastStop + 1);
  tl.to(ch, { headlights: 1, duration: 0.5 }, T.doorClose2 - 0.4);
  tl.to(ch, { headlights: 0.55, duration: 2 }, T.homeStop + 1);

  // Party lighting fades up at dusk and back down for the return.
  tl.to(ch, { party: 1, duration: T.partyFull - T.celebrationStart, ease: "sine.inOut" }, T.celebrationStart);
  tl.to(ch, { party: 0.25, duration: 4, ease: "sine.inOut" }, T.returnBoardStart + 4);
  tl.to(ch, { party: 0, duration: 3 }, T.returnDepart + 2);

  // Camera: blend shot i-1 → i across each window.
  SHOT_SCHEDULE.forEach(([at, duration], i) => {
    tl.to(ch, { shot: i + 1, duration, ease: "sine.inOut" }, at);
  });

  // Time of day.
  ATMOSPHERE_SCHEDULE.forEach(([at, duration], i) => {
    tl.to(ch, { atmo: i + 1, duration, ease: "sine.inOut" }, at);
  });

  // Pad to the full story length.
  tl.set({}, {}, T.end);
  return tl;
}
