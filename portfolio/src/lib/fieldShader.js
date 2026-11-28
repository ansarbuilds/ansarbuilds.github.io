/* The light field behind the site: one full-screen WebGL2 fragment shader.

   A slow domain-warped noise field (ink moving in water) drawn in the
   site's cobalt, with thin caustic lines where the field folds, a pool of
   light that follows the pointer, and film grain. It is calm behind text on
   the left and strongest on the right of the hero, and it quietens as the
   page scrolls so it never competes with reading. The intro turns it up.

   Uniforms
     uRes     drawing-buffer size in pixels
     uTime    seconds
     uMouse   pointer, in buffer pixels, origin bottom left (smoothed in JS)
     uScroll  page scroll in screen heights
     uDark    0 light, 1 dark (eased in JS, so a theme switch fades)
     uEnergy  overall strength: 1 at the top, less further down, more in the intro
*/

export const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform float uDark;
uniform float uEnergy;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.045;

  // Scrolling drifts the field up, a little slower than the page.
  p.y -= uScroll * 0.28;
  m.y -= uScroll * 0.28;
  float d = length(p - m);

  // Domain warp: the field folds into itself, and the pointer stirs it.
  vec2 q = vec2(fbm(p * 1.3 + vec2(0.0, t)), fbm(p * 1.3 + vec2(5.2, -t)));
  vec2 swirl = 0.35 * exp(-d * 2.6) * vec2(-(p - m).y, (p - m).x);
  vec2 r = vec2(fbm(p * 1.5 + 2.0 * q + vec2(1.7, 9.2) + t * 1.4 + swirl),
                fbm(p * 1.5 + 2.0 * q + vec2(8.3, 2.8) - t * 1.1 - swirl));
  float f = fbm(p * 1.15 + 2.3 * r);

  // Where the ink gathers, and the thin bright lines where the field folds.
  float ink = smoothstep(0.3, 0.72, f);
  float fold = pow(1.0 - abs(fract(f * 4.0 + t * 0.6) * 2.0 - 1.0), 9.0) * smoothstep(0.22, 0.6, f);

  // Cobalt, with violet and cyan where the warp turns.
  vec3 cobalt = vec3(0.114, 0.306, 0.847);
  vec3 violet = vec3(0.388, 0.275, 0.922);
  vec3 cyan = vec3(0.157, 0.580, 0.988);
  vec3 tint = mix(cobalt, violet, smoothstep(0.35, 0.75, q.x));
  tint = mix(tint, cyan, smoothstep(0.55, 0.85, r.y) * 0.55);

  // Calm on the left where the text sits, fuller on the right.
  float side = mix(0.22, 1.25, smoothstep(-0.7, 0.75, p.x + uScroll * 0.1));
  float e = uEnergy * side;

  vec3 lightBase = vec3(0.953, 0.949, 0.933);
  vec3 darkBase = vec3(0.027, 0.031, 0.047);

  // Light: the ink stains the stone in cobalt, the folds draw fine lines.
  vec3 light = lightBase;
  light = mix(light, mix(lightBase, tint, 0.62), clamp(ink * 0.85 * e, 0.0, 0.92));
  light = mix(light, tint * 0.92, clamp(fold * 0.55 * e, 0.0, 0.8));
  light = mix(light, mix(lightBase, tint, 0.45), exp(-d * 3.0) * 0.35 * e);

  // Dark: the ink glows, the folds are light, the pointer is a soft lamp.
  vec3 dark = darkBase;
  dark += tint * ink * 0.55 * e;
  dark += mix(tint, vec3(0.75, 0.82, 1.0), 0.45) * fold * 0.7 * e;
  dark += tint * exp(-d * 2.4) * 0.16 * e;

  vec3 col = mix(light, dark, uDark);

  // Vignette and grain.
  vec2 uv = frag / uRes;
  float vig = smoothstep(1.25, 0.35, length(uv - vec2(0.55, 0.5)));
  col *= mix(1.0, mix(0.97, 0.72, uDark), 1.0 - vig);
  col += (hash(frag + fract(uTime * 7.0) * 100.0) - 0.5) * mix(0.028, 0.045, uDark);

  outColor = vec4(col, 1.0);
}
`;
