import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* =====================================================================
   CONFIG — edit these to match your model and pricing
   ===================================================================== */
const CONFIG = {
  stlPath: 'ExoSkeletonV1.STL',
  currency: '$',
  // The brush the exoskeleton STL was modelled around (mm). User inputs scale the STL relative to this.
  referenceBrush: { length: 230, headLength: 100, headWidth: 80, handleWidth: 28, thickness: 12 },
  // Landmarks on the STL once it is centred (mm). x runs along the length (head side is −x),
  // y is up from the bottom of the back plate (the brush sits on the +y side).
  exo: {
    armX: -15,        // centre of the cross-arms that clip around the brush head
    neckStart: 13,    // where the plate narrows from head width ...
    neckEnd: 34,      // ... to handle width
    plateTop: 7.6,    // top face of the back plate (the brush rests here)
    mirrorX: -40,     // where the back mirror sits under the head plate
    engraveX: 33, engraveLen: 60, engraveH: 7, // engraving strip on the underside
  },
  basePrice: 24,
  engravingPrice: 5,
};

const COLORS = [
  { id: 'cobalt', name: 'Cobalt', hex: '#2f5bea' },
  { id: 'coral', name: 'Coral', hex: '#ff6f59' },
  { id: 'blush', name: 'Blush', hex: '#e8a7a0' },
  { id: 'sage', name: 'Sage', hex: '#94b394' },
  { id: 'ivory', name: 'Ivory', hex: '#efe7d8' },
  { id: 'onyx', name: 'Onyx', hex: '#25252a' },
];
const FINISHES = [
  { id: 'matte', name: 'Matte', rough: 0.85, metal: 0, clear: 0, price: 0 },
  { id: 'satin', name: 'Satin', rough: 0.45, metal: 0, clear: 0.3, price: 0 },
  { id: 'gloss', name: 'Gloss', rough: 0.15, metal: 0, clear: 1, price: 2 },
  { id: 'metal', name: 'Metallic', rough: 0.3, metal: 0.85, clear: 0.5, price: 4 },
];
const DESIGNS = [
  { id: 'paddle', name: 'Paddle', blurb: 'Wide, flat cushion for smoothing long hair.', price: 39,
    dims: { length: 240, headLength: 110, headWidth: 84, handleWidth: 28, thickness: 12 } },
  { id: 'oval', name: 'Oval cushion', blurb: 'An everyday all-rounder with a softer footprint.', price: 36,
    dims: { length: 220, headLength: 96, headWidth: 66, handleWidth: 26, thickness: 13 } },
  { id: 'round', name: 'Round thermal', blurb: 'Aluminium barrel for volume and blow-outs.', price: 42,
    dims: { length: 250, headLength: 110, headWidth: 56, handleWidth: 24, thickness: 12 } },
  { id: 'slim', name: 'Slim detangler', blurb: 'Narrow and light, with staggered pins that glide through knots.', price: 34,
    dims: { length: 215, headLength: 100, headWidth: 46, handleWidth: 22, thickness: 10 } },
];
const SIZES = [
  { id: 's', name: 'Compact', note: '−12%', k: 0.88, price: 0 },
  { id: 'm', name: 'Standard', note: 'as shown', k: 1, price: 0 },
  { id: 'l', name: 'Large', note: '+10%', k: 1.1, price: 4 },
];
const BRISTLES = [
  { id: 'nylon', name: 'Nylon ball-tip', blurb: 'Flexible pins with rounded tips that are gentle on the scalp.', price: 0 },
  { id: 'boar', name: 'Boar tufts', blurb: 'Dense natural tufts that spread oils for shine.', price: 8 },
  { id: 'mixed', name: 'Boar + nylon', blurb: 'Tufts for shine, taller pins for detangling.', price: 5 },
];
const ICONS = {
  grip: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M8 8v8M11 8v8M14 8v8M17 8v8"/></svg>',
  mirror: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M8.5 10.5l3-3M9.5 14l5-5"/></svg>',
  mount: '<svg viewBox="0 0 24 24"><path d="M6 4v8a6 6 0 0 0 12 0V4"/><path d="M6 8h3M15 8h3"/></svg>',
  upgrade: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="9" height="14" rx="3"/><path d="M13 12h7"/><path d="M17 3l2 2-2 2M19 5h-4"/></svg>',
  create: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8L18 21l-.8-2.4-2-.8 2-.8z"/></svg>',
};
const UPGRADES = [
  { id: 'grip', name: 'Ergo grip sleeve', blurb: 'Soft-touch ribbed sleeve that stops the handle slipping.', price: 9 },
  { id: 'mirror', name: 'Back mirror', blurb: 'Shatter-proof mirror set into the back of the head.', price: 7 },
  { id: 'mount', name: 'Magnetic wall mount', blurb: 'A magnet in the handle end and a matching wall plate.', price: 6 },
];
const DIM_FIELDS = [
  { key: 'length', label: 'Total length', min: 160, max: 300, hint: 'Tip of the head to the end of the handle.' },
  { key: 'headLength', label: 'Head length', min: 60, max: 140, hint: 'The part with bristles, measured lengthwise.' },
  { key: 'headWidth', label: 'Head width', min: 40, max: 110, hint: 'Widest point across the head.' },
  { key: 'handleWidth', label: 'Handle width', min: 16, max: 40, hint: 'Across the handle where you grip it.' },
  { key: 'thickness', label: 'Head thickness', min: 6, max: 24, hint: 'From the back of the head to the bristle base.' },
];
const DESIGN_ART = {
  paddle: '<svg viewBox="0 0 120 40"><rect x="3" y="3" width="50" height="34" rx="11"/><path d="M50 15c9 0 11 2 20 2h41a3 3 0 0 1 0 6H70c-9 0-11 2-20 2z"/></svg>',
  oval: '<svg viewBox="0 0 120 40"><ellipse cx="27" cy="20" rx="24" ry="15"/><path d="M48 16c8 0 10 1.5 20 1.5h43a2.5 2.5 0 0 1 0 5H68c-10 0-12 1.5-20 1.5z"/></svg>',
  round: '<svg viewBox="0 0 120 40"><rect x="4" y="12" width="50" height="16" rx="8"/><path d="M8 5v6M14 5v6M20 5v6M26 5v6M32 5v6M38 5v6M44 5v6M50 5v6M8 29v6M14 29v6M20 29v6M26 29v6M32 29v6M38 29v6M44 29v6M50 29v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M54 16h57a4 4 0 0 1 0 8H54z"/></svg>',
  slim: '<svg viewBox="0 0 120 40"><rect x="3" y="11" width="54" height="18" rx="9"/><path d="M55 17c6 0 8 1 15 1h41a2 2 0 0 1 0 4H70c-7 0-9 1-15 1z"/></svg>',
};

const REF = CONFIG.referenceBrush;
const DIM_KEYS = Object.keys(REF);
const UP = new THREE.Vector3(0, 1, 0);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* =====================================================================
   Small math + animation helpers
   ===================================================================== */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const dimsClose = (a, b, eps) => DIM_KEYS.every((k) => Math.abs(a[k] - b[k]) < eps);
const ease = {
  linear: (t) => t,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

let time = 0;
const tweens = new Set();
function tween({ duration = 0.8, delay = 0, ease: e = ease.inOutCubic, onUpdate, onComplete }) {
  const t = { start: time + delay, duration: Math.max(1e-4, duration), e, onUpdate, onComplete };
  tweens.add(t);
  return t;
}
const cancel = (t) => t && tweens.delete(t);
function updateTweens() {
  for (const t of [...tweens]) {
    const k = (time - t.start) / t.duration;
    if (k < 0) continue;
    const c = Math.min(1, k);
    t.onUpdate?.(t.e(c), c);
    if (c >= 1) { tweens.delete(t); t.onComplete?.(); }
  }
}

/* =====================================================================
   Renderer, scene, camera
   ===================================================================== */
const viewport = document.getElementById('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
viewport.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
viewport.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, 1, 1, 5000);
camera.position.set(120, 260, 420);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 90;
controls.maxDistance = 900;
controls.autoRotateSpeed = 0.8;
controls.target.set(0, 10, 0);

const key = new THREE.DirectionalLight('#fff4e6', 1.7);
key.position.set(140, 320, 200);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -280, right: 280, top: 280, bottom: -280, near: 10, far: 1000 });
key.shadow.bias = -0.0004;
scene.add(key);
const rim = new THREE.DirectionalLight('#d6e4ff', 0.9);
rim.position.set(-240, 140, -260);
scene.add(rim);
scene.add(new THREE.HemisphereLight('#ffffff', '#d8cdbf', 0.45));
const under = new THREE.DirectionalLight('#fff1e2', 0.9);
under.position.set(60, -260, 140);
scene.add(under);

const FLOOR_Y = -40;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: 0.12 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = FLOOR_Y;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.PolarGridHelper(260, 16, 7, 128, '#bfb3a4', '#d9d0c4');
grid.position.y = FLOOR_Y + 0.1;
grid.material.transparent = true;
grid.material.opacity = 0.4;
scene.add(grid);

// Everything product-related lives here; it re-centres itself and gently floats.
const productRoot = new THREE.Group();
scene.add(productRoot);
let rootGoalX = 0;

/* =====================================================================
   Shared materials / textures / geometry
   ===================================================================== */
function makeBodyMat(hex = COLORS[0].hex) {
  return new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.45, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.25, side: THREE.DoubleSide });
}
const glowTexture = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const keep = (g) => { g.userData.keep = true; return g; };
const mirrorTexture = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#f4f7fb');
  grad.addColorStop(0.5, '#b9c3cf');
  grad.addColorStop(1, '#8794a5');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.globalAlpha = 0.75;
  g.fillStyle = '#ffffff';
  g.translate(128, 128);
  g.rotate(-Math.PI / 4);
  g.fillRect(-160, -40, 320, 26);
  g.fillRect(-160, 0, 320, 9);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const PIN_GEO = keep(new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0));
const TUFT_GEO = keep(new THREE.CylinderGeometry(0.8, 1, 1, 7).translate(0, 0.5, 0));
const TIP_GEO = keep(new THREE.SphereGeometry(1, 10, 8));

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.isCSS2DObject) o.element.remove();
    if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach((m) => { if (!m.userData.keep) { m.map?.dispose(); m.dispose(); } });
  });
}

/* =====================================================================
   Effects: particle burst + shockwave ring, scan reveal
   ===================================================================== */
function burst(pos, color = '#ff6f59', count = 34, spread = 46) {
  const positions = new Float32Array(count * 3);
  const vel = [];
  for (let i = 0; i < count; i++) {
    const v = V3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(spread * (0.4 + Math.random() * 0.6));
    vel.push(v);
    positions.set([pos.x, pos.y, pos.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ size: 4, map: glowTexture, color, transparent: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  ring.position.copy(pos);
  ring.quaternion.copy(camera.quaternion);
  scene.add(pts, ring);
  tween({
    duration: 0.9, ease: ease.linear,
    onUpdate: (k) => {
      const e = ease.outCubic(k);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = pos.x + vel[i].x * e;
        positions[i * 3 + 1] = pos.y + vel[i].y * e - 14 * k * k;
        positions[i * 3 + 2] = pos.z + vel[i].z * e;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 1 - k;
      ring.scale.setScalar(3 + e * 34);
      ring.material.opacity = (1 - e) * 0.7;
    },
    onComplete: () => { scene.remove(pts, ring); disposeTree(pts); disposeTree(ring); },
  });
}

// "3D printer" reveal: a glowing plane sweeps along the part. Blueprint edges show ahead of it,
// the solid part fills in behind it.
function scanReveal(mesh, duration = 2.2) {
  mesh.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(V3());
  const center = box.getCenter(V3());
  const solidCut = new THREE.Plane(V3(-1, 0, 0), box.min.x - 1);
  const ghostCut = new THREE.Plane(V3(1, 0, 0), -(box.min.x - 1));
  const mats = [].concat(mesh.material);
  mats.forEach((m) => { m.clippingPlanes = [solidCut]; m.needsUpdate = true; });

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 25),
    new THREE.LineBasicMaterial({ color: '#2f9bff', transparent: true, opacity: 0, clippingPlanes: [ghostCut] }),
  );
  mesh.add(edges);

  const glow = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#59c2ff', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: '#2f9bff', transparent: true }));
  glow.add(sheet, frame);
  glow.rotation.y = Math.PI / 2;
  glow.scale.set(size.z * 1.25, size.y * 2.2 + 10, 1);
  glow.position.set(box.min.x, center.y, center.z);
  scene.add(glow);

  tween({ duration: 0.4, ease: ease.outCubic, onUpdate: (k) => { edges.material.opacity = 0.75 * k; } });
  tween({
    delay: 0.35, duration, ease: ease.inOutCubic,
    onUpdate: (k) => {
      const x = lerp(box.min.x - 1, box.max.x + 1, k);
      solidCut.constant = x;
      ghostCut.constant = -x;
      glow.position.x = x;
      const fade = Math.min(1, Math.min(k, 1 - k) * 8);
      sheet.material.opacity = 0.22 * fade;
      frame.material.opacity = fade;
    },
    onComplete: () => {
      mats.forEach((m) => { m.clippingPlanes = null; m.needsUpdate = true; });
      scene.remove(glow);
      disposeTree(glow);
      edges.removeFromParent();
      disposeTree(edges);
      burst(V3(box.max.x, center.y, center.z), '#2f9bff', 26, 36);
    },
  });
}

/* =====================================================================
   Geometry builders
   ===================================================================== */
function superellipseShape(a, b, n, seg = 80) {
  const s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    const c = Math.cos(t), sn = Math.sin(t);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = b * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  return s;
}
const insideSuperellipse = (x, y, a, b, n) => Math.pow(Math.abs(x / a), n) + Math.pow(Math.abs(y / b), n) <= 1;

// Extrude a top-view outline (shape x → world x, shape y → world z) upwards into a slab of `thickness`.
function slab(shape, thickness, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.1, thickness - 2 * bevel), bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

function handleShape(x0, x1, wNeck, w) {
  const r = w / 2;
  const neck = Math.min(35, (x1 - x0) * 0.3);
  const s = new THREE.Shape();
  s.moveTo(x0, wNeck / 2);
  s.bezierCurveTo(x0 + neck * 0.5, wNeck / 2, x0 + neck * 0.5, r, x0 + neck, r);
  s.lineTo(x1 - r, r);
  s.absarc(x1 - r, 0, r, Math.PI / 2, -Math.PI / 2, true);
  s.lineTo(x0 + neck, -r);
  s.bezierCurveTo(x0 + neck * 0.5, -r, x0 + neck * 0.5, -wNeck / 2, x0, -wNeck / 2);
  s.closePath();
  return { shape: s, neck };
}

/* =====================================================================
   Bristles: instanced pins / tufts / ball tips with a ripple grow animation
   ===================================================================== */
const MAX_BRISTLES = 1800;
const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion();

class BristleField {
  constructor(ghost) {
    this.ghost = ghost;
    this.group = new THREE.Group();
    this.pinMat = ghost
      ? new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.3 })
      : new THREE.MeshStandardMaterial({ color: '#2a2a31', roughness: 0.45 });
    this.tuftMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    this.tipMat = new THREE.MeshStandardMaterial({ color: '#f5f1e8', roughness: 0.3 });
    this.pins = new THREE.InstancedMesh(PIN_GEO, this.pinMat, MAX_BRISTLES);
    this.tufts = new THREE.InstancedMesh(TUFT_GEO, this.tuftMat, MAX_BRISTLES);
    this.tips = new THREE.InstancedMesh(TIP_GEO, this.tipMat, MAX_BRISTLES);
    for (const m of [this.pins, this.tufts, this.tips]) {
      m.count = 0;
      m.frustumCulled = false;
      m.castShadow = !ghost;
      this.group.add(m);
    }
    this.items = [];
    this.mode = 'idle';
    this.level = 1;
    this.t0 = 0;
    this.maxDelay = 0;
    this.dirty = true;
  }

  // points: [{ p, d, lenMul, wave }]
  setLayout(points, baseLen, type) {
    const items = [];
    const tuftColA = new THREE.Color('#dcc29c'), tuftColB = new THREE.Color('#9c7650');
    points.forEach((pt, i) => {
      let kind = 'pin', len = baseLen * (pt.lenMul ?? 1), tip = !this.ghost;
      if (this.ghost) tip = false;
      else if (type === 'boar') { kind = 'tuft'; len *= 0.72; tip = false; }
      else if (type === 'mixed' && i % 3 !== 0) { kind = 'tuft'; len *= 0.74; tip = false; }
      else if (type === 'mixed') len *= 1.08;
      items.push({
        p: pt.p, d: pt.d, q: new THREE.Quaternion().setFromUnitVectors(UP, pt.d), len, kind, tip,
        delay: pt.wave * 0.75 + hash(i) * 0.12,
        color: kind === 'tuft' ? tuftColA.clone().lerp(tuftColB, hash(i * 3.1)) : null,
      });
    });
    this.items = items;
    this.maxDelay = items.reduce((m, it) => Math.max(m, it.delay), 0);
    let t = 0;
    for (const it of items) if (it.kind === 'tuft') this.tufts.setColorAt(t++, it.color);
    if (this.tufts.instanceColor) this.tufts.instanceColor.needsUpdate = true;
    this.dirty = true;
  }

  grow() { this.mode = 'grow'; this.t0 = time; }
  retract(then) { this.mode = 'shrink'; this.t0 = time; this.onShrunk = then; }

  growthOf(it) {
    const dt = time - this.t0;
    if (this.mode === 'grow') return ease.outBack(clamp((dt - it.delay) / 0.5, 0, 1));
    if (this.mode === 'shrink') return 1 - ease.inCubic(clamp((dt - it.delay * 0.35) / 0.28, 0, 1));
    return this.level;
  }

  update() {
    if (this.mode === 'idle' && !this.dirty) return;
    let np = 0, nt = 0, nx = 0;
    for (const it of this.items) {
      const g = this.growthOf(it);
      const r = it.kind === 'pin' ? (this.ghost ? 0.5 : 0.6) : 1.3;
      _s.set(r, Math.max(0.001, it.len * g), r);
      _m.compose(it.p, it.q, _s);
      if (it.kind === 'pin') this.pins.setMatrixAt(np++, _m); else this.tufts.setMatrixAt(nt++, _m);
      if (it.tip) {
        _p.copy(it.d).multiplyScalar(it.len * g).add(it.p);
        _s.setScalar(1.25 * clamp(g, 0.001, 1.15));
        _m.compose(_p, _q.identity(), _s);
        this.tips.setMatrixAt(nx++, _m);
      }
    }
    this.pins.count = np; this.tufts.count = nt; this.tips.count = nx;
    for (const m of [this.pins, this.tufts, this.tips]) m.instanceMatrix.needsUpdate = true;
    this.dirty = false;

    const span = this.mode === 'grow' ? this.maxDelay + 0.55 : this.maxDelay * 0.35 + 0.3;
    if (this.mode !== 'idle' && time - this.t0 > span) {
      const wasShrink = this.mode === 'shrink';
      this.level = wasShrink ? 0 : 1;
      this.mode = 'idle';
      this.dirty = true;
      if (wasShrink && this.onShrunk) { const cb = this.onShrunk; this.onShrunk = null; cb(); }
    }
  }
}

/* =====================================================================
   Procedural brush (used for "brand new" and as the ghost of the user's brush)
   ===================================================================== */
const STYLES = {
  paddle: { n: 4.5, brLen: 20, pad: true },
  oval: { n: 2.2, brLen: 18, pad: true },
  slim: { n: 3, brLen: 21, pad: false },
  ghost: { n: 3.5, brLen: 20, pad: false },
  round: { n: 2, brLen: 0, pad: false },
};

class BrushModel {
  constructor(style, { ghost = false, bristle = 'nylon' } = {}) {
    this.style = style;
    this.ghost = ghost;
    this.bristle = bristle;
    this.group = new THREE.Group();
    this.bodyMat = ghost
      ? new THREE.MeshPhysicalMaterial({ color: '#e6eeff', transparent: true, opacity: 0.28, roughness: 0.15, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })
      : makeBodyMat();
    this.metalMat = new THREE.MeshStandardMaterial({ color: '#c9ccd3', metalness: 1, roughness: 0.32 });
    this.padMat = new THREE.MeshStandardMaterial({ color: '#2b2b30', roughness: 0.8 });
    this.meshes = [];
    this.field = new BristleField(ghost);
    this.group.add(this.field.group);
    this.built = null;
    this.info = null;
  }

  addMesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = !this.ghost;
    m.receiveShadow = !this.ghost;
    this.group.add(m);
    this.meshes.push(m);
  }

  setDims(d) {
    if (this.built && dimsClose(this.built, d, 0.25)) return;
    this.built = { ...d };
    for (const m of this.meshes) { m.removeFromParent(); m.geometry.dispose(); }
    this.meshes = [];
    if (this.style === 'round') this.buildRound(d); else this.buildFlat(d);
    this.layoutBristles();
  }

  buildFlat(d) {
    const st = STYLES[this.ghost ? 'ghost' : this.style];
    const L = d.length, Lh = clamp(d.headLength, 40, L - 60), Wh = d.headWidth, T = d.thickness, Wd = d.handleWidth;
    const bev = Math.min(2.5, T / 4);
    const head = slab(superellipseShape(Lh / 2 - bev, Wh / 2 - bev, st.n), T, bev);
    head.translate(Lh / 2, 0, 0);
    this.addMesh(head, this.bodyMat);

    const Th = Math.max(5, T * 0.8);
    const hb = Math.min(2, Th / 4);
    const neckX = Lh - 10;
    const { shape, neck } = handleShape(neckX, L - hb, Math.min(Wd * 0.75, Wh * 0.6), Wd);
    const handle = slab(shape, Th, hb);
    handle.translate(0, (T - Th) / 2, 0);
    this.addMesh(handle, this.bodyMat);

    let brBase = T;
    if (st.pad && !this.ghost) {
      const pad = slab(superellipseShape(Lh / 2 - 6, Wh / 2 - 6, st.n), 2.4, 0.8);
      pad.translate(Lh / 2, T - 0.6, 0);
      this.addMesh(pad, this.padMat);
      brBase = T + 1.8;
    }
    this.info = {
      round: false, L, Lh, Wh, T, Th, Wd, n: st.n, brBase, brLen: st.brLen,
      handleY: T / 2, handleTop: T / 2 + Th / 2, handleThk: Th, endX: L,
      gripX0: neckX + neck + 4, bristleTop: brBase + st.brLen,
    };
  }

  buildRound(d) {
    const L = d.length, Lh = clamp(d.headLength, 40, L - 60), Wh = d.headWidth, Wd = d.handleWidth;
    const R = Math.max(9, Wh * 0.2), cy = Wh / 2, brLen = Math.max(6, Wh / 2 - R - 1);
    const barrel = new THREE.CylinderGeometry(R, R, Lh, 48, 1);
    barrel.rotateZ(Math.PI / 2).translate(Lh / 2, cy, 0);
    this.addMesh(barrel, this.metalMat);
    const cap = new THREE.SphereGeometry(R * 1.04, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.rotateZ(Math.PI / 2).translate(0, cy, 0);
    this.addMesh(cap, this.bodyMat);
    const collar = new THREE.TorusGeometry(R * 0.98, 1.6, 12, 48);
    collar.rotateY(Math.PI / 2).translate(Lh, cy, 0);
    this.addMesh(collar, this.bodyMat);

    const Lhd = L - Lh, rN = R * 0.85, rH = Wd / 2, pts = [];
    for (let i = 0; i <= 48; i++) {
      const u = i / 48;
      let r;
      if (u < 0.2) r = lerp(rN, rH * 0.8, smoothstep(0, 0.2, u));
      else if (u < 0.35) r = lerp(rH * 0.8, rH, smoothstep(0.2, 0.35, u));
      else r = rH * (1 - 0.08 * Math.sin(((u - 0.35) / 0.65) * Math.PI));
      if (u > 0.94) r *= Math.sqrt(Math.max(0, 1 - ((u - 0.94) / 0.06) ** 2));
      pts.push(new THREE.Vector2(Math.max(r, 0.01), u * Lhd));
    }
    const handle = new THREE.LatheGeometry(pts, 40);
    handle.rotateZ(-Math.PI / 2).translate(Lh, cy, 0);
    this.addMesh(handle, this.bodyMat);

    this.info = {
      round: true, L, Lh, Wh, T: Wh, Th: Wd, Wd, R, cy, brBase: R, brLen,
      handleY: cy, handleTop: cy + rH, handleThk: Wd, endX: L,
      gripX0: Lh + Lhd * 0.36, bristleTop: Wh,
    };
  }

  layoutBristles() {
    const b = this.info;
    const type = this.ghost ? 'ghost' : this.bristle;
    const spacing = { nylon: 7.5, boar: 5.6, mixed: 6.2, ghost: 7 }[type];
    const pts = [];
    if (b.round) {
      const step = type === 'nylon' ? 6 : 5;
      const rings = Math.floor((b.Lh - 10) / step);
      const per = Math.max(8, Math.round((Math.PI * 2 * b.R) / (spacing * 0.8)));
      for (let k = 0; k <= rings; k++) {
        const x = 5 + k * step;
        for (let j = 0; j < per; j++) {
          const th = (j / per) * Math.PI * 2 + (k % 2) * (Math.PI / per);
          const dir = V3(0, Math.cos(th), Math.sin(th));
          pts.push({ p: V3(x, b.cy + b.R * dir.y, b.R * dir.z), d: dir, wave: x / b.Lh + (j / per) * 0.15 });
        }
      }
    } else {
      const a = b.Lh / 2 - 8, bb = b.Wh / 2 - 7;
      if (a > 0 && bb > 0) {
        const rowH = spacing * 0.866;
        const rows = Math.floor(bb / rowH);
        for (let r = -rows; r <= rows; r++) {
          const z = r * rowH, off = (Math.abs(r) % 2) * spacing * 0.5;
          const cols = Math.floor(a / spacing) + 1;
          for (let c = -cols; c <= cols; c++) {
            const x = c * spacing + off;
            if (!insideSuperellipse(x, z, a, bb, b.n)) continue;
            pts.push({
              p: V3(b.Lh / 2 + x, b.brBase, z), d: UP,
              lenMul: this.style === 'slim' && !this.ghost && Math.abs(r) % 2 ? 0.8 : 1,
              wave: Math.hypot(x / a, z / bb),
            });
          }
        }
      }
    }
    this.field.setLayout(pts, b.brLen, type);
  }

  setBristle(type) {
    if (type === this.bristle) return;
    this.bristle = type;
    this.field.retract(() => { this.layoutBristles(); this.field.grow(); });
  }

  setGhostOpacity(k) {
    this.bodyMat.opacity = 0.28 * k;
    this.field.pinMat.opacity = 0.5 * k;
    this.group.visible = k > 0.002;
  }

  update(d) { this.setDims(d); this.field.update(); }
}

/* =====================================================================
   The imported STL exoskeleton, deformed to fit the user's measurements
   ===================================================================== */
class Exo {
  constructor(src) {
    const g = src.clone();
    g.computeBoundingBox();
    const bb = g.boundingBox;
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g.deleteAttribute('normal');
    g.computeVertexNormals();
    this.halfLen = (bb.max.x - bb.min.x) / 2;
    this.geom = g;
    this.orig = g.attributes.position.array.slice();
    this.material = makeBodyMat();
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.last = null;
  }

  scales(d) {
    return {
      head: d.headLength / REF.headLength, total: d.length / REF.length,
      zHead: d.headWidth / REF.headWidth, zHandle: d.handleWidth / REF.handleWidth,
      y: d.thickness / REF.thickness,
    };
  }

  // Head side stretches with head length, handle side with total length; width blends from head to
  // handle across the neck; only the hooks above the plate grow with thickness.
  deformInto(geom, d) {
    const s = this.scales(d), E = CONFIG.exo, o = this.orig, pos = geom.attributes.position.array;
    const ky = lerp(1, s.y, 0.7);
    for (let i = 0; i < o.length; i += 3) {
      const x = o[i], y = o[i + 1], z = o[i + 2];
      pos[i] = x < 0 ? x * s.head : x * s.total;
      pos[i + 1] = y <= E.plateTop ? y : E.plateTop + (y - E.plateTop) * ky;
      pos[i + 2] = z * lerp(s.zHead, s.zHandle, smoothstep(E.neckStart, E.neckEnd, x));
    }
    geom.attributes.position.needsUpdate = true;
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
  }

  deform(d) {
    if (this.last && dimsClose(this.last, d, 0.05)) return;
    this.last = { ...d };
    this.deformInto(this.geom, d);
  }
}

/* =====================================================================
   Dimension call-outs (lines + floating labels) for the measuring step
   ===================================================================== */
class DimLine {
  constructor(key, label) {
    this.key = key;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
    this.mat = new THREE.LineBasicMaterial({ color: '#1d1b20', transparent: true, opacity: 0, depthTest: false });
    this.line = new THREE.LineSegments(this.geo, this.mat);
    this.line.renderOrder = 20;
    this.line.frustumCulled = false;
    this.el = document.createElement('div');
    this.el.className = 'dim-label';
    this.el.dataset.dim = key;
    this.caption = label;
    this.label = new CSS2DObject(this.el);
    this.group = new THREE.Group();
    this.group.add(this.line, this.label);
  }

  set(a, b, tick, value, opacity) {
    const p = this.geo.attributes.position.array;
    const t = tick.clone().multiplyScalar(3);
    const pts = [a, b, a.clone().add(t), a.clone().sub(t), b.clone().add(t), b.clone().sub(t)];
    pts.forEach((v, i) => p.set([v.x, v.y, v.z], i * 3));
    this.geo.attributes.position.needsUpdate = true;
    this.mat.opacity = opacity * 0.85;
    this.label.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(tick, 7);
    const text = `<small>${this.caption}</small>${Math.round(value)} mm`;
    if (text !== this.text) { this.el.innerHTML = text; this.text = text; }
    this.el.style.opacity = opacity;
    this.label.visible = opacity > 0.02;
    this.line.visible = opacity > 0.02;
  }
}

/* =====================================================================
   Products
   ===================================================================== */
class ExistingProduct {
  constructor(stl) {
    this.kind = 'existing';
    this.group = new THREE.Group();
    this.exo = new Exo(stl);
    this.group.add(this.exo.mesh);
    this.brush = new BrushModel('ghost', { ghost: true });
    this.brush.group.renderOrder = 2;
    this.group.add(this.brush.group);
    this.ghostLevel = 0;
    this.brush.setGhostOpacity(0);
    this.bodyMaterials = [this.exo.material];
    this.parts = new Map();
    this.explode = 0;
    this.dimsLevel = 0;
    this.dimLines = Object.fromEntries(DIM_FIELDS.map((f) => [f.key, new DimLine(f.key, f.label.replace('Total ', '').replace('Head ', 'head ').toLowerCase())]));
    Object.values(this.dimLines).forEach((l) => this.group.add(l.group));
  }

  setGhost(on) {
    cancel(this.ghostTween);
    const from = this.ghostLevel;
    if (on && from < 0.05) { this.brush.field.level = 0; this.brush.field.grow(); }
    this.ghostTween = tween({
      duration: 0.7, ease: ease.inOutCubic,
      onUpdate: (k) => { this.ghostLevel = lerp(from, on ? 1 : 0, k); this.brush.setGhostOpacity(this.ghostLevel); },
    });
  }

  update(d, dt) {
    this.d = d;
    this.exo.deform(d);
    this.brush.update(d);
    const b = this.brush.info, s = this.exo.scales(d);
    this.s = s;
    this.bx = CONFIG.exo.armX * s.head - b.Lh / 2;
    this.by = CONFIG.exo.plateTop;
    this.brush.group.position.set(this.bx, this.by + 20 * this.explode, 0);
    this.exo.mesh.position.y = -22 * this.explode;
    this.dimsLevel = damp(this.dimsLevel, showDims() ? 1 : 0, 8, dt);
    this.updateDims(b);
  }

  updateDims(b) {
    const o = this.dimsLevel, bx = this.bx, by = this.by, L = this.dimLines;
    const zf = b.Wh / 2 + 16, top = by + b.T;
    L.length.set(V3(bx, by, zf), V3(bx + b.endX, by, zf), V3(0, 0, 1), this.d.length, o);
    L.headLength.set(V3(bx, top, -(b.Wh / 2 + 10)), V3(bx + b.Lh, top, -(b.Wh / 2 + 10)), V3(0, 0, -1), b.Lh, o);
    L.headWidth.set(V3(bx - 12, top, -b.Wh / 2), V3(bx - 12, top, b.Wh / 2), V3(-1, 0, 0), b.Wh, o);
    const hx = bx + (b.gripX0 + b.endX) / 2, hy = by + b.handleTop + 3;
    L.handleWidth.set(V3(hx, hy, -b.Wd / 2), V3(hx, hy, b.Wd / 2), V3(1, 0, 0), b.Wd, o);
    L.thickness.set(V3(bx + b.Lh * 0.5, by, b.Wh / 2 + 4), V3(bx + b.Lh * 0.5, top, b.Wh / 2 + 4), V3(0, 0, 1), this.d.thickness, o);
  }

  extentX() {
    const b = this.brush.info;
    const xmin = Math.min(-this.exo.halfLen * this.s.head, this.bx), xmax = this.bx + b.endX;
    return [xmin, xmax];
  }

  anchors() {
    const b = this.brush.info, s = this.s, E = CONFIG.exo, bx = this.bx, by = this.by;
    const [xmin, xmax] = this.extentX();
    const exoEnd = this.exo.halfLen * s.total;
    const x1 = bx + b.endX - 8;
    let x0 = Math.max(bx + b.gripX0, exoEnd + 6);
    if (x1 - x0 < 30) x0 = x1 - 30;
    const mr = Math.min(13 * s.zHead, 14 * s.head);
    return {
      length: xmax - xmin,
      center: V3((xmin + xmax) / 2, by + b.T * 0.5 + 6, 0),
      head: V3(bx + b.Lh / 2, by + b.bristleTop * 0.6, 0),
      handle: { x0, x1, y: by + b.handleY, w: b.Wd, t: b.Th },
      back: { pos: V3(E.mirrorX * s.head, -0.5, 0), rx: mr, rz: mr },
      engrave: { pos: V3(E.engraveX * s.total, -0.35, 0), w: E.engraveLen * s.total, h: E.engraveH * s.zHandle, up: false },
      end: V3(bx + b.endX, by + b.handleY, 0),
    };
  }

  centerX() { const [a, b] = this.extentX(); return (a + b) / 2; }
}

class NewProduct {
  constructor(design, bristle) {
    this.kind = 'new';
    this.design = design;
    this.group = new THREE.Group();
    this.brush = new BrushModel(design, { bristle });
    this.group.add(this.brush.group);
    this.bodyMaterials = [this.brush.bodyMat];
    this.parts = new Map();
    this.explode = 0;
  }

  update(d) {
    this.brush.update(d);
    this.brush.field.group.position.y = 26 * this.explode;
  }

  anchors() {
    const b = this.brush.info;
    const xmin = b.round ? -b.R : 0;
    return {
      length: b.endX - xmin,
      center: V3((xmin + b.endX) / 2, b.round ? b.cy : b.T * 0.5 + 8, 0),
      head: V3(b.Lh / 2, b.round ? b.cy + b.R : b.bristleTop * 0.55, 0),
      handle: { x0: b.gripX0, x1: b.endX - 8, y: b.handleY, w: b.Wd, t: b.handleThk },
      back: { pos: V3(b.Lh / 2, -0.5, 0), rx: b.Lh * 0.28, rz: b.Wh * 0.28 },
      engrave: { pos: V3(lerp(b.gripX0, b.endX, 0.5), b.handleTop + 0.3, 0), w: Math.min(70, (b.endX - b.gripX0) * 0.62), h: b.Wd * 0.5, up: true },
      end: V3(b.endX, b.handleY, 0),
    };
  }

  centerX() { const b = this.brush.info; return ((b.round ? -b.R : 0) + b.endX) / 2; }
}

/* =====================================================================
   Upgrade parts — each pops in with a burst and has its own camera close-up
   ===================================================================== */
class Part {
  constructor(product, id) {
    this.product = product;
    this.id = id;
    this.group = new THREE.Group();
    this.pop = new THREE.Group();
    this.group.add(this.pop);
    product.group.add(this.group);
    this.explodeDir = V3();
  }

  enter(delay = 0) {
    this.pop.scale.setScalar(0.001);
    cancel(this.popTween);
    this.popTween = tween({ delay, duration: 0.75, ease: ease.outBack, onUpdate: (k) => this.pop.scale.setScalar(Math.max(0.001, k)) });
    tween({ delay: delay + 0.08, duration: 0.001, onComplete: () => burst(this.group.getWorldPosition(V3()), accentHex()) });
  }

  exit() {
    cancel(this.popTween);
    const s0 = this.pop.scale.x;
    this.popTween = tween({
      duration: 0.35, ease: ease.inCubic,
      onUpdate: (k) => this.pop.scale.setScalar(Math.max(0.001, s0 * (1 - k))),
      onComplete: () => { this.group.removeFromParent(); disposeTree(this.group); },
    });
  }
}

// A ribbed sleeve swept along +x with a squarish (superellipse) cross-section, so it encloses
// rounded-rectangle handles without their corners poking through.
function gripGeometry(len, ry, rz) {
  const N = 140, M = 40, n = 3.5, taper = Math.min(6, len * 0.15);
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * len, edge = Math.min(u, len - u);
    let r = edge < taper ? Math.sqrt(Math.max(0, 1 - (1 - edge / taper) ** 2)) : 1;
    r *= 1 + 0.05 * smoothstep(taper * 1.5, taper * 2.5, edge) * Math.max(0, Math.sin((u / 4.2) * Math.PI));
    for (let j = 0; j < M; j++) {
      const t = (j / M) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      pos.push(u, ry * r * Math.sign(sn) * Math.abs(sn) ** (2 / n), rz * r * Math.sign(c) * Math.abs(c) ** (2 / n));
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j, b = i * M + ((j + 1) % M), c = a + M, d = b + M;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

class GripPart extends Part {
  constructor(p) {
    super(p, 'grip');
    this.mesh = new THREE.Mesh(undefined, new THREE.MeshPhysicalMaterial({ color: '#2d2f37', roughness: 0.9, sheen: 0.6, sheenColor: new THREE.Color('#777') }));
    this.mesh.castShadow = true;
    this.pop.add(this.mesh);
    this.explodeDir.set(0, 34, 0);
  }
  place(a, e) {
    const h = a.handle, len = Math.max(20, h.x1 - h.x0), ry = h.t / 2 + 2.2, rz = h.w / 2 + 3.2;
    const key = [len, ry, rz];
    if (!this.key || key.some((v, i) => Math.abs(v - this.key[i]) > 0.3)) {
      this.mesh.geometry?.dispose();
      this.mesh.geometry = gripGeometry(len, ry, rz);
      this.key = key;
    }
    this.group.position.set(h.x0 + len / 2, h.y, 0).addScaledVector(this.explodeDir, e);
    this.mesh.position.x = -len / 2;
  }
  view(a) { return { target: V3((a.handle.x0 + a.handle.x1) / 2, a.handle.y, 0), r: 270, phi: 1.0, theta: 0.6 }; }
}

class MirrorPart extends Part {
  constructor(p) {
    super(p, 'mirror');
    const glass = new THREE.MeshBasicMaterial({ map: mirrorTexture });
    glass.userData.keep = true;
    this.disk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.8, 64), glass);
    this.rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 12, 64), new THREE.MeshStandardMaterial({ color: '#2b2b30', roughness: 0.4 }));
    this.rim.rotation.x = Math.PI / 2;
    this.pop.add(this.disk, this.rim);
    this.explodeDir.set(0, -42, 0);
  }
  place(a, e) {
    const b = a.back;
    this.group.position.copy(b.pos).addScaledVector(this.explodeDir, e);
    this.disk.scale.set(b.rx, 1, b.rz);
    this.rim.scale.set(b.rx, b.rz, 14);
  }
  view(a) { return { target: a.back.pos.clone(), r: 250, phi: 2.2, theta: 0.45 }; }
}

class MountPart extends Part {
  constructor(p) {
    super(p, 'mount');
    const chrome = new THREE.MeshStandardMaterial({ color: '#dadde3', metalness: 1, roughness: 0.18 });
    this.puck = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), chrome);
    this.puck.rotation.z = Math.PI / 2;
    this.plate = new THREE.Group();
    const board = new THREE.Mesh(new RoundedBoxGeometry(5, 36, 36, 4, 2), new THREE.MeshPhysicalMaterial({ color: '#f4f1ea', roughness: 0.6 }));
    board.castShadow = true;
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 1.2, 40), chrome);
    dot.rotation.z = Math.PI / 2;
    dot.position.x = -2.6;
    this.plate.add(board, dot);
    this.pop.add(this.puck, this.plate);
    this.slide = 70;
    this.explodeDir.set(16, 0, 0);
  }
  enter(delay = 0) {
    super.enter(delay);
    this.slide = 70;
    tween({
      delay: delay + 0.3, duration: 1.0, ease: ease.outBounce,
      onUpdate: (k) => { this.slide = 70 * (1 - k); },
      onComplete: () => burst(this.plate.getWorldPosition(V3()), '#9aa7ff', 22, 30),
    });
  }
  place(a, e) {
    const r = Math.min(a.handle.t, a.handle.w) * 0.36;
    this.group.position.copy(a.end).addScaledVector(this.explodeDir, e);
    this.puck.scale.set(r, 3.2, r);
    this.puck.position.x = 0.4;
    this.plate.position.x = 6 + this.slide + e * 14;
  }
  view(a) { return { target: a.end.clone().add(V3(4, 0, 0)), r: 240, phi: 1.2, theta: 0.4 }; }
}

class EngravePart extends Part {
  constructor(p) {
    super(p, 'engrave');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.mat = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.plane.renderOrder = 3;
    this.laser = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: '#ff4a2a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.laser.scale.setScalar(9);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 90, 8).translate(0, 45, 0), new THREE.MeshBasicMaterial({ color: '#ff3b2f', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.laser.visible = this.beam.visible = false;
    this.pop.add(this.plane, this.laser, this.beam);
    this.text = '';
    this.progress = 1;
    this.aspect = 0;
    this.explodeDir.set(0, p.kind === 'existing' ? -36 : 16, 0);
  }

  setText(t, animate = true) {
    this.text = t;
    if (!animate) { this.progress = 1; this.draw(); return; }
    cancel(this.burnTween);
    this.progress = 0;
    this.laser.visible = this.beam.visible = true;
    this.burnTween = tween({
      duration: 0.35 + 0.08 * t.length, ease: ease.linear,
      onUpdate: (k) => { this.progress = k; this.draw(); },
      onComplete: () => { this.laser.visible = this.beam.visible = false; this.draw(); },
    });
  }

  draw() {
    const c = this.canvas, g = this.ctx;
    if (!this.mat.map) return;
    g.clearRect(0, 0, c.width, c.height);
    let fs = c.height * 0.66;
    const font = (s) => `700 ${s}px Manrope, system-ui, sans-serif`;
    g.font = font(fs);
    let w = g.measureText(this.text).width;
    if (w > c.width * 0.92) { fs *= (c.width * 0.92) / w; g.font = font(fs); w = g.measureText(this.text).width; }
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    const x0 = (c.width - w) / 2, y = c.height / 2;
    // Engraving on the (charcoal) grip sleeve or a dark body gets light text; otherwise dark text.
    const onGrip = this.product.kind === 'new' && this.product.parts.has('grip');
    const dark = onGrip || new THREE.Color(colorHex()).getHSL({}).l < 0.4;
    g.fillStyle = dark ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.45)';
    g.fillText(this.text, x0, y + fs * 0.05);
    g.fillStyle = dark ? '#ece6da' : '#1f1d22';
    g.fillText(this.text, x0, y);
    if (this.progress < 1) g.clearRect(x0 + w * this.progress, 0, c.width, c.height);
    this.textX = (x0 + w * this.progress) / c.width - 0.5;
    this.mat.map.needsUpdate = true;
  }

  place(a, e) {
    const g = a.engrave;
    const aspect = g.w / g.h;
    if (Math.abs(aspect - this.aspect) / Math.max(this.aspect, 1e-3) > 0.04) {
      this.aspect = aspect;
      this.canvas.width = 1024;
      this.canvas.height = Math.max(32, Math.round(1024 / aspect));
      this.mat.map?.dispose();
      this.mat.map = new THREE.CanvasTexture(this.canvas);
      this.mat.map.colorSpace = THREE.SRGBColorSpace;
      this.mat.map.anisotropy = 8;
      this.mat.needsUpdate = true;
      this.draw();
    }
    const lift = g.up && this.product.parts.has('grip') ? (a.handle.t / 2 + 2.2) * 1.05 - a.handle.t / 2 : 0;
    this.group.position.copy(g.pos).add(V3(0, lift, 0)).addScaledVector(this.explodeDir, e);
    this.plane.rotation.set(g.up ? -Math.PI / 2 : Math.PI / 2, 0, 0);
    this.plane.scale.set(g.w, g.h, 1);
    const ly = g.up ? 0.6 : -0.6;
    this.laser.position.set((this.textX ?? 0) * g.w, ly, 0);
    this.beam.position.copy(this.laser.position);
    this.beam.rotation.x = g.up ? 0 : Math.PI;
  }
  view(a) {
    const g = a.engrave;
    return { target: g.pos.clone(), r: 210, phi: g.up ? 0.7 : 2.25, theta: 0.3 };
  }
}

const PART_TYPES = { grip: GripPart, mirror: MirrorPart, mount: MountPart, engrave: EngravePart };

/* =====================================================================
   App state
   ===================================================================== */
const state = {
  mode: null, step: 0,
  dims: { ...REF },
  design: 'paddle', size: 'm', bristle: 'nylon',
  upgrades: new Set(),
  color: 'cobalt', finish: 'satin', engraving: '',
  ghost: true, explode: false, spin: true,
};
const cur = { dims: { ...REF }, explode: 0 };
let stlGeometry = null;
let product = null;
let lastInteraction = -10;

const FLOWS = {
  existing: [
    { id: 'measure', title: 'Your brush', view: 'top' },
    { id: 'upgrades', title: 'Upgrades', view: 'overview' },
    { id: 'finish', title: 'Finish', view: 'overview' },
    { id: 'review', title: 'Review', view: 'overview' },
  ],
  new: [
    { id: 'design', title: 'Design', view: 'overview' },
    { id: 'bristles', title: 'Bristles', view: 'bristles' },
    { id: 'upgrades', title: 'Upgrades', view: 'overview' },
    { id: 'finish', title: 'Finish', view: 'overview' },
    { id: 'review', title: 'Review', view: 'overview' },
  ],
};
const flow = () => (state.mode ? FLOWS[state.mode] : []);
const stepId = () => flow()[state.step]?.id ?? 'landing';
const showDims = () => state.mode === 'existing' && stepId() === 'measure';
const colorHex = () => COLORS.find((c) => c.id === state.color).hex;
const accentHex = () => (state.color === 'coral' ? '#2f5bea' : '#ff6f59');
const finish = () => FINISHES.find((f) => f.id === state.finish);
const money = (v) => `${CONFIG.currency}${v}`;

function designDims() {
  const d = DESIGNS.find((x) => x.id === state.design).dims;
  const k = SIZES.find((s) => s.id === state.size).k;
  return Object.fromEntries(DIM_KEYS.map((key) => [key, Math.round(d[key] * (key === 'thickness' ? 1 : k))]));
}

function priceLines() {
  const lines = [];
  if (state.mode === 'existing') {
    lines.push(['Custom-fit exoskeleton', CONFIG.basePrice]);
  } else {
    const d = DESIGNS.find((x) => x.id === state.design);
    lines.push([`${d.name} brush`, d.price]);
    const s = SIZES.find((x) => x.id === state.size);
    if (s.price) lines.push([`${s.name} size`, s.price]);
    const b = BRISTLES.find((x) => x.id === state.bristle);
    lines.push([b.name, b.price]);
  }
  for (const u of UPGRADES) if (state.upgrades.has(u.id) && upgradeAvailable(u.id)) lines.push([u.name, u.price]);
  const f = finish();
  lines.push([`${COLORS.find((c) => c.id === state.color).name}, ${f.name.toLowerCase()} finish`, f.price]);
  if (state.engraving.trim()) lines.push([`Engraving “${state.engraving.trim()}”`, CONFIG.engravingPrice]);
  return lines;
}
const total = () => priceLines().reduce((s, l) => s + l[1], 0);
const upgradeAvailable = (id) => !(id === 'mirror' && state.mode === 'new' && state.design === 'round');

/* =====================================================================
   Product orchestration
   ===================================================================== */
function swapProduct(next, { intro = 'drop' } = {}) {
  const prev = product;
  if (prev) {
    const y0 = prev.group.position.y;
    tween({
      duration: 0.6, ease: ease.inCubic,
      onUpdate: (k) => {
        prev.group.position.y = y0 + k * 70;
        prev.group.rotation.y = k * 1.4;
        prev.group.scale.setScalar(Math.max(0.001, 1 - k));
      },
      onComplete: () => { prev.group.removeFromParent(); disposeTree(prev.group); },
    });
  }
  product = next;
  productRoot.add(next.group);
  next.update(cur.dims, 0);
  rootGoalX = -next.centerX();
  applyFinish(false);

  if (intro === 'drop') {
    next.group.position.y = 110;
    next.group.scale.setScalar(0.6);
    next.group.rotation.y = -0.8;
    if (next.brush && next.kind === 'new') next.brush.field.level = 0;
    tween({
      delay: prev ? 0.25 : 0, duration: 1.1, ease: ease.linear,
      onUpdate: (k) => {
        next.group.position.y = lerp(110, 0, ease.outBounce(k));
        next.group.scale.setScalar(lerp(0.6, 1, ease.outBack(Math.min(1, k * 1.4))));
        next.group.rotation.y = lerp(-0.8, 0, ease.outCubic(k));
      },
      onComplete: () => burst(V3(0, FLOOR_Y + 2, 0).add(productRoot.position), '#c8b8a6', 30, 70),
    });
    if (next.kind === 'new') tween({ delay: (prev ? 0.25 : 0) + 0.7, duration: 0.001, onComplete: () => next.brush.field.grow() });
  } else if (intro === 'scan') {
    productRoot.position.x = rootGoalX;
    scanReveal(next.exo.mesh);
  }
  syncParts({ stagger: true });
}

function wantedParts() {
  const want = new Set([...state.upgrades].filter(upgradeAvailable));
  if (state.engraving.trim()) want.add('engrave');
  return want;
}

function syncParts({ stagger = false } = {}) {
  if (!product) return [];
  const want = wantedParts(), added = [];
  for (const [id, part] of product.parts) if (!want.has(id)) { part.exit(); product.parts.delete(id); }
  let i = 0;
  for (const id of want) {
    if (product.parts.has(id)) continue;
    const part = new PART_TYPES[id](product);
    product.parts.set(id, part);
    if (id === 'engrave') part.setText(state.engraving.trim(), !stagger);
    part.place(product.anchors(), cur.explode);
    part.enter(stagger ? 1.0 + i++ * 0.18 : 0);
    added.push(part);
  }
  product.parts.get('engrave')?.draw();
  return added;
}

function applyFinish(animate = true) {
  if (!product) return;
  const c = new THREE.Color(colorHex()), f = finish();
  for (const m of product.bodyMaterials) {
    if (!animate) { m.color.copy(c); m.roughness = f.rough; m.metalness = f.metal; m.clearcoat = f.clear; continue; }
    const c0 = m.color.clone(), r0 = m.roughness, me0 = m.metalness, cl0 = m.clearcoat;
    tween({
      duration: 0.8, ease: ease.inOutCubic,
      onUpdate: (k) => {
        m.color.lerpColors(c0, c, k);
        m.roughness = lerp(r0, f.rough, k);
        m.metalness = lerp(me0, f.metal, k);
        m.clearcoat = lerp(cl0, f.clear, k);
        m.emissive.copy(c).multiplyScalar(0.45 * Math.sin(k * Math.PI));
      },
    });
  }
  product.parts.get('engrave')?.draw();
}

/* =====================================================================
   Camera choreography
   ===================================================================== */
let camTween = null;

function viewportFree() {
  const panel = document.getElementById('panel').getBoundingClientRect();
  const w = window.innerWidth, h = window.innerHeight;
  if (w > 760) return { w: Math.max(200, panel.left - 20), h, dx: (w - panel.left) / 2, dy: 0 };
  return { w, h: Math.max(160, panel.top - 60), dx: 0, dy: (h - panel.top) / 2 - 25 };
}

function frameDistance(len) {
  const f = viewportFree();
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (f.w / window.innerHeight));
  const visibleFrac = f.h / window.innerHeight;
  const dH = (len * (f.w < 600 ? 0.72 : 0.62)) / Math.tan(hFov / 2);
  const dV = (len * 0.32) / (Math.tan(vFov / 2) * visibleFrac);
  return clamp(Math.max(dH, dV), 200, 950);
}

function computeView(name) {
  if (!product) return null;
  const a = product.anchors();
  const toWorld = (v) => v.clone().add(V3(rootGoalX, 0, 0));
  const base = frameDistance(a.length);
  if (name === 'top') return { target: toWorld(a.center), r: base * 1.25, phi: 0.6, theta: 0.12 };
  if (name === 'bristles') return { target: toWorld(a.head), r: base * 0.72, phi: 0.82, theta: 0.7 };
  if (name === 'landing') return { target: toWorld(a.center), r: base * 0.92, phi: 1.02, theta: 0.5 };
  if (typeof name === 'object') return { ...name, target: toWorld(name.target) };
  return { target: toWorld(a.center), r: base, phi: 1.06, theta: 0.42 };
}

function flyTo(view, duration = 1.4) {
  const v = computeView(view);
  if (!v) return;
  cancel(camTween);
  controls.enabled = false;
  const t0 = controls.target.clone();
  const s0 = new THREE.Spherical().setFromVector3(camera.position.clone().sub(t0));
  let dTheta = v.theta - s0.theta;
  dTheta = ((((dTheta + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  const s = new THREE.Spherical();
  camTween = tween({
    duration, ease: ease.inOutCubic,
    onUpdate: (k) => {
      controls.target.lerpVectors(t0, v.target, k);
      s.set(lerp(s0.radius, v.r, k), lerp(s0.phi, v.phi, k), s0.theta + dTheta * k);
      camera.position.setFromSpherical(s).add(controls.target);
      camera.lookAt(controls.target);
    },
    onComplete: () => { controls.enabled = true; camTween = null; },
  });
}
const flyToStep = () => flyTo(state.mode ? flow()[state.step].view : 'landing');

controls.addEventListener('start', () => {
  lastInteraction = time;
  if (camTween) { cancel(camTween); camTween = null; controls.enabled = true; }
});

/* =====================================================================
   UI
   ===================================================================== */
const $ = (s, el = document) => el.querySelector(s);
const panelBody = $('#panel-body');
const panelFoot = $('#panel-foot');
const priceEl = $('#price');
let shownPrice = 0, priceTween = null;

function updatePrice() {
  const to = total();
  if (to === shownPrice) return;
  const from = shownPrice;
  shownPrice = to;
  cancel(priceTween);
  priceTween = tween({ duration: 0.6, ease: ease.outCubic, onUpdate: (k) => { priceEl.textContent = money(Math.round(lerp(from, to, k))); } });
  priceEl.classList.remove('bump');
  void priceEl.offsetWidth;
  priceEl.classList.add('bump');
}

function renderStepper() {
  const el = $('#stepper');
  el.classList.toggle('is-on', !!state.mode);
  el.innerHTML = flow().map((s, i) => `
    <button type="button" class="step-pill ${i < state.step ? 'is-done' : ''} ${i === state.step ? 'is-current' : ''}" data-step="${i}" ${i < state.step ? '' : 'tabindex="-1"'}>
      <span class="dot">${i < state.step ? '✓' : i + 1}</span><span class="label">${s.title}</span>
    </button>`).join('');
}
$('#stepper').addEventListener('click', (e) => {
  const b = e.target.closest('.step-pill.is-done');
  if (b) goStep(+b.dataset.step);
});

const stagger = (html) => html.replace(/data-stagger/g, () => `style="--i:${stagger.i++}"`);

function renderPanel() {
  stagger.i = 0;
  const id = stepId();
  const f = flow(), i = state.step;
  const eyebrow = state.mode ? `<p class="eyebrow" data-stagger>Step ${i + 1} of ${f.length}</p>` : '';
  panelBody.innerHTML = stagger(eyebrow + VIEWS[id]());
  panelBody.scrollTop = 0;
  panelFoot.hidden = !state.mode;
  $('#back').textContent = i === 0 ? 'Start over' : 'Back';
  const last = i === f.length - 1;
  $('#next').textContent = last ? 'Place order' : 'Next';
  $('#next').classList.toggle('is-accent', last);
  BIND[id]?.();
  renderStepper();
  updatePrice();
}

const VIEWS = {
  landing: () => `
    <p class="eyebrow" data-stagger>Made-to-measure hairbrushes</p>
    <h1 data-stagger>Your brush,<br><em>tailored.</em></h1>
    <p class="lede" data-stagger>Fit a custom exoskeleton to a brush you already own, or design a brand-new one from scratch. Every choice you make shows up on the model as you go.</p>
    <div class="choices">
      <button type="button" class="choice" data-mode="existing" data-stagger>
        <span class="choice-icon">${ICONS.upgrade}</span>
        <span class="choice-title">Upgrade my brush</span>
        <span class="choice-text">Enter your brush’s measurements and we’ll print an exoskeleton that clips onto it, with any upgrades you want.</span>
        <span class="choice-meta">From ${money(CONFIG.basePrice)}</span>
      </button>
      <button type="button" class="choice" data-mode="new" data-stagger>
        <span class="choice-icon">${ICONS.create}</span>
        <span class="choice-title">Design a new one</span>
        <span class="choice-text">Pick a shape, bristles and finish, and we’ll build the whole brush for you.</span>
        <span class="choice-meta">From ${money(Math.min(...DESIGNS.map((d) => d.price)))}</span>
      </button>
    </div>`,

  measure: () => `
    <h2 data-stagger>Measure your brush</h2>
    <p class="lede" data-stagger>Use a ruler or calipers. The exoskeleton reshapes itself around the outline of your brush as you type.</p>
    ${DIM_FIELDS.map((f) => `
      <div class="field" data-key="${f.key}" data-stagger>
        <div class="field-top">
          <label for="dim-${f.key}">${f.label}</label>
          <div class="num"><input id="dim-${f.key}" type="number" inputmode="numeric" min="${f.min}" max="${f.max}" value="${state.dims[f.key]}" data-key="${f.key}"><span>mm</span></div>
        </div>
        <input type="range" min="${f.min}" max="${f.max}" step="1" value="${state.dims[f.key]}" data-key="${f.key}" aria-label="${f.label}">
        <p class="hint">${f.hint}</p>
      </div>`).join('')}
    <div class="fit" id="fit" data-stagger></div>
    <label class="switch" data-stagger><input type="checkbox" id="ghost-toggle" ${state.ghost ? 'checked' : ''}><span class="track"></span>Show my brush in the preview</label>`,

  design: () => `
    <h2 data-stagger>Choose a design</h2>
    <p class="lede" data-stagger>Every design is printed in your colour and finish, then hand-assembled with your choice of bristles.</p>
    <div class="grid-2" role="radiogroup" aria-label="Design">
      ${DESIGNS.map((d) => `
        <button type="button" class="opt" role="radio" aria-checked="${state.design === d.id}" data-design="${d.id}" data-stagger>
          <span class="opt-art">${DESIGN_ART[d.id]}</span>
          <span class="opt-title">${d.name}</span>
          <span class="opt-text">${d.blurb}</span>
          <span class="opt-price">${money(d.price)}</span>
        </button>`).join('')}
    </div>
    <h3 data-stagger>Size</h3>
    <div class="segmented" role="radiogroup" aria-label="Size" data-stagger>
      ${SIZES.map((s) => `<button type="button" role="radio" aria-checked="${state.size === s.id}" data-size="${s.id}">${s.name}<small>${s.price ? '+' + money(s.price) : s.note}</small></button>`).join('')}
    </div>`,

  bristles: () => `
    <h2 data-stagger>Pick your bristles</h2>
    <p class="lede" data-stagger>Watch them retract and regrow as you switch.</p>
    <div class="stack" role="radiogroup" aria-label="Bristles">
      ${BRISTLES.map((b) => `
        <button type="button" class="opt" role="radio" aria-checked="${state.bristle === b.id}" data-bristle="${b.id}" data-stagger>
          <span class="opt-title">${b.name}</span>
          <span class="opt-text">${b.blurb}</span>
          <span class="opt-price">${b.price ? '+' + money(b.price) : 'Included'}</span>
        </button>`).join('')}
    </div>`,

  upgrades: () => `
    <h2 data-stagger>Add upgrades</h2>
    <p class="lede" data-stagger>${state.mode === 'existing' ? 'These attach to your exoskeleton.' : 'Built straight into your new brush.'} Tap one to see it fitted.</p>
    <div class="stack">
      ${UPGRADES.map((u) => {
        const ok = upgradeAvailable(u.id);
        return `
        <button type="button" class="opt" aria-pressed="${ok && state.upgrades.has(u.id)}" data-upgrade="${u.id}" ${ok ? '' : 'disabled'} data-stagger>
          <span class="opt-row">
            <span class="opt-icon">${ICONS[u.id]}</span>
            <span><span class="opt-title">${u.name}</span><span class="opt-text">${ok ? u.blurb : 'Not available on a round brush.'}</span><span class="opt-price">+${money(u.price)}</span></span>
            <span class="check"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg></span>
          </span>
        </button>`;
      }).join('')}
    </div>`,

  finish: () => `
    <h2 data-stagger>Make it yours</h2>
    <p class="lede" data-stagger>${state.mode === 'existing' ? 'Pick the colour and finish of your exoskeleton.' : 'Pick the colour and finish of the body.'}</p>
    <h3 data-stagger>Colour</h3>
    <div class="swatches" role="radiogroup" aria-label="Colour" data-stagger>
      ${COLORS.map((c) => `<button type="button" class="swatch" role="radio" aria-checked="${state.color === c.id}" aria-label="${c.name}" title="${c.name}" style="--c:${c.hex}" data-color="${c.id}"></button>`).join('')}
    </div>
    <p class="swatch-name" id="swatch-name" data-stagger>${COLORS.find((c) => c.id === state.color).name}</p>
    <h3 data-stagger>Finish</h3>
    <div class="segmented" role="radiogroup" aria-label="Finish" data-stagger>
      ${FINISHES.map((f) => `<button type="button" role="radio" aria-checked="${state.finish === f.id}" data-finish="${f.id}">${f.name}<small>${f.price ? '+' + money(f.price) : 'Included'}</small></button>`).join('')}
    </div>
    <h3 data-stagger>Engraving <span style="text-transform:none;letter-spacing:0;font-weight:600">· +${money(CONFIG.engravingPrice)}</span></h3>
    <div data-stagger>
      <input class="text-input" id="engrave" maxlength="14" placeholder="A name or initials" value="${escapeHtml(state.engraving)}" autocomplete="off">
      <div class="counter"><span>${state.mode === 'existing' ? 'Laser-engraved on the back plate' : 'Laser-engraved on the handle'}</span><span id="engrave-count">${state.engraving.length}/14</span></div>
    </div>`,

  review: () => `
    <h2 data-stagger>Review your brush</h2>
    <p class="lede" data-stagger>${state.mode === 'existing'
      ? `An exoskeleton fitted to your ${state.dims.length} × ${state.dims.headWidth} mm brush.`
      : `${DESIGNS.find((d) => d.id === state.design).name}, ${SIZES.find((s) => s.id === state.size).name.toLowerCase()} size, ${state.dims.length} mm long.`}</p>
    <ul class="lines" data-stagger>
      ${priceLines().map(([n, p]) => `<li><span>${escapeHtml(n)}</span><span>${p ? money(p) : '—'}</span></li>`).join('')}
      <li class="total"><span>Total</span><span>${money(total())}</span></li>
    </ul>
    <div class="actions" data-stagger>
      <button type="button" class="btn btn-outline" id="explode" aria-pressed="${state.explode}">Exploded view</button>
      ${state.mode === 'existing' ? '<button type="button" class="btn btn-outline" id="download">Download fitted STL</button>' : ''}
    </div>
    ${state.mode === 'existing' ? '<p class="note" data-stagger>The fitted STL is your exoskeleton stretched to these measurements. Check clearances before printing.</p>' : ''}`,
};

function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function setRangeFill(r) { r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`); }

function renderFit() {
  const el = $('#fit');
  if (!el) return;
  const d = state.dims;
  const pct = (v, r) => `${Math.round((v / r) * 100)}%`;
  el.innerHTML = `
    <span class="fit-title">Exoskeleton fitted</span>
    <span class="fit-chip">head length <b>${pct(d.headLength, REF.headLength)}</b></span>
    <span class="fit-chip">head width <b>${pct(d.headWidth, REF.headWidth)}</b></span>
    <span class="fit-chip">handle <b>${pct(d.handleWidth, REF.handleWidth)}</b></span>
    <span class="fit-chip">body <b>${pct(d.length, REF.length)}</b></span>`;
}

function setActiveDim(key) {
  document.querySelectorAll('.dim-label').forEach((l) => l.classList.toggle('is-active', l.dataset.dim === key));
}

let reframeTimer = null;

const BIND = {
  landing() {
    panelBody.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => startFlow(b.dataset.mode)));
  },

  measure() {
    const setDim = (k, v, from) => {
      const f = DIM_FIELDS.find((x) => x.key === k);
      v = clamp(Math.round(+v || 0), f.min, f.max);
      state.dims[k] = v;
      if (k === 'length' || k === 'headLength') {
        state.dims.headLength = Math.min(state.dims.headLength, state.dims.length - 60);
        const hl = panelBody.querySelectorAll('[data-key="headLength"]');
        hl.forEach((el) => { if (el.tagName === 'INPUT') { el.value = state.dims.headLength; if (el.type === 'range') setRangeFill(el); } });
      }
      panelBody.querySelectorAll(`input[data-key="${k}"]`).forEach((el) => {
        if (el !== from) el.value = state.dims[k];
        if (el.type === 'range') setRangeFill(el);
      });
      renderFit();
      clearTimeout(reframeTimer);
      reframeTimer = setTimeout(() => stepId() === 'measure' && flyTo('top', 1.1), 700);
    };
    panelBody.querySelectorAll('input[data-key]').forEach((el) => {
      if (el.type === 'range') setRangeFill(el);
      el.addEventListener('input', () => {
        const f = DIM_FIELDS.find((x) => x.key === el.dataset.key);
        // While typing, only apply values that are already in range; 'change' clamps the rest.
        if (el.type === 'range' || (+el.value >= f.min && +el.value <= f.max)) setDim(el.dataset.key, el.value, el);
      });
      el.addEventListener('change', () => { setDim(el.dataset.key, el.value); el.value = state.dims[el.dataset.key]; });
      el.addEventListener('focus', () => setActiveDim(el.dataset.key));
      el.addEventListener('pointerdown', () => setActiveDim(el.dataset.key));
      el.addEventListener('blur', () => setActiveDim(null));
    });
    $('#ghost-toggle').addEventListener('change', (e) => { state.ghost = e.target.checked; product.setGhost(state.ghost); });
    renderFit();
  },

  design() {
    panelBody.querySelectorAll('[data-design]').forEach((b) => b.addEventListener('click', () => {
      if (state.design === b.dataset.design) return;
      state.design = b.dataset.design;
      state.dims = designDims();
      swapProduct(new NewProduct(state.design, state.bristle));
      panelBody.querySelectorAll('[data-design]').forEach((x) => x.setAttribute('aria-checked', x === b));
      tween({ delay: 0.3, duration: 0.001, onComplete: () => flyTo('overview') });
      updatePrice();
    }));
    panelBody.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
      state.size = b.dataset.size;
      state.dims = designDims();
      panelBody.querySelectorAll('[data-size]').forEach((x) => x.setAttribute('aria-checked', x === b));
      tween({ delay: 0.2, duration: 0.001, onComplete: () => flyTo('overview') });
      updatePrice();
    }));
  },

  bristles() {
    panelBody.querySelectorAll('[data-bristle]').forEach((b) => b.addEventListener('click', () => {
      state.bristle = b.dataset.bristle;
      product.brush.setBristle(state.bristle);
      panelBody.querySelectorAll('[data-bristle]').forEach((x) => x.setAttribute('aria-checked', x === b));
      flyTo('bristles', 1);
      updatePrice();
    }));
  },

  upgrades() {
    panelBody.querySelectorAll('[data-upgrade]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.upgrade;
      const on = !state.upgrades.has(id);
      if (on) state.upgrades.add(id); else state.upgrades.delete(id);
      b.setAttribute('aria-pressed', on);
      const added = syncParts();
      if (on && added[0]) flyTo(added[0].view(product.anchors()), 1.2);
      else flyTo('overview', 1.2);
      updatePrice();
    }));
  },

  finish() {
    panelBody.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
      state.color = b.dataset.color;
      panelBody.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-checked', x === b));
      $('#swatch-name').textContent = COLORS.find((c) => c.id === state.color).name;
      applyFinish(true);
      updatePrice();
    }));
    panelBody.querySelectorAll('[data-finish]').forEach((b) => b.addEventListener('click', () => {
      state.finish = b.dataset.finish;
      panelBody.querySelectorAll('[data-finish]').forEach((x) => x.setAttribute('aria-checked', x === b));
      applyFinish(true);
      updatePrice();
    }));
    const input = $('#engrave');
    let timer = null, focused = false;
    input.addEventListener('input', () => {
      state.engraving = input.value;
      $('#engrave-count').textContent = `${input.value.length}/14`;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const text = state.engraving.trim();
        const existing = product.parts.get('engrave');
        const added = syncParts();
        if (existing && text) existing.setText(text);
        const part = product.parts.get('engrave');
        if (part && !focused) { flyTo(part.view(product.anchors()), 1.2); focused = true; }
        if (!part) { focused = false; flyTo('overview'); }
        updatePrice();
      }, 380);
    });
  },

  review() {
    $('#explode').addEventListener('click', (e) => {
      state.explode = !state.explode;
      e.currentTarget.setAttribute('aria-pressed', state.explode);
      flyTo({ target: product.anchors().center, r: frameDistance(product.anchors().length) * (state.explode ? 1.15 : 1), phi: 1.12, theta: 0.5 }, 1.1);
    });
    $('#download')?.addEventListener('click', downloadFittedSTL);
  },
};

function startFlow(mode) {
  state.mode = mode;
  state.step = 0;
  state.explode = false;
  if (mode === 'existing') {
    state.dims = { ...REF };
    if (product?.kind !== 'existing') swapProduct(new ExistingProduct(stlGeometry));
    product.setGhost(state.ghost);
  } else {
    state.dims = designDims();
    swapProduct(new NewProduct(state.design, state.bristle));
  }
  goStep(0);
}

function goStep(i) {
  state.step = i;
  if (stepId() !== 'review') state.explode = false;
  renderPanel();
  flyToStep();
}

function resetAll() {
  Object.assign(state, {
    mode: null, step: 0, dims: { ...REF }, design: 'paddle', size: 'm', bristle: 'nylon',
    upgrades: new Set(), color: 'cobalt', finish: 'satin', engraving: '', ghost: true, explode: false,
  });
  shownPrice = 0;
  swapProduct(new ExistingProduct(stlGeometry), { intro: product ? 'drop' : 'scan' });
  renderPanel();
  flyToStep();
}

$('#back').addEventListener('click', () => (state.step === 0 ? resetAll() : goStep(state.step - 1)));
$('#next').addEventListener('click', () => (state.step === flow().length - 1 ? placeOrder() : goStep(state.step + 1)));
$('#brand').addEventListener('click', () => stlGeometry && resetAll());
$('#recenter').addEventListener('click', flyToStep);
$('#spin').addEventListener('click', (e) => {
  state.spin = !state.spin;
  e.currentTarget.setAttribute('aria-pressed', state.spin);
  lastInteraction = -10;
});

function placeOrder() {
  const no = `BL-${Math.floor(10000 + Math.random() * 89999)}`;
  const modal = $('#modal');
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="order-title">
      <svg class="success" viewBox="0 0 76 76"><circle cx="38" cy="38" r="35"/><path d="M24 39l9 9 19-20"/></svg>
      <h2 id="order-title">Order placed</h2>
      <p>Order <span class="order-no">${no}</span> · ${money(total())}</p>
      <p>We’ll print, finish and ship your brush within 5 working days.</p>
      <button type="button" class="btn btn-primary" id="again">Start another</button>
    </div>`;
  modal.hidden = false;
  $('#again').addEventListener('click', () => { modal.hidden = true; resetAll(); });
  const c = product.anchors().center.clone().add(V3(rootGoalX, 0, 0));
  const g = product.group, r0 = g.rotation.y;
  tween({ duration: 1.4, ease: ease.inOutCubic, onUpdate: (k) => { g.rotation.y = r0 + k * Math.PI * 2; g.position.y = Math.sin(k * Math.PI) * 30; } });
  [0, 0.25, 0.5].forEach((d, i) => tween({ delay: d + 0.3, duration: 0.001, onComplete: () => burst(c.clone().add(V3((i - 1) * 60, 20, 0)), [accentHex(), colorHex(), '#ffd36b'][i], 40, 80) }));
}

function downloadFittedSTL() {
  const geom = product.exo.geom.clone();
  product.exo.deformInto(geom, state.dims);
  const data = new STLExporter().parse(new THREE.Mesh(geom), { binary: true });
  geom.dispose();
  const url = URL.createObjectURL(new Blob([data], { type: 'model/stl' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `exoskeleton-fit-${state.dims.length}x${state.dims.headWidth}.stl`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* =====================================================================
   Resize + main loop
   ===================================================================== */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  const f = viewportFree();
  camera.setViewOffset(w, h, f.dx, f.dy, w, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => { resize(); if (!camTween) flyToStep(); });
resize();

// ?nocap lets slow software renderers (e.g. headless screenshots) jump straight to animation end states.
const DT_CAP = new URLSearchParams(location.search).has('nocap') ? 10 : 0.25;
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), DT_CAP);
  time += dt;
  updateTweens();

  for (const k of DIM_KEYS) cur.dims[k] = damp(cur.dims[k], state.dims[k], 7, dt);
  cur.explode = damp(cur.explode, state.explode ? 1 : 0, 5, dt);

  if (product) {
    product.explode = cur.explode;
    product.update(cur.dims, dt);
    rootGoalX = -product.centerX();
    const a = product.anchors();
    for (const p of product.parts.values()) p.place(a, cur.explode);
  }
  productRoot.position.x = damp(productRoot.position.x, rootGoalX, 4, dt);
  productRoot.position.y = Math.sin(time * 1.3) * 1.6;

  const spinnable = !state.mode || stepId() === 'review';
  controls.autoRotate = state.spin && spinnable && !camTween && time - lastInteraction > 3;
  if (!camTween) controls.update();

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* =====================================================================
   Boot
   ===================================================================== */
async function boot() {
  const loader = $('#loader');
  try {
    const res = await fetch(CONFIG.stlPath);
    if (!res.ok) throw new Error(`Could not load ${CONFIG.stlPath} (${res.status})`);
    stlGeometry = new STLLoader().parse(await res.arrayBuffer());
  } catch (err) {
    $('#loader-text').textContent = `Couldn’t load the brush model: ${err.message}`;
    loader.classList.add('is-error');
    throw err;
  }
  renderPanel();
  frame();
  swapProduct(new ExistingProduct(stlGeometry), { intro: 'scan' });
  const v = computeView('landing');
  controls.target.copy(v.target);
  camera.position.setFromSpherical(new THREE.Spherical(v.r * 1.5, 1.2, -0.4)).add(v.target);
  flyTo('landing', 2.4);
  loader.classList.add('is-done');
}
if (location.protocol !== 'file:') boot();
