/* GLSL for Act II's shared pieces: the floor of a set, and soft light (a spotlight cone, a pool of glow). */

export const cardVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
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
