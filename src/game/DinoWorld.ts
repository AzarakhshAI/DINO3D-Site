import * as THREE from "three";

export type WorldMode = "auto" | "play";
export type GameState = "ready" | "running" | "paused" | "over";
export type SoundKind = "jump" | "die" | "milestone";

export interface WorldOptions {
  mode: WorldMode;
  dark: boolean;
  onScore?: (score: number) => void;
  onState?: (state: GameState) => void;
  onSound?: (kind: SoundKind) => void;
}

const PAL = {
  light: {
    bg: 0xf7f7f7,
    ground: 0xefefef,
    dino: 0x535353,
    cactus: 0x777777,
    decor: 0xc6c6c6,
    line: 0xd6d6d6,
    dash: 0xc2c2c2,
    cloud: 0xeaeaea,
    orb: 0xe6e6e6,
    eye: 0xf7f7f7,
    shadow: 0.13,
    ambient: 1.0,
    dir: 0.55,
  },
  dark: {
    bg: 0x14141a,
    ground: 0x1b1b23,
    dino: 0xbcbcc8,
    cactus: 0x7a7a8a,
    decor: 0x3a3a48,
    line: 0x34343f,
    dash: 0x3b3b48,
    cloud: 0x22222c,
    orb: 0xf1f1f6,
    eye: 0x14141a,
    shadow: 0.4,
    ambient: 0.9,
    dir: 0.6,
  },
};

const BOX = new THREE.BoxGeometry(1, 1, 1);
const FLAT = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

const DINO_X = -4;
const SPAWN_X = 80;
const DESPAWN_X = -32;
const GRAVITY = 58;
const JUMP_V = 19.5;
const BASE_SPEED = 11;
const MAX_SPEED = 25;

function box(
  mat: THREE.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number
) {
  const m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  return m;
}

interface Obstacle {
  group: THREE.Group;
  x: number;
  w: number;
  h: number;
  y0: number;
  bird: boolean;
  decor: boolean;
  age: number;
  wings?: [THREE.Object3D, THREE.Object3D];
  shadow?: THREE.Mesh;
  phase: number;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
}

export class DinoWorld {
  private el: HTMLElement;
  private mode: WorldMode;
  private dark: boolean;
  private cb: Pick<WorldOptions, "onScore" | "onState" | "onSound">;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.5, 300);
  private fog = new THREE.Fog(0xffffff, 28, 90);
  private ambient = new THREE.AmbientLight(0xffffff, 1);
  private sun = new THREE.DirectionalLight(0xffffff, 0.6);

  private mats = {
    ground: new THREE.MeshBasicMaterial(),
    line: new THREE.MeshBasicMaterial(),
    dash: new THREE.MeshBasicMaterial(),
    cloud: new THREE.MeshBasicMaterial(),
    orb: new THREE.MeshBasicMaterial({ fog: false }),
    dino: new THREE.MeshLambertMaterial(),
    cactus: new THREE.MeshLambertMaterial(),
    decor: new THREE.MeshLambertMaterial(),
    eye: new THREE.MeshBasicMaterial(),
    shadow: new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      depthWrite: false,
    }),
  };
  private stars: THREE.Points;

  // dino
  private dino = new THREE.Group();
  private torso = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private dinoShadow: THREE.Mesh;
  private dinoY = 0;
  private vy = 0;
  private grounded = true;
  private ducking = false;
  private duckAmt = 0;
  private runT = 0;
  private dustT = 0;

  // world
  private obstacles: Obstacle[] = [];
  private particles: Particle[] = [];
  private dashes: THREE.Mesh[] = [];
  private clouds: THREE.Group[] = [];
  private speed = 0;
  private score = 0;
  private lastShown = -1;
  private state: GameState = "ready";
  private paused = false;
  private distSince = 0;
  private nextGap = 20;
  private decorTimer = 0;
  private overAt = 0;
  private shake = 0;
  private time = 0;
  private nightT = 0;
  private nightOn = false;
  private nightTimer = 0;
  private nightIdx = 0;

  // loop
  private raf = 0;
  private active = false;
  private last = 0;
  private disposed = false;
  private ro: ResizeObserver;
  private mx = 0;
  private my = 0;
  private smx = 0;
  private smy = 0;
  private camBase = new THREE.Vector3();
  private camTarget = new THREE.Vector3();

  constructor(el: HTMLElement, opts: WorldOptions) {
    this.el = el;
    this.mode = opts.mode;
    this.dark = opts.dark;
    this.cb = {
      onScore: opts.onScore,
      onState: opts.onState,
      onSound: opts.onSound,
    };

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const cv = this.renderer.domElement;
    cv.style.width = "100%";
    cv.style.height = "100%";
    cv.style.display = "block";
    cv.style.touchAction = "none";
    el.appendChild(cv);

    this.scene.fog = this.fog;
    this.scene.add(this.ambient);
    this.sun.position.set(-6, 14, 10);
    this.scene.add(this.sun);

    this.buildWorld();
    this.dinoShadow = new THREE.Mesh(FLAT, this.mats.shadow);
    this.dinoShadow.position.y = 0.04;
    this.scene.add(this.dinoShadow);
    this.buildDino();

    // stars
    const sp = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      sp[i * 3] = (Math.random() - 0.3) * 160;
      sp[i * 3 + 1] = 10 + Math.random() * 40;
      sp[i * 3 + 2] = -60 - Math.random() * 40;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(
      sg,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.45,
        transparent: true,
        fog: false,
        opacity: 0,
      })
    );
    this.scene.add(this.stars);

    this.applyTheme(this.dark);
    this.reset();
    this.resize();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    window.addEventListener("pointermove", this.onPointer, { passive: true });
  }

  /* ───────────── build ───────────── */

  private buildWorld() {
    const m = this.mats;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 320), m.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(60, -0.01, -80);
    this.scene.add(ground);

    for (const z of [-2.9, 3.1]) {
      this.scene.add(box(m.line, 500, 0.03, 0.12, 100, 0.015, z));
    }

    for (let i = 0; i < 70; i++) {
      const len = 0.4 + Math.random() * 1.8;
      const z = (Math.random() - 0.5) * 12 + 0.5;
      const d = box(m.dash, len, 0.03, 0.1, -30 + Math.random() * 120, 0.02, z);
      this.dashes.push(d);
      this.scene.add(d);
    }

    // sun / moon orb
    const orb = box(m.orb, 5, 5, 1, 20, 17, -72);
    this.scene.add(orb);

    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const parts = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < parts; p++) {
        g.add(
          box(
            m.cloud,
            2.5 + Math.random() * 3,
            0.9 + Math.random() * 0.6,
            1.6,
            p * 2.2 - parts,
            (p % 2) * 0.7,
            0
          )
        );
      }
      g.position.set(
        -30 + i * 16 + Math.random() * 8,
        8 + Math.random() * 4,
        -28 - Math.random() * 18
      );
      this.clouds.push(g);
      this.scene.add(g);
    }
  }

  private buildDino() {
    const m = this.mats.dino;
    const t = this.torso;
    t.position.set(0, 1.3, 0);
    t.add(box(m, 1.4, 1.6, 1.4, 0, 0.8, 0)); // body
    t.add(box(m, 1.8, 1.2, 1.3, 0.4, 2.1, 0)); // head
    t.add(box(m, 0.6, 0.3, 1.0, 0.9, 1.4, 0)); // jaw
    t.add(box(m, 1.0, 0.7, 0.7, -1.1, 1.0, 0)); // tail 1
    t.add(box(m, 0.8, 0.5, 0.5, -1.8, 0.7, 0)); // tail 2
    t.add(box(m, 0.5, 0.25, 0.3, 0.95, 0.9, 0.55)); // arm
    t.add(box(m, 0.5, 0.25, 0.3, 0.95, 0.9, -0.55));
    t.add(box(m, 0.3, 0.3, 0.4, -0.6, 1.75, 0)); // spikes
    t.add(box(m, 0.3, 0.3, 0.4, -1.15, 1.45, 0));
    for (const s of [0.68, -0.68]) {
      t.add(box(this.mats.eye, 0.34, 0.34, 0.05, 0.7, 2.4, s));
      t.add(box(m, 0.16, 0.16, 0.06, 0.78, 2.38, s * 1.02));
    }
    this.dino.add(t);

    for (const [leg, z] of [
      [this.legL, 0.38],
      [this.legR, -0.38],
    ] as [THREE.Group, number][]) {
      leg.position.set(-0.1, 1.3, z);
      leg.add(box(m, 0.6, 1.3, 0.6, 0, -0.65, 0));
      leg.add(box(m, 0.5, 0.25, 0.6, 0.2, -1.17, 0));
      this.dino.add(leg);
    }
    this.dino.position.x = DINO_X;
    this.scene.add(this.dino);
  }

  private cactusUnit(mat: THREE.Material, h: number, arms: boolean) {
    const g = new THREE.Group();
    g.add(box(mat, 0.8, h, 0.8, 0, h / 2, 0));
    if (arms) {
      const ay = h * 0.42;
      g.add(box(mat, 0.6, 0.4, 0.5, -0.6, ay, 0));
      g.add(box(mat, 0.4, h * 0.34, 0.5, -0.9, ay - 0.2 + (h * 0.34) / 2, 0));
      const by = h * 0.55;
      g.add(box(mat, 0.6, 0.4, 0.5, 0.6, by, 0));
      g.add(box(mat, 0.4, h * 0.26, 0.5, 0.9, by - 0.2 + (h * 0.26) / 2, 0));
    }
    return g;
  }

  private makeCactus(variant: number, mat: THREE.Material) {
    const g = new THREE.Group();
    let w = 2;
    let h = 2.2;
    const add = (u: THREE.Group, x: number) => {
      u.position.x = x;
      g.add(u);
    };
    switch (variant) {
      case 0:
        add(this.cactusUnit(mat, 2.2, true), 0);
        w = 1.8;
        h = 2.2;
        break;
      case 1:
        add(this.cactusUnit(mat, 2.2, false), -0.85);
        add(this.cactusUnit(mat, 1.8, true), 0.85);
        w = 2.8;
        h = 2.2;
        break;
      case 2:
        add(this.cactusUnit(mat, 3.0, true), 0);
        w = 1.9;
        h = 3.0;
        break;
      case 3:
        add(this.cactusUnit(mat, 1.7, false), -1.2);
        add(this.cactusUnit(mat, 1.8, true), 0);
        add(this.cactusUnit(mat, 1.5, false), 1.2);
        w = 3.5;
        h = 1.8;
        break;
      default:
        add(this.cactusUnit(mat, 3.0, false), -0.45);
        add(this.cactusUnit(mat, 2.6, false), 0.45);
        w = 1.8;
        h = 3.0;
        break;
    }
    return { g, w, h };
  }

  private makeBird() {
    const m = this.mats.cactus;
    const g = new THREE.Group();
    g.add(box(m, 1.4, 0.55, 0.6, 0, 0.3, 0));
    g.add(box(m, 0.55, 0.45, 0.5, -0.85, 0.5, 0));
    g.add(box(m, 0.45, 0.14, 0.2, -1.25, 0.45, 0));
    g.add(box(m, 0.5, 0.3, 0.3, 0.9, 0.25, 0));
    const wa = new THREE.Group();
    wa.position.set(0.1, 0.45, 0);
    wa.add(box(m, 0.9, 0.12, 0.95, 0, 0, 0.5));
    const wb = new THREE.Group();
    wb.position.set(0.1, 0.45, 0);
    wb.add(box(m, 0.9, 0.12, 0.95, 0, 0, -0.5));
    g.add(wa, wb);
    return { g, wings: [wa, wb] as [THREE.Object3D, THREE.Object3D] };
  }

  private spawnObstacle(x: number) {
    const shadow = new THREE.Mesh(FLAT, this.mats.shadow);
    shadow.position.y = 0.04;
    let ob: Obstacle;
    const z = (Math.random() - 0.5) * 0.4;
    if (this.score > 250 && Math.random() < 0.3) {
      const b = this.makeBird();
      const levels = [0.55, 1.6, 2.95];
      const level = levels[Math.floor(Math.random() * levels.length)];
      b.g.position.set(x, level, z);
      shadow.scale.set(1.4, 1, 0.9);
      ob = {
        group: b.g,
        x,
        w: 1.7,
        h: 1.0,
        y0: level - 0.22,
        bird: true,
        decor: false,
        age: 0,
        wings: b.wings,
        shadow,
        phase: Math.random() * 6,
      };
    } else {
      const variant = Math.floor(Math.random() * 5);
      const c = this.makeCactus(variant, this.mats.cactus);
      c.g.position.set(x, 0, z);
      shadow.scale.set(c.w * 0.9, 1, 1.2);
      ob = {
        group: c.g,
        x,
        w: c.w,
        h: c.h,
        y0: 0,
        bird: false,
        decor: false,
        age: 0,
        shadow,
        phase: 0,
      };
    }
    shadow.position.x = x;
    shadow.position.z = z;
    this.scene.add(ob.group, shadow);
    this.obstacles.push(ob);
  }

  private spawnDecor(x: number) {
    const c = this.makeCactus(Math.floor(Math.random() * 5), this.mats.decor);
    const s = 0.8 + Math.random() * 0.8;
    c.g.scale.setScalar(s);
    c.g.position.set(x, 0, -5 - Math.random() * 12);
    this.scene.add(c.g);
    this.obstacles.push({
      group: c.g,
      x,
      w: c.w,
      h: c.h,
      y0: 0,
      bird: false,
      decor: true,
      age: 1,
      phase: 0,
    });
  }

  private gap(speed: number) {
    return speed * (0.95 + Math.random() * 1.15) + 4;
  }

  private clearObstacles() {
    for (const o of this.obstacles) {
      this.scene.remove(o.group);
      if (o.shadow) this.scene.remove(o.shadow);
    }
    this.obstacles = [];
    for (const p of this.particles) this.scene.remove(p.mesh);
    this.particles = [];
  }

  private prefill() {
    this.clearObstacles();
    const sp = BASE_SPEED;
    let x = this.mode === "auto" ? 24 : 36;
    while (x < SPAWN_X) {
      this.spawnObstacle(x);
      x += this.gap(sp) + 4;
    }
    const lastX = this.obstacles[this.obstacles.length - 1]?.x ?? SPAWN_X;
    this.distSince = SPAWN_X - lastX;
    this.nextGap = this.gap(sp) + 4;
    let dx = -20;
    while (dx < SPAWN_X) {
      this.spawnDecor(dx);
      dx += 6 + Math.random() * 14;
    }
    this.decorTimer = 8;
    for (const o of this.obstacles) o.age = 1;
  }

  /* ───────────── theme ───────────── */

  applyTheme(dark: boolean) {
    this.dark = dark;
    const useDarkPalette = dark || this.nightT > 0.5;
    const p = useDarkPalette ? PAL.dark : PAL.light;
    this.scene.background = new THREE.Color(p.bg);
    this.fog.color.set(p.bg);
    this.mats.ground.color.set(p.ground);
    this.mats.line.color.set(p.line);
    this.mats.dash.color.set(p.dash);
    this.mats.cloud.color.set(p.cloud);
    this.mats.orb.color.set(p.orb);
    this.mats.dino.color.set(p.dino);
    this.mats.cactus.color.set(p.cactus);
    this.mats.decor.color.set(p.decor);
    this.mats.eye.color.set(p.eye);
    this.mats.shadow.opacity = p.shadow;
    this.ambient.intensity = p.ambient;
    this.sun.intensity = p.dir;
    (this.stars.material as THREE.PointsMaterial).opacity = useDarkPalette ? 0.85 : 0;
  }

  /* ───────────── control ───────────── */

  reset() {
    this.score = 0;
    this.lastShown = -1;
    this.speed = this.mode === "auto" ? 15 : 0;
    this.dinoY = 0;
    this.vy = 0;
    this.grounded = true;
    this.ducking = false;
    this.duckAmt = 0;
    this.shake = 0;
    this.paused = false;
    this.nightT = 0;
    this.nightOn = false;
    this.nightTimer = 0;
    this.nightIdx = 0;
    this.applyTheme(this.dark);
    this.state = this.mode === "auto" ? "running" : "ready";
    this.prefill();
    this.emitScore();
    this.cb.onState?.(this.state);
    this.draw();
  }

  getState() {
    return this.state;
  }

  togglePause() {
    if (this.state === "running") {
      this.paused = true;
      this.state = "paused";
      this.cb.onState?.("paused");
    } else if (this.state === "paused") {
      this.paused = false;
      this.state = "running";
      this.cb.onState?.("running");
    }
  }

  start() {
    if (this.mode !== "play") return;
    if (this.state === "over" && this.time - this.overAt < 0.45) return;
    if (this.state !== "running") {
      this.reset();
      this.state = "running";
      this.speed = BASE_SPEED;
      this.cb.onState?.("running");
    }
  }

  jump() {
    if (this.mode !== "play") return;
    if (this.state !== "running") {
      this.start();
      if (this.getState() !== "running") return;
    }
    if (this.grounded) {
      this.vy = JUMP_V;
      this.grounded = false;
      this.cb.onSound?.("jump");
    }
  }

  setDuck(on: boolean) {
    if (this.mode !== "play") return;
    this.ducking = on;
  }

  setActive(on: boolean) {
    if (this.disposed || on === this.active) return;
    this.active = on;
    if (on) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else {
      cancelAnimationFrame(this.raf);
    }
  }

  /* ───────────── loop ───────────── */

  private loop = (now: number) => {
    if (!this.active || this.disposed) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.step(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private onPointer = (e: PointerEvent) => {
    this.mx = (e.clientX / window.innerWidth) * 2 - 1;
    this.my = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private emitScore() {
    const s = Math.floor(this.score);
    if (s !== this.lastShown) {
      if (
        this.mode === "play" &&
        s > 0 &&
        s % 100 === 0 &&
        this.state === "running"
      ) {
        this.cb.onSound?.("milestone");
      }
      this.lastShown = s;
      this.cb.onScore?.(s);
    }
  }

  private autopilot() {
    let shouldDuck = false;
    let shouldJump = false;
    for (const o of this.obstacles) {
      if (o.decor) continue;
      const dx = o.x - (DINO_X + 0.3);
      if (o.bird) {
        if (dx < 9 && dx > -2.2) shouldDuck = true;
      } else if (dx > 0 && dx <= this.speed * 0.355) {
        shouldJump = true;
      }
    }
    this.ducking = shouldDuck && this.grounded;
    if (shouldJump && this.grounded && !shouldDuck) {
      this.vy = JUMP_V;
      this.grounded = false;
    }
  }

  private emit(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    life: number,
    mat: THREE.Material
  ) {
    const mesh = new THREE.Mesh(BOX, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(size);
    this.scene.add(mesh);
    this.particles.push({ mesh, vx, vy, vz, life, max: life, size });
  }

  private step(dt: number) {
    if (this.paused) return;
    this.time += dt;
    const moving = this.state === "running";

    if (moving) {
      // Match the original DINO 3D runner: steady acceleration and distance-based score.
      this.speed = Math.min(MAX_SPEED, this.speed + 0.12 * dt);
      this.score += dt * this.speed;
      const nightIndex = Math.floor(this.score / 700);
      if (nightIndex > this.nightIdx) {
        this.nightIdx = nightIndex;
        this.nightOn = true;
        this.nightTimer = 16;
      }
      if (this.nightOn) {
        this.nightTimer -= dt;
        if (this.nightTimer <= 0) this.nightOn = false;
      }
      const nightTarget = this.nightOn ? 1 : 0;
      const previousNight = this.nightT;
      this.nightT += Math.sign(nightTarget - this.nightT) * Math.min(Math.abs(nightTarget - this.nightT), dt * 1.1);
      if (previousNight !== this.nightT) this.applyTheme(this.dark);
      this.emitScore();
      if (this.mode === "auto") this.autopilot();
    } else {
      this.speed = 0;
    }

    // physics
    const wasAir = !this.grounded;
    if (!this.grounded) {
      const g = this.ducking ? GRAVITY * 2.8 : GRAVITY;
      this.vy -= g * dt;
      this.dinoY += this.vy * dt;
      if (this.dinoY <= 0) {
        this.dinoY = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }
    if (wasAir && this.grounded && moving) {
      for (let i = 0; i < 6; i++) {
        this.emit(
          DINO_X + 0.2,
          0.15,
          (Math.random() - 0.5) * 1.2,
          -2 - Math.random() * 3,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 3,
          0.3,
          0.45,
          this.mats.dash
        );
      }
    }

    // obstacles & ground
    const sp = this.speed;
    for (const o of this.obstacles) {
      o.x -= sp * dt;
      o.group.position.x = o.x;
      if (!o.decor) {
        o.age += dt;
        const k = Math.min(1, o.age * 2.5 + 0.001);
        o.group.scale.y = k;
        if (o.shadow) {
          o.shadow.position.x = o.x;
          o.shadow.scale.y = 1;
        }
        if (o.bird) {
          o.group.position.y = o.y0 + Math.sin(this.time * 4 + o.phase) * 0.12;
          const f = Math.sin(this.time * 16 + o.phase) * 0.75;
          o.wings![0].rotation.x = -f;
          o.wings![1].rotation.x = f;
        }
      }
    }
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (o.x < DESPAWN_X) {
        this.scene.remove(o.group);
        if (o.shadow) this.scene.remove(o.shadow);
        this.obstacles.splice(i, 1);
      }
    }
    for (const d of this.dashes) {
      d.position.x -= sp * dt;
      if (d.position.x < -30) {
        d.position.x += 120;
        d.position.z = (Math.random() - 0.5) * 12 + 0.5;
      }
    }
    for (const c of this.clouds) {
      c.position.x -= (0.8 + sp * 0.05) * dt;
      if (c.position.x < -50) c.position.x += 130;
    }

    if (moving) {
      this.distSince += sp * dt;
      if (this.distSince >= this.nextGap) {
        this.spawnObstacle(SPAWN_X);
        this.distSince = 0;
        this.nextGap = this.gap(sp) + 2;
      }
      this.decorTimer -= sp * dt;
      if (this.decorTimer <= 0) {
        this.spawnDecor(SPAWN_X + Math.random() * 8);
        this.decorTimer = 6 + Math.random() * 14;
      }
    }

    // collision (play)
    if (this.mode === "play" && moving) {
      const low = this.ducking && this.grounded;
      const top = this.dinoY + (low ? 2.0 : 3.9);
      const bottom = this.dinoY;
      for (const o of this.obstacles) {
        if (o.decor) continue;
        const hw = o.w / 2 + 0.75 - 0.2;
        if (Math.abs(o.x - (DINO_X + 0.3)) < hw) {
          if (bottom < o.y0 + o.h - 0.25 && top > o.y0 + 0.1) {
            this.die();
            break;
          }
        }
      }
    }

    // dust trail
    if (moving && this.grounded) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.07;
        this.emit(
          DINO_X - 0.4,
          0.12,
          (Math.random() - 0.5) * 0.8,
          -sp * 0.12 - Math.random(),
          0.8 + Math.random() * 1.2,
          (Math.random() - 0.5) * 1.2,
          0.22,
          0.42,
          this.mats.dash
        );
      }
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 18 * dt;
      p.mesh.position.x += (p.vx - sp * 0.9) * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(p.size * (p.life / p.max));
    }

    // dino pose
    if (moving) this.runT += dt * (this.ducking ? 20 : 15);
    const duckTarget = this.ducking ? 1 : 0;
    this.duckAmt += (duckTarget - this.duckAmt) * Math.min(1, dt * 18);
    const swing = moving && this.grounded ? Math.sin(this.runT) * 0.75 : 0;
    const air = !this.grounded ? 0.5 : 0;
    this.legL.rotation.z = swing + air;
    this.legR.rotation.z = -swing - air * 0.4;
    const bob =
      moving && this.grounded
        ? Math.abs(Math.cos(this.runT)) * 0.1
        : state0(this.state, this.time) * 0.04;
    this.torso.position.y = 1.3 + bob;
    this.torso.rotation.z =
      -1.15 * this.duckAmt + (this.state === "over" ? 0.12 : 0);
    this.dino.position.y = this.dinoY;
    const sc = Math.max(0.3, 1 - this.dinoY / 9);
    this.dinoShadow.position.x = DINO_X + 0.2;
    this.dinoShadow.scale.set(2.8 * sc, 1, 1.5 * sc);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
  }

  private die() {
    this.state = "over";
    this.overAt = this.time;
    this.shake = 0.35;
    this.speed = 0;
    this.cb.onSound?.("die");
    for (let i = 0; i < 16; i++) {
      this.emit(
        DINO_X + 0.3 + (Math.random() - 0.5),
        1 + Math.random() * 3,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.3) * 10,
        4 + Math.random() * 8,
        (Math.random() - 0.5) * 8,
        0.4 + Math.random() * 0.3,
        0.9 + Math.random() * 0.5,
        this.mats.dino
      );
    }
    this.cb.onState?.("over");
  }

  private draw() {
    this.smx += (this.mx - this.smx) * 0.05;
    this.smy += (this.my - this.smy) * 0.05;
    const sh = this.shake > 0 ? this.shake : 0;
    this.camera.position.set(
      this.camBase.x + this.smx * 1.2 + (Math.random() - 0.5) * sh * 1.6,
      this.camBase.y - this.smy * 0.5 + (Math.random() - 0.5) * sh * 1.6,
      this.camBase.z
    );
    this.camera.lookAt(this.camTarget);
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (w < 2 || h < 2) return;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    const k = Math.min(2, Math.max(1, 1.7 / aspect));
    this.camBase.set(-1, 3.6 + (k - 1) * 1.5, 14 * k);
    this.camera.position.copy(this.camBase);
    this.camera.updateProjectionMatrix();

    // aim camera so the dino sits at ~ 22% from the left edge
    const probe = new THREE.Vector3(DINO_X + 0.3, 2, 0);
    let lo = -6;
    let hi = 40;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      this.camTarget.set(mid, 2.2, 0);
      this.camera.lookAt(this.camTarget);
      this.camera.updateMatrixWorld(true);
      const ndc = probe.clone().project(this.camera);
      if (ndc.x > -0.56) lo = mid;
      else hi = mid;
    }
    this.camTarget.set((lo + hi) / 2, 2.2, 0);
    this.draw();
  }

  dispose() {
    this.disposed = true;
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("pointermove", this.onPointer);
    this.ro.disconnect();
    this.clearObstacles();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function state0(state: GameState, t: number) {
  return state === "running" ? 0 : Math.sin(t * 3);
}
