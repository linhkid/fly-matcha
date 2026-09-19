// The stage: a fly at a tea table and the cloud of his neurons.
// Everything built from a mesh is staged, and pose() in puppet.ts says where it is. The points are the fly's: their
// number, their places and their groups come from the connectome. Light on the points comes only from applyLight()
// and applyLipLight(), which take the output of light(): no recording, no light.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Cloud, CloudInfo } from "./cloud";
import type { LipDot } from "./lips";
import type { LoopState } from "./loop";
import { GROUP_COLOUR, hex } from "./palette";
import { pose, type Pose, type SipLook } from "./puppet";

const TABLE_Y = 1.0;
const AT = { shelf: -4.0, kettle: -2.9, sifter: -2.0, bowl: -0.9, cup: 0.6, cloth: 1.7 };
const TIER_COLOUR: Record<string, number> = { smooth: 0xb9d48a, balanced: 0x7fa24e, robust: 0x4f6b2a };
const POINT_SIZE: Record<string, number> = { none: 0.018, mn9: 0.17, "relay.shiu2022": 0.08 };
const CLOUD_SCALE = 5.0;
const WATER = new THREE.Color(0xcfd8c0);
const MATCHA = new THREE.Color(0x5d8a2f);
const POWDER = new THREE.Color(0x86a84a);

/** A set of points, the colours they have when nothing fires, and which entry of the light each point reads. */
interface Lit { points: THREE.Points; base: Float32Array; map: Int32Array }

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private readonly controls: OrbitControls;
  private readonly staged: THREE.Mesh[] = [];
  private readonly fly = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly frontLegs: THREE.Mesh[] = [];
  private readonly wings: THREE.Mesh[] = [];
  private readonly tins: THREE.Group[] = [];
  private readonly sifter = new THREE.Group();
  private readonly grains: THREE.Mesh[] = [];
  private readonly kettle = new THREE.Group();
  private readonly bowl = new THREE.Group();
  private readonly bowlTea: THREE.Mesh;
  private readonly heap: THREE.Mesh;
  private readonly whisk = new THREE.Group();
  private readonly stream: THREE.Mesh;
  private readonly cupTea: THREE.Mesh;
  private readonly cloth: THREE.Mesh;
  private readonly sweets: THREE.Mesh[] = [];
  private readonly brain = new THREE.Group();
  private readonly cloudPoints: Lit[] = [];
  private lipPoints: Lit | null = null;
  private flyX = AT.shelf;
  private time = 0;

  constructor(canvas: HTMLCanvasElement, tiers: string[]) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new THREE.Color(0x12150f);
    this.scene.fog = new THREE.Fog(0x12150f, 18, 34);
    this.camera.position.set(1.0, 2.7, 12.6);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(1.0, 1.45, 0);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 22;
    this.scene.add(new THREE.HemisphereLight(0xfff1d6, 0x1a2114, 1.2));
    const lamp = new THREE.DirectionalLight(0xffe2b0, 1.5);
    lamp.position.set(-2, 6, 6);
    this.scene.add(lamp);

    // the room: a floor, a paper screen that the dark fly reads against, the table
    const floor = this.mesh(new THREE.CircleGeometry(16, 48), 0x1b2016);
    floor.rotation.x = -Math.PI / 2;
    const mat = this.mesh(new THREE.BoxGeometry(9.2, 0.04, 4.2), 0x8d9160);
    mat.position.set(-1.2, 0.02, 0);
    const paper = this.mesh(new THREE.BoxGeometry(8.6, 3.5, 0.04), 0xd9cfb4);
    paper.position.set(-1.2, 1.95, -1.75);
    for (let i = 0; i <= 6; i++) this.mesh(new THREE.BoxGeometry(i % 6 ? 0.04 : 0.1, 3.5, 0.07), 0x3d2b1a).position.set(-5.5 + i * (8.6 / 6), 1.95, -1.72);
    for (const y of [0.2, 1.35, 2.5, 3.7]) this.mesh(new THREE.BoxGeometry(8.7, y === 0.2 || y === 3.7 ? 0.1 : 0.04, 0.07), 0x3d2b1a).position.set(-1.2, y, -1.72);
    const table = this.mesh(new THREE.BoxGeometry(7.4, 0.16, 2.4), 0x6b4a2f);
    table.position.set(-1.2, TABLE_Y - 0.08, 0);
    for (const x of [-4.6, 2.2]) for (const z of [-1, 1]) this.mesh(new THREE.BoxGeometry(0.16, TABLE_Y - 0.16, 0.16), 0x54391f).position.set(x, (TABLE_Y - 0.16) / 2, z);

    // the shelf of tins, one per tea on the menu
    const shelf = this.mesh(new THREE.BoxGeometry(2.5, 0.1, 0.5), 0x7d5a3a);
    shelf.position.set(AT.shelf + 0.85, TABLE_Y + 0.05, -0.75);
    tiers.forEach((tier, i) => {
      const tin = new THREE.Group();
      this.mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 20), TIER_COLOUR[tier] ?? 0x7fa24e, tin);
      this.mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.06, 20), 0x2c3323, tin).position.y = 0.18;
      tin.position.set(AT.shelf - 0.2 + i * 0.35, TABLE_Y + 0.26, -0.75);
      tin.userData.home = tin.position.clone();
      this.scene.add(tin);
      this.tins.push(tin);
    });

    const pot = this.mesh(new THREE.SphereGeometry(0.3, 20, 16), 0x23211f, this.kettle);
    pot.scale.y = 0.8;
    const spout = this.mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.34, 8), 0x23211f, this.kettle);
    spout.position.set(0.32, 0.06, 0);
    spout.rotation.z = -0.9;
    const handle = this.mesh(new THREE.TorusGeometry(0.24, 0.022, 8, 24, Math.PI), 0x23211f, this.kettle);
    handle.position.y = 0.17;
    this.scene.add(this.kettle);

    const rim = this.mesh(new THREE.TorusGeometry(0.3, 0.03, 10, 32), 0xb9b4a6, this.sifter);
    const gauze = this.mesh(new THREE.CircleGeometry(0.3, 32), 0x8a8a80, this.sifter);
    (gauze.material as THREE.MeshStandardMaterial).transparent = true;
    (gauze.material as THREE.MeshStandardMaterial).opacity = 0.55;
    (gauze.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    rim.rotation.x = gauze.rotation.x = -Math.PI / 2;
    this.scene.add(this.sifter);
    for (let i = 0; i < 36; i++) this.grains.push(this.mesh(new THREE.SphereGeometry(0.02, 6, 6), 0x86a84a));

    const wall = this.mesh(new THREE.CylinderGeometry(0.48, 0.3, 0.36, 32, 1, true), 0x2f2a26, this.bowl);
    (wall.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    const foot = this.mesh(new THREE.CircleGeometry(0.3, 32), 0x2f2a26, this.bowl);
    foot.rotation.x = -Math.PI / 2;
    foot.position.y = -0.18;
    this.bowlTea = this.mesh(new THREE.CircleGeometry(1, 32), 0xcfd8c0, this.bowl);
    this.heap = this.mesh(new THREE.SphereGeometry(0.2, 16, 10), 0x86a84a, this.bowl);
    this.bowlTea.rotation.x = -Math.PI / 2;
    this.heap.position.y = -0.18;
    this.scene.add(this.bowl);

    this.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 10), 0xd9c08a, this.whisk).position.y = 0.44;
    this.mesh(new THREE.ConeGeometry(0.13, 0.3, 16, 1, true), 0xe6d3a3, this.whisk).position.y = 0.14;
    this.scene.add(this.whisk);

    const cup = new THREE.Group();
    const cupWall = this.mesh(new THREE.CylinderGeometry(0.21, 0.16, 0.26, 24, 1, true), 0xe8e2d2, cup);
    (cupWall.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    const cupFoot = this.mesh(new THREE.CircleGeometry(0.16, 24), 0xe8e2d2, cup);
    cupFoot.rotation.x = -Math.PI / 2;
    cupFoot.position.y = -0.13;
    this.cupTea = this.mesh(new THREE.CircleGeometry(1, 24), 0x5d8a2f, cup);
    this.cupTea.rotation.x = -Math.PI / 2;
    cup.position.set(AT.cup, TABLE_Y + 0.13, 0.35);
    this.scene.add(cup);
    this.stream = this.mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8), 0x5d8a2f);
    this.stream.position.set(AT.cup - 0.02, TABLE_Y + 0.47, 0.34);

    this.cloth = this.mesh(new THREE.BoxGeometry(0.5, 0.03, 0.36), 0xd8d2c4);
    for (let i = 0; i < 4; i++) {
      const sweet = this.mesh(new THREE.SphereGeometry(0.075, 14, 10), 0xf0b7c4);
      sweet.scale.y = 0.6;
      sweet.position.set(AT.cup + 0.5 + i * 0.19, TABLE_Y + 0.045, 0.78);
      this.sweets.push(sweet);
    }

    this.buildFly();
    this.brain.position.set(5.0, 2.45, -0.4);
    this.scene.add(this.brain);
  }

  private mesh(geometry: THREE.BufferGeometry, colour: number, parent: THREE.Object3D = this.scene): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.75 }));
    parent.add(mesh);
    this.staged.push(mesh);
    return mesh;
  }

  private buildFly(): void {
    const body = 0x2b2a27;
    const thorax = this.mesh(new THREE.SphereGeometry(0.3, 24, 18), body, this.fly);
    thorax.scale.set(1, 0.9, 1.15);
    const abdomen = this.mesh(new THREE.SphereGeometry(0.3, 24, 18), 0x5a4a30, this.fly);
    abdomen.scale.set(0.95, 0.85, 1.5);
    abdomen.position.set(0, -0.03, -0.55);
    this.mesh(new THREE.SphereGeometry(0.2, 20, 16), body, this.head);
    for (const side of [-1, 1]) {
      const eye = this.mesh(new THREE.SphereGeometry(0.115, 16, 12), 0xa83a32, this.head);
      eye.position.set(side * 0.13, 0.04, 0.08);
      const wing = this.mesh(new THREE.SphereGeometry(0.5, 16, 10), 0xcfd8d8, this.fly);
      wing.scale.set(0.42, 0.03, 1.0);
      wing.position.set(side * 0.2, 0.2, -0.55);
      wing.rotation.y = side * -0.25;
      const material = wing.material as THREE.MeshStandardMaterial;
      material.transparent = true;
      material.opacity = 0.5;
      this.wings.push(wing);
      for (let pair = 0; pair < 3; pair++) {
        const leg = this.mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.62, 6), body, this.fly);
        leg.position.set(side * 0.34, -0.22, 0.22 - pair * 0.27);
        leg.rotation.z = side * 0.85;
        leg.rotation.y = (1 - pair) * side * 0.5;
        if (pair === 0) this.frontLegs.push(leg);
      }
    }
    // Retracted. pose() holds its extension at zero until a recording carries an outcome.
    this.mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 8), 0x3b332b, this.head).position.set(0, -0.2, 0.08);
    this.head.position.set(0, 0.06, 0.42);
    this.fly.add(this.head);
    this.fly.scale.setScalar(1.3);
    this.scene.add(this.fly);
  }

  private points(position: Float32Array, colour: Float32Array, size: number, opacity: number, parent: THREE.Object3D): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colour, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity, depthWrite: false }));
    parent.add(points);
    return points;
  }

  /** The cloud is split by group so that the few named neurons can be drawn larger than the rest. */
  setCloud(cloud: Cloud, info: CloudInfo): void {
    for (const group of info.groups) {
      const members: number[] = [];
      for (let i = 0; i < cloud.n; i++) if (cloud.group[i] === group.code) members.push(i);
      if (!members.length) continue;
      const position = new Float32Array(members.length * 3);
      const colour = new Float32Array(members.length * 3);
      const base = new THREE.Color(hex(GROUP_COLOUR[group.id] ?? "#9aa08a"));
      members.forEach((point, k) => {
        // the dataset's long axis runs from the front of the brain to the tail of the nerve cord: stand it up, brain on top
        position.set([cloud.xyz[3 * point] * CLOUD_SCALE, -cloud.xyz[3 * point + 2] * CLOUD_SCALE, cloud.xyz[3 * point + 1] * CLOUD_SCALE], 3 * k);
        colour.set([base.r, base.g, base.b], 3 * k);
      });
      const points = this.points(position, colour, POINT_SIZE[group.id] ?? 0.05, group.id === "none" ? 0.55 : 0.95, this.brain);
      this.cloudPoints.push({ points, base: colour.slice(), map: Int32Array.from(members) });
    }
  }

  /** One dot per taste neuron on the two lobes at the tip of his proboscis. */
  setLips(dots: LipDot[]): void {
    const position = new Float32Array(dots.length * 3);
    const colour = new Float32Array(dots.length * 3);
    dots.forEach((dot, k) => {
      const base = new THREE.Color(hex(GROUP_COLOUR[dot.group])).multiplyScalar(dot.speaks ? 1 : 0.45);
      position.set([dot.u * 0.2, -0.3 + dot.v * 0.075, 0.13 + (1 - Math.abs(dot.v)) * 0.03], 3 * k);
      colour.set([base.r, base.g, base.b], 3 * k);
    });
    const points = this.points(position, colour, 0.03, 1, this.head);
    this.lipPoints = { points, base: colour.slice(), map: Int32Array.from(dots.keys()) };
  }

  private static boost(lit: Lit, glow: Float32Array): void {
    const colour = lit.points.geometry.getAttribute("color") as THREE.BufferAttribute;
    for (let k = 0; k < lit.map.length; k++) {
      const more = Math.min(3, glow[lit.map[k]]);
      colour.setXYZ(k, Math.min(1, lit.base[3 * k] + more), Math.min(1, lit.base[3 * k + 1] + more), Math.min(1, lit.base[3 * k + 2] + more * 0.8));
    }
    colour.needsUpdate = true;
  }

  /** `glow` comes from light(): one number per cloud point. All zeros leaves the cloud exactly as it is. */
  applyLight(glow: Float32Array): void {
    for (const lit of this.cloudPoints) Stage.boost(lit, glow);
  }

  /** The same for the taste neurons: one number per dot, in the order given to setLips(). */
  applyLipLight(glow: Float32Array): void {
    if (this.lipPoints) Stage.boost(this.lipPoints, glow);
  }

  /** Everything built from a mesh is puppetry. Tint it, so the eye can tell it from the points, which are the fly's. */
  showStaged(on: boolean): void {
    for (const mesh of this.staged) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(on ? 0x8a5a00 : 0x000000);
      material.emissiveIntensity = on ? 0.6 : 0;
    }
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Draw one frame. `dt` is wall time and only moves puppets; while paused nothing but the camera moves. */
  draw(state: LoopState, sip: SipLook, dt: number): void {
    const step = state.paused ? 0 : dt;
    this.time += step;
    this.place(pose(state.phase, state.progress, sip), sip, step);
    this.brain.rotation.y += step * 0.12;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private place(at: Pose, sip: SipLook, step: number): void {
    const t = this.time;
    const tin = sip.teaIndex === null ? null : this.tins[sip.teaIndex];
    const walkTo = { tin: tin ? (tin.userData.home as THREE.Vector3).x : AT.shelf, kettle: AT.kettle, sifter: AT.bowl - 0.6, bowl: AT.bowl, between: (AT.bowl + AT.cup) / 2, cup: AT.cup }[at.walkTo];
    this.flyX += (walkTo - this.flyX) * Math.min(1, step * 3.2);
    const walking = Math.min(1, Math.abs(walkTo - this.flyX) * 3);
    this.fly.position.set(this.flyX, TABLE_Y + 0.56 + Math.sin(t * 2.1) * 0.012 - 0.1 * at.lean, -0.45 + 0.3 * at.lean);
    this.fly.rotation.x = 0.3 * at.lean;
    this.head.rotation.x = 0.35 * at.lean;
    this.wings.forEach((wing, i) => (wing.rotation.z = (i ? 1 : -1) * 0.04 * Math.sin(t * 9)));
    const swing = walking * Math.sin(t * 14) * 0.3 + at.whisking * Math.sin(t * 19) * 0.35 + at.wipe * Math.sin(t * 12) * 0.2;
    this.frontLegs.forEach((leg, i) => (leg.rotation.x = 0.5 + (i ? -swing : swing)));

    this.tins.forEach((each) => {
      const home = each.userData.home as THREE.Vector3;
      const lift = each === tin ? at.tinLift : 0;
      each.position.set(home.x, home.y + 0.45 * lift, home.z + 0.4 * lift);
      each.rotation.z = each === tin ? -0.5 * at.tinTilt : 0;
    });

    this.sifter.position.set(AT.sifter + (AT.bowl - AT.sifter) * at.sifterOver + (at.grains ? Math.sin(t * 38) * 0.025 : 0), TABLE_Y + 0.06 + 0.66 * at.sifterOver, 0.2 + 0.05 * at.sifterOver);
    this.grains.forEach((grain, k) => {
      grain.visible = k < at.grains;
      const fall = (t * 1.4 + k / this.grains.length) % 1;
      grain.position.set(AT.bowl + Math.sin(k * 2.4) * 0.2, TABLE_Y + 0.7 - fall * 0.5, 0.25 + Math.cos(k * 1.7) * 0.2);
    });

    this.kettle.position.set(AT.kettle + (AT.bowl - 0.5 - AT.kettle) * at.kettleOver, TABLE_Y + 0.24 + 0.55 * at.kettleOver, -0.55 + 0.75 * at.kettleOver);
    this.kettle.rotation.z = -0.6 * at.kettleOver;

    const strength = sip.scoops === 0 ? 0 : 0.35 + 0.65 * (sip.bitterLevel / 4);
    const tea = WATER.clone().lerp(POWDER, sip.scoops === 0 ? 0 : 0.3).lerp(WATER.clone().lerp(MATCHA, strength), at.mixed);
    for (const mesh of [this.bowlTea, this.cupTea, this.stream]) (mesh.material as THREE.MeshStandardMaterial).color.copy(tea);

    this.whisk.position.set(AT.bowl + 0.8 * (1 - at.whisking) + at.whisking * Math.sin(t * 17) * 0.13, TABLE_Y + 0.12 * at.whisking, 0.6 - 0.35 * at.whisking + at.whisking * Math.sin(t * 34) * 0.05);

    this.bowl.rotation.z = -0.95 * at.bowlTilt;
    this.bowl.position.set(AT.bowl + 0.85 * at.bowlTilt, TABLE_Y + 0.18 + 0.55 * at.bowlTilt, 0.25 + 0.1 * at.bowlTilt);
    this.bowlTea.visible = at.bowlLevel > 0.02;
    this.bowlTea.position.y = -0.17 + 0.3 * at.bowlLevel;
    this.bowlTea.scale.setScalar(0.31 + 0.15 * at.bowlLevel); // the bowl widens towards its rim
    this.heap.visible = at.heap > 0.02;
    this.heap.scale.set(at.heap, 0.35 * at.heap, at.heap);
    this.stream.visible = at.stream;
    this.cupTea.visible = at.cupLevel > 0.02;
    this.cupTea.position.y = -0.12 + 0.21 * at.cupLevel;
    this.cupTea.scale.setScalar(0.165 + 0.04 * at.cupLevel);

    this.cloth.position.set(AT.cloth + (AT.bowl - AT.cloth) * at.wipe + at.wipe * Math.sin(t * 9) * 0.18, TABLE_Y + 0.02 + 0.36 * at.wipe, 0.4 - 0.15 * at.wipe + at.wipe * Math.cos(t * 9) * 0.1);
    this.sweets.forEach((sweet, i) => (sweet.visible = i < at.sweetsShown));
  }
}
