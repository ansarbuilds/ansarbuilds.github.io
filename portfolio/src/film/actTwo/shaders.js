/* GLSL for Act II's shared pieces: the light-speed streak over the frame,
   the floor of a set, and soft light (a spotlight cone, a pool of glow). */

const HASH = /* glsl */ `
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise1(float x) { float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(hash(i), hash(i + 1.), f); }
`;

export const cardVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
`;

// Thin lines racing out from the middle of the frame.
export const streakFragment = /* glsl */ `
  ${HASH}
  uniform float uStreak, uTime, uAspect;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2. - 1.; p.x *= uAspect;
    float r = length(p), a = atan(p.y, p.x);
    float lane = floor(a * 70.);
    float line = smoothstep(0.5, 0., abs(fract(a * 70.) - 0.5) * 2. - 0.25) * step(0.55, hash(lane * 1.7));
    float dash = smoothstep(0.35, 0., abs(fract(r * (1.2 + hash(lane) * 1.6) - uTime * (2.5 + hash(lane + 3.) * 3.)) - 0.5));
    float reach = smoothstep(0.08, 0.7, r);
    vec3 color = mix(vec3(0.94, 0.9, 0.85), vec3(1., 0.54, 0.37), hash(lane + 9.));
    float core = exp(-r * r * 30.) * 0.5;
    gl_FragColor = vec4((color * line * dash * reach + vec3(1., 0.8, 0.7) * core) * uStreak * 0.9, 1.);
  }
`;

// A set's floor: a faint grid that fades into the dark.
export const floorFragment = /* glsl */ `
  uniform vec3 uTint;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 cell = abs(fract(vUv * 40.) - 0.5);
    float grid = smoothstep(0.47, 0.5, max(cell.x, cell.y));
    float fade = smoothstep(0.5, 0.05, length(vUv - 0.5));
    gl_FragColor = vec4(uTint * (grid * 0.5 + 0.12) * fade * uOpacity, 1.);
  }
`;

// Soft light: brightest at the middle (a pool) or at the top (a cone).
export const glowFragment = /* glsl */ `
  uniform vec3 uTint;
  uniform float uOpacity, uCone;
  varying vec2 vUv;
  void main() {
    float pool = smoothstep(0.5, 0., length(vUv - 0.5));
    float cone = pow(vUv.y, 1.6);
    gl_FragColor = vec4(uTint * mix(pool * pool, cone, uCone) * uOpacity, 1.);
  }
`;
