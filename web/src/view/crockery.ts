// The tea bowl and the cup, thrown on a lathe: profiles with thickness, a foot ring, a lip.
// The bowl is a chawan in a dark iron glaze that runs thin and rusty at the rim and stops short of the bare clay foot,
// a little out of round, as hand-made bowls are. The cup is thick-based glass, kept transparent on purpose: what his
// lips do at the tea, and how much tea is left, must stay visible. All of it is staged, like every mesh in the room.

import * as THREE from "three";

/** A vessel that can hold tea: how high its floor is, how high a full serving stands, and how wide it is inside at a height. */
export interface Vessel {
  group: THREE.Group;
  body: THREE.Mesh;
  tea: THREE.Mesh;    // the liquid's surface
  froth: THREE.Mesh;  // the foam lying on it
  volume: THREE.Mesh | null; // the body of the liquid, where the vessel lets it be seen
  floorY: number;
  fullY: number;
  radiusAt(y: number): number;
}

type Point = [number, number]; // radius, height

/** The same numbers every time, so that a still of the page can be taken twice and be the same. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function painted(width: number, height: number, draw: (pen: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const pen = canvas.getContext("2d");
  if (pen) draw(pen);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** Corners stay corners in `sharp`; `smooth` is a curve through its points. The last sharp point starts the curve. */
function outline(sharp: Point[], smooth: Point[], detail: number): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(smooth.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(detail);
  return [...sharp.slice(0, -1).map(([r, y]) => new THREE.Vector2(r, y)), ...curve];
}

/** Width inside the vessel at a height, read off the inner half of its profile (the points after the lip). */
function inside(points: THREE.Vector2[], lift: number): (y: number) => number {
  const lip = points.reduce((best, p, i) => (p.y > points[best].y ? i : best), 0);
  const wall = points.slice(lip).map((p) => new THREE.Vector2(p.x, p.y + lift)); // from the lip down to the floor
  return (y: number): number => {
    for (let i = 1; i < wall.length; i++) {
      if (y >= wall[i].y) {
        const span = wall[i - 1].y - wall[i].y;
        const along = span > 0 ? (y - wall[i].y) / span : 0;
        return wall[i].x + (wall[i - 1].x - wall[i].x) * Math.min(1, along);
      }
    }
    return wall[wall.length - 1].x;
  };
}

/** Whisked matcha carries a fine foam: many small bubbles, thicker towards the middle where the whisk was lifted out. */
function foam(): THREE.CanvasTexture {
  const random = seeded(11);
  return painted(256, 256, (pen) => {
    pen.clearRect(0, 0, 256, 256);
    pen.strokeStyle = "rgba(34, 58, 14, 0.75)"; // the meniscus: darker where the tea climbs the wall
    pen.lineWidth = 7;
    pen.beginPath();
    pen.arc(128, 128, 123, 0, Math.PI * 2);
    pen.stroke();
    for (let i = 0; i < 2200; i++) {
      const reach = Math.sqrt(random()) * 124 * (0.35 + 0.65 * random());
      const turn = random() * Math.PI * 2;
      const size = 0.6 + random() * random() * 2.6;
      pen.fillStyle = `rgba(${150 + Math.floor(random() * 40)}, ${198 + Math.floor(random() * 30)}, ${84 + Math.floor(random() * 40)}, ${0.25 + random() * 0.45})`;
      pen.beginPath();
      pen.arc(128 + Math.cos(turn) * reach, 128 + Math.sin(turn) * reach, size, 0, Math.PI * 2);
      pen.fill();
    }
  });
}

function surfaces(group: THREE.Group, make: (geometry: THREE.BufferGeometry, colour: number, parent: THREE.Object3D) => THREE.Mesh, sky: THREE.Texture): [THREE.Mesh, THREE.Mesh] {
  const tea = make(new THREE.CircleGeometry(1, 40), 0x6f9a2c, group);
  tea.rotation.x = -Math.PI / 2;
  Object.assign(tea.material as THREE.MeshStandardMaterial, { roughness: 0.22, envMap: sky, envMapIntensity: 0.5 }); // wet
  const froth = make(new THREE.CircleGeometry(1, 40), 0xffffff, group);
  froth.rotation.x = -Math.PI / 2;
  Object.assign(froth.material as THREE.MeshStandardMaterial, { map: foam(), transparent: true, depthWrite: false, roughness: 0.95 });
  return [tea, froth];
}

export type Make = (geometry: THREE.BufferGeometry, colour: number, parent: THREE.Object3D) => THREE.Mesh;

/** A chawan about 0.96 across and 0.4 high. Its origin is at half its height, so that it tips about its middle. */
export function chawan(make: Make, sky: THREE.Texture): Vessel {
  const lift = -0.2;
  const points = outline(
    [[0.001, 0.035], [0.15, 0.035], [0.162, 0], [0.205, 0], [0.215, 0.05]],                       // the foot ring, cut sharp
    [[0.215, 0.05], [0.3, 0.072], [0.4, 0.135], [0.455, 0.235], [0.476, 0.33], [0.483, 0.385],     // hip and wall
      [0.471, 0.403], [0.455, 0.39],                                                                // the lip, rounded over
      [0.44, 0.33], [0.42, 0.24], [0.365, 0.15], [0.27, 0.096], [0.12, 0.076], [0.001, 0.071]],     // and down the inside to the well
    72,
  );
  const lip = points.reduce((best, p, i) => (p.y > points[best].y ? i : best), 0);
  const geometry = new THREE.LatheGeometry(points, 72, Math.PI); // the seam faces the wall, not the room
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {                      // a little out of round, more so towards the lip
    const [x, y, z] = [position.getX(i), position.getY(i), position.getZ(i)];
    const turn = Math.atan2(x, z);
    const wobble = 1 + (0.012 * Math.sin(2 * turn + 0.7) + 0.006 * Math.sin(5 * turn + 2)) * Math.min(1, y / 0.3);
    position.setXYZ(i, x * wobble, y + lift + 0.006 * Math.sin(3 * turn + 1) * Math.max(0, (y - 0.3) / 0.1), z * wobble);
  }
  const random = seeded(5);
  const glaze = painted(1024, 512, (pen) => {
    const row = (index: number): number => 512 * (1 - index / (points.length - 1)); // where a point of the profile lands on the canvas
    pen.fillStyle = "#1d1714";                                                       // iron glaze, nearly black
    pen.fillRect(0, 0, 1024, 512);
    pen.fillStyle = "#15130f";                                                       // a cooler black inside, to set off the green
    pen.fillRect(0, 0, 1024, row(lip + 4));
    for (let i = 0; i < 9000; i++) {                                                 // pinholes and specks
      pen.fillStyle = random() < 0.5 ? "rgba(90, 58, 34, 0.35)" : "rgba(8, 6, 5, 0.5)";
      pen.fillRect(random() * 1024, random() * 512, 1 + random() * 1.6, 1 + random() * 1.6);
    }
    for (let i = 0; i < 520; i++) {                                                  // hare's fur: the glaze runs thin and rusty from the lip
      const x = random() * 1024;
      const [top, reach] = [row(lip), (0.05 + random() * random() * 0.42) * (row(4) - row(lip))];
      for (const [from, to] of [[top, top + reach], [top, top - reach * 0.3]]) {
        const streak = pen.createLinearGradient(0, from, 0, to);
        streak.addColorStop(0, `rgba(${150 + Math.floor(random() * 50)}, ${78 + Math.floor(random() * 30)}, 30, ${0.2 + random() * 0.3})`);
        streak.addColorStop(1, "rgba(120, 60, 24, 0)");
        pen.fillStyle = streak;
        pen.fillRect(x, Math.min(from, to), 1 + random() * 2.2, Math.abs(to - from));
      }
    }
    pen.fillStyle = "rgba(164, 96, 40, 0.55)";                                       // the lip itself, where it is thinnest
    pen.fillRect(0, row(lip + 2), 1024, row(lip - 2) - row(lip + 2));
    pen.fillStyle = "#8d6a48";                                                       // bare clay: the glaze stops short of the foot
    pen.beginPath();
    pen.moveTo(0, 512);
    for (let x = 0; x <= 1024; x += 16) pen.lineTo(x, row(5.2) - 5 - 7 * Math.sin(x / 61) - 5 * Math.sin(x / 23 + 1));
    pen.lineTo(1024, 512);
    pen.fill();
    for (let i = 0; i < 1500; i++) {                                                 // grit in the clay
      pen.fillStyle = "rgba(60, 40, 24, 0.4)";
      pen.fillRect(random() * 1024, row(5.2) + random() * (512 - row(5.2)), 1.5, 1.5);
    }
  });
  const group = new THREE.Group();
  const body = make(geometry, 0xffffff, group);
  Object.assign(body.material as THREE.MeshStandardMaterial, { map: glaze, roughness: 0.28, metalness: 0.05, envMap: sky, envMapIntensity: 0.85, side: THREE.DoubleSide });
  const [tea, froth] = surfaces(group, make, sky);
  const floorY = 0.071 + lift;
  // a serving of thin tea is small: it stands well under half way up the bowl
  return { group, body, tea, froth, volume: null, floorY, fullY: floorY + 0.125, radiusAt: inside(points, lift) };
}

/** A small glass with a thick base, about 0.4 across. Its origin is at half its height. */
export function glassCup(make: Make, sky: THREE.Texture): Vessel {
  const lift = -0.115;
  const points = outline(
    [[0.001, 0], [0.128, 0], [0.146, 0.01]],
    [[0.146, 0.01], [0.17, 0.06], [0.19, 0.14], [0.2, 0.215], [0.199, 0.228], [0.193, 0.23],       // outside, up to a fire-polished lip
      [0.188, 0.222], [0.18, 0.14], [0.161, 0.07], [0.12, 0.046], [0.001, 0.043]],                 // inside, down to a thick base
    56,
  );
  const geometry = new THREE.LatheGeometry(points, 56, Math.PI);
  geometry.translate(0, lift, 0);
  const group = new THREE.Group();
  const body = make(geometry, 0xffffff, group);
  body.material = new THREE.MeshPhysicalMaterial({
    color: 0xdcebe5, transparent: true, opacity: 0.17, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
    envMap: sky, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false,
  });
  const [tea, froth] = surfaces(group, make, sky);
  // matcha is a suspension, not an infusion: seen through glass it is a solid green body, not a green skin on clear water
  const volume = make(new THREE.CylinderGeometry(1, 0.84, 1, 40, 1, true), 0x6f9a2c, group);
  (volume.material as THREE.MeshStandardMaterial).roughness = 0.5;
  const floorY = 0.043 + lift;
  // filled to a little over half: the clear glass above the tea is where his lips, and the spikes on them, can be seen
  return { group, body, tea, froth, volume, floorY, fullY: floorY + 0.105, radiusAt: inside(points, lift) };
}

/** Level the tea in a vessel: `level` 0..1 of a full serving, `foamy` 0..1 of how much froth lies on it. */
export function fill(vessel: Vessel, level: number, colour: THREE.Color, foamy: number): void {
  const y = vessel.floorY + (vessel.fullY - vessel.floorY) * level;
  const radius = Math.max(0.01, vessel.radiusAt(y) - 0.004);
  vessel.tea.visible = level > 0.02;
  vessel.tea.position.y = y;
  vessel.tea.scale.setScalar(radius);
  (vessel.tea.material as THREE.MeshStandardMaterial).color.copy(colour);
  vessel.froth.visible = level > 0.02 && foamy > 0.02;
  vessel.froth.position.y = y + 0.003;
  vessel.froth.scale.setScalar(radius * 0.97);
  (vessel.froth.material as THREE.MeshStandardMaterial).opacity = 0.62 * foamy;
  if (vessel.volume) {
    vessel.volume.visible = vessel.tea.visible;
    vessel.volume.position.y = (vessel.floorY + y) / 2 + 0.004;
    vessel.volume.scale.set(radius, Math.max(0.001, y - vessel.floorY - 0.008), radius);
    (vessel.volume.material as THREE.MeshStandardMaterial).color.copy(colour).multiplyScalar(0.72);
  }
}
