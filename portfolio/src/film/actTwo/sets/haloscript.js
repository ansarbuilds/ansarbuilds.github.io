import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { floor, glow, ramp, smooth } from "../kit.js";

/* Haloscript (shots A2-05a and A2-05b): a Mac, an iPad and an iPhone on a
   turntable under studio light, turning slowly. Their screens are the real
   app, and move through it together: the manuscript, the whiteboard, the
   corkboard.

   Local space: +z faces the camera's scene position, +x is screen right. */

const VIOLET = new THREE.Color("#b9a8ff");
// Right of centre and set back: the card takes the lower left.
const STAND = new THREE.Vector3(3, -2.55, -4);
const SCREEN = 0.5;
// Each device's screens, in the order the scene shows them.
const SCREENS = {
  mac: ["/shots/haloscript/write_mac.jpg", "/shots/haloscript/whiteboard_mac.jpg", "/shots/haloscript/corkboard_mac.jpg"],
  ipad: ["/shots/haloscript/write_ipad.jpg", "/shots/haloscript/board_ipad.jpg", "/shots/haloscript/corkboard_ipad.jpg"],
  iphone: ["/shots/haloscript/write_iphone.jpg", "/shots/haloscript/home_iphone.jpg", "/shots/haloscript/corkboard_iphone.jpg"],
};

export function buildHaloscript({ group, media, renderer }) {
  const disposers = [];
  const keep = (item) => { disposers.push(item.dispose); return item; };
  const own = (thing) => { disposers.push(() => thing.dispose()); return thing; };

  // Reflections for the metal: a soft studio, rendered once.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomScene = new RoomEnvironment();
  const environment = own(pmrem.fromScene(roomScene, 0.04).texture);
  roomScene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
  pmrem.dispose();

  const ground = keep(floor(44, VIOLET, 0.12));
  ground.mesh.position.y = -3.2;
  group.add(ground.mesh);
  const pool = keep(glow(14, 10, VIOLET, { opacity: 0.28 }));
  pool.mesh.position.set(STAND.x, -3.15, STAND.z);
  group.add(pool.mesh);

  // Studio light: a key from the front left, a violet rim from behind, a low fill.
  const key = new THREE.SpotLight(0xfff4ea, 0, 0, 0.55, 0.7, 2);
  key.position.set(STAND.x - 7, 9, STAND.z + 8);
  key.target.position.copy(STAND).add(new THREE.Vector3(0, 1.5, 0));
  const rim = new THREE.SpotLight(0xb9a8ff, 0, 0, 0.6, 0.8, 2);
  rim.position.set(STAND.x + 5, 6, STAND.z - 8);
  rim.target.position.copy(key.target.position);
  const fill = new THREE.HemisphereLight(0x3a3450, 0x0a0810, 0);
  group.add(key, key.target, rim, rim.target, fill);

  const aluminium = own(new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.92, roughness: 0.32, envMap: environment, envMapIntensity: 0.7 }));
  const graphite = own(new THREE.MeshStandardMaterial({ color: 0x2b2c31, metalness: 0.85, roughness: 0.38, envMap: environment, envMapIntensity: 0.6 }));
  const glass = own(new THREE.MeshStandardMaterial({ color: 0x050507, metalness: 0.1, roughness: 0.08, envMap: environment, envMapIntensity: 1 }));
  const geometry = (g) => { disposers.push(() => g.dispose()); return g; };

  // The turntable.
  const table = new THREE.Group();
  table.position.copy(STAND);
  group.add(table);
  const disk = new THREE.Mesh(geometry(new THREE.CylinderGeometry(5.4, 5.6, 0.32, 96)), own(new THREE.MeshStandardMaterial({ color: 0x141218, metalness: 0.2, roughness: 0.28, envMap: environment, envMapIntensity: 0.5 })));
  disk.position.y = -0.16;
  table.add(disk);

  // A screen that can cross-fade to the next shot: two layers.
  const loader = new THREE.TextureLoader();
  function screen(width, height, sources) {
    const plane = geometry(new THREE.PlaneGeometry(width, height));
    // Filled in when the set is first on screen (see load below).
    const textures = sources.map(() => null);
    const under = new THREE.Mesh(plane, own(new THREE.MeshBasicMaterial({ map: null, toneMapped: false, color: new THREE.Color().setScalar(0) })));
    const over = new THREE.Mesh(plane, own(new THREE.MeshBasicMaterial({ map: null, toneMapped: false, transparent: true, opacity: 0, depthWrite: false, color: new THREE.Color().setScalar(0) })));
    over.position.z = 0.002;
    const holder = new THREE.Group();
    holder.add(under, over);
    return { holder, under, over, textures, sources };
  }

  // MacBook: base, keyboard well, and an open lid hinged at the back.
  const mac = new THREE.Group();
  mac.position.set(0, 0, -0.4);
  table.add(mac);
  const base = new THREE.Mesh(geometry(new RoundedBoxGeometry(6.2, 0.2, 4.2, 4, 0.08)), aluminium);
  base.position.y = 0.1;
  mac.add(base);
  const well = new THREE.Mesh(geometry(new THREE.PlaneGeometry(5.4, 2.1)), graphite);
  well.rotation.x = -Math.PI / 2;
  well.position.set(0, 0.205, -0.55);
  mac.add(well);
  const pad = new THREE.Mesh(geometry(new THREE.PlaneGeometry(2.2, 1.3)), own(new THREE.MeshStandardMaterial({ color: 0x9fa2a8, metalness: 0.6, roughness: 0.25, envMap: environment })));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, 0.205, 1.2);
  mac.add(pad);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.2, -2.08);
  hinge.rotation.x = -0.26;
  mac.add(hinge);
  const lid = new THREE.Mesh(geometry(new RoundedBoxGeometry(6.2, 4.05, 0.12, 4, 0.06)), aluminium);
  lid.position.set(0, 2.02, 0);
  hinge.add(lid);
  const macBezel = new THREE.Mesh(geometry(new THREE.PlaneGeometry(6.04, 3.9)), glass);
  macBezel.position.set(0, 2.03, 0.062);
  hinge.add(macBezel);
  const macScreen = screen(5.76, 3.6, SCREENS.mac);
  macScreen.holder.position.set(0, 2.06, 0.066);
  hinge.add(macScreen.holder);

  // iPad, standing on the left, turned toward the middle.
  const ipad = new THREE.Group();
  ipad.position.set(-3.7, 1.95, 1.3);
  ipad.rotation.set(-0.12, 0.42, 0);
  table.add(ipad);
  ipad.add(new THREE.Mesh(geometry(new RoundedBoxGeometry(2.78, 3.66, 0.1, 4, 0.16)), graphite));
  const ipadGlass = new THREE.Mesh(geometry(new THREE.PlaneGeometry(2.7, 3.58)), glass);
  ipadGlass.position.z = 0.052;
  ipad.add(ipadGlass);
  const ipadScreen = screen(2.52, 3.36, SCREENS.ipad);
  ipadScreen.holder.position.z = 0.056;
  ipad.add(ipadScreen.holder);

  // iPhone, standing on the right, at the front.
  const iphone = new THREE.Group();
  iphone.position.set(3.75, 1.38, 1.6);
  iphone.rotation.set(-0.1, -0.5, 0);
  table.add(iphone);
  iphone.add(new THREE.Mesh(geometry(new RoundedBoxGeometry(1.3, 2.72, 0.13, 4, 0.2)), graphite));
  const iphoneGlass = new THREE.Mesh(geometry(new THREE.PlaneGeometry(1.24, 2.66)), glass);
  iphoneGlass.position.z = 0.067;
  iphone.add(iphoneGlass);
  const iphoneScreen = screen(1.14, 2.48, SCREENS.iphone);
  iphoneScreen.holder.position.z = 0.07;
  iphone.add(iphoneScreen.holder);

  const screens = [macScreen, ipadScreen, iphoneScreen];
  let showing = -1;
  // The screenshots (about 1 MB together) load only once the camera is on
  // its way here, not with the rest of the act.
  let loaded = false, arrived = 0, wanted = 0;
  const load = () => {
    loaded = true;
    wanted = screens.reduce((n, s) => n + s.sources.length, 0);
    screens.forEach((s) => s.sources.forEach((src, i) => {
      const texture = loader.load(media(src), () => { showing = -1; arrived++; }, undefined, () => { arrived++; });
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      disposers.push(() => texture.dispose());
      s.textures[i] = texture;
    }));
  };
  return {
    setPlaying() {},
    // Called while the set before this one is on screen.
    prepare() { if (!loaded) load(); },
    // Finished only once every screenshot is in (a failed one counts, so
    // the film never waits forever).
    ready() { return loaded && arrived >= wanted; },
    update({ arrive, scene, camera }) {
      if (!loaded) load();
      // Off to the right only on a wide screen; centred on a narrow one.
      const wide = Math.min(1, camera.aspect / 1.5);
      table.position.x = 0.6 + (STAND.x - 0.6) * wide;
      pool.mesh.position.x = table.position.x;

      // The studio lights come up as the camera arrives.
      const lit = smooth(ramp(arrive, 0.2, 1));
      key.intensity = 420 * lit;
      rim.intensity = 320 * lit;
      fill.intensity = 1.2 * lit;
      pool.mesh.material.uniforms.uOpacity.value = 0.28 * lit;

      // Turning slowly: from three-quarters left to three-quarters right.
      table.rotation.y = -0.42 + 0.84 * smooth(ramp(scene, 0, 1)) + (1 - lit) * -0.3;

      // The screens wake, then move through the app together.
      const on = smooth(ramp(arrive, 0.5, 1));
      const step = scene < 0.36 ? 0 : scene < 0.7 ? 1 : 2;
      const fade = scene < 0.36 ? smooth(ramp(scene, 0.3, 0.36)) : scene < 0.7 ? smooth(ramp(scene, 0.64, 0.7)) : 0;
      if (step !== showing) {
        showing = step;
        screens.forEach((s) => { s.under.material.map = s.textures[step]; s.over.material.map = s.textures[Math.min(step + 1, s.textures.length - 1)]; s.under.material.needsUpdate = s.over.material.needsUpdate = true; });
      }
      screens.forEach((s) => {
        // The app is cream paper: at full brightness it floods the bloom.
        // Dark until its screenshot has arrived.
        s.under.material.color.setScalar(s.under.material.map?.image ? SCREEN * on : 0);
        s.over.material.color.setScalar(s.over.material.map?.image ? SCREEN * on : 0);
        s.over.material.opacity = fade;
      });
    },
    dispose() {
      disposers.forEach((fn) => fn());
    },
  };
}
