"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { JourneyScene, type Quality } from "./JourneyScene";
import { Effects } from "./Effects";

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 3) onReady();
  });
  return null;
}

export interface ExperienceCanvasProps {
  quality: Quality;
  reducedMotion: boolean;
  /** Pause rendering entirely while the journey is off-screen. */
  active: boolean;
  onReady: () => void;
  onContextLost: () => void;
}

export default function ExperienceCanvas({ quality, reducedMotion, active, onReady, onContextLost }: ExperienceCanvasProps) {
  const maxDpr = quality === "high" ? 1.5 : 1;
  const [dpr, setDpr] = useState(Math.min(maxDpr, typeof window === "undefined" ? 1 : window.devicePixelRatio));
  const usePost = quality === "high";

  return (
    <Canvas
      className="experience-canvas"
      dpr={dpr}
      shadows={quality === "high"}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: !usePost, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 42, near: 0.3, far: 3000, position: [15, 8.5, -38] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onContextLost();
        });
      }}
      aria-hidden="true"
    >
      {/* Only ever steps resolution down: each resize can flash a frame, so it must not oscillate. */}
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))} flipflops={2} />
      <JourneyScene quality={quality} reducedMotion={reducedMotion} />
      {usePost && <Effects />}
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}
