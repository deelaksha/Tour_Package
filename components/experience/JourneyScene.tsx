"use client";

import { useRef } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { SceneAtmosphere } from "./SceneAtmosphere";
import { JourneyCamera } from "./JourneyCamera";
import { TourBus, type BusRig } from "./TourBus";
import { TravelerGroup } from "./TravelerGroup";
import { Terrain } from "./world/Terrain";
import { Road } from "./world/Road";
import { CityEnvironment } from "./world/CityEnvironment";
import { HighwayEnvironment } from "./world/HighwayEnvironment";
import { ForestEnvironment } from "./world/ForestEnvironment";
import { Waterfall } from "./world/Waterfall";
import { CoastalEnvironment } from "./world/CoastalEnvironment";
import { PartyEnvironment } from "./world/PartyEnvironment";

export type Quality = "high" | "low";

/**
 * One continuous world laid out along the route — Bengaluru, the highway,
 * the Western Ghats and the coast — so every transition is a camera move,
 * never a scene swap.
 */
export function JourneyScene({ quality, reducedMotion }: { quality: Quality; reducedMotion: boolean }) {
  const busRig = useRef<BusRig | null>(null);
  return (
    <>
      <SceneAtmosphere quality={quality} />
      {/* Procedural studio reflections for paint and glass — no HDR file needed. */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} color="#9fdcff" position={[0, 6, -8]} scale={[20, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffb98a" position={[10, 2, 6]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#b48cff" position={[-10, 3, 4]} scale={[8, 3, 1]} />
        <Lightformer form="circle" intensity={1.5} color="#ffffff" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={8} />
      </Environment>
      <JourneyCamera reducedMotion={reducedMotion} />
      <Terrain quality={quality} />
      <Road quality={quality} />
      <CityEnvironment quality={quality} />
      <HighwayEnvironment />
      <ForestEnvironment quality={quality} />
      <Waterfall quality={quality} />
      <CoastalEnvironment quality={quality} />
      <PartyEnvironment quality={quality} />
      <TourBus rigRef={busRig} quality={quality} />
      <TravelerGroup />
    </>
  );
}
