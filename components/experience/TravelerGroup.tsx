"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TRAVELERS } from "@/lib/config/travelers";
import { createFrame, evaluateTraveler, SEATS } from "@/lib/animation/choreography";
import { effectiveBusS, journey } from "@/lib/animation/journeyStore";
import { getBusPose } from "@/lib/config/route";
import { groundHeight } from "@/lib/three/terrain";
import { applyPose, buildCharacter } from "@/lib/three/characterRig";

const BUS_FLOOR = 0.95;
const CULL_DISTANCE = 240;

/**
 * Drives every traveler from the story clock. Each frame: evaluate the
 * traveler's state machine at journey.time, place the rig in the world
 * (or in its bus seat while riding) and write the joint angles.
 */
export function TravelerGroup() {
  const rigs = useMemo(() => TRAVELERS.map((look) => buildCharacter(look)), []);
  const frames = useMemo(() => TRAVELERS.map(() => createFrame()), []);
  const bus = useMemo(() => getBusPose(0), []);
  const seat = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, camera }) => {
    const t = journey.time;
    getBusPose(effectiveBusS(), bus);
    rigs.forEach((rig, i) => {
      const f = evaluateTraveler(i, t, clock.elapsedTime, frames[i]);
      if (f.riding) {
        const s = SEATS[f.seat];
        seat.copy(bus.position).addScaledVector(bus.forward, s.x).addScaledVector(bus.left, -s.z);
        rig.root.position.set(seat.x, BUS_FLOOR, seat.z);
        rig.root.rotation.y = Math.atan2(bus.forward.x, bus.forward.z);
      } else {
        rig.root.position.set(f.x, groundHeight(f.x, f.z) + f.lift, f.z);
        rig.root.rotation.y = f.heading;
      }
      rig.root.visible = rig.root.position.distanceTo(camera.position) < CULL_DISTANCE;
      rig.handCamera.visible = f.state === "photo";
      applyPose(rig, f.pose);
    });
  });

  return (
    <group name="travelers">
      {rigs.map((rig, i) => (
        <primitive key={TRAVELERS[i].id} object={rig.root} />
      ))}
    </group>
  );
}
