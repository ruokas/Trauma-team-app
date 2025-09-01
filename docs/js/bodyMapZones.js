const WIDTH = 48;

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
  { id: 'upper-arm', path: 'M1 18H7V28H1Z', area: 2, label: 'žastas', bbox: [1, 18, 7, 28] },
  { id: 'lower-arm', path: 'M1 28H7V40H1Z', area: 1.5, label: 'dilbis', bbox: [1, 28, 7, 40] },
  { id: 'hand', path: 'M1 40H7V46H1Z', area: 1, label: 'plaštaka', bbox: [1, 40, 7, 46] },
  { id: 'thigh', path: 'M15 34H23V41H15Z', area: 4.5, label: 'šlaunis', bbox: [15, 34, 23, 41] },
  { id: 'leg', path: 'M15 41H23V46H15Z', area: 3.5, label: 'blauzda', bbox: [15, 41, 23, 46] },
  { id: 'foot', path: 'M15 46H23V50H15Z', area: 1, label: 'pėda', bbox: [15, 46, 23, 50] }
];

const backDefs = [
  { id: 'upper-arm', path: 'M1 18H7V28H1Z', area: 2, label: 'žastas', bbox: [1, 18, 7, 28] },
  { id: 'lower-arm', path: 'M1 28H7V40H1Z', area: 1.5, label: 'dilbis', bbox: [1, 28, 7, 40] },
  { id: 'hand', path: 'M1 40H7V46H1Z', area: 1, label: 'plaštaka', bbox: [1, 40, 7, 46] },
  { id: 'thigh', path: 'M15 34H23V41H15Z', area: 4.5, label: 'šlaunis', bbox: [15, 34, 23, 41] },
  { id: 'leg', path: 'M15 41H23V46H15Z', area: 3.5, label: 'blauzda', bbox: [15, 41, 23, 46] },
  { id: 'foot', path: 'M15 46H23V50H15Z', area: 1, label: 'pėda', bbox: [15, 46, 23, 50] }
];

export default [
  { id: 'front-head', side: 'front', path: 'M24 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z', area: 4.5, label: 'Galva (priekis)', bbox: [17, 3, 31, 17] },
  { id: 'front-torso', side: 'front', path: 'M14 16c0-8 10-12 10-12s10 4 10 12v18c0 8-10 12-10 12s-10-4-10-12V16z', area: 18, label: 'Liemuo (priekis)', bbox: [14, 4, 34, 46] },
  ...makeSymmetric('front', frontDefs),
  { id: 'back-head', side: 'back', path: 'M24 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z', area: 4.5, label: 'Galva (nugara)', bbox: [17, 3, 31, 17] },
  { id: 'back-torso', side: 'back', path: 'M14 16c0-8 10-12 10-12s10 4 10 12v18c0 8-10 12-10 12s-10-4-10-12V16z', area: 18, label: 'Liemuo (nugara)', bbox: [14, 4, 34, 46] },
  ...makeSymmetric('back', backDefs)
];

