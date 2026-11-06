import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { voxelTexture } from './voxels.js';
import { createExplorer } from './explore.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : d);
// ?scene=khwopa loads the campus; the default is Bhaktapur's Taumadhi square.
const { buildDiorama, W, D, G, PLACES, START, VIEW = {} } = q.get('scene') === 'khwopa' ? await import('./khwopa.js') : await import('./layout.js');
const V = { fit: 63, az: 40, el: 37, ty: 9, shadow: 85, ...VIEW };
if (V.title) document.title = V.title;
if (V.caption) document.querySelector('.caption').innerHTML = V.caption;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = num('exp', 1.1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const world = buildDiorama();
const mesh = world.build(new THREE.MeshStandardMaterial({ vertexColors: true, map: voxelTexture(), roughness: 0.92, metalness: 0 }));
// The model and the explorer share one voxel-space group (origin at the platform corner).
const root = new THREE.Group();
root.position.set(-W / 2, 0, -D / 2);
root.add(mesh);
scene.add(root);

// Soft contact shadow on an invisible floor so the model sits in space.
const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.22 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
floor.receiveShadow = true;
scene.add(floor);

// Warm, directional late-morning sun from the upper right; cool sky fill.
scene.add(new THREE.HemisphereLight(0xe4e9f0, 0x76604c, 1.35));
const sun = new THREE.DirectionalLight(0xffe2bc, 3.0);
sun.position.set(60, 110, 48).multiplyScalar(2); // same direction; far enough back for the larger campus
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -V.shadow, right: V.shadow, top: V.shadow, bottom: -V.shadow, near: 1, far: 800 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.25;
sun.shadow.radius = 2;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xb8c8e0, 0.35);
fill.position.set(-60, 40, 80);
scene.add(fill);

// Orthographic near-isometric camera, a little higher than true isometric (35.3°), turned a few
// degrees off the diagonal so Nyatapola's stair front leads and the view isn't mirror-symmetric.
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 1000);
const target = new THREE.Vector3(num('tx', 0), num('ty', G + V.ty), num('tz', 0));
const az = THREE.MathUtils.degToRad(num('az', V.az)), el = THREE.MathUtils.degToRad(num('el', V.el));
camera.position.copy(target).add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(300));
camera.zoom = num('zoom', 1);

// Fit the whole platform (plus the tallest spire) into view.
const FIT = V.fit;
function resize() {
  const a = innerWidth / innerHeight;
  const h = a > 1.25 ? FIT : (FIT * 1.25) / a;
  Object.assign(camera, { left: -h * a, right: h * a, top: h, bottom: -h });
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  explorer?.resize(a);
}
addEventListener('resize', resize);
let explorer;
resize();

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(target);
Object.assign(controls, {
  // no pan: zooming in hands the framing to the explorer-follow in explore.js
  enableDamping: true, dampingFactor: 0.08, enablePan: false,
  minZoom: 0.7, maxZoom: 5, minPolarAngle: 0.55, maxPolarAngle: 1.2,
});
controls.update();

explorer = createExplorer({
  renderer, root, world, ortho: camera, controls, lights: [sun, fill], G, places: PLACES, start: START,
  home: { target: target.clone(), az, el, zoom: camera.zoom },
});
explorer.resize(innerWidth / innerHeight);
window.__explore = explorer;

let last = performance.now();
renderer.setAnimationLoop((t) => {
  renderer.render(scene, explorer.update(Math.min(Math.max(1, t - last) / 1000, 0.05)));
  last = t;
});
requestAnimationFrame(() => requestAnimationFrame(() => (window.__ready = true)));
