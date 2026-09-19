// The fly, as a puppet: a male Drosophila melanogaster in placeholder geometry, jointed where a fly is jointed.
// Red eyes, tan thorax, banded abdomen with the dark tip of a male, veined wings folded flat, six three-part legs.
// Everything here is staged. He walks with an alternating tripod, as flies do, turns before he walks, breathes,
// twitches his antennae, flicks his wings and moves his head in small jumps. He does not groom: grooming has a
// circuit of its own in his brain, and a later slice wants that movement to be his.
// The proboscis is built folded. It comes out by one number, `proboscis`, which the scene takes from the replay of a
// recording, and which is zero unless the experiment that licenses drinking has passed.

import * as THREE from "three";

export type Make = (geometry: THREE.BufferGeometry, colour: number, parent: THREE.Object3D) => THREE.Mesh;

export interface FlyMotion {
  t: number;         // seconds, for everything that idles
  stride: number;    // radians of gait, advanced by the distance he has walked
  walking: number;   // 0..1
  lean: number;      // 0..1, head down to the cup
  calm: number;      // 0..1, stillness while his lips are on the tea
  reading: number;   // 0..1, sitting up with his book
  whisking: number;  // 0..1, front legs at the whisk
  wiping: number;    // 0..1, front legs at the cloth
  proboscis: number; // 0..1, how far out. From MN9's recorded spikes, never from the staging.
}

const TAN = 0xa9854a, TAN_DARK = 0x7a5e30, BAND = 0x2e2216, LEG = 0x5e4826, EYE = 0xb3342a;
const FEMUR = 0.3, TIBIA = 0.36, TARSUS = 0.24;
const RAISE = 0.7, DROP = 1.22, FLAT = 0.26; // femur above the horizontal, tibia and tarsus below it, in radians: feet meet the ground
const HIP_Y = FEMUR * Math.sin(RAISE) * -1 + TIBIA * Math.sin(DROP) + TARSUS * Math.sin(FLAT);

interface Leg { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group; pair: number; tripod: number; restYaw: number }

function canvasTexture(width: number, height: number, draw: (pen: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const pen = canvas.getContext("2d");
  if (pen) draw(pen);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class FlyPuppet {
  readonly group = new THREE.Group();   // origin on the ground under his thorax, facing +z
  readonly head = new THREE.Group();
  readonly labellum = new THREE.Group(); // the tip of the folded proboscis: his lips
  readonly hands = new THREE.Group();    // between his front feet when he holds something up
  private readonly body = new THREE.Group();
  private readonly abdomen = new THREE.Group();
  private readonly wings: THREE.Group[] = [];
  private readonly antennae: THREE.Group[] = [];
  private readonly legs: Leg[] = [];
  private readonly trunk = new THREE.Group();   // rostrum and haustellum: what unfolds when the proboscis comes out

  constructor(private readonly make: Make) {
    this.group.add(this.body);
    this.body.position.y = HIP_Y + 0.17;
    this.buildTrunk();
    this.buildHead();
    this.buildWings();
    this.buildLegs();
    this.hands.position.set(0, HIP_Y + 0.2, 0.74);
    this.group.add(this.hands);
  }

  private ball(parent: THREE.Object3D, colour: number, radius: [number, number, number], at: [number, number, number], detail = 20): THREE.Mesh {
    const mesh = this.make(new THREE.SphereGeometry(1, detail, Math.round(detail * 0.75)), colour, parent);
    mesh.scale.set(...radius);
    mesh.position.set(...at);
    return mesh;
  }

  private rod(parent: THREE.Object3D, colour: number, length: number, thick: number, thin = thick): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(thin, thick, length, 7);
    geometry.rotateZ(-Math.PI / 2);        // along +x
    geometry.translate(length / 2, 0, 0);  // from the joint outwards
    return this.make(geometry, colour, parent);
  }

  private buildTrunk(): void {
    this.ball(this.body, TAN, [0.26, 0.24, 0.32], [0, 0, 0], 28);
    this.ball(this.body, TAN_DARK, [0.13, 0.08, 0.12], [0, 0.12, -0.3]);                       // scutellum
    for (const [x, z] of [[0.09, 0.12], [-0.09, 0.12], [0.11, -0.06], [-0.11, -0.06], [0.06, -0.2], [-0.06, -0.2], [0.05, -0.36], [-0.05, -0.36]]) {
      const bristle = this.make(new THREE.CylinderGeometry(0.004, 0.007, 0.13, 4), BAND, this.body); // the long bristles of his back
      bristle.position.set(x, 0.24 - Math.abs(z) * 0.12, z);
      bristle.rotation.x = -0.75;
    }
    for (const side of [1, -1]) {                                                               // halteres
      const stalk = this.make(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 4), TAN_DARK, this.body);
      stalk.position.set(side * 0.25, 0.02, -0.24);
      stalk.rotation.z = side * -1.1;
      this.ball(this.body, 0xd9c69a, [0.022, 0.022, 0.022], [side * 0.3, 0.045, -0.24], 8);
    }
    this.abdomen.position.set(0, -0.03, -0.3);
    this.body.add(this.abdomen);
    this.ball(this.abdomen, 0xc39b55, [0.235, 0.205, 0.37], [0, -0.03, -0.33], 28);
    [-0.12, -0.25, -0.38, -0.5].forEach((z, i) => {                                             // the dark bands of the tergites
      const size = 0.225 * Math.sqrt(1 - ((z + 0.33) / 0.37) ** 2);
      const band = this.make(new THREE.TorusGeometry(1, 0.085 + 0.01 * i, 6, 28, Math.PI * 1.25), BAND, this.abdomen);
      band.scale.set(size * 1.03, size * 0.9, size);
      band.position.set(0, -0.025, z);
      band.rotation.z = -Math.PI * 0.125;                                                       // across his back, open underneath
    });
    this.ball(this.abdomen, BAND, [0.172, 0.15, 0.14], [0, -0.04, -0.6]);                       // a male: the tip is dark and round
  }

  private buildHead(): void {
    this.head.position.set(0, 0.09, 0.42);
    this.body.add(this.head);
    this.ball(this.head, TAN, [0.2, 0.17, 0.15], [0, 0, 0], 24);
    const facets = canvasTexture(128, 128, (pen) => {
      pen.fillStyle = "#b3342a";
      pen.fillRect(0, 0, 128, 128);
      pen.fillStyle = "rgba(60, 8, 6, 0.55)";
      for (let row = 0; row < 32; row++) for (let col = 0; col < 32; col++) pen.fillRect(col * 4 + (row % 2) * 2, row * 4, 1.3, 1.3);
    });
    facets.wrapS = facets.wrapT = THREE.RepeatWrapping;
    facets.repeat.set(3, 2);
    for (const side of [1, -1]) {
      const eye = this.ball(this.head, 0xffffff, [0.115, 0.15, 0.125], [side * 0.145, 0.015, 0.035], 28);
      const material = eye.material as THREE.MeshStandardMaterial;
      material.map = facets;
      material.color.setHex(EYE).multiplyScalar(1.6);
      material.roughness = 0.35;
      const antenna = new THREE.Group();                                                        // two short segments and the feathery arista
      antenna.position.set(side * 0.045, 0.03, 0.14);
      this.ball(antenna, TAN_DARK, [0.022, 0.022, 0.03], [0, 0, 0.02], 8);
      this.ball(antenna, TAN, [0.024, 0.03, 0.045], [0, -0.015, 0.07], 10);
      const arista = this.make(new THREE.CylinderGeometry(0.002, 0.004, 0.16, 4), BAND, antenna);
      arista.position.set(side * 0.04, 0.04, 0.1);
      arista.rotation.set(0.9, 0, side * -0.6);
      this.head.add(antenna);
      this.antennae.push(antenna);
    }
    for (const [x, z] of [[0, 0.02], [0.028, -0.02], [-0.028, -0.02]]) this.ball(this.head, 0xc86a2a, [0.012, 0.012, 0.012], [x, 0.165, z], 6); // ocelli
    for (const x of [0.05, -0.05]) {
      const bristle = this.make(new THREE.CylinderGeometry(0.003, 0.005, 0.09, 4), BAND, this.head);
      bristle.position.set(x, 0.17, -0.04);
      bristle.rotation.x = -0.5;
    }
    // the proboscis, folded under his head: rostrum, haustellum, and the two lobes of the labellum
    this.head.add(this.trunk);
    const rostrum = this.make(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 10), TAN_DARK, this.trunk);
    rostrum.position.set(0, -0.16, 0.03);
    const haustellum = this.make(new THREE.CylinderGeometry(0.032, 0.03, 0.09, 10), 0x4a3a22, this.trunk);
    haustellum.position.set(0, -0.215, 0.055);
    haustellum.rotation.x = 0.5;
    this.labellum.position.set(0, -0.255, 0.085);
    this.head.add(this.labellum);
    for (const side of [1, -1]) this.ball(this.labellum, 0x6b5436, [0.04, 0.03, 0.045], [side * 0.032, 0, 0], 12);
  }

  private buildWings(): void {
    const veins = canvasTexture(512, 192, (pen) => {
      const blade = pen.createLinearGradient(0, 0, 512, 192);
      blade.addColorStop(0, "rgba(226, 236, 244, 0.55)");
      blade.addColorStop(0.5, "rgba(206, 230, 222, 0.42)");
      blade.addColorStop(1, "rgba(238, 222, 240, 0.55)");
      pen.fillStyle = blade;
      pen.fillRect(0, 0, 512, 192);
      pen.strokeStyle = "rgba(52, 40, 26, 0.85)";
      pen.lineWidth = 2.2;
      const vein = (points: number[]): void => { pen.beginPath(); pen.moveTo(points[0], points[1]); pen.bezierCurveTo(points[2], points[3], points[4], points[5], points[6], points[7]); pen.stroke(); };
      vein([0, 84, 90, 10, 380, 0, 506, 78]);     // the leading edge
      vein([0, 90, 120, 40, 330, 34, 480, 52]);   // L2
      vein([0, 96, 140, 70, 340, 72, 508, 96]);   // L3
      vein([0, 102, 150, 104, 340, 118, 496, 128]); // L4
      vein([0, 108, 120, 140, 300, 168, 440, 164]); // L5
      pen.lineWidth = 1.8;
      pen.beginPath(); pen.moveTo(215, 74); pen.lineTo(222, 108); pen.stroke();                 // the two crossveins
      pen.beginPath(); pen.moveTo(335, 117); pen.lineTo(322, 160); pen.stroke();
    });
    const outline = new THREE.Shape();
    outline.moveTo(0, 0.42);
    outline.bezierCurveTo(0.14, 0.96, 0.76, 1.06, 1.0, 0.56);
    outline.bezierCurveTo(1.02, 0.3, 0.8, 0.0, 0.45, 0.03);
    outline.bezierCurveTo(0.25, 0.05, 0.05, 0.16, 0, 0.42);
    for (const side of [1, -1]) {
      const geometry = new THREE.ShapeGeometry(outline, 24);
      geometry.translate(0, -0.42, 0);
      geometry.scale(1.18, 0.44, 1);
      // length runs to his tail, width to his side, and the blade lies flat
      geometry.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)));
      const wing = this.make(geometry, 0xffffff, new THREE.Group());
      const material = wing.material as THREE.MeshStandardMaterial;
      material.map = veins;
      material.transparent = true;
      material.side = THREE.DoubleSide;
      material.depthWrite = false;
      material.roughness = 0.25;
      const hinge = wing.parent as THREE.Group;
      hinge.position.set(side * 0.1, 0.2 + (side > 0 ? 0.006 : 0), -0.08); // one blade rests on the other
      hinge.scale.x = side;
      this.body.add(hinge);
      this.wings.push(hinge);
    }
  }

  private buildLegs(): void {
    const hips: [number, number, number][] = [[0.13, 0.18, -0.95], [0.16, 0.0, -0.08], [0.14, -0.17, 0.85]]; // x, z, and where the leg points at rest
    for (const side of [1, -1]) {
      hips.forEach(([x, z, restYaw], pair) => {
        const root = new THREE.Group();          // right legs are left legs in a mirror
        root.position.set(side * x, HIP_Y, z);
        root.scale.x = side;
        const hip = new THREE.Group();
        const knee = new THREE.Group();
        const ankle = new THREE.Group();
        this.rod(hip, LEG, FEMUR, 0.028, 0.02);
        knee.position.x = FEMUR;
        this.rod(knee, LEG, TIBIA, 0.019, 0.013);
        this.ball(knee, LEG, [0.024, 0.024, 0.024], [0, 0, 0], 8);
        ankle.position.x = TIBIA;
        this.rod(ankle, 0x3e2f18, TARSUS, 0.012, 0.007);
        knee.add(ankle);
        hip.add(knee);
        root.add(hip);
        this.group.add(root);
        this.legs.push({ hip, knee, ankle, pair, tripod: (pair + (side > 0 ? 0 : 1)) % 2, restYaw });
      });
    }
  }

  update(m: FlyMotion): void {
    const { t } = m;
    const busy = 1 - m.calm;
    // trunk: down to the cup, or sitting up with a book; a slow breath always
    this.body.rotation.x = 0.27 * m.lean - 0.45 * m.reading;
    this.body.position.y = HIP_Y + 0.17 + 0.012 * Math.sin(t * 2.3) * busy - 0.02 * m.lean + 0.06 * m.reading + 0.01 * m.walking * Math.sin(m.stride * 2);
    this.abdomen.scale.set(1, 1 + 0.03 * Math.sin(t * 1.7), 1 + 0.02 * Math.sin(t * 1.7 + 1));
    this.abdomen.rotation.x = -0.1 + 0.03 * Math.sin(t * 1.7) + 0.25 * m.reading;
    // head: small jumps from one fixed look to the next, as a fly's head moves, unless he is tasting or reading
    const look = Math.floor(t / 1.6);
    const jump = Math.min(1, (t / 1.6 - look) * 9);
    const gaze = (n: number): number => Math.sin(n * 12.9898) * 0.22;
    const free = busy * (1 - m.reading) * (1 - m.lean);
    this.head.rotation.y = free * (gaze(look - 1) + (gaze(look) - gaze(look - 1)) * jump) + m.reading * 0.14 * Math.sin(t * 1.1);
    this.head.rotation.x = 0.3 * m.lean + 0.32 * m.reading - 0.12 * m.proboscis;   // his head comes up a little as the proboscis goes down
    this.head.position.y = 0.09 + 0.07 * m.proboscis;
    this.trunk.scale.y = 1 + 0.55 * m.proboscis;                                     // rostrum and haustellum unfold
    this.labellum.position.y = -0.255 - 0.16 * m.proboscis;                          // and his lips stay in the tea
    this.head.rotation.z = free * gaze(look + 40) * 0.3;
    this.antennae.forEach((antenna, i) => {
      const twitch = Math.max(0, Math.sin(t * 5.3 + i * 2.1) - 0.8) * 1.5;
      antenna.rotation.set(-0.25 * twitch * busy, (i ? -1 : 1) * 0.2 * twitch * busy, 0);
    });
    // wings: folded, with a quick flick now and then
    const since = t % 7.3;
    const flick = since < 0.24 ? Math.sin((since / 0.24) * Math.PI) * busy : 0;
    this.wings.forEach((hinge, i) => {
      const side = i ? -1 : 1;
      hinge.rotation.set(-0.06, side * (0.1 + 0.5 * flick), side * -(0.1 + 0.12 * flick));
    });
    // legs: an alternating tripod when he walks; the front pair has work to do at the whisk, the cloth and the book
    for (const leg of this.legs) {
      const phase = m.stride + leg.tripod * Math.PI;
      const swing = Math.max(0, Math.sin(phase)) * m.walking;
      let yaw = leg.restYaw + 0.34 * Math.cos(phase) * m.walking;
      let raise = RAISE + 0.3 * swing;
      let bend = -(RAISE + DROP) + 0.25 * swing;
      let flat = DROP - FLAT;
      if (leg.pair === 0) {
        const hold = Math.max(m.reading, m.whisking, m.wiping);
        const work = m.whisking * Math.sin(t * 19) * 0.12 + m.wiping * Math.sin(t * 9) * 0.2;
        yaw += (-1.32 - yaw) * hold + work;
        raise += (1.05 - RAISE) * hold + 0.1 * m.lean;
        bend += (-(1.05 + 0.35) - bend) * hold;
        flat += (0.5 - flat) * hold;
        yaw += 0.25 * m.lean; // at the cup his front feet stand either side of it
      }
      leg.hip.rotation.set(0, yaw, raise);
      leg.knee.rotation.z = bend;
      leg.ankle.rotation.z = flat;
    }
  }
}
