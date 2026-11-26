import * as THREE from "three";

export type GameState = "ready" | "playing" | "over";

export interface GameCallbacks {
  onState: (s: GameState) => void;
  onScore: (score: number, hi: number, visible: boolean) => void;
  isActive?: () => boolean;
  onPause?: (paused: boolean) => void;
  onMute?: (muted: boolean) => void;
}

const DAY_BG = new THREE.Color("#f7f7f7");
const DAY_FG = new THREE.Color("#535353");
const NIGHT_BG = new THREE.Color("#1e1f23");
const NIGHT_FG = new THREE.Color("#b9b9b9");

const GRAVITY = 58;
const JUMP_V = 19.5;
const START_SPEED = 11;
const MAX_SPEED = 25;
const ACCEL = 0.12;
const SPAWN_X = 58;
const HI_KEY = "dino3d-hi";

interface Obstacle {
  kind: "cactus" | "bird";
  group: THREE.Group;
  x: number;
  hw: number; // half width
  y0: number;
  y1: number;
  vx: number; // extra speed offset
  wings?: THREE.Group[];
  phase?: number;
}

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export class Game {
  private container: HTMLElement;
  private cb: GameCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private box = new THREE.BoxGeometry(1, 1, 1);
  private raf = 0;
  private lastTime = 0;
  private disposed = false;
  private ro: ResizeObserver;

  // materials
  private objMat = new THREE.MeshLambertMaterial({ color: DAY_FG });
  private softMat = new THREE.MeshLambertMaterial({ color: "#aaa" });
  private bgMat = new THREE.MeshBasicMaterial({ color: DAY_BG });
  private pebbleMat = new THREE.MeshBasicMaterial({ color: "#999" });
  private cloudMat = new THREE.MeshBasicMaterial({ color: "#ddd" });
  private hillMat = new THREE.MeshBasicMaterial({ color: "#ddd" });
  private starMat = new THREE.MeshBasicMaterial({
    color: DAY_FG,
    transparent: true,
    opacity: 0,
    fog: false,
  });
  private moonMat = new THREE.MeshBasicMaterial({
    color: DAY_FG,
    transparent: true,
    opacity: 0,
    fog: false,
  });
  private ambient: THREE.AmbientLight;
  private sun: THREE.DirectionalLight;

  // dino parts
  private dino = new THREE.Group();
  private upper = new THREE.Group();
  private headG = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private pupils: THREE.Mesh[] = [];
  private xEyes: THREE.Group[] = [];

  // world
  private pebbles: THREE.Mesh[] = [];
  private clouds: THREE.Group[] = [];
  private hills: THREE.Group[] = [];
  private stars: THREE.Mesh[] = [];
  private sceneryCacti: THREE.Group[] = [];
  private moon: THREE.Mesh;
  private obstacles: Obstacle[] = [];

  // state
  state: GameState = "ready";
  private time = 0;
  private speed = START_SPEED;
  private dist = 0;
  private score = 0;
  private hi = 0;
  private gapRemain = 22;
  private dy = 0;
  private vy = 0;
  private onGround = true;
  private duckHeld = false;
  private duckAmt = 0;
  private runPhase = 0;
  private nightT = 0;
  private nightOn = false;
  private nightTimer = 0;
  private nightIdx = 0;
  private lastMilestone = 0;
  private flashTimer = 0;
  private deadAt = 0;
  private shake = 0;
  private paused = false;

  // audio
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor(container: HTMLElement, cb: GameCallbacks) {
    this.container = container;
    this.cb = cb;
    this.hi = Number(localStorage.getItem(HI_KEY) || 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    container.appendChild(canvas);

    this.scene.background = DAY_BG.clone();
    this.scene.fog = new THREE.Fog(DAY_BG.clone(), 22, 78);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.62);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sun.position.set(14, 15, 9);
    this.sun.target.position.set(8, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -32;
    sc.right = 32;
    sc.top = 32;
    sc.bottom = -32;
    sc.near = 1;
    sc.far = 60;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);

    // moon
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 16), this.moonMat);
    this.moon.position.set(24, 13, -34);
    this.scene.add(this.moon);

    this.buildGround();
    this.buildDino();
    this.buildScenery();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);

    this.applyTheme();
    this.emitScore();
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ------------------------------------------------------------------ */
  /* Building helpers                                                    */
  /* ------------------------------------------------------------------ */

  private part(
    parent: THREE.Object3D,
    mat: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    cast = true
  ) {
    const m = new THREE.Mesh(this.box, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    m.castShadow = cast;
    parent.add(m);
    return m;
  }

  private buildGround() {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 160),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(150, 0, 0);
    plane.receiveShadow = true;
    this.scene.add(plane);

    // horizon lines of the track
    for (const z of [-1.7, 1.7]) {
      const line = new THREE.Mesh(this.box, this.pebbleMat);
      line.scale.set(500, 0.04, 0.09);
      line.position.set(150, 0.02, z);
      this.scene.add(line);
    }

    // pebbles / bumps
    for (let i = 0; i < 170; i++) {
      const p = new THREE.Mesh(this.box, this.pebbleMat);
      this.randomizePebble(p, -30 + Math.random() * 110);
      this.scene.add(p);
      this.pebbles.push(p);
    }
  }

  private randomizePebble(p: THREE.Mesh, x: number) {
    const w = 0.15 + Math.random() * 0.55;
    p.scale.set(w, 0.04 + Math.random() * 0.05, 0.08 + Math.random() * 0.1);
    let z = -9 + Math.random() * 15;
    // keep many of them close to the lane, like Chrome's ground specks
    if (Math.random() < 0.55) z = -1.3 + Math.random() * 3.4;
    p.position.set(x, 0.03, z);
  }

  private buildDino() {
    const { objMat, bgMat } = this;
    const root = this.dino;
    const upper = this.upper;
    // pivot of the body tilt (hip)
    upper.position.set(-0.15, 0.6, 0);
    root.add(upper);
    const U = (
      parent: THREE.Object3D,
      mat: THREE.Material,
      sx: number,
      sy: number,
      sz: number,
      x: number,
      y: number,
      z: number
    ) => this.part(parent, mat, sx, sy, sz, x + 0.15, y - 0.6, z);

    // body + arms + tail
    U(upper, objMat, 0.9, 0.9, 0.65, -0.15, 0.95, 0);
    U(upper, objMat, 0.3, 0.35, 0.42, -0.75, 1.15, 0);
    U(upper, objMat, 0.3, 0.27, 0.32, -1.0, 1.3, 0);
    U(upper, objMat, 0.25, 0.2, 0.22, -1.22, 1.45, 0);
    for (const s of [1, -1]) {
      U(upper, objMat, 0.26, 0.1, 0.1, 0.36, 1.12, s * 0.33);
      U(upper, objMat, 0.1, 0.16, 0.1, 0.46, 1.06, s * 0.33);
    }

    // neck + head group (moves forward/down when ducking)
    const hg = this.headG;
    upper.add(hg);
    U(hg, objMat, 0.5, 0.7, 0.55, 0.05, 1.55, 0);
    U(hg, objMat, 1.0, 0.6, 0.6, 0.3, 2.0, 0);
    // mouth slit
    U(hg, bgMat, 0.34, 0.035, 0.625, 0.62, 1.84, 0);
    for (const s of [1, -1]) {
      U(hg, bgMat, 0.19, 0.19, 0.02, 0.4, 2.15, s * 0.305);
      const pupil = U(hg, objMat, 0.09, 0.09, 0.02, 0.44, 2.15, s * 0.316);
      pupil.castShadow = false;
      this.pupils.push(pupil);
      // dead eye (X)
      const xg = new THREE.Group();
      xg.position.set(0.4 + 0.15, 2.15 - 0.6, s * 0.32);
      for (const r of [Math.PI / 4, -Math.PI / 4]) {
        const bar = new THREE.Mesh(this.box, objMat);
        bar.scale.set(0.24, 0.05, 0.02);
        bar.rotation.z = r;
        xg.add(bar);
      }
      xg.visible = false;
      hg.add(xg);
      this.xEyes.push(xg);
    }

    // legs
    for (const [leg, z] of [
      [this.legL, 0.17],
      [this.legR, -0.17],
    ] as [THREE.Group, number][]) {
      leg.position.set(-0.2, 0.6, z);
      this.part(leg, objMat, 0.26, 0.6, 0.24, 0, -0.3, 0);
      this.part(leg, objMat, 0.42, 0.12, 0.24, 0.08, -0.54, 0);
      root.add(leg);
    }

    root.position.set(0, 0, 0);
    this.scene.add(root);
  }

  private makeCactus(n: number, large: boolean, soft = false) {
    const g = new THREE.Group();
    const mat = soft ? this.softMat : this.objMat;
    for (let i = 0; i < n; i++) {
      const h = (large ? 2.0 : 1.3) * (0.9 + Math.random() * 0.2);
      const tw = large ? 0.5 : 0.38;
      const cx = (i - (n - 1) / 2) * 0.95;
      this.part(g, mat, tw, h, tw, cx, h / 2, 0);
      this.part(g, mat, tw - 0.12, 0.14, tw - 0.12, cx, h + 0.06, 0);
      const armL = Math.random() < 0.85;
      const armR = Math.random() < 0.7 || !armL;
      if (armL) {
        const ay = h * 0.45;
        this.part(g, mat, 0.34, 0.17, 0.2, cx - tw / 2 - 0.12, ay, 0);
        this.part(g, mat, 0.17, h * 0.3, 0.2, cx - tw / 2 - 0.24, ay + h * 0.15 - 0.08, 0);
      }
      if (armR) {
        const ay = h * 0.58;
        this.part(g, mat, 0.34, 0.17, 0.2, cx + tw / 2 + 0.12, ay, 0);
        this.part(g, mat, 0.17, h * 0.24, 0.2, cx + tw / 2 + 0.24, ay + h * 0.12 - 0.08, 0);
      }
    }
    return g;
  }

  private makeBird() {
    const g = new THREE.Group();
    const m = this.objMat;
    // faces -x
    this.part(g, m, 0.95, 0.42, 0.42, 0, 0, 0);
    this.part(g, m, 0.45, 0.32, 0.32, -0.62, 0.1, 0);
    this.part(g, m, 0.55, 0.1, 0.12, -1.05, 0.06, 0);
    this.part(g, m, 0.18, 0.2, 0.14, -0.45, 0.32, 0); // crest
    this.part(g, m, 0.55, 0.13, 0.2, 0.7, -0.02, 0);
    this.part(g, m, 0.25, 0.1, 0.1, 1.05, 0.0, 0);
    const eye = this.part(g, this.bgMat, 0.08, 0.08, 0.34, -0.6, 0.15, 0, false);
    eye.castShadow = false;
    const wings: THREE.Group[] = [];
    for (const s of [1, -1]) {
      const w = new THREE.Group();
      w.position.set(0.0, 0.18, 0);
      this.part(w, m, 0.7, 0.07, 0.9, 0.05, 0, s * 0.5);
      this.part(w, m, 0.4, 0.07, 0.5, 0.2, 0, s * 1.15);
      g.add(w);
      wings.push(w);
    }
    return { g, wings };
  }

  private buildScenery() {
    // clouds
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      const parts = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < parts; k++) {
        const w = 1.6 + Math.random() * 1.8;
        this.part(c, this.cloudMat, w, 0.45 + Math.random() * 0.4, 1.2, k * 1.6 - parts * 0.8, Math.random() * 0.5, 0, false);
      }
      c.position.set(-20 + Math.random() * 110, 6 + Math.random() * 6, -6 - Math.random() * 20);
      this.scene.add(c);
      this.clouds.push(c);
    }
    // hills (stepped pixel mountains)
    for (let i = 0; i < 8; i++) {
      const h = new THREE.Group();
      const base = 8 + Math.random() * 10;
      const height = 3 + Math.random() * 4;
      const steps = 5;
      for (let s = 0; s < steps; s++) {
        const k = 1 - s / steps;
        this.part(h, this.hillMat, base * k, height / steps, 6, 0, (s + 0.5) * (height / steps), 0, false);
      }
      h.position.set(-50 + i * 24 + Math.random() * 10, 0, -32 - Math.random() * 14);
      this.scene.add(h);
      this.hills.push(h);
    }
    // stars
    for (let i = 0; i < 55; i++) {
      const s = new THREE.Mesh(this.box, this.starMat);
      const sz = 0.1 + Math.random() * 0.14;
      s.scale.set(sz, sz, sz);
      s.position.set(-30 + Math.random() * 110, 5 + Math.random() * 14, -18 - Math.random() * 20);
      this.scene.add(s);
      this.stars.push(s);
    }
    // decorative cacti beside the lane
    for (let i = 0; i < 16; i++) {
      const c = this.makeCactus(1 + Math.floor(Math.random() * 2), Math.random() < 0.4, true);
      const back = Math.random() < 0.8;
      c.position.set(-25 + Math.random() * 100, 0, back ? -(3.5 + Math.random() * 9) : 3 + Math.random() * 1.5);
      c.scale.setScalar(0.85 + Math.random() * 0.3);
      this.scene.add(c);
      this.sceneryCacti.push(c);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                               */
  /* ------------------------------------------------------------------ */

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.cb.isActive && !this.cb.isActive()) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      if (!e.repeat) this.pressJump();
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      e.preventDefault();
      this.setDuck(true);
    } else if (e.code === "Enter") {
      if (this.state === "over") this.pressJump();
    } else if (e.code === "KeyP" || e.code === "Escape") {
      this.togglePause();
    } else if (e.code === "KeyM") {
      this.setMuted(!this.muted);
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    if (this.cb.isActive && !this.cb.isActive()) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") this.releaseJump();
    else if (e.code === "ArrowDown" || e.code === "KeyS") this.setDuck(false);
  };
  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    this.pressJump();
  };
  private onPointerUp = () => this.releaseJump();
  private onBlur = () => {
    this.duckHeld = false;
    if (this.state === "playing") {
      this.paused = true;
      this.cb.onPause?.(true);
    }
  };

  pressJump() {
    this.ensureAudio();
    if (this.paused) {
      this.paused = false;
      this.cb.onPause?.(false);
      return;
    }
    if (this.state === "over") {
      if (performance.now() - this.deadAt > 450) this.restart();
      return;
    }
    if (this.state === "ready") {
      this.state = "playing";
      this.cb.onState("playing");
    }
    if (this.onGround) {
      this.vy = JUMP_V;
      this.onGround = false;
      this.beep(520, 900, 0.13, "square", 0.06);
    }
  }

  releaseJump() {
    if (this.vy > 7) this.vy = 7;
  }

  setDuck(v: boolean) {
    this.duckHeld = v;
  }

  togglePause() {
    if (this.state === "playing") {
      this.paused = !this.paused;
      this.cb.onPause?.(this.paused);
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.cb.onMute?.(m);
  }

  private restart() {
    for (const o of this.obstacles) this.scene.remove(o.group);
    this.obstacles = [];
    this.speed = START_SPEED;
    this.dist = 0;
    this.score = 0;
    this.gapRemain = 22;
    this.dy = 0;
    this.vy = 0;
    this.onGround = true;
    this.lastMilestone = 0;
    this.flashTimer = 0;
    this.nightIdx = 0;
    this.nightOn = false;
    this.nightTimer = 0;
    this.shake = 0;
    for (const x of this.xEyes) x.visible = false;
    for (const p of this.pupils) p.visible = true;
    this.state = "playing";
    this.cb.onState("playing");
    this.vy = JUMP_V * 0.0;
    this.emitScore();
  }

  /* ------------------------------------------------------------------ */
  /* Audio                                                               */
  /* ------------------------------------------------------------------ */

  private ensureAudio() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  private beep(f0: number, f1: number, dur: number, type: OscillatorType = "square", vol = 0.06, delay = 0) {
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* ------------------------------------------------------------------ */
  /* Loop                                                                */
  /* ------------------------------------------------------------------ */

  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (!this.paused) this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    this.time += dt;
    const playing = this.state === "playing";
    let scroll = 0;

    if (playing) {
      this.speed = Math.min(MAX_SPEED, this.speed + ACCEL * dt);
      scroll = this.speed * dt;
      this.dist += scroll;
      this.score = this.dist;

      // dino physics
      if (!this.onGround) {
        const g = this.duckHeld ? GRAVITY * 2.8 : GRAVITY;
        this.vy -= g * dt;
        this.dy += this.vy * dt;
        if (this.dy <= 0) {
          this.dy = 0;
          this.vy = 0;
          this.onGround = true;
          this.beep(140, 90, 0.05, "triangle", 0.05);
        }
      }

      // night cycle
      const idx = Math.floor(this.score / 700);
      if (idx > this.nightIdx) {
        this.nightIdx = idx;
        this.nightOn = true;
        this.nightTimer = 16;
      }
      if (this.nightOn) {
        this.nightTimer -= dt;
        if (this.nightTimer <= 0) this.nightOn = false;
      }

      // milestones
      const ms = Math.floor(this.score / 100);
      if (ms > this.lastMilestone) {
        this.lastMilestone = ms;
        this.flashTimer = 1.0;
        this.beep(880, 880, 0.09, "square", 0.05);
        this.beep(1180, 1180, 0.12, "square", 0.05, 0.1);
      }

      this.updateObstacles(dt, scroll);
    }

    // theme
    const target = this.nightOn ? 1 : 0;
    const prev = this.nightT;
    this.nightT += Math.sign(target - this.nightT) * Math.min(Math.abs(target - this.nightT), dt * 1.1);
    if (prev !== this.nightT || this.time < 0.1) this.applyTheme();

    // world scrolling
    this.scrollWorld(scroll, dt);
    this.animateDino(dt, playing);
    this.updateCamera(dt);

    // HUD
    if (this.flashTimer > 0) this.flashTimer -= dt;
    const flashHidden = this.flashTimer > 0 && Math.floor(this.flashTimer / 0.14) % 2 === 1;
    this.emitScore(!flashHidden);
  }

  private emitScore(visible = true) {
    this.cb.onScore(Math.floor(this.score * 1), this.hi, visible);
  }

  private applyTheme() {
    const t = this.nightT;
    const bg = DAY_BG.clone().lerp(NIGHT_BG, t);
    const fg = DAY_FG.clone().lerp(NIGHT_FG, t);
    (this.scene.background as THREE.Color).copy(bg);
    (this.scene.fog as THREE.Fog).color.copy(bg);
    this.objMat.color.copy(fg);
    this.bgMat.color.copy(bg);
    this.softMat.color.copy(bg.clone().lerp(fg, 0.28));
    this.pebbleMat.color.copy(bg.clone().lerp(fg, 0.5));
    this.cloudMat.color.copy(bg.clone().lerp(fg, 0.1 + 0.05 * t));
    this.hillMat.color.copy(bg.clone().lerp(fg, 0.07 + 0.03 * t));
    this.starMat.color.copy(fg);
    this.starMat.opacity = t;
    this.moonMat.color.copy(fg);
    this.moonMat.opacity = t;
    this.ambient.intensity = 0.62 + 0.05 * t;
    this.sun.intensity = 1.0 - 0.3 * t;
    const c = this.container;
    c.style.setProperty("--fg", "#" + fg.getHexString());
    c.style.setProperty("--bg", "#" + bg.getHexString());
    c.style.backgroundColor = "#" + bg.getHexString();
  }

  private scrollWorld(scroll: number, dt: number) {
    const driftBase = 0.6 * dt;
    for (const p of this.pebbles) {
      p.position.x -= scroll;
      if (p.position.x < -30) this.randomizePebble(p, p.position.x + 110);
    }
    for (const c of this.sceneryCacti) {
      c.position.x -= scroll;
      if (c.position.x < -30) c.position.x += 105 + Math.random() * 10;
    }
    for (const c of this.clouds) {
      c.position.x -= driftBase + scroll * 0.1;
      if (c.position.x < -35) c.position.x += 130;
    }
    for (const h of this.hills) {
      h.position.x -= scroll * 0.06 + dt * 0.1;
      if (h.position.x < -70) h.position.x += 220;
    }
    for (const s of this.stars) {
      s.position.x -= scroll * 0.03 + dt * 0.15;
      if (s.position.x < -40) s.position.x += 120;
    }
    this.moon.position.x -= dt * 0.05;
    if (this.moon.position.x < 10) this.moon.position.x = 30;
  }

  private animateDino(dt: number, playing: boolean) {
    const dead = this.state === "over";
    const duckTarget = playing && this.duckHeld && this.onGround ? 1 : 0;
    this.duckAmt += (duckTarget - this.duckAmt) * Math.min(1, dt * 22);
    const d = this.duckAmt;

    let lift = 0;
    let liftOther = 0;
    if (playing && this.onGround) {
      this.runPhase += dt * (9 + this.speed * 0.45);
      const s = Math.sin(this.runPhase);
      lift = Math.max(0, s) * 0.24;
      liftOther = Math.max(0, -s) * 0.24;
    }
    this.legL.position.y = 0.6 - 0.26 * d + lift;
    this.legR.position.y = 0.6 - 0.26 * d + liftOther;
    this.legL.scale.y = this.legR.scale.y = 1 - 0.43 * d;

    const bob = playing && this.onGround ? Math.abs(Math.sin(this.runPhase)) * 0.03 : 0;
    this.upper.position.y = 0.6 - 0.26 * d + bob;
    this.upper.rotation.z = -0.2 * d;
    this.headG.position.set(0.4 * d, -0.9 * d, 0);
    this.headG.rotation.z = 0.2 * d;

    this.dino.position.y = this.dy;
    // slight lean while jumping
    this.dino.rotation.z = this.onGround ? 0 : THREE.MathUtils.clamp(-this.vy * 0.004, -0.08, 0.08);

    if (dead) {
      for (const x of this.xEyes) x.visible = true;
      for (const p of this.pupils) p.visible = false;
    }
    // idle breathing when waiting
    if (this.state === "ready") {
      this.upper.position.y = 0.6 + Math.sin(this.time * 3) * 0.015;
    }
  }

  private updateCamera(dt: number) {
    const aspect = this.camera.aspect;
    const scale = Math.max(1, 1.75 / aspect);
    const look = new THREE.Vector3(8.5, 1.3 + this.dy * 0.15, 0);
    const base = new THREE.Vector3(-2.8, 3.7, 10.2);
    const pos = look.clone().add(base.clone().sub(new THREE.Vector3(8.5, 1.3, 0)).multiplyScalar(scale));
    pos.y += Math.sin(this.time * 0.6) * 0.04;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.2);
      pos.x += (Math.random() - 0.5) * this.shake * 0.5;
      pos.y += (Math.random() - 0.5) * this.shake * 0.5;
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
  }

  /* ------------------------------------------------------------------ */
  /* Obstacles                                                           */
  /* ------------------------------------------------------------------ */

  private updateObstacles(dt: number, scroll: number) {
    this.gapRemain -= scroll;
    if (this.gapRemain <= 0) this.spawn();

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= scroll + o.vx * dt;
      o.group.position.x = o.x;
      if (o.kind === "bird" && o.wings) {
        o.phase = (o.phase ?? 0) + dt * 16;
        const a = Math.sin(o.phase) * 0.75;
        o.wings[0].rotation.x = -a;
        o.wings[1].rotation.x = a;
        // wings are mirrored in z, so flapping is symmetric
      }
      if (o.x < -12) {
        this.scene.remove(o.group);
        this.obstacles.splice(i, 1);
      }
    }

    if (this.checkCollision()) this.die();
  }

  private spawn() {
    const canBird = this.score > 250 && Math.random() < 0.3;
    let width: number;
    if (canBird) {
      const { g, wings } = this.makeBird();
      const levels = [0.55, 1.6, 2.95];
      const lvl = levels[Math.floor(Math.random() * levels.length)];
      g.position.set(SPAWN_X, lvl, 0);
      g.rotation.y = 0;
      this.scene.add(g);
      this.obstacles.push({
        kind: "bird",
        group: g,
        x: SPAWN_X,
        hw: 0.95,
        y0: lvl - 0.22,
        y1: lvl + 0.32,
        vx: 2.2,
        wings,
        phase: Math.random() * 6,
      });
      width = 2;
    } else {
      const maxN = this.score > 400 ? 3 : this.score > 120 ? 2 : 1;
      const n = 1 + Math.floor(Math.random() * maxN);
      const large = Math.random() < 0.45;
      const g = this.makeCactus(n, large);
      g.position.set(SPAWN_X, 0, 0);
      this.scene.add(g);
      const hw = (n - 1) * 0.475 + (large ? 0.5 : 0.42);
      this.obstacles.push({
        kind: "cactus",
        group: g,
        x: SPAWN_X,
        hw,
        y0: 0,
        y1: (large ? 2.0 : 1.3) * 1.05 + 0.1,
        vx: 0,
      });
      width = hw * 2;
    }
    this.gapRemain = width + this.speed * (0.95 + Math.random() * 1.15);
  }

  private dinoBoxes(): Box[] {
    const s = 0.1;
    const y = this.dy;
    if (this.duckAmt > 0.5) {
      return [{ x0: -0.6 + s, x1: 1.25 - s, y0: y + 0.05, y1: y + 1.15 - s }];
    }
    return [
      { x0: -0.6 + s, x1: 0.3, y0: y + 0.05, y1: y + 1.45 - s },
      { x0: -0.1, x1: 0.8 - s, y0: y + 1.2, y1: y + 2.3 - s },
    ];
  }

  private checkCollision() {
    const s = 0.08;
    const boxes = this.dinoBoxes();
    for (const o of this.obstacles) {
      if (o.x > 4 || o.x < -4) continue;
      const ob: Box = { x0: o.x - o.hw + s, x1: o.x + o.hw - s, y0: o.y0 + s, y1: o.y1 - s };
      for (const b of boxes) {
        if (b.x0 < ob.x1 && b.x1 > ob.x0 && b.y0 < ob.y1 && b.y1 > ob.y0) return true;
      }
    }
    return false;
  }

  private die() {
    this.state = "over";
    this.deadAt = performance.now();
    this.shake = 1;
    this.flashTimer = 0;
    const final = Math.floor(this.score);
    if (final > this.hi) {
      this.hi = final;
      try {
        localStorage.setItem(HI_KEY, String(final));
      } catch {
        /* ignore */
      }
    }
    this.beep(320, 110, 0.18, "square", 0.08);
    this.beep(220, 60, 0.35, "sawtooth", 0.06, 0.15);
    this.cb.onState("over");
    this.emitScore();
  }

  /* ------------------------------------------------------------------ */

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.renderer.dispose();
    canvas.remove();
    if (this.ctx) void this.ctx.close();
  }
}