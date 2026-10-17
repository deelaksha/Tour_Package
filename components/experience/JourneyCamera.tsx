"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createResolvedShot, evaluateCamera } from "@/lib/animation/cameraChoreography";
import { effectiveBusS, journey } from "@/lib/animation/journeyStore";
import { getBusPose } from "@/lib/config/route";
import { damp } from "@/lib/utils/math";
import { shared } from "@/lib/three/sharedUniforms";

/** Shared, read-only view of where the camera is looking (for shadows, LOD). */
export const cameraRig = { target: new THREE.Vector3(40, 0, 0) };

export function JourneyCamera({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const bus = useMemo(() => getBusPose(0), []);
  const shot = useMemo(() => createResolvedShot(), []);
  const state = useMemo(() => ({ px: 0, py: 0, right: new THREE.Vector3(), up: new THREE.Vector3() }), []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const cam = camera as THREE.PerspectiveCamera;
    getBusPose(effectiveBusS(), bus);
    const introWeight = (1 - journey.intro) * Math.max(0, 1 - journey.time / 4);
    evaluateCamera(journey.channels.shot, introWeight, bus, size.width / size.height, shot);

    cam.position.copy(shot.position);
    cam.lookAt(shot.target);

    if (!reducedMotion) {
      // Pointer parallax and a faint handheld drift, applied in view space.
      state.px = damp(state.px, journey.pointer.x, 2.5, dt);
      state.py = damp(state.py, journey.pointer.y, 2.5, dt);
      const t = clock.elapsedTime;
      state.right.setFromMatrixColumn(cam.matrixWorld, 0);
      state.up.setFromMatrixColumn(cam.matrixWorld, 1);
      cam.position
        .addScaledVector(state.right, state.px * 0.5 + Math.sin(t * 0.37) * 0.04)
        .addScaledVector(state.up, state.py * 0.25 + Math.sin(t * 0.51) * 0.03);
      cam.lookAt(shot.target);
    }

    if (Math.abs(cam.fov - shot.fov) > 0.01) {
      cam.fov = shot.fov;
      cam.updateProjectionMatrix();
    }
    cameraRig.target.copy(shot.target);
    shared.uFadeTarget.value.copy(shot.target);
  });

  return null;
}
