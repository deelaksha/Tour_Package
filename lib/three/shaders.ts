import * as THREE from "three";
import { shared } from "./sharedUniforms";
import { SEA_LEVEL, SHORE_Z } from "./terrain";
import { OCCLUSION_FADE_GLSL } from "./occlusionFade";

const fogUniforms = () => THREE.UniformsUtils.clone(THREE.UniformsLib.fog);

const NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
`;

/* ------------------------------------------------------------------ sky -- */

export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSkyTop: shared.uSkyTop,
      uSkyHorizon: shared.uSkyHorizon,
      uSkyBottom: shared.uSkyBottom,
      uSunDir: shared.uSunDir,
      uSunColor: shared.uSunColor,
      uSunDisc: shared.uSunDisc,
      uParty: shared.uParty,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        // Just inside the far plane: exactly w can be clipped by some drivers.
        gl_Position = vec4(p.xy, p.w * 0.9999, p.w);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSkyTop, uSkyHorizon, uSkyBottom, uSunDir, uSunColor;
      uniform float uSunDisc, uParty;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uSkyHorizon, uSkyTop, pow(smoothstep(-0.02, 0.55, h), 0.55));
        col = mix(uSkyBottom, col, smoothstep(-0.12, 0.0, h));
        vec3 s = normalize(uSunDir);
        float sd = max(dot(d, s), 0.0);
        col += uSunColor * (pow(sd, 6.0) * 0.35 + pow(sd, 64.0) * 0.6) * uSunDisc;
        col += uSunColor * smoothstep(0.9993, 0.9997, sd) * 3.0 * uSunDisc;
        // Warm bonfire haze low on the horizon during the beach night.
        float band = exp(-pow((h - 0.06) * 12.0, 2.0)) * uParty;
        col += vec3(0.45, 0.22, 0.08) * band * 0.25;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function createStarsMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uStars: shared.uStars, uTime: shared.uTime, uPixelRatio: shared.uPixelRatio },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aSeed;
      uniform float uTime, uPixelRatio;
      varying float vAlpha;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w * 0.9999;
        vAlpha = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 40.0);
        vAlpha *= smoothstep(-0.02, 0.15, normalize(position).y);
        gl_PointSize = aSize * uPixelRatio;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uStars; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(0.8, 0.9, 1.0) * a * vAlpha * uStars, 1.0);
      }`,
  });
}

/* ---------------------------------------------------------------- ocean -- */

export function createOceanMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: {
      ...fogUniforms(),
      uTime: shared.uTime,
      uSunDir: shared.uSunDir,
      uSunColor: shared.uSunColor,
      uSkyTop: shared.uSkyTop,
      uSkyHorizon: shared.uSkyHorizon,
      uHemiSky: shared.uHemiSky,
      uParty: shared.uParty,
      uPartyPos: { value: new THREE.Vector3(925, 0, -51) },
      uShoreZ: { value: SHORE_Z },
      uSeaLevel: { value: SEA_LEVEL },
    },
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      uniform float uTime, uSeaLevel;
      varying vec3 vWorldPos; varying vec3 vNormalW;
      void addWave(vec2 p, vec2 dir, float amp, float len, float speed, inout float h, inout vec2 grad){
        float k = 6.28318 / len;
        float ph = dot(normalize(dir), p) * k + uTime * speed;
        h += amp * sin(ph);
        grad += normalize(dir) * amp * k * cos(ph);
      }
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float h = 0.0; vec2 g = vec2(0.0);
        addWave(wp.xz, vec2(0.15, 1.0), 0.16, 14.0, 1.3, h, g);
        addWave(wp.xz, vec2(-0.4, 1.0), 0.09, 7.5, 1.9, h, g);
        addWave(wp.xz, vec2(0.8, 0.6), 0.05, 4.2, 2.6, h, g);
        addWave(wp.xz, vec2(-0.9, 0.3), 0.03, 2.3, 3.4, h, g);
        wp.y = uSeaLevel + h;
        vWorldPos = wp.xyz;
        vNormalW = normalize(vec3(-g.x, 1.0, -g.y));
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime, uParty, uShoreZ;
      uniform vec3 uSunDir, uSunColor, uSkyTop, uSkyHorizon, uHemiSky, uPartyPos;
      varying vec3 vWorldPos; varying vec3 vNormalW;
      ${NOISE}
      void main(){
        vec2 ripple = vec2(vnoise(vWorldPos.xz * 0.9 + uTime * 0.6), vnoise(vWorldPos.zx * 0.9 - uTime * 0.5)) - 0.5;
        vec3 n = normalize(vNormalW + vec3(ripple.x, 0.0, ripple.y) * 0.18);
        vec3 v = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 r = reflect(-v, n);
        vec3 sky = mix(uSkyHorizon, uSkyTop, smoothstep(0.0, 0.5, r.y));
        vec3 deep = vec3(0.01, 0.05, 0.09) + uHemiSky * 0.05;
        vec3 shallow = vec3(0.03, 0.22, 0.26) + uHemiSky * 0.04;
        float toShore = clamp((vWorldPos.z - (uShoreZ - 40.0)) / 40.0, 0.0, 1.0);
        vec3 col = mix(deep, shallow, toShore * 0.7);
        col = mix(col, sky, 0.25 + 0.65 * fres);
        vec3 s = normalize(uSunDir);
        float spec = max(dot(r, s), 0.0);
        col += uSunColor * (pow(spec, 240.0) * 4.0 + pow(spec, 24.0) * 0.25);
        // Foam where waves meet the sand.
        float shore = vWorldPos.z - uShoreZ;
        float band = smoothstep(-7.0, 0.5, shore);
        float wash = sin(shore * 1.4 - uTime * 1.6 + vnoise(vWorldPos.xz * 0.3) * 4.0) * 0.5 + 0.5;
        float foam = band * smoothstep(0.55, 0.95, wash * vnoise(vWorldPos.xz * 1.7 + uTime * 0.3) * 1.6);
        col = mix(col, vec3(0.85, 0.92, 0.95) * (0.35 + uHemiSky * 0.6), foam * 0.75);
        // Party light reflected on the water.
        float pd = length(vWorldPos.xz - uPartyPos.xz);
        col += vec3(1.0, 0.55, 0.22) * uParty * exp(-pd * 0.08) * (0.3 + fres) * (0.85 + 0.15 * sin(uTime * 3.0 + pd * 0.4));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

/* ------------------------------------------------------------ buildings -- */

export function createTowerMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: {
      ...fogUniforms(),
      uCityGlow: shared.uCityGlow,
      uSunDir: shared.uSunDir,
      uSunColor: shared.uSunColor,
      uHemiSky: shared.uHemiSky,
      uHemiGround: shared.uHemiGround,
      uTime: shared.uTime,
      uFadeTarget: shared.uFadeTarget,
    },
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      attribute float aSeed;
      varying vec3 vWorldPos; varying vec3 vNormalW; varying float vSeed; varying float vTop;
      void main(){
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(m) * normal);
        vTop = (m * vec4(0.0, 1.0, 0.0, 1.0)).y;
        vSeed = aSeed;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uCityGlow, uTime;
      uniform vec3 uSunDir, uSunColor, uHemiSky, uHemiGround;
      varying vec3 vWorldPos; varying vec3 vNormalW; varying float vSeed; varying float vTop;
      ${NOISE}
      ${OCCLUSION_FADE_GLSL}
      void main(){
        occlusionFade(vWorldPos);
        vec3 n = normalize(vNormalW);
        vec3 base = mix(vec3(0.16, 0.15, 0.14), vec3(0.32, 0.3, 0.27), vSeed);
        float diff = max(dot(n, normalize(uSunDir)), 0.0);
        vec3 col = base * (mix(uHemiGround, uHemiSky, n.y * 0.5 + 0.5) * 1.2 + uSunColor * diff * 0.8);
        if (abs(n.y) < 0.5) {
          float along = abs(n.x) > 0.5 ? vWorldPos.z : vWorldPos.x;
          vec2 cell = vec2(along / 1.9, vWorldPos.y / 3.3);
          vec2 id = floor(cell); vec2 f = fract(cell);
          float frame = step(0.16, f.x) * step(f.x, 0.84) * step(0.22, f.y) * step(f.y, 0.86);
          float r = hash12(id + vSeed * 91.7);
          float lit = step(0.64, r) * step(2.5, vWorldPos.y);
          vec3 warm = vec3(1.0, 0.7, 0.42);
          vec3 cool = vec3(0.45, 0.85, 1.0);
          vec3 wc = mix(warm, cool, step(0.86, r));
          float flick = 0.75 + 0.25 * hash12(id.yx + floor(uTime * 0.2 + r * 10.0));
          col += frame * lit * wc * 1.1 * uCityGlow * flick;
          col += frame * vec3(0.02, 0.035, 0.06) * (0.4 + uHemiSky);
          // Daylight concrete tone so the city never reads as a black wall.
          col += vec3(0.05, 0.05, 0.045) * (0.6 + vSeed) * (1.0 - uCityGlow * 0.6);
        }
        float crown = smoothstep(vTop - 0.6, vTop - 0.1, vWorldPos.y) * step(0.75, vSeed);
        col += crown * vec3(1.0, 0.78, 0.5) * uCityGlow * 0.6;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

/* ------------------------------------------------- additive light effects -- */

/** Soft volumetric-looking cone for headlights, searchlights and party beams. */
export function createBeamMaterial(color: THREE.ColorRepresentation, intensity = 1) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vNormalV; varying vec3 vViewPos;
      void main(){
        vUv = uv;
        vNormalV = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity;
      varying vec2 vUv; varying vec3 vNormalV; varying vec3 vViewPos;
      void main(){
        float along = pow(vUv.y, 1.6);
        float edge = abs(dot(normalize(vNormalV), normalize(-vViewPos)));
        float a = along * pow(edge, 1.5) * uIntensity;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
  });
}

/** Radial light pool, instanced under streetlights. */
export function createGlowPoolMaterial(color: THREE.ColorRepresentation, intensity: { value: number } = shared.uCityGlow) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: intensity },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        #ifdef USE_INSTANCING
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
        #else
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #endif
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity; varying vec2 vUv;
      void main(){
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(1.0 - d, 0.0), 2.2) * 0.55 * uIntensity;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
  });
}

export function createFlameMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { uTime: shared.uTime, uIntensity: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        p.x += sin(uTime * 7.0 + p.y * 4.0) * 0.06 * uv.y;
        p.z += cos(uTime * 6.0 + p.y * 5.0) * 0.06 * uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIntensity; varying vec2 vUv;
      ${NOISE}
      void main(){
        float n = vnoise(vec2(vUv.x * 6.0, vUv.y * 3.0 - uTime * 3.5));
        float body = (1.0 - vUv.y) * (0.6 + 0.6 * n);
        vec3 col = mix(vec3(1.0, 0.18, 0.02), vec3(1.0, 0.62, 0.22), body);
        gl_FragColor = vec4(col * body * 0.9 * uIntensity, 1.0);
      }`,
  });
}

/** Drifting motes: fireflies in the forest, sparks at the party, dust in the city. */
export function createParticleMaterial(color: THREE.ColorRepresentation, rise: number, height = 8) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: {
      uTime: shared.uTime,
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 1 },
      uRise: { value: rise },
      uHeight: { value: height },
      uPixelRatio: shared.uPixelRatio,
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uRise, uHeight, uPixelRatio;
      varying float vAlpha;
      void main(){
        vec3 p = position;
        float t = uTime * (0.4 + aSeed * 0.6) * uRise + aSeed * 50.0;
        p.y += mod(t, uHeight);
        p.x += sin(t * 0.9 + aSeed * 12.0) * 0.6;
        p.z += cos(t * 0.7 + aSeed * 7.0) * 0.6;
        vAlpha = sin(3.14159 * mod(t, uHeight) / uHeight);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min((2.0 + aSeed * 3.0) * (40.0 / max(-mv.z, 1.0)), 14.0) * uPixelRatio;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIntensity; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha * uIntensity;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
  });
}

/* ------------------------------------------------------------ waterfall -- */

/** Falling water sheet: streaks scroll down, edges feather, foam at the lip and base. */
export function createWaterfallMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    uniforms: { ...fogUniforms(), uTime: shared.uTime, uHemiSky: shared.uHemiSky },
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime; uniform vec3 uHemiSky; varying vec2 vUv;
      ${NOISE}
      void main(){
        float streak = vnoise(vec2(vUv.x * 14.0, vUv.y * 2.5 + uTime * 2.2));
        streak = mix(streak, vnoise(vec2(vUv.x * 30.0, vUv.y * 5.0 + uTime * 3.4)), 0.4);
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        float foam = smoothstep(0.12, 0.0, vUv.y) + smoothstep(0.93, 1.0, vUv.y) * 0.6;
        vec3 water = mix(vec3(0.55, 0.72, 0.74), vec3(0.95, 0.98, 1.0), streak);
        water *= 0.7 + uHemiSky * 0.4;
        float a = edge * (0.55 + streak * 0.45) + foam * edge;
        gl_FragColor = vec4(water + foam * 0.2, clamp(a, 0.0, 0.95));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}
