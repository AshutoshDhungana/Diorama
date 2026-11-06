// Exploration layer: one persistent explorer walking the voxel world, seen either through the composed
// orthographic diorama camera or through their own eyes. A single eased blend `s` (0 = diorama,
// 1 = first person) carries one view into the other: a near-orthographic telephoto that dives toward
// the eye while widening, so both ends match their real cameras exactly.
import * as THREE from 'three';
import { solidGrid, makeBody, walk } from './collision.js';
import { makeCharacter } from './character.js';

const WALK = 6, RUN = 11, BLEND = 1.4, EYE = 3.05, FAR = 6000, NEAR_D = 8;
const Y = new THREE.Vector3(0, 1, 0);
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const lerp = THREE.MathUtils.lerp;

const MOVE = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

// places: [x, z, reach, name, note] in voxel coordinates; start: [x, z] on the ground
export function createExplorer({ renderer, root, world, ortho, controls, lights, home, G, places, start }) {
  const dom = renderer.domElement;
  const $ = (id) => document.getElementById(id);
  const solid = solidGrid(world);
  const body = makeBody(solid, start[0], G, start[1]);
  const hero = makeCharacter();
  root.add(hero.group);
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xe2a93a }));
  marker.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
  marker.visible = false;
  root.add(marker);
  // gold beacon over the explorer's head in the diorama view, so they stand out from the crowd
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({ color: 0xe0a030, depthTest: false }));
  beacon.renderOrder = 11;
  root.add(beacon);

  const persp = new THREE.PerspectiveCamera(70, 1, 0.05, 600);
  const vel = new THREE.Vector2(), keys = new Set();
  let facing = Math.PI, visY = body.y, yaw = 0, pitch = 0;
  let wantFp = false, s = 0, tween = null, dest = null, stuck = 0, place = null;

  // ---- modes ----------------------------------------------------------------------------------------
  const locked = () => document.pointerLockElement === dom;
  const lock = () => dom.requestPointerLock?.()?.catch?.(() => {});
  function setFp(on) {
    if (on === wantFp) return;
    if (on && s === 0) [yaw, pitch] = [wrap(facing + Math.PI), -0.12]; // look where the explorer faces
    wantFp = on;
    dest = null;
    if (on) lock();
    else if (locked()) document.exitPointerLock();
    hud();
  }
  function resetView() {
    setFp(false);
    const sp = new THREE.Spherical().setFromVector3(ortho.position.clone().sub(controls.target));
    tween = { t: 0, az: sp.theta, el: Math.PI / 2 - sp.phi, zoom: ortho.zoom };
  }

  // ---- input ----------------------------------------------------------------------------------------
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    keys.add(e.code);
    if (MOVE[e.code]) (dest = null), e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyV') setFp(!wantFp);
    else if (e.code === 'Escape' && wantFp && !locked()) setFp(false); // 1st Esc frees the mouse, 2nd leaves
    else if (e.code === 'KeyH' || e.code === 'Home') resetView();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear()); // no stuck keys after alt-tab
  document.addEventListener('pointerlockchange', hud);
  document.addEventListener('mousemove', (e) => {
    if (!wantFp || !(locked() || e.buttons & 1)) return; // locked look, or drag-look if lock is refused
    yaw -= e.movementX * 0.0024;
    pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0024, -1.4, 1.4);
  });
  // diorama view: a click (not a drag — that rotates the platform) walks the explorer there
  let down = null;
  dom.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  dom.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || e.button !== 0) return;
    if (wantFp) return void (locked() || lock());
    const p = pick(e);
    if (p) (dest = p), (stuck = 0), marker.position.set(p.x, p.y + 0.03, p.z);
  });
  $('bIso').onclick = (e) => (setFp(false), e.currentTarget.blur());
  $('bFp').onclick = (e) => (setFp(true), e.currentTarget.blur());
  $('bHome').onclick = (e) => (resetView(), e.currentTarget.blur());

  // March the click ray through the voxel grid to the first solid voxel; returns its top centre-ish.
  const ray = new THREE.Raycaster(), hit = new THREE.Vector3();
  const bounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3(world.w, world.h, world.d));
  function pick(e) {
    const r = dom.getBoundingClientRect();
    ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, ortho);
    ray.ray.origin.sub(root.position);
    if (!ray.ray.intersectBox(bounds, hit)) return null;
    const d = ray.ray.direction;
    for (let t = 0; t < 500; t += 0.1) {
      const x = hit.x + d.x * t, y = hit.y + d.y * t, z = hit.z + d.z * t;
      if (world.get(Math.floor(x), Math.floor(y), Math.floor(z))) return { x, y: Math.floor(y) + 1, z };
    }
    return null;
  }

  // ---- HUD ------------------------------------------------------------------------------------------
  function hud() {
    document.body.classList.toggle('fp', wantFp);
    $('bIso').classList.toggle('on', !wantFp);
    $('bFp').classList.toggle('on', wantFp);
    $('hint').innerHTML = !wantFp
      ? '<kbd>WASD</kbd> or click to walk · <kbd>Shift</kbd> run · drag or <kbd>Q</kbd><kbd>E</kbd> rotate · scroll zoom · <kbd>V</kbd> first person · <kbd>H</kbd> reset'
      : locked()
        ? '<kbd>WASD</kbd> walk · mouse look · <kbd>Shift</kbd> run · <kbd>V</kbd> back to the diorama'
        : '<b>Click to look around</b> · <kbd>WASD</kbd> walk · <kbd>V</kbd> or <kbd>Esc</kbd> back to the diorama';
  }
  hud();
  function showPlace(p) {
    if (p === place) return;
    place = p;
    if (p) [$('place').firstChild.textContent, $('place').lastChild.textContent] = [p[3], p[4]];
    $('place').classList.toggle('show', !!p);
  }

  // ---- per frame ------------------------------------------------------------------------------------
  const heroAt = new THREE.Vector3(), want = new THREE.Vector3(), off = new THREE.Vector3();
  const qFp = new THREE.Quaternion(), eul = new THREE.Euler(0, 0, 0, 'YXZ'), fwd = new THREE.Vector3(), focus = new THREE.Vector3();
  const lightBase = lights.map((l) => l.position.clone());

  function move(dt) {
    let ix = 0, iz = 0;
    for (const k of keys) if (MOVE[k]) (ix += MOVE[k][0]), (iz += MOVE[k][1]);
    // controls are relative to the view: the screen in the diorama, the gaze in first person
    const a = wantFp ? yaw : controls.getAzimuthalAngle();
    let mx = Math.cos(a) * ix - Math.sin(a) * iz, mz = -Math.sin(a) * ix - Math.cos(a) * iz;
    if (!ix && !iz && dest) {
      [mx, mz] = [dest.x - body.x, dest.z - body.z];
      if (Math.hypot(mx, mz) < 0.4) (dest = null), (mx = mz = 0);
    }
    const len = Math.hypot(mx, mz), sp = keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK;
    const k = damp(14, dt);
    vel.x += ((len ? (mx / len) * sp : 0) - vel.x) * k;
    vel.y += ((len ? (mz / len) * sp : 0) - vel.y) * k;
    const px = body.x, pz = body.z;
    walk(solid, body, vel.x * dt, vel.y * dt, dt);
    const speed = Math.hypot(body.x - px, body.z - pz) / dt;
    // a click-walk that runs into something gives up rather than pushing forever (no pathfinding)
    if (dest) {
      stuck = speed < 1 ? stuck + dt : 0;
      if (stuck > 0.35) dest = null;
    }
    marker.visible = !!dest && s === 0;
    if (wantFp) facing = yaw + Math.PI;
    else if (speed > 0.3) facing += wrap(Math.atan2(vel.x, vel.y) - facing) * damp(14, dt);
    visY += (body.y - visY) * damp(18, dt); // stair steps glide instead of popping
    hero.group.position.set(body.x, visY, body.z);
    hero.group.rotation.y = facing;
    hero.animate(dt, speed);
    let best = null;
    for (const p of places) {
      const r = Math.hypot(body.x - p[0], body.z - p[1]) / p[2];
      if (r < 1 && (!best || r < best.r)) best = { r, p };
    }
    showPlace(best && best.p);
  }

  function dioramaCamera(dt) {
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 0.9);
      const k = ease(tween.t);
      ortho.zoom = lerp(tween.zoom, home.zoom, k);
      ortho.updateProjectionMatrix();
      const az = tween.az + wrap(home.az - tween.az) * k, el = lerp(tween.el, home.el, k);
      ortho.position.copy(controls.target).add(off.setFromSphericalCoords(300, Math.PI / 2 - el, az));
      if (tween.t === 1) tween = null;
    } else if (s === 0 && (keys.has('KeyQ') || keys.has('KeyE'))) {
      off.copy(ortho.position).sub(controls.target).applyAxisAngle(Y, (keys.has('KeyQ') ? -1.5 : 1.5) * dt);
      ortho.position.copy(controls.target).add(off);
    }
    // Zoomed out, the composition stays centred on the square; zoomed in, it drifts to follow the explorer.
    const f = THREE.MathUtils.smoothstep(ortho.zoom, 1.15, 2);
    want.lerpVectors(home.target, heroAt.set(body.x, visY + 2, body.z).add(root.position), f);
    off.subVectors(want, controls.target).multiplyScalar(damp(6, dt));
    controls.target.add(off);
    ortho.position.add(off);
    controls.enabled = s === 0 && !tween;
    controls.update();
    // the light turns with the view, like a turntable under fixed gallery lamps
    const turn = controls.getAzimuthalAngle() - home.az;
    if (!wantFp && s === 0) lights.forEach((l, i) => l.position.copy(lightBase[i]).applyAxisAngle(Y, turn));
  }

  return {
    persp,
    body,
    get state() {
      return { s, wantFp, yaw, pitch, facing, x: body.x, y: body.y, z: body.z, place: place && place[3], az: controls.getAzimuthalAngle(), zoom: ortho.zoom, dest: !!dest };
    },
    look: (y, p) => ([yaw, pitch] = [y, p]),
    setFp,
    resetView,
    resize(aspect) {
      persp.aspect = aspect;
    },
    update(dt) {
      move(dt);
      s = THREE.MathUtils.clamp(s + (wantFp ? dt : -dt) / BLEND, 0, 1);
      dioramaCamera(dt);
      hero.group.visible = s < 0.85;
      hero.xray(s === 0);
      const sc = THREE.MathUtils.clamp(2.4 / ortho.zoom, 0.5, 2.4); // roughly constant on screen
      beacon.visible = s === 0;
      beacon.scale.set(sc, sc * 1.5, sc);
      beacon.position.set(body.x, visY + 4.2 + sc * 0.7 + Math.sin(performance.now() / 300) * 0.12 * sc, body.z);
      beacon.rotation.y += dt * 1.5;
      if (s === 0) return ortho;

      // first-person pose: eye with a slight walking bob, looking along yaw/pitch
      qFp.setFromEuler(eul.set(pitch, yaw, 0));
      heroAt.set(body.x, visY + EYE + hero.bob(), body.z).add(root.position);
      focus.copy(heroAt).addScaledVector(fwd.set(0, 0, -1).applyQuaternion(qFp), NEAR_D);
      // blend: focus point and rotation interpolate; distance and visible height interpolate in log space
      const k = ease(s);
      const hIso = (ortho.top - ortho.bottom) / ortho.zoom, hFp = 2 * NEAR_D * Math.tan(THREE.MathUtils.degToRad(35));
      const d = Math.exp(lerp(Math.log(FAR), Math.log(NEAR_D), k)), h = Math.exp(lerp(Math.log(hIso), Math.log(hFp), k));
      persp.quaternion.slerpQuaternions(ortho.quaternion, qFp, k);
      fwd.set(0, 0, -1).applyQuaternion(persp.quaternion);
      persp.position.lerpVectors(controls.target, focus, k).addScaledVector(fwd, -d);
      persp.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / 2 / d));
      persp.near = Math.max(0.05, d - 300);
      persp.far = d + 400;
      persp.updateProjectionMatrix();
      return persp;
    },
  };
}
