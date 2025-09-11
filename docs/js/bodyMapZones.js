export const CANVAS = { WIDTH: 48, HEIGHT: 50 };
const WIDTH = CANVAS.WIDTH;

/**
 * Mirror an SVG path across the vertical axis of the viewBox.
 * Supports basic commands used in this project (M, L, H, C and relative c).
 *
 * @param {string} d Path definition for the left side of the body
 * @returns {string} Mirrored path suitable for the right side
 */
function mirrorPath (d) {
  const segments = d.match(/[a-zA-Z][^a-zA-Z]*/g) || [];
  return segments
    .map(seg => {
      const cmd = seg[0];
      const nums = seg.slice(1).trim();
      if (!nums) return cmd;
      const parts = nums.split(/[ ,]+/).filter(Boolean).map(Number);
      if (cmd === 'M' || cmd === 'L' || cmd === 'C') {
        for (let i = 0; i < parts.length; i += 2) {
          parts[i] = WIDTH - parts[i];
        }
      } else if (cmd === 'H') {
        for (let i = 0; i < parts.length; i++) {
          parts[i] = WIDTH - parts[i];
        }
      } else if (cmd === 'c') {
        for (let i = 0; i < parts.length; i += 2) {
          parts[i] = -parts[i];
        }
      }
      return cmd + parts.join(' ');
    })
    .join(' ');
}

function mirrorBbox ([x1, y1, x2, y2]) {
  return [WIDTH - x2, y1, WIDTH - x1, y2];
}

function makeSymmetric (side, defs) {
  const sideLabel = side === 'front' ? 'priekis' : 'nugara';
  return defs.flatMap(def => {
    const left = {
      id: `${side}-left-${def.id}`,
      side,
      path: def.path,
      area: def.area,
      label: `Kairė ${def.label} (${sideLabel})`,
      bbox: def.bbox
    };
    const right = {
      id: `${side}-right-${def.id}`,
      side,
      path: mirrorPath(def.path),
      area: def.area,
      label: `Dešinė ${def.label} (${sideLabel})`,
      bbox: mirrorBbox(def.bbox)
    };
    return [left, right];
  });
}

// Symmetric limb definitions used for both front and back views
const limbDefs = [
  { id: 'upper-arm', path: 'M1 20 L6 20 L6 32 L1 32 Z', area: 60, label: 'žastas', bbox: [1, 20, 6, 32] },
  { id: 'lower-arm', path: 'M1.5 32 L5.5 32 L5.5 44 L1.5 44 Z', area: 48, label: 'dilbis', bbox: [1.5, 32, 5.5, 44] },
  { id: 'hand', path: 'M1.5 44 L6 44 L6 48 L1.5 48 Z', area: 18, label: 'plaštaka', bbox: [1.5, 44, 6, 48] },
  { id: 'thigh', path: 'M15 30 L23 30 L23 41 L15 41 Z', area: 88, label: 'šlaunis', bbox: [15, 30, 23, 41] },
  { id: 'leg', path: 'M16 41 L22 41 L22 46 L16 46 Z', area: 30, label: 'blauzda', bbox: [16, 41, 22, 46] },
  { id: 'foot', path: 'M15 46 L23 46 L23 50 L15 50 Z', area: 32, label: 'pėda', bbox: [15, 46, 23, 50] }
];

export { mirrorPath };

export default [
  // Front zones
  { id: 'front-head', side: 'front', path: 'M24 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z', area: 153.94, label: 'Galva (priekis)', bbox: [17, 3, 31, 17] },
  { id: 'front-neck', side: 'front', path: 'M21 17 L27 17 L27 20 L21 20 Z', area: 18, label: 'Kaklas (priekis)', bbox: [21, 17, 27, 20] },
  { id: 'front-chest', side: 'front', path: 'M14 20 L34 20 L34 30 L14 30 Z', area: 200, label: 'Krūtinė (priekis)', bbox: [14, 20, 34, 30] },
  { id: 'front-abdomen', side: 'front', path: 'M14 30 L34 30 L34 40 L14 40 Z', area: 200, label: 'Pilvas (priekis)', bbox: [14, 30, 34, 40] },
  { id: 'front-pelvis', side: 'front', path: 'M17 40 L31 40 L31 46 L17 46 Z', area: 84, label: 'Dubuo (priekis)', bbox: [17, 40, 31, 46] },
  { id: 'front-groin', side: 'front', path: 'M20 46 L28 46 L28 48 L20 48 Z', area: 16, label: 'Tarpvietė', bbox: [20, 46, 28, 48] },
  ...makeSymmetric('front', limbDefs),

  // Back zones
  { id: 'back-head', side: 'back', path: 'M24 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z', area: 153.94, label: 'Galva (nugara)', bbox: [17, 3, 31, 17] },
  { id: 'back-neck', side: 'back', path: 'M21 17 L27 17 L27 20 L21 20 Z', area: 18, label: 'Kaklas (nugara)', bbox: [21, 17, 27, 20] },
  { id: 'back-upper-back', side: 'back', path: 'M14 20 L34 20 L34 30 L14 30 Z', area: 200, label: 'Viršutinė nugara', bbox: [14, 20, 34, 30] },
  { id: 'back-lower-back', side: 'back', path: 'M14 30 L34 30 L34 40 L14 40 Z', area: 200, label: 'Juosmuo', bbox: [14, 30, 34, 40] },
  { id: 'back-buttocks', side: 'back', path: 'M17 40 L31 40 L31 46 L17 46 Z', area: 84, label: 'Sėdmenys', bbox: [17, 40, 31, 46] },
  ...makeSymmetric('back', limbDefs)
];
