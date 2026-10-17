import * as THREE from "three";
import { shared } from "./sharedUniforms";

/**
 * Camera-occluder fade. Scenery that sits on the sightline between the camera
 * and what it is looking at (or right in front of the lens) dissolves with a
 * screen-space dither instead of sweeping across the frame as a black shape.
 * Applied to props only — never to the ground, road, bus or travelers.
 */
export const OCCLUSION_FADE_GLSL = /* glsl */ `
uniform vec3 uFadeTarget;
float occlusionIgn(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void occlusionFade(vec3 wp) {
  vec3 axis = uFadeTarget - cameraPosition;
  float len = length(axis);
  vec3 dir = axis / max(len, 1e-3);
  vec3 rel = wp - cameraPosition;
  float t = dot(rel, dir);
  float perp = length(rel - dir * t);
  // Anything within a few metres of the lens.
  float alpha = smoothstep(1.5, 5.0, length(rel));
  // A cone around the sightline that stops short of the subject itself.
  float radius = 0.9 + max(t, 0.0) * 0.14;
  float cone = step(0.0, t) * (1.0 - smoothstep(len - 6.0, len - 3.0, t)) * (1.0 - smoothstep(radius, radius + 1.2, perp));
  alpha = min(alpha, 1.0 - cone);
  if (alpha < 0.999 && occlusionIgn(gl_FragCoord.xy) > alpha) discard;
}
`;

/** Patch a built-in material (standard, basic, lambert…) in place. */
export function withOcclusionFade<M extends THREE.Material>(material: M): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFadeTarget = shared.uFadeTarget;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFadeWorld;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec4 fadeWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fadeWorld = instanceMatrix * fadeWorld;
        #endif
        vFadeWorld = (modelMatrix * fadeWorld).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vFadeWorld;\n${OCCLUSION_FADE_GLSL}`)
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nocclusionFade(vFadeWorld);");
  };
  material.customProgramCacheKey = () => "occlusion-fade";
  return material;
}
