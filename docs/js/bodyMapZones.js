const WIDTH = 48;

/**
 * Mirror an SVG path across the vertical axis of the viewBox. The function only
 * supports absolute M, L, H, V and Z commands as they are sufficient for the
 * simple rectangular shapes used in the body map.
 *
 * @param {string} d  Path definition for the left side of the body
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
      if (cmd === 'M' || cmd === 'L') {
        for (let i = 0; i < parts.length; i += 2) {
          parts[i] = WIDTH - parts[i];
        }
      } else if (cmd === 'H') {
        for (let i = 0; i < parts.length; i++) {
          parts[i] = WIDTH - parts[i];
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

const frontDefs = [
  // Tapered trapezoid resembling the upper arm
  { id: 'upper-arm', path: 'M1 18 L7 18 L6 28 L2 28 Z', area: 2, label: 'žastas', bbox: [1, 18, 7, 28] },
  // Narrowing towards the wrist
  { id: 'lower-arm', path: 'M2 28 L6 28 L5 40 L3 40 Z', area: 1.5, label: 'dilbis', bbox: [2, 28, 6, 40] },
  // Simple polygon approximating palm and fingers
  { id: 'hand', path: 'M2 40 L6 40 L6.5 43 L7 46 L1 46 L1.5 43 Z', area: 1, label: 'plaštaka', bbox: [1, 40, 7, 46] },
  // Slightly curved thigh
  { id: 'thigh', path: 'M15 34 L23 34 L22.5 38 L21 41 L17 41 L15.5 38 Z', area: 4.5, label: 'šlaunis', bbox: [15, 34, 23, 41] },
  // Tapered lower leg
  { id: 'leg', path: 'M16 41 L22 41 L21.5 44 L21 46 L17 46 L16.5 44 Z', area: 3.5, label: 'blauzda', bbox: [16, 41, 22, 46] },
  // Wedge shaped foot
  { id: 'foot', path: 'M15 46 L23 46 L23 48 L21 50 L17 50 L15 48 Z', area: 1, label: 'pėda', bbox: [15, 46, 23, 50] }
];

// Back definitions mirror the front shapes for now
const backDefs = [
  { id: 'upper-arm', path: 'M1 18 L7 18 L6 28 L2 28 Z', area: 2, label: 'žastas', bbox: [1, 18, 7, 28] },
  { id: 'lower-arm', path: 'M2 28 L6 28 L5 40 L3 40 Z', area: 1.5, label: 'dilbis', bbox: [2, 28, 6, 40] },
  { id: 'hand', path: 'M2 40 L6 40 L6.5 43 L7 46 L1 46 L1.5 43 Z', area: 1, label: 'plaštaka', bbox: [1, 40, 7, 46] },
  { id: 'thigh', path: 'M15 34 L23 34 L22.5 38 L21 41 L17 41 L15.5 38 Z', area: 4.5, label: 'šlaunis', bbox: [15, 34, 23, 41] },
  { id: 'leg', path: 'M16 41 L22 41 L21.5 44 L21 46 L17 46 L16.5 44 Z', area: 3.5, label: 'blauzda', bbox: [16, 41, 22, 46] },
  { id: 'foot', path: 'M15 46 L23 46 L23 48 L21 50 L17 50 L15 48 Z', area: 1, label: 'pėda', bbox: [15, 46, 23, 50] }
];

export default [
  // Front zones
  { id: 'front-head', side: 'front', path: 'M24 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z', area: 4.5, label: 'Galva (priekis)', bbox: [17, 3, 31, 17] },
  { id: 'front-torso', side: 'front', path: 'M14 16c0-8 10-12 10-12s10 4 10 12v18c0 8-10 12-10 12s-10-4-10-12V16z', area: 18, label: 'Liemuo (priekis)', bbox: [14, 4, 34, 46] },
  ...makeSymmetric('front', frontDefs),

  // Back zones
  { id: 'back-head', side: 'back', path: 'M24 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z', area: 4.5, label: 'Galva (nugara)', bbox: [17, 3, 31, 17] },
  { id: 'back-torso', side: 'back', path: 'M14 16c0-8 10-12 10-12s10 4 10 12v18c0 8-10 12-10 12s-10-4-10-12V16z', area: 18, label: 'Liemuo (nugara)', bbox: [14, 4, 34, 46] },
  ...makeSymmetric('back', backDefs)
];

