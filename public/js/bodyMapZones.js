export const CANVAS = { WIDTH: 480, HEIGHT: 500 };
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
  { id: 'upper-arm', path: 'M10 200 L60 200 L60 320 L10 320 Z', area: 60, label: 'žastas', bbox: [10, 200, 60, 320] },
  { id: 'lower-arm', path: 'M15 320 L55 320 L55 440 L15 440 Z', area: 48, label: 'dilbis', bbox: [15, 320, 55, 440] },
  { id: 'hand', path: 'M15 440 L60 440 L60 480 L15 480 Z', area: 18, label: 'plaštaka', bbox: [15, 440, 60, 480] },
  { id: 'thigh', path: 'M150 300 L230 300 L230 410 L150 410 Z', area: 88, label: 'šlaunis', bbox: [150, 300, 230, 410] },
  { id: 'leg', path: 'M160 410 L220 410 L220 460 L160 460 Z', area: 30, label: 'blauzda', bbox: [160, 410, 220, 460] },
  { id: 'foot', path: 'M150 460 L230 460 L230 500 L150 500 Z', area: 32, label: 'pėda', bbox: [150, 460, 230, 500] }
];

export { mirrorPath };

export default [
  // Front zones
  { id: 'front-head', side: 'front', path: 'M240 30c40 0 70 30 70 70s-30 70-70 70-70-30-70-70 30-70 70-70z', area: 153.94, label: 'Galva (priekis)', bbox: [170, 30, 310, 170] },
  { id: 'front-neck', side: 'front', path: 'M210 170 L270 170 L270 200 L210 200 Z', area: 18, label: 'Kaklas (priekis)', bbox: [210, 170, 270, 200] },
  { id: 'front-chest', side: 'front', path: 'M140 200 L340 200 L340 300 L140 300 Z', area: 200, label: 'Krūtinė (priekis)', bbox: [140, 200, 340, 300] },
  { id: 'front-abdomen', side: 'front', path: 'M140 300 L340 300 L340 400 L140 400 Z', area: 200, label: 'Pilvas (priekis)', bbox: [140, 300, 340, 400] },
  { id: 'front-pelvis', side: 'front', path: 'M170 400 L310 400 L310 460 L170 460 Z', area: 84, label: 'Dubuo (priekis)', bbox: [170, 400, 310, 460] },
  { id: 'front-groin', side: 'front', path: 'M200 460 L280 460 L280 480 L200 480 Z', area: 16, label: 'Tarpvietė', bbox: [200, 460, 280, 480] },
  ...makeSymmetric('front', limbDefs),

  // Back zones
  { id: 'back-head', side: 'back', path: 'M240 30c40 0 70 30 70 70s-30 70-70 70-70-30-70-70 30-70 70-70z', area: 153.94, label: 'Galva (nugara)', bbox: [170, 30, 310, 170] },
  { id: 'back-neck', side: 'back', path: 'M210 170 L270 170 L270 200 L210 200 Z', area: 18, label: 'Kaklas (nugara)', bbox: [210, 170, 270, 200] },
  { id: 'back-upper-back', side: 'back', path: 'M140 200 L340 200 L340 300 L140 300 Z', area: 200, label: 'Viršutinė nugara', bbox: [140, 200, 340, 300] },
  { id: 'back-lower-back', side: 'back', path: 'M140 300 L340 300 L340 400 L140 400 Z', area: 200, label: 'Juosmuo', bbox: [140, 300, 340, 400] },
  { id: 'back-buttocks', side: 'back', path: 'M170 400 L310 400 L310 460 L170 460 Z', area: 84, label: 'Sėdmenys', bbox: [170, 400, 310, 460] },
  ...makeSymmetric('back', limbDefs)
];
