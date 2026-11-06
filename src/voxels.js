import * as THREE from 'three';

// Integer hash -> [0,1). Drives every "random" choice so the scene is deterministic.
export function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1440662683 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

const FILLED = 0x1000000;

// A material is a hex colour, an array of hex colours (picked per voxel), or fn(x,y,z) -> either.
function resolve(mat, x, y, z) {
  if (typeof mat === 'function') mat = mat(x, y, z);
  if (Array.isArray(mat)) mat = mat[Math.floor(hash(x, y, z) * mat.length)];
  const j = 1 + (hash(x, y, z, 7) - 0.5) * 0.07;
  const r = Math.min(255, Math.round(((mat >> 16) & 255) * j));
  const g = Math.min(255, Math.round(((mat >> 8) & 255) * j));
  const b = Math.min(255, Math.round((mat & 255) * j));
  return (r << 16) | (g << 8) | b;
}

export class VoxelWorld {
  constructor(w, h, d) {
    Object.assign(this, { w, h, d });
    this.data = new Uint32Array(w * h * d);
    this.details = []; // free-floating sub-voxel boxes: [x, y, z, sx, sy, sz, hex]
  }

  inside(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d;
  }
  get(x, y, z) {
    return this.inside(x, y, z) ? this.data[x + this.w * (z + this.d * y)] : 0;
  }
  set(x, y, z, mat) {
    if (!this.inside(x, y, z)) return;
    this.data[x + this.w * (z + this.d * y)] = mat == null ? 0 : resolve(mat, x, y, z) | FILLED;
  }
  box(x0, y0, z0, x1, y1, z1, mat) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, mat);
  }
  // Box given by min corner + size, in voxel units, may be fractional.
  detail(x, y, z, sx, sy, sz, hex) {
    this.details.push([x, y, z, sx, sy, sz, hex]);
  }
  // Same, but centred on (cx, cz) at base height y.
  detailC(cx, y, cz, sx, sy, sz, hex) {
    this.details.push([cx - sx / 2, y, cz - sz / 2, sx, sy, sz, hex]);
  }

  // Face-culled mesh with per-vertex voxel ambient occlusion (0fps.net style).
  build(material) {
    const pos = [], nor = [], col = [], uv = [], idx = [];
    const lin = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const c = i / 255;
      lin[i] = c < 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }
    const AO = [0.42, 0.62, 0.82, 1];
    const solid = (p) => (this.get(p[0], p[1], p[2]) ? 1 : 0);
    const CORNERS = [[0, 0], [1, 0], [1, 1], [0, 1]];

    const quad = (verts, n, rgb, aos, uvs) => {
      const base = pos.length / 3;
      for (let i = 0; i < 4; i++) {
        pos.push(...verts[i]);
        nor.push(...n);
        const a = aos[i];
        col.push(rgb[0] * a, rgb[1] * a, rgb[2] * a);
        uv.push(...uvs[i]);
      }
      // flip the diagonal so AO interpolates without the classic anisotropy artefact
      if (aos[0] + aos[2] < aos[1] + aos[3]) idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      else idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };

    const { w, h, d, data } = this;
    for (let y = 0; y < h; y++)
      for (let z = 0; z < d; z++)
        for (let x = 0; x < w; x++) {
          const v = data[x + w * (z + d * y)];
          if (!v) continue;
          const rgb = [lin[(v >> 16) & 255], lin[(v >> 8) & 255], lin[v & 255]];
          for (let a = 0; a < 3; a++)
            for (const s of [1, -1]) {
              const L = [x, y, z];
              L[a] += s;
              if (solid(L)) continue;
              const u = (a + 1) % 3, vv = (a + 2) % 3;
              const order = s > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
              const verts = [], aos = [], uvs = [];
              for (const ci of order) {
                const [cu, cv] = CORNERS[ci];
                const du = cu ? 1 : -1, dv = cv ? 1 : -1;
                const p1 = [...L]; p1[u] += du;
                const p2 = [...L]; p2[vv] += dv;
                const p3 = [...L]; p3[u] += du; p3[vv] += dv;
                const s1 = solid(p1), s2 = solid(p2), c = solid(p3);
                aos.push(AO[s1 && s2 ? 0 : 3 - (s1 + s2 + c)]);
                const p = [x, y, z];
                p[a] += s > 0 ? 1 : 0;
                p[u] += cu;
                p[vv] += cv;
                verts.push(p);
                uvs.push([cu, cv]);
              }
              const n = [0, 0, 0];
              n[a] = s;
              quad(verts, n, rgb, aos, uvs);
            }
        }

    // Detail boxes: no culling, no AO, sampled at the texture centre so they skip the voxel grid lines.
    const C = new THREE.Color();
    for (const [x, y, z, sx, sy, sz, hex] of this.details) {
      C.setHex(hex);
      const rgb = [C.r, C.g, C.b];
      const lo = [x, y, z], size = [sx, sy, sz];
      for (let a = 0; a < 3; a++)
        for (const s of [1, -1]) {
          const u = (a + 1) % 3, vv = (a + 2) % 3;
          const order = s > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1];
          const verts = order.map((ci) => {
            const p = [...lo];
            if (s > 0) p[a] += size[a];
            p[u] += CORNERS[ci][0] * size[u];
            p[vv] += CORNERS[ci][1] * size[vv];
            return p;
          });
          const n = [0, 0, 0];
          n[a] = s;
          quad(verts, n, rgb, [1, 1, 1, 1], Array(4).fill([0.5, 0.5]));
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}

// Subtle bevel texture: a faint dark rim on each voxel face so the construction stays legible.
export function voxelTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 16, 16);
  g.strokeStyle = 'rgba(0,0,0,0.13)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, 16, 16);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}
