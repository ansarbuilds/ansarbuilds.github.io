/* GLSL for Act I: points (the name and the dust along the path) and the
   river of code under the camera. The film finish is the cold open's. */

// Points: soft dots, sized by distance, faded right at the lens and far away.
export const pointVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute vec2 aSeed;
  uniform float uTime, uScale, uSize, uPart, uOpacity, uFar, uWobble, uSteady;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    // The name parts for the camera: points move out from the middle as it comes through.
    p.xy += normalize(p.xy + vec2(0.001)) * uPart * (2. + aSeed.x * 7.);
    p.z += uPart * (aSeed.y - 0.5) * 6.;
    // A slow drift, in the points' own units (a scaled-up model passes less).
    p += uWobble * vec3(sin(uTime * 0.6 + aSeed.x * 40.), cos(uTime * 0.5 + aSeed.y * 40.), sin(uTime * 0.4 + aSeed.x * 23.));
    vec4 view = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * view;
    float depth = -view.z;
    // Dust twinkles and varies in size; the name (uSteady 1) holds even
    // dots, so its letters read as type, not static.
    float sized = mix(0.55 + aSeed.y, 0.85 + 0.3 * aSeed.y, uSteady);
    gl_PointSize = clamp(uSize * sized * uScale / depth, 1., 6.);
    float twinkle = mix(0.7 + 0.3 * sin(uTime * (1. + aSeed.x * 3.) + aSeed.y * 50.), 0.92, uSteady);
    vColor = aColor;
    vAlpha = uOpacity * twinkle * smoothstep(0.8, 7., depth) * smoothstep(uFar, uFar * 0.3, depth);
  }
`;
export const pointFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vColor * smoothstep(0.5, 0.08, d) * vAlpha, 1.);
  }
`;

// The river: a long strip of code texture, flowing toward the camera.
export const riverVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 view = modelViewMatrix * vec4(position, 1.);
    vDepth = -view.z;
    gl_Position = projectionMatrix * view;
  }
`;
export const riverFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFlow, uRepeat, uOpacity;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vec3 code = texture2D(uMap, vec2(vUv.x, vUv.y * uRepeat + uFlow)).rgb;
    float banks = smoothstep(0., 0.22, vUv.x) * smoothstep(1., 0.78, vUv.x);
    // Faded far off, and close to the lens too, where big glyphs would
    // otherwise crowd the bottom of the frame.
    float fade = smoothstep(150., 30., vDepth) * smoothstep(12., 40., vDepth);
    gl_FragColor = vec4(code * banks * fade * uOpacity, 1.);
  }
`;

// The receipts' numbers: type on a plane, revealed bottom to top behind a
// hot seam with a ragged edge, as if lit by something passing up through it.
export const digitsVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
`;
export const digitsFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uRise, uOpacity;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    float ink = texture2D(uMap, vUv).a;
    float ragged = (hash(floor(vUv * vec2(120., 1.))) - 0.5) * 0.06;
    float edge = (uRise * 1.3 - 0.15) - vUv.y + ragged;
    float lit = smoothstep(0., 0.025, edge);
    float moving = step(0.001, uRise) * (1. - step(0.999, uRise));
    float seam = (1. - smoothstep(0., 0.06, abs(edge))) * moving;
    vec3 color = uColor * lit + vec3(1., 0.62, 0.42) * seam * 1.4;
    gl_FragColor = vec4(color, ink * uOpacity * max(lit, seam));
  }
`;
