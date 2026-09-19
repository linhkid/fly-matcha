// The stage: a fly at a tea table and the cloud of his neurons.
// Everything built from a mesh is staged: pose() in puppet.ts says where the props are, fly.ts moves his body.
// The points are the fly's: their number, their places and their groups come from the connectome. Light on the points
// comes only from applyActiveLight() and applyLipLight(), which take the output of light(): no spikes, no light.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Cloud, CloudInfo } from "./cloud";
import { chawan, fill, glassCup, type Vessel } from "./crockery";
import { FlyPuppet } from "./fly";
import type { LipDot } from "./lips";
import type { LoopState } from "./loop";
import { GROUP_COLOUR, hex } from "./palette";
import { ease, onBreak, pose, type Pose, type SipLook } from "./puppet";

const TABLE_Y = 1.0;
// He walks along the back of the table; everything he uses stands in front of him, so that nothing hides behind his body.
const AT = { tins: -4.45, kettle: -1.85, sifter: -1.15, bowl: -0.3, cup: 1.15, cloth: 1.95, cushion: 2.1 };
const WALK_Z = -0.75;
const FRONT_Z = 0.45;  // the bowl, the kettle when it pours, the cup
// He comes to the cup at an angle, so that his lips at the tea can be seen from the room and are not hidden behind his face.
const TASTE_YAW = 0.7;
const REACH = 0.46; // from the middle of his thorax to his lips, along the way he faces, with his head down
const TASTE_STEP = (FRONT_Z - WALK_Z) / Math.cos(TASTE_YAW) - REACH;       // how far he steps up: his lips end above the middle of the cup
const CUP_STAND = AT.cup - Math.sin(TASTE_YAW) * (REACH + TASTE_STEP);     // where on his walking line he turns towards it
const WALK_SPEED = 1.7;  // table units a second
const TURN_SPEED = 7;    // radians a second
const STRIDE = 11;       // radians of gait for every unit walked
const TIER_COLOUR: Record<string, number> = { smooth: 0xb9d48a, balanced: 0x7fa24e, robust: 0x4f6b2a };
const CLOUD_SCALE = 5.0;
const CORD_FROM = -0.12; // along the dataset's long axis: in front of this is brain, behind it nerve cord
const WATER = new THREE.Color(0xcfd8c0);
const MATCHA = new THREE.Color(0x3f7a1a);
const POWDER = new THREE.Color(0x86a84a);

/** A set of points, the colours they have when nothing fires, and which entry of the light each point reads. */
interface Lit { points: THREE.Points; base: Float32Array; map: Int32Array }
export interface Pin { x: number; y: number; visible: boolean }
/** What the replay of a recording says he is doing at the cup. Both are zero unless drinking has been licensed. */
export interface Drink { extension: number; drunk: number }
const DRY: Drink = { extension: 0, drunk: 0 };

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private readonly controls: OrbitControls;
  private readonly staged: THREE.Mesh[] = [];
  private room = 0; // how many of `staged` are the room, which is tinted only lightly
  private readonly puppet: FlyPuppet;
  private readonly tins: THREE.Group[] = [];
  private readonly sifter = new THREE.Group();
  private readonly grains: THREE.Mesh[] = [];
  private readonly kettle = new THREE.Group();
  private readonly bowl: Vessel;
  private readonly heap: THREE.Mesh;
  private readonly whisk = new THREE.Group();
  private readonly stream: THREE.Mesh;
  private readonly water: THREE.Mesh;
  private readonly cup: Vessel;
  private readonly ripple: THREE.Mesh;
  private readonly cloth: THREE.Mesh;
  private readonly sweets: THREE.Mesh[] = [];
  private readonly book = new THREE.Group();
  private readonly page = new THREE.Group();
  private readonly cover = document.createElement("canvas");
  private readonly coverTexture = new THREE.CanvasTexture(this.cover);
  private readonly brain = new THREE.Group();
  private readonly tether: THREE.Line;
  private readonly dot: THREE.CanvasTexture;
  private cloud: Cloud | null = null;
  private active: { points: THREE.Points; count: number; readout: THREE.Points; places: number[] } | null = null; // the neurons that fire in the recording being replayed
  private lipPoints: Lit | null = null;
  private flyX = AT.tins;
  private yaw = 0;
  private stride = 0;
  private time = 0;
  private rest = 0;      // 0 at work, 1 with everything put down
  private resting = false;  // the viewer's wish: he is on a break, or on his way to one
  private atStation = true; // he stands where his work is, facing it
  private touchedAt = 0;
  private drink: Drink = DRY;
  private title = "";

  constructor(canvas: HTMLCanvasElement, tiers: string[]) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new THREE.Color(0x12150f);
    this.scene.fog = new THREE.Fog(0x12150f, 18, 34);
    this.camera.position.set(1.0, 4.1, 12.3); // high enough to look into the bowl and the cup
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(1.0, 1.3, 0);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 22;
    this.scene.add(new THREE.HemisphereLight(0xfff1d6, 0x1a2114, 1.2));
    const lamp = new THREE.DirectionalLight(0xffe2b0, 1.5);
    lamp.position.set(-2, 6, 6);
    this.scene.add(lamp);

    // a soft room to be mirrored in glaze, glass and wet tea. Only those materials are given it; the scene's light is unchanged.
    const mirror = new THREE.PMREMGenerator(this.renderer);
    const sky = mirror.fromScene(new RoomEnvironment(), 0.04).texture;
    mirror.dispose();

    // a round dot for every point: squares read as sparks
    const disc = document.createElement("canvas");
    disc.width = disc.height = 32;
    const pen = disc.getContext("2d");
    if (pen) { pen.fillStyle = "#fff"; pen.beginPath(); pen.arc(16, 16, 14, 0, Math.PI * 2); pen.fill(); }
    this.dot = new THREE.CanvasTexture(disc);

    // the room: a floor, a mat, a paper screen that he reads against, the table
    const floor = this.mesh(new THREE.CircleGeometry(16, 48), 0x1b2016);
    floor.rotation.x = -Math.PI / 2;
    this.mesh(new THREE.BoxGeometry(9.2, 0.04, 4.2), 0x8d9160).position.set(-1.2, 0.02, 0);
    this.mesh(new THREE.BoxGeometry(8.6, 3.5, 0.04), 0xd9cfb4).position.set(-1.2, 1.95, -1.75);
    for (let i = 0; i <= 6; i++) this.mesh(new THREE.BoxGeometry(i % 6 ? 0.04 : 0.1, 3.5, 0.07), 0x3d2b1a).position.set(-5.5 + i * (8.6 / 6), 1.95, -1.72);
    for (const y of [0.2, 1.35, 2.5, 3.7]) this.mesh(new THREE.BoxGeometry(8.7, y === 0.2 || y === 3.7 ? 0.1 : 0.04, 0.07), 0x3d2b1a).position.set(-1.2, y, -1.72);
    this.mesh(new THREE.BoxGeometry(7.4, 0.16, 2.4), 0x6b4a2f).position.set(-1.2, TABLE_Y - 0.08, 0);
    for (const x of [-4.6, 2.2]) for (const z of [-1, 1]) this.mesh(new THREE.BoxGeometry(0.16, TABLE_Y - 0.16, 0.16), 0x54391f).position.set(x, (TABLE_Y - 0.16) / 2, z);
    this.room = this.staged.length;

    // the tray of tins, one per tea on the menu
    this.mesh(new THREE.BoxGeometry(2.5, 0.06, 0.5), 0x7d5a3a).position.set(AT.tins + 1.05, TABLE_Y + 0.03, 0.5);
    tiers.forEach((tier, i) => {
      const tin = new THREE.Group();
      this.mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 20), TIER_COLOUR[tier] ?? 0x7fa24e, tin);
      this.mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.06, 20), 0x2c3323, tin).position.y = 0.18;
      tin.position.set(AT.tins + i * 0.35, TABLE_Y + 0.22, 0.5);
      tin.userData.home = tin.position.clone();
      this.scene.add(tin);
      this.tins.push(tin);
    });

    this.mesh(new THREE.SphereGeometry(0.3, 20, 16), 0x23211f, this.kettle).scale.y = 0.8;
    const spout = this.mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.34, 8), 0x23211f, this.kettle);
    spout.position.set(0.32, 0.06, 0);
    spout.rotation.z = -0.9;
    this.mesh(new THREE.TorusGeometry(0.24, 0.022, 8, 24, Math.PI), 0x23211f, this.kettle).position.y = 0.17;
    this.scene.add(this.kettle);
    this.water = this.mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), 0xcfd8c0);
    this.water.position.set(AT.bowl - 0.32, TABLE_Y + 0.35, FRONT_Z);

    const rim = this.mesh(new THREE.TorusGeometry(0.3, 0.03, 10, 32), 0xb9b4a6, this.sifter);
    const gauze = this.mesh(new THREE.CircleGeometry(0.3, 32), 0x8a8a80, this.sifter);
    Object.assign(gauze.material as THREE.MeshStandardMaterial, { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    rim.rotation.x = gauze.rotation.x = -Math.PI / 2;
    this.scene.add(this.sifter);
    for (let i = 0; i < 36; i++) this.grains.push(this.mesh(new THREE.SphereGeometry(0.02, 6, 6), 0x86a84a));

    const make = (geometry: THREE.BufferGeometry, colour: number, parent: THREE.Object3D): THREE.Mesh => this.mesh(geometry, colour, parent);
    this.bowl = chawan(make, sky);
    this.heap = this.mesh(new THREE.SphereGeometry(0.17, 16, 10), 0x7fa336, this.bowl.group); // sifted powder, before the water
    this.heap.position.y = this.bowl.floorY;
    this.scene.add(this.bowl.group);

    // a chasen: a short bamboo handle, a bound waist, and a head of tines that curl in at their tips
    this.mesh(new THREE.CylinderGeometry(0.05, 0.046, 0.24, 14), 0xd9c08a, this.whisk).position.y = 0.46;
    this.mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.03, 14), 0x2a2622, this.whisk).position.y = 0.335;
    const tines = document.createElement("canvas");
    tines.width = 256;
    tines.height = 8;
    const comb = tines.getContext("2d");
    if (comb) { comb.fillStyle = "#fff"; for (let x = 0; x < 256; x += 8) comb.fillRect(x, 0, 4.5, 8); }
    const gaps = new THREE.CanvasTexture(tines);
    for (const [top, bottom, height, y] of [[0.052, 0.15, 0.27, 0.19], [0.04, 0.085, 0.24, 0.2]]) {
      const head = this.mesh(new THREE.CylinderGeometry(top, bottom, height, 32, 1, true), 0xe6d3a3, this.whisk);
      head.position.y = y;
      Object.assign(head.material as THREE.MeshStandardMaterial, { alphaMap: gaps, alphaTest: 0.5, side: THREE.DoubleSide });
    }
    this.scene.add(this.whisk);

    // a glass, not a second bowl: what his lips do at the tea, and how much tea is left, can be seen through it
    this.cup = glassCup(make, sky);
    this.ripple = this.mesh(new THREE.TorusGeometry(1, 0.06, 6, 32), 0xe9f0d8, this.cup.group);
    this.ripple.rotation.x = -Math.PI / 2;
    (this.ripple.material as THREE.MeshStandardMaterial).transparent = true;
    this.scene.add(this.cup.group);
    this.stream = this.mesh(new THREE.CylinderGeometry(0.03, 0.013, 0.5, 10), 0x5d8a2f); // a poured stream thins as it falls
    this.stream.position.set(AT.cup - 0.02, TABLE_Y + 0.43, FRONT_Z);

    this.cloth = this.mesh(new THREE.BoxGeometry(0.5, 0.03, 0.36), 0xd8d2c4);
    for (let i = 0; i < 4; i++) {
      const sweet = this.mesh(new THREE.SphereGeometry(0.075, 14, 10), 0xf0b7c4);
      sweet.userData.home = new THREE.Vector3(AT.cup + 0.45 + i * 0.19, TABLE_Y + 0.045, 0.85);
      this.sweets.push(sweet);
    }
    this.mesh(new THREE.CylinderGeometry(0.62, 0.64, 0.08, 28), 0x7a2f35).position.set(AT.cushion, TABLE_Y + 0.04, WALK_Z);

    this.puppet = new FlyPuppet((geometry, colour, parent) => this.mesh(geometry, colour, parent));
    this.puppet.group.position.set(this.flyX, TABLE_Y, WALK_Z);
    this.scene.add(this.puppet.group);
    this.buildBook();

    this.brain.position.set(5.0, 2.45, -0.4);
    this.scene.add(this.brain);
    // a thread from his head to the cloud: that is his, in there
    this.tether = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: 0xa7a791, dashSize: 0.07, gapSize: 0.09, transparent: true, opacity: 0.45 }),
    );
    this.scene.add(this.tether);
  }

  private mesh(geometry: THREE.BufferGeometry, colour: number, parent: THREE.Object3D = this.scene): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.75 }));
    parent.add(mesh);
    this.staged.push(mesh);
    return mesh;
  }

  /** Held in his front legs on a break. Two covers open towards him, so the title faces the room. */
  private buildBook(): void {
    this.cover.width = 256;
    this.cover.height = 352;
    this.coverTexture.colorSpace = THREE.SRGBColorSpace;
    for (const side of [-1, 1]) {
      const half = new THREE.Group();
      this.mesh(new THREE.BoxGeometry(0.27, 0.38, 0.02), 0x5a1f1f, half).position.x = side * 0.135;
      this.mesh(new THREE.BoxGeometry(0.25, 0.35, 0.035), 0xefe8d6, half).position.set(side * 0.13, 0, -0.028);
      if (side === 1) {
        const face = this.mesh(new THREE.PlaneGeometry(0.27, 0.38), 0xffffff, half);
        (face.material as THREE.MeshStandardMaterial).map = this.coverTexture;
        face.position.set(0.135, 0, 0.011);
      }
      half.rotation.y = side * 0.38;
      this.book.add(half);
    }
    const leaf = this.mesh(new THREE.PlaneGeometry(0.24, 0.34), 0xfaf5e6, this.page);
    (leaf.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    leaf.position.x = 0.12;
    this.page.position.z = -0.05;
    this.book.add(this.page);
    this.book.rotation.x = -0.35;
    this.puppet.hands.add(this.book);
  }

  private printCover(title: string): void {
    const pen = this.cover.getContext("2d");
    if (!pen || title === this.title) return;
    this.title = title;
    pen.fillStyle = "#5a1f1f";
    pen.fillRect(0, 0, 256, 352);
    pen.strokeStyle = "#d9b45a";
    pen.lineWidth = 4;
    pen.strokeRect(14, 14, 228, 324);
    pen.fillStyle = "#d9b45a";
    pen.textAlign = "center";
    pen.font = "600 22px Georgia, serif";
    pen.fillText("DOSTOEVSKY", 128, 64);
    pen.fillRect(88, 82, 80, 2);
    pen.font = "italic 30px Georgia, serif";
    const lines: string[] = [];
    for (const word of title.split(" ")) {
      const last = lines[lines.length - 1];
      if (last !== undefined && pen.measureText(`${last} ${word}`).width < 200) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    lines.forEach((line, i) => pen.fillText(line, 128, 190 - (lines.length - 1) * 19 + i * 38));
    this.coverTexture.needsUpdate = true;
  }

  private points(position: Float32Array, colour: Float32Array, size: number, opacity: number, parent: THREE.Object3D): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colour, 3));
    const material = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity, depthWrite: false, map: this.dot, alphaTest: 0.02 });
    const points = new THREE.Points(geometry, material);
    parent.add(points);
    return points;
  }

  /**
   * The cloud is drawn in sets, so that the few named neurons can be a little larger than the rest and the thin
   * nerve cord a little denser than the brain. Colour is flat paint. Nothing here is light.
   */
  setCloud(cloud: Cloud, info: CloudInfo): void {
    this.cloud = cloud;
    for (const group of info.groups) {
      for (const cord of [false, true]) {
        const members: number[] = [];
        for (let i = 0; i < cloud.n; i++) if (cloud.group[i] === group.code && (cloud.xyz[3 * i + 2] > CORD_FROM) === cord) members.push(i);
        if (!members.length) continue;
        const position = new Float32Array(members.length * 3);
        const colour = new Float32Array(members.length * 3);
        const base = new THREE.Color(hex(GROUP_COLOUR[group.id] ?? "#9aa08a"));
        members.forEach((point, k) => {
          // the dataset's long axis runs from the front of the brain to the tail of the nerve cord: stand it up, brain on top
          position.set([cloud.xyz[3 * point] * CLOUD_SCALE, -cloud.xyz[3 * point + 2] * CLOUD_SCALE, cloud.xyz[3 * point + 1] * CLOUD_SCALE], 3 * k);
          colour.set([base.r, base.g, base.b], 3 * k);
        });
        const named = group.id !== "none";
        this.points(position, colour, named ? (group.id === "mn9" ? 0.075 : 0.042) : cord ? 0.026 : 0.018, named ? 0.95 : cord ? 0.95 : 0.8, this.brain);
      }
    }
  }

  /** One dot per taste neuron, on his lips: a pad under the tip of his folded proboscis, drawn larger than life so it can be found. */
  setLips(dots: LipDot[]): void {
    const position = new Float32Array(dots.length * 3);
    const colour = new Float32Array(dots.length * 3);
    dots.forEach((dot, k) => {
      const base = new THREE.Color(hex(GROUP_COLOUR[dot.group])).multiplyScalar(dot.speaks ? 0.5 : 0.25); // dim until the model fires it
      // the pad stands above the tip of his proboscis, so that it stays out of the tea and in sight when his lips touch it
      position.set([dot.u * 0.17, dot.v * 0.07 + 0.075, 0.13 + (1 - Math.abs(dot.v)) * 0.015], 3 * k);
      colour.set([base.r, base.g, base.b], 3 * k);
    });
    const points = this.points(position, colour, 0.03, 1, this.puppet.labellum);
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

  /**
   * The neurons that fire in the recording being replayed, as a layer of their own over the painted cloud: a few thousand
   * points whose light changes every frame, where rewriting all the cloud's colours would not do. They add light, and the
   * painted cloud under them does not change. `indices` are points of the cloud; with none, the layer goes.
   */
  setActive(indices: number[], readoutPlaces: number[] = []): void {
    if (this.active) {
      for (const points of [this.active.points, this.active.readout]) {
        this.brain.remove(points);
        points.geometry.dispose();
        (points.material as THREE.Material).dispose();
      }
      this.active = null;
    }
    if (!this.cloud || !indices.length) return;
    const layer = (points: number[], size: number): THREE.Points => {
      const position = new Float32Array(points.length * 3);
      points.forEach((point, k) => position.set([this.cloud!.xyz[3 * point] * CLOUD_SCALE, -this.cloud!.xyz[3 * point + 2] * CLOUD_SCALE, this.cloud!.xyz[3 * point + 1] * CLOUD_SCALE], 3 * k));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(points.length * 3), 3)); // black: adds nothing
      const material = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, map: this.dot });
      const made = new THREE.Points(geometry, material);
      this.brain.add(made);
      return made;
    };
    // MN9 is two neurons among thousands: when one of them fires it has to be seen, so they get a larger point of their own
    this.active = { points: layer(indices, 0.13), count: indices.length, readout: layer(readoutPlaces.map((k) => indices[k]), 0.5), places: readoutPlaces };
  }

  /** `glow` comes from light(): one number per active neuron, or null for none. No spikes in the window, no light. */
  applyActiveLight(glow: Float32Array | null): void {
    if (!this.active) return;
    // light from another recording's neurons would be light with no spike behind it: stop, loudly
    if (glow && glow.length !== this.active.count) throw new Error(`light for ${glow.length} neurons was handed to a layer of ${this.active.count}`);
    const paint = (points: THREE.Points, count: number, valueOf: (k: number) => number, tint: [number, number, number]): void => {
      const colour = points.geometry.getAttribute("color") as THREE.BufferAttribute;
      for (let k = 0; k < count; k++) {
        const lit = glow ? Math.min(1, valueOf(k) * 0.6) : 0;   // one spike in the window is a clear flash, two are full light
        colour.setXYZ(k, lit * tint[0], lit * tint[1], lit * tint[2]);
      }
      colour.needsUpdate = true;
    };
    paint(this.active.points, this.active.count, (k) => glow![k], [1, 0.86, 0.45]);
    paint(this.active.readout, this.active.places.length, (k) => glow![this.active!.places[k]], [1, 0.95, 0.8]);
  }

  /** The same for the taste neurons: one number per dot, in the order given to setLips(). */
  applyLipLight(glow: Float32Array): void {
    if (this.lipPoints) Stage.boost(this.lipPoints, glow);
  }

  /** Everything built from a mesh is puppetry. Tint it lilac, the colour of the STAGED tag, so the eye can tell it from the points. */
  showStaged(on: boolean): void {
    this.staged.forEach((mesh, i) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(on ? 0x7a4fb0 : 0x000000);
      material.emissiveIntensity = on ? (i < this.room ? 0.04 : 0.55) : 0;
    });
  }

  /** Stand somewhere else and look at something else. For stills: `&from=x,y,z&at3=x,y,z` in the address. */
  lookFrom(from: [number, number, number], at: [number, number, number]): void {
    this.camera.position.set(...from);
    this.controls.target.set(...at);
    this.controls.update();
  }

  /** He is back: at his station, facing his work, with it picked up again. Only then may the ceremony's clock run. */
  get atWork(): boolean {
    return !this.resting && this.atStation && this.rest === 0;
  }

  resize(width: number, height: number): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // the window may have moved to another screen
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Where the names go, in CSS pixels: over his brain and beside his nerve cord. */
  pins(): Record<"brain" | "cord", Pin> {
    const { clientWidth: width, clientHeight: height } = this.renderer.domElement;
    const pin = (world: THREE.Vector3): Pin => {
      const v = world.project(this.camera);
      return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, visible: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 };
    };
    return {
      brain: pin(this.brain.position.clone().add(new THREE.Vector3(0, CLOUD_SCALE * 0.5 + 0.22, 0))),
      cord: pin(this.brain.position.clone().add(new THREE.Vector3(1.05, -CLOUD_SCALE * 0.12, 0))),
    };
  }

  /**
   * Draw one frame. `dt` is wall time and only moves puppets. A break holds the ceremony, not the room: he puts down
   * what he holds, walks to his cushion and reads `book`. Coming back he shuts the book, walks to his work, and only then
   * picks it up again. `resting` is the viewer's wish; `atWork` says when he has caught up with it.
   * In a still the idle clock stands too, so that a shot can be taken twice and be the same.
   */
  draw(state: LoopState, sip: SipLook, book: string, dt: number, resting: boolean, still = false, drink: Drink = DRY): void {
    this.drink = drink;
    if (!still) this.time += dt;
    this.resting = resting;
    this.rest = Math.min(1, Math.max(0, this.rest + (resting ? dt : this.atStation ? -dt : 0) / 0.8));
    if (resting) this.printCover(book);
    this.place(onBreak(pose(state.phase, state.progress, sip, state.phaseSeconds, drink.drunk), this.rest), sip, dt);
    if (!still) this.brain.rotation.y += dt * 0.12;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /** Put everyone where a moment has them, with no walking there and no turning of the cloud. For stills. */
  settle(state: LoopState, sip: SipLook, book: string, resting: boolean): void {
    this.resting = resting;
    this.rest = resting ? 1 : 0;
    this.reading = 0; // so that nothing keeps him sitting
    if (resting) this.printCover(book);
    const at = onBreak(pose(state.phase, state.progress, sip, state.phaseSeconds, this.drink.drunk), this.rest);
    this.place(at, sip, 10); // he turns and walks all the way
    this.place(at, sip, 10); // and turns to face his work, or sits down and opens his book
    this.reading = resting ? 1 : 0;
    this.place(at, sip, 0);
  }

  private place(at: Pose, sip: SipLook, step: number): void {
    if (!(step >= 0)) throw new Error(`time runs forwards here: ${step}`); // a negative step would turn him by a rate times a negative time
    const t = this.time;
    const tin = sip.teaIndex === null ? null : this.tins[sip.teaIndex];
    const station = { tin: tin ? (tin.userData.home as THREE.Vector3).x : AT.tins, kettle: AT.kettle, sifter: AT.sifter, bowl: AT.bowl, cup: CUP_STAND }[at.walkTo];
    const walkTo = this.resting ? AT.cushion : station;
    const stand = !this.resting && at.walkTo === "cup" ? TASTE_YAW : 0; // the way he faces once he is there

    // he turns to where he is going, walks there on an alternating tripod, and turns back to face his work
    const away = walkTo - this.flyX;
    const seated = this.reading > 0.05 && !this.resting; // he shuts his book before he gets up
    const facing = seated ? this.yaw : Math.abs(away) > 0.03 ? Math.sign(away) * (Math.PI / 2) : stand;
    const turn = Math.max(-TURN_SPEED * step, Math.min(TURN_SPEED * step, facing - this.yaw));
    this.yaw += turn;
    const aligned = Math.abs(facing - this.yaw) < 0.3;
    const move = aligned && !seated ? Math.sign(away) * Math.min(Math.abs(away), WALK_SPEED * step) : 0;
    this.flyX += move;
    this.atStation = Math.abs(station - this.flyX) < 0.02 && Math.abs(stand - this.yaw) < 0.05;
    this.stride += (Math.abs(move) + Math.abs(turn) * 0.12) * STRIDE;
    const walking = step > 0 ? Math.min(1, (Math.abs(move) + Math.abs(turn) * 0.12) / (WALK_SPEED * step) * 1.2) : 0;
    // the book opens once he has sat down, and closes before he gets up
    const reading = this.resting && this.rest === 1 && Math.abs(AT.cushion - this.flyX) < 0.02 && Math.abs(this.yaw) < 0.05 ? 1 : 0;
    this.reading += (reading - this.reading) * Math.min(1, step * 5);

    // To taste he steps up to the cup and lowers his head until his lips touch the tea. Touching is the stimulus; it is not drinking.
    this.puppet.group.position.set(this.flyX + Math.sin(TASTE_YAW) * TASTE_STEP * at.lean, TABLE_Y, WALK_Z + Math.cos(TASTE_YAW) * TASTE_STEP * at.lean);
    this.puppet.group.rotation.y = this.yaw;
    this.puppet.update({ t, stride: this.stride, walking: Math.max(walking, at.lean > 0.02 && at.lean < 0.98 ? 0.6 : 0), lean: at.lean, calm: at.touching ? 1 : 0, reading: this.reading, whisking: at.whisking, wiping: at.wipe, proboscis: at.touching ? this.drink.extension : 0 });
    if (at.lean > 0.02 && at.lean < 0.98) this.stride += step * 9; // stepping up to the cup, and back
    this.book.visible = this.reading > 0.02;
    this.book.scale.setScalar(Math.max(0.001, this.reading));
    const leaf = (t % 5.5) / 0.9; // a page every few seconds
    this.page.rotation.y = -0.38 - (Math.PI - 0.76) * (leaf < 1 ? ease(leaf) : 0);
    this.page.visible = leaf < 1;

    const head = this.puppet.head.getWorldPosition(new THREE.Vector3());
    const line = this.tether.geometry.getAttribute("position") as THREE.BufferAttribute;
    line.setXYZ(0, head.x, head.y + 0.2, head.z);
    line.setXYZ(1, this.brain.position.x - 0.4, this.brain.position.y + CLOUD_SCALE * 0.27, this.brain.position.z);
    line.needsUpdate = true;
    this.tether.computeLineDistances();

    this.tins.forEach((each) => {
      const home = each.userData.home as THREE.Vector3;
      each.position.set(home.x, home.y + 0.5 * (each === tin ? at.tinLift : 0), home.z);
      each.rotation.x = each === tin ? -0.6 * at.tinTilt : 0; // tipped towards him
    });

    this.sifter.position.set(AT.sifter + (AT.bowl - AT.sifter) * at.sifterOver + (at.grains ? Math.sin(t * 38) * 0.025 : 0), TABLE_Y + 0.06 + 0.66 * at.sifterOver, 0.75 + (FRONT_Z - 0.75) * at.sifterOver);
    this.grains.forEach((grain, k) => {
      grain.visible = k < at.grains;
      const fall = (t * 1.4 + k / this.grains.length) % 1;
      grain.position.set(AT.bowl + Math.sin(k * 2.4) * 0.2, TABLE_Y + 0.7 - fall * 0.5, FRONT_Z + Math.cos(k * 1.7) * 0.2);
    });

    this.kettle.position.set(AT.kettle + (AT.bowl - 0.7 - AT.kettle) * at.kettleOver, TABLE_Y + 0.24 + 0.6 * at.kettleOver, FRONT_Z);
    this.kettle.rotation.z = -0.6 * at.kettleOver;
    this.water.visible = at.kettleOver > 0.97;

    const strength = sip.scoops === 0 ? 0 : 0.6 + 0.4 * (sip.bitterLevel / 4);
    const tea = WATER.clone().lerp(POWDER, sip.scoops === 0 ? 0 : 0.3).lerp(WATER.clone().lerp(MATCHA, strength), at.mixed);
    (this.stream.material as THREE.MeshStandardMaterial).color.copy(tea);
    const foamy = ease((at.mixed - 0.35) / 0.65); // the whisk raises the foam

    this.whisk.position.set(AT.bowl + 0.75 * (1 - at.whisking) + at.whisking * Math.sin(t * 17) * 0.13, TABLE_Y + 0.12 * at.whisking, 0.8 + (FRONT_Z - 0.8) * at.whisking + at.whisking * Math.sin(t * 34) * 0.05);

    this.bowl.group.rotation.z = -0.95 * at.bowlTilt;
    this.bowl.group.position.set(AT.bowl + (AT.cup - 0.62 - AT.bowl) * at.bowlTilt, TABLE_Y + 0.2 + 0.5 * at.bowlTilt, FRONT_Z);
    fill(this.bowl, at.bowlLevel, tea, foamy);
    this.heap.visible = at.heap > 0.02;
    this.heap.scale.set(at.heap, 0.3 * at.heap, at.heap);
    this.stream.visible = at.stream;

    // what he has not drunk is tipped out where everyone can see it
    this.cup.group.position.set(AT.cup + 0.25 * at.cupTip, TABLE_Y + 0.115 + 0.3 * at.cupTip, FRONT_Z + 0.35 * at.cupTip);
    this.cup.group.rotation.z = -1.35 * at.cupTip;
    fill(this.cup, at.cupLevel, tea, 1);
    // a ring spreads from where his lips touch. It is water moving, not a verdict.
    if (!at.touching) this.touchedAt = t;
    const spread = ((t - this.touchedAt) % 2.4) / 2.4;
    this.ripple.visible = at.touching;
    this.ripple.position.set(0, this.cup.tea.position.y + 0.006, 0);
    this.ripple.scale.setScalar(0.02 + 0.13 * spread);
    (this.ripple.material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - spread);

    this.cloth.position.set(AT.cloth + (AT.bowl - AT.cloth) * at.wipe + at.wipe * Math.sin(t * 9) * 0.18, TABLE_Y + 0.02 + 0.36 * at.wipe, 0.2 + (FRONT_Z - 0.2) * at.wipe + at.wipe * Math.cos(t * 9) * 0.1);
    // the sweets he was offered are carried off the table, not eaten
    this.sweets.forEach((sweet, i) => {
      const home = sweet.userData.home as THREE.Vector3;
      sweet.visible = i < at.sweetsShown && at.sweetsAway < 0.99;
      sweet.position.set(home.x + 1.6 * at.sweetsAway, home.y, home.z);
      sweet.scale.set(1, 0.6, 1).multiplyScalar(1 - 0.5 * ease((at.sweetsAway - 0.7) / 0.3));
    });
  }

  private reading = 0;
}
