/* GLSL for the cold open. Four things are drawn: the particles (nebula and
   name), the network's edges, the point of light with its lens flare, and
   the light behind the name. One pass at the end adds the film finish. */

const COMMON = /* glsl */ `
  const float PI = 3.141592653589793;
  mat2 turn(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float noise1(float x) { float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(hash(i), hash(i + 1.), f); }
  // The network grows out of the signal: near nodes first.
  float grown(float amount, float order) { float g = clamp(amount * 1.7 - order * 0.7, 0., 1.); return 1. - pow(1. - g, 3.); }
`;

/* Every particle belongs to the nebula. Most of them are also given a place
   in the name, and fly there when the name forms. */
export const particleVertex = /* glsl */ `
  ${COMMON}
  attribute vec3 aNebula;
  attribute vec3 aTarget;
  attribute vec4 aSeed;
  attribute float aKind;   // 1 = has a place in the name
  attribute float aTint;   // 0 = bone, 1 = signal orange
  uniform float uTime, uGrow, uForm, uGone, uDust, uSpin, uScale, uSize, uImpact;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float order = length(aNebula) / 62.;
    float g = grown(uGrow, order);
    vec3 nebula = aNebula * g;
    nebula.xz = turn(uSpin) * nebula.xz;
    // A slow breath so the cloud is never frozen.
    nebula += 0.5 * vec3(sin(uTime * 0.6 + aSeed.x * 40.), cos(uTime * 0.5 + aSeed.y * 40.), sin(uTime * 0.4 + aSeed.z * 40.)) * g;

    // Each particle leaves for the name at its own moment, and spirals in.
    float f = clamp(uForm * 1.45 - aSeed.z * 0.45, 0., 1.);
    f = f * f * (3. - 2. * f);
    f *= aKind;
    vec3 away = nebula - aTarget;
    away.xy = turn((1. - f) * (1. - f) * (1.6 + aSeed.w * 1.4)) * away.xy;
    vec3 position = aTarget + away * (1. - f);
    position += normalize(aSeed.xyz - 0.5) * sin(f * PI) * 5.;

    // What is left of the nebula falls back as the name arrives.
    position.z -= (1. - aKind) * uForm * 26.;
    // At the end the name lets go: its particles drift toward the lens.
    position += uGone * vec3((aSeed.x - 0.5) * 9., (aSeed.y - 0.5) * 6., 10. + aSeed.w * 30.) * aKind;

    vec4 view = modelViewMatrix * vec4(position, 1.);
    gl_Position = projectionMatrix * view;
    float size = mix(0.045 + aSeed.w * 0.11, 0.085, f);
    // Capped, so a node thrown past the lens is not a screen-sized blob.
    gl_PointSize = clamp(uSize * size * uScale / -view.z, 1., 7.);
    float nearFade = smoothstep(1.2, 7., -view.z);

    vec3 bone = vec3(0.94, 0.9, 0.85), signal = vec3(1., 0.54, 0.37);
    vec3 nebulaColor = mix(bone, signal, pow(aSeed.y, 2.2));
    vec3 nameColor = mix(vec3(1., 0.97, 0.92), vec3(1., 0.5, 0.3), aTint);
    vColor = mix(nebulaColor, nameColor, f);
    float twinkle = 0.62 + 0.38 * sin(uTime * (1.5 + aSeed.x * 3.) + aSeed.y * 60.);
    float nebulaAlpha = step(0.002, g) * twinkle * (0.08 + 0.26 * aSeed.w) * mix(uDust, 1., aKind);
    vAlpha = mix(nebulaAlpha, 0.42 + uImpact * 0.4, f) * (1. - uGone) * nearFade;
  }
`;
export const particleFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d);
    gl_FragColor = vec4(vColor * a * vAlpha, 1.);
  }
`;

/* The network's edges. A bright dot (a signal) runs along each one. */
export const lineVertex = /* glsl */ `
  ${COMMON}
  attribute vec3 aOther;
  attribute float aEnd;
  attribute float aPhase;
  uniform float uGrow, uSpin;
  varying float vEnd, vPhase, vGrown;
  void main() {
    // Both ends must have appeared before the edge between them shows.
    float g = min(grown(uGrow, length(position) / 62.), grown(uGrow, length(aOther) / 62.));
    vec3 p = position * g;
    p.xz = turn(uSpin) * p.xz;
    vEnd = aEnd; vPhase = aPhase; vGrown = g;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  }
`;
export const lineFragment = /* glsl */ `
  uniform float uTime, uLines, uSignals;
  varying float vEnd, vPhase, vGrown;
  void main() {
    float along = fract(uTime * (0.25 + 0.5 * uSignals) * (0.5 + vPhase) + vPhase * 7.);
    float signal = smoothstep(0.09, 0., abs(along - vEnd)) * uSignals;
    vec3 color = vec3(0.94, 0.9, 0.85) * 0.035 + vec3(1., 0.5, 0.3) * signal * 0.7;
    gl_FragColor = vec4(color * uLines * step(0.6, vGrown), 1.);
  }
`;

/* The signal: a white-hot point, a soft halo, the long anamorphic streak a
   cinema lens throws across a bright light, and a ring for each heartbeat. */
export const flareVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = (uv * 2. - 1.) * 1.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
`;
export const flareFragment = /* glsl */ `
  uniform float uCore, uFlare, uBeat1, uBeat2, uAspect;
  varying vec2 vUv;
  float ring(float r, float beat) {
    if (beat < 0.) return 0.;
    float radius = 0.03 + beat * 0.34;
    return smoothstep(0.012, 0., abs(r - radius)) * (1. - beat) * (1. - beat);
  }
  void main() {
    vec2 p = vUv; p.x *= uAspect;
    float r = length(p);
    float core = exp(-r * r * 2600.) * 2.4 + exp(-r * r * 260.) * 0.55 + exp(-r * 9.) * 0.16;
    float streak = exp(-abs(p.y) * 150.) * exp(-abs(p.x) * 1.5) + 0.35 * exp(-abs(p.y) * 46.) * exp(-abs(p.x) * 3.6);
    float rings = ring(r, uBeat1) + ring(r, uBeat2);
    vec3 warm = vec3(1., 0.56, 0.36), hot = vec3(1., 0.95, 0.9);
    vec3 color = mix(warm, hot, clamp(core * 0.6, 0., 1.)) * core * uCore
      + mix(warm, vec3(0.62, 0.72, 1.), 0.18) * streak * uFlare
      + warm * rings * 0.7;
    gl_FragColor = vec4(color, 1.);
  }
`;

/* Light from behind the name, in shafts. */
export const raysFragment = /* glsl */ `
  ${COMMON}
  uniform float uTime, uRays, uAspect;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv; p.x *= uAspect;
    float r = length(p), a = atan(p.y, p.x);
    float shafts = noise1(a * 9. + uTime * 0.22) * 0.55 + noise1(a * 23. - uTime * 0.31) * 0.45;
    shafts = pow(shafts, 2.6) * 2.4;
    float reach = exp(-r * 2.3) * smoothstep(0.02, 0.2, r);
    float glow = exp(-p.y * p.y * 14.) * exp(-p.x * p.x * 0.9) * 0.2;
    vec3 warm = vec3(1., 0.5, 0.3);
    gl_FragColor = vec4(warm * (shafts * reach * 0.9 + glow) * uRays, 1.);
  }
`;

/* The film finish, over the whole frame: colour fringing toward the edges
   (stronger while the camera is moving fast), grain, and a vignette. */
export const finishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAberration: { value: 0.0012 }, uGrain: { value: 0.028 }, uGrade: { value: 1 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: /* glsl */ `
    ${COMMON}
    uniform sampler2D tDiffuse;
    uniform float uTime, uAberration, uGrain, uGrade;
    varying vec2 vUv;
    void main() {
      vec2 fromCentre = vUv - 0.5;
      vec2 shift = fromCentre * dot(fromCentre, fromCentre) * uAberration * 40.;
      vec3 color = vec3(texture2D(tDiffuse, vUv + shift).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - shift).b);
      // The film's one grade, the same in every act: blacks settle on the
      // hero's carbon instead of pure black, shadows lean warm, highlights
      // roll off toward bone instead of clipping to white, and a gentle
      // S-curve holds the contrast. (Linear light: OutputPass converts.)
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(color, color * vec3(1.04, 1.0, 0.94), smoothstep(0.35, 0., luma) * uGrade);
      color = mix(color, 1. - exp(-color * 1.35), uGrade);
      color = mix(color, mix(color, vec3(0.86, 0.79, 0.69) * luma * 1.12, 0.18), smoothstep(0.45, 1., luma) * uGrade);
      color = mix(color, color * color * (3. - 2. * color), 0.22 * uGrade);
      color = max(color, vec3(0.0037, 0.0030, 0.0027) * uGrade);
      color *= 1. - 0.55 * smoothstep(0.35, 0.95, length(fromCentre) * 1.25);
      color += (hash2(vUv * 913. + fract(uTime) * 31.) - 0.5) * uGrain;
      gl_FragColor = vec4(color, 1.);
    }
  `,
};
