import { test } from "node:test";
import assert from "node:assert/strict";
import { pickQuality } from "./quality.js";

test("a low-power phone gets the lightest cold open, never above 1x pixels", () => {
  const q = pickQuality({ narrow: true, cores: 4, memory: 8, dpr: 3 });
  assert.equal(q.tier, "lite");
  assert.equal(q.dpr, 1);
  assert.ok(q.name >= 10000, "enough particles for the name to read");
});
test("low memory alone makes a phone lite", () => assert.equal(pickQuality({ narrow: true, cores: 8, memory: 3 }).tier, "lite"));
test("a capable phone and a small laptop get the low tier", () => {
  assert.equal(pickQuality({ narrow: true, cores: 8, memory: 8 }).tier, "low");
  assert.equal(pickQuality({ narrow: false, cores: 4 }).tier, "low");
});
test("a capable laptop gets the full cold open", () => assert.equal(pickQuality({ narrow: false, cores: 10, memory: 16, dpr: 2 }).tier, "full"));
test("lighter tiers only ever have fewer particles", () => {
  const [lite, low, full] = [{ narrow: true, cores: 2 }, { narrow: true }, {}].map(pickQuality);
  for (const key of ["name", "dust", "hubs"]) assert.ok(lite[key] < low[key] && low[key] < full[key], key);
});
