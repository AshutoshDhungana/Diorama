// The explorer: a blocky visitor in daura-suruwal, waistcoat and dhaka topi with a red bag, built at the
// crowd's scale (~3.5 voxels) from boxes so limbs can swing. Origin at the feet, facing +z.
import * as THREE from 'three';

const mats = new Map();
const mat = (hex) => {
  if (!mats.has(hex)) {
    // stencil 1 marks pixels where the explorer is visible, so the x-ray pass skips them
    mats.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, stencilWrite: true, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp }));
  }
  return mats.get(hex);
};
// Pale silhouette drawn only where buildings hide the explorer (diorama view).
const xrayMat = new THREE.MeshBasicMaterial({
  color: 0xfff3dc, transparent: true, opacity: 0.55, depthWrite: false, depthFunc: THREE.GreaterDepth,
  stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
});

function part(parent, [sx, sy, sz], [x, y, z], hex) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(hex));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  const xr = new THREE.Mesh(m.geometry, xrayMat);
  xr.renderOrder = 10;
  m.add(xr);
  parent.add(m);
  return m;
}
function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function makeCharacter() {
  const group = new THREE.Group();
  const body = pivot(group, 0, 0, 0);
  const CLOTH = 0xe0d6c0, SKIN = 0xa8734f, DARK = 0x2b2622;
  const legs = [-0.21, 0.21].map((x) => {
    const p = pivot(body, x, 1.5, 0);
    part(p, [0.34, 1.3, 0.4], [0, -0.65, 0], 0xd3c8b0);
    part(p, [0.36, 0.22, 0.54], [0, -1.39, 0.06], 0x2a1d16);
    return p;
  });
  part(body, [0.86, 1.3, 0.5], [0, 2.15, 0], CLOTH); // daura
  part(body, [0.9, 0.42, 0.54], [0, 1.4, 0], CLOTH); // its skirt over the thighs
  part(body, [0.9, 0.72, 0.54], [0, 2.42, 0], DARK); // istakoat
  part(body, [0.6, 0.7, 0.26], [0, 2.25, -0.38], 0xb8352b); // bag on the back: reads the facing from above
  const arms = [-1, 1].map((sx) => {
    const p = pivot(body, sx * 0.56, 2.72, 0);
    part(p, [0.24, 1.0, 0.34], [0, -0.5, 0], CLOTH);
    part(p, [0.22, 0.2, 0.3], [0, -1.1, 0], SKIN);
    return p;
  });
  const head = pivot(body, 0, 2.8, 0);
  part(head, [0.64, 0.64, 0.64], [0, 0.34, 0], SKIN);
  part(head, [0.66, 0.2, 0.3], [0, 0.6, -0.18], 0x17120f); // hair at the back
  for (const sx of [-1, 1]) part(head, [0.1, 0.1, 0.04], [sx * 0.14, 0.42, 0.33], 0x17120f);
  part(head, [0.66, 0.34, 0.66], [0, 0.83, -0.02], 0x6b2a36); // dhaka topi
  part(head, [0.68, 0.07, 0.68], [0, 0.69, -0.02], 0xd6a03a);

  let phase = 0, swing = 0, idle = 0, look = 0, t = 0;
  return {
    group,
    bob: () => body.position.y,
    xray: (on) => (xrayMat.visible = on),
    // speed in voxels/s: legs and arms swing with stride, a light bob; after a pause, a look around
    animate(dt, speed) {
      t += dt;
      swing += (Math.min(1, speed / 6) - swing) * Math.min(1, dt * 10);
      phase += dt * (3 + speed * 1.15);
      const s = Math.sin(phase) * 0.7 * swing;
      legs[0].rotation.x = s;
      legs[1].rotation.x = -s;
      arms[0].rotation.x = -s * 0.8;
      arms[1].rotation.x = s * 0.8;
      body.position.y = Math.abs(Math.cos(phase)) * 0.1 * swing;
      body.rotation.x = 0.06 * Math.max(0, speed - 7) / 4; // lean into a run
      idle = speed < 0.2 ? idle + dt : 0;
      look += ((idle > 2.5 ? 1 : 0) - look) * Math.min(1, dt * 2);
      head.rotation.y = look * Math.sin(t * 0.7) * 0.5;
    },
  };
}
