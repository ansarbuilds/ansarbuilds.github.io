// Fewer particles and pixels on phones and small machines, and fewer
// still on a low-power phone (a phone-width screen with four cores or
// fewer, or 4 GB of memory or less). Every shot stays; only the density
// and resolution change, and the name still reads at phone width.
export function pickQuality({ narrow, cores = 8, memory = 8, dpr = 1 }) {
  if (narrow && (cores <= 4 || memory <= 4)) return { tier: "lite", name: 10000, dust: 4000, hubs: 200, dpr: Math.min(dpr, 1) };
  if (narrow || cores <= 4) return { tier: "low", name: 15000, dust: 9000, hubs: 320, dpr: Math.min(dpr, 1.25) };
  return { tier: "full", name: 40000, dust: 24000, hubs: 640, dpr: Math.min(dpr, 1.75) };
}
