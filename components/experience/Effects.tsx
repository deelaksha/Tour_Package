"use client";

import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * Restrained bloom and vignette. Only mounted on the high-quality preset.
 * Anti-aliasing is SMAA (a shader pass) rather than a multisampled render
 * target: several GPU drivers return black frames for multisampled targets.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.5} radius={0.65} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.35} darkness={0.45} />
      <SMAA />
    </EffectComposer>
  );
}
