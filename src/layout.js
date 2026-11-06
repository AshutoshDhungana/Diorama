// Composition of the square. Grid: x → (screen lower-right), z → (screen lower-left), y up.
// Tall fabric lines the two back edges; the front edges stay low so the square reads from the camera.
import { VoxelWorld } from './voxels.js';
import { P } from './palette.js';
import * as A from './architecture.js';
import * as E from './environment.js';

export const W = 100, D = 88, G = 12, H = 100;

export const PLACES = [
  [52, 26, 19, 'Nyatapola', 'Five-tiered pagoda, 1702'],
  [21, 27, 14, 'Bhairavnath Temple', 'Three-tiered pagoda of Bhairav'],
  [24, 56, 12, 'Vatsala Durga', 'Stone shikhara temple'],
  [40, 50, 5, 'Taleju Bell', 'The bell of barking dogs'],
  [50, 61, 5, "Bhupatindra Malla's Column", 'The king kneels beneath a gilt parasol'],
  [79, 62, 9, 'Pagoda Shrine', 'Two-tiered shrine on a brick plinth'],
  [61, 75, 8, 'Dhunge Dhara', 'Sunken stone water spout'],
  [92, 58, 9, "Potters' Yard", 'Clay pots drying in rows'],
  [24, 81, 9, 'Pati', 'Open rest house'],
  [78, 33, 9, 'Pati', 'Open rest house'],
  [93, 6, 8, 'Chautara', 'Resting platform under a pipal tree'],
];
export const START = [46.5, 70.5]; // forecourt between Vatsala and the dhara

export function buildDiorama() {
  const w = new VoxelWorld(W, H, D);
  E.platform(w, W, D, G);

  // Landmarks. Bhairavnath faces Nyatapola across a narrow stone-paved lane, as in Taumadhi Square.
  E.stonePaving(w, 30, 13, 38, 42, G);
  E.stonePaving(w, 44, 41, 62, 50, G);
  A.nyatapola(w, 52, G, 26);
  A.bhairavnath(w, 21, G, 27, [1, 0]);
  E.stonePaving(w, 34, 46, 44, 66, G);
  A.vatsala(w, 24, G, 56, [1, 0]);
  A.taleBell(w, 40, G, 50, [1, 0]);
  A.royalColumn(w, 50, G, 61);
  A.shrineTemple(w, 79, G, 62, [0, 1]);
  E.dhara(w, 57, 72, 9, 7, 4, G);

  // Back row (z = 0 edge)
  A.house(w, 14, G, 0, 12, 10, { floors: 4 });
  E.tree(w, 30, G, 4, { r: 6, trunk: 17, seed: 11 }); // courtyard tree breaking the back roofline
  A.house(w, 36, G, 0, 12, 10, { floors: 4 });
  A.house(w, 48, G, 0, 11, 10, { floors: 3, brick: P.brickOld });
  A.house(w, 59, G, 0, 12, 10, { floors: 4, roof: 'terrace' });
  A.house(w, 71, G, 0, 10, 10, { floors: 3 });
  A.house(w, 81, G, 0, 7, 10, { floors: 2, brick: P.brickOld, roof: 'terrace' });
  E.chautara(w, 93, G, 6, 3, 6); // pipal tree on its stepped platform, in the back corner

  // Left row (x = 0 edge), facades toward the square
  const fx = [[1, 0], [0, 1]];
  A.house(w, 0, G, 0, 14, 13, { floors: 4, facade: fx });
  A.house(w, 0, G, 13, 11, 11, { floors: 3, facade: fx, brick: P.brickOld });
  A.house(w, 0, G, 24, 11, 13, { floors: 4, facade: fx });
  A.house(w, 0, G, 37, 11, 10, { floors: 3, facade: fx, roof: 'terrace', brick: P.brickOld });
  A.house(w, 0, G, 47, 11, 16, { floors: 3, facade: fx });
  A.house(w, 0, G, 63, 11, 11, { floors: 3, facade: fx, shops: true, awning: true, plaster: P.plaster });
  E.tree(w, 5, G, 80, { r: 5, trunk: 5, seed: 7 });

  // Right of Nyatapola: a dense block of houses and a second pati facing the square
  A.house(w, 68, G, 12, 10, 11, { floors: 3, facade: [[0, 1], [-1, 0]] });
  A.house(w, 78, G, 12, 10, 12, { floors: 4, roof: 'terrace', facade: [[0, 1]], brick: P.brickOld });
  const pf2 = A.pati(w, 70, G, 30, 16, 7);

  // Right row (x = W edge)
  const fr = [[1, 0], [0, 1], [-1, 0]];
  A.house(w, 88, G, 13, 12, 12, { floors: 3, facade: fr });
  A.house(w, 88, G, 25, 12, 11, { floors: 2, facade: fr, roof: 'terrace', brick: P.brickOld });
  A.house(w, 88, G, 36, 12, 14, { floors: 3, facade: fr, shops: true, peacock: [1, 0] });
  A.house(w, 89, G, 77, 10, 8, { floors: 1, facade: fr, shops: true, awning: true, brick: P.brickOld });

  // Front edge (z = D edge): open pati and the stair down off the platform
  const pf = A.pati(w, 14, G, 77, 20, 8);
  E.sideStair(w, 38, D, G);


  // Market and everyday life
  E.stall(w, 44, G, 78, 3, 2, 1);
  E.stall(w, 48, G, 80, 3, 2, 2);
  E.stall(w, 70, G, 80, 3, 2, 4);
  E.stall(w, 11.5, G, 50, 2, 3, 3);
  E.pottery(w, 89, G, 53, 8, 11, 1);
  E.potterWheel(w, 87, G, 70, 77);
  E.wayShrine(w, 68, G, 54);
  E.wayShrine(w, 46, G, 74);
  for (let i = 0; i < 6; i++) E.plant(w, 11.6, G, 26 + i * 2, i);
  for (let i = 0; i < 4; i++) E.plant(w, 47.5 + (i % 2) * 10 + (i >> 1), G, 47.5 + (i >> 1), 10 + i);
  E.crowd(w, 44, 50, 86, 86, 30, G, 1);
  E.crowd(w, 14.5, 77.5, 33, 84, 6, pf, 2);
  E.crowd(w, 68, 24, 86, 46, 6, G, 3);
  E.crowd(w, 70.5, 30.5, 85, 36, 4, pf2, 5);
  E.crowd(w, 30, 14, 38, 42, 4, G, 4);

  E.overgrowth(w, W, D, G);
  return w;
}
