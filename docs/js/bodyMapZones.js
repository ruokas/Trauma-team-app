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
  // Curved upper arm
  { id: 'upper-arm', path: 'M1 16 C2 14 6 14 7 16 L6 28 C5 30 3 30 2 28 Z', area: 2.3, label: 'žastas', bbox: [1, 16, 7, 28] },
  // Forearm tapering toward the wrist
  { id: 'lower-arm', path: 'M2 28 C3 28 5 28 6 28 L5.5 40 C5 42 3 42 2.5 40 Z', area: 1.7, label: 'dilbis', bbox: [2, 28, 6, 40] },
  // Palm with slight finger outline
  { id: 'hand', path: 'M2.5 40 L5.5 40 L6.5 43 L6 46 L2 46 L1.5 43 Z', area: 0.5, label: 'plaštaka', bbox: [1.5, 40, 6.5, 46] },
  // Rounded thigh following body contour
  { id: 'thigh', path: 'M15 30 C15 27 23 27 23 30 L22 41 C21 43 17 43 16 41 Z', area: 4.5, label: 'šlaunis', bbox: [15, 30, 23, 41] },
  // Lower leg narrowing towards the ankle
  { id: 'leg', path: 'M16 41 C16 40 22 40 22 41 L21.5 46 C21 48 17 48 16.5 46 Z', area: 3.5, label: 'blauzda', bbox: [16, 41, 22, 46] },
  // Simplified foot shape
  { id: 'foot', path: 'M15 46 L23 46 L22 49 L20 50 L18 50 L16 49 Z', area: 1, label: 'pėda', bbox: [15, 46, 23, 50] }
];

// Back definitions reuse the same limb shapes
const backDefs = [...frontDefs];

export default [
  // Front zones
  { id: 'front-head', side: 'front', path: 'M24 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z', area: 4.5, label: 'Galva (priekis)', bbox: [17, 3, 31, 17] },
  { id: 'front-torso', side: 'front', path: 'M14 16c0-8 10-12 10-12s10 4 10 12v18c0 8-10 12-10 12s-10-4-10-12V16z', area: 18, label: 'Liemuo (priekis)', bbox: [14, 4, 34, 46] },
  { id: 'front-groin', side: 'front', path: 'M20 46 L28 46 L28 48 L20 48 Z', area: 1, label: 'Tarpvietė', bbox: [20, 46, 28, 48] },
  ...makeSymmetric('front', frontDefs),

  // Back zones
  { id: 'back-head', side: 'back', path: 'M24 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z', area: 4.5, label: 'Galva (nugara)', bbox: [17, 3, 31, 17] },
  { id: 'back-torso', side: 'back', path: 'M14 16c0-8 10-12 10-12s10 4 10 12v18c0 8-10 12-10 12s-10-4-10-12V16z', area: 18, label: 'Liemuo (nugara)', bbox: [14, 4, 34, 46] },
  ...makeSymmetric('back', backDefs)
];

