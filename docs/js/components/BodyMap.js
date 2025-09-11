import { $ } from '../utils.js';
import zones from '../bodyMapZones.js';
import { TOOLS } from '../BodyMapTools.js';

// Map tool symbols for <use> elements
const TOOL_SYMBOL = Object.values(TOOLS).reduce((acc, t) => {
  if (t.symbol) acc[t.char] = t.symbol;
  return acc;
}, {});

// Zone id to human label
const ZONE_LABELS = zones.reduce((acc, z) => {
  acc[z.id] = z.label;
  return acc;
}, {});

// Sum of all zone areas (used for burn %)
const TOTAL_AREA = zones.reduce((sum, z) => sum + z.area, 0);

/** Minimalus kūno žemėlapis: žymi žaizdas ir nudegimus. */
export default class BodyMap {
  constructor() {
    this.initialized = false;
    this.svg = null;
    this.marksLayer = null;
    this.brushLayer = null;
    this.activeTool = TOOLS.WOUND.char;
    this.markScale = 1;
    this.saveCb = () => {};
    this.idSeq = 1;
  }

  /** Inicializuoja DOM nuorodas ir zonų kelius. */
  init(saveCb) {
    if (this.initialized) return;
    this.svg = $('#bodySvg');
    this.marksLayer = $('#marks');
    if (!this.svg || !this.marksLayer) return;

    this.saveCb = typeof saveCb === 'function' ? saveCb : () => {};

    this.brushLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.insertBefore(this.brushLayer, this.marksLayer);

    const layers = { front: $('#layer-front'), back: $('#layer-back') };
    zones.forEach(z => {
      const layer = layers[z.side];
      if (!layer) return;
      let group = layer.querySelector('.zones');
      if (!group) {
        group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('zones');
        layer.appendChild(group);
      }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', z.path);
      path.classList.add('zone');
      path.dataset.zone = z.id;
      path.dataset.side = z.side;
      group.appendChild(path);
    });

    this.svg.addEventListener('click', evt => {
      const zone = evt.target.closest('.zone');
      if (!zone) return;
      const pt = this.svgPoint(evt);
      if (this.activeTool === TOOLS.BURN.char) {
        this.addBrush(pt.x, pt.y, 20);
      } else {
        this.addMark(pt.x, pt.y, this.activeTool, zone.dataset.side, zone.dataset.zone);
      }
      this.saveCb();
    });

    this.initialized = true;
  }

  /** Konvertuoja įvykio tašką į SVG koordinatę. */
  svgPoint(evt) {
    return { x: evt.offsetX || 0, y: evt.offsetY || 0 };
  }

  setTool(tool) { this.activeTool = tool; }

  setMarkScale(scale) {
    const s = parseFloat(scale);
    if (!isNaN(s) && s > 0) this.markScale = s;
  }

  addMark(x, y, type, side, zone) {
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', TOOL_SYMBOL[type] || '');
    use.setAttribute('transform', `translate(${x},${y}) scale(${this.markScale})`);
    use.dataset.id = this.idSeq++;
    use.dataset.type = type;
    use.dataset.side = side;
    use.dataset.zone = zone;
    use.dataset.x = x;
    use.dataset.y = y;
    this.marksLayer.appendChild(use);
    return use;
  }

  addBrush(x, y, r) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x);
    c.setAttribute('cy', y);
    c.setAttribute('r', r);
    c.dataset.id = this.idSeq++;
    c.dataset.x = x;
    c.dataset.y = y;
    c.dataset.r = r;
    this.brushLayer.appendChild(c);
    this.updateBurnTotal();
    return c;
  }

  clear() {
    this.marksLayer.innerHTML = '';
    this.brushLayer.innerHTML = '';
  }

  serialize() {
    const marks = [...this.marksLayer.querySelectorAll('use')].map(el => ({
      id: Number(el.dataset.id),
      x: Number(el.dataset.x),
      y: Number(el.dataset.y),
      type: el.dataset.type,
      side: el.dataset.side,
      zone: el.dataset.zone
    }));
    const brushes = [...this.brushLayer.querySelectorAll('circle')].map(el => ({
      id: Number(el.dataset.id),
      x: Number(el.dataset.x),
      y: Number(el.dataset.y),
      r: Number(el.dataset.r)
    }));
    return JSON.stringify({ tool: this.activeTool, marks, brushes });
  }

  load(data) {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    this.clear();
    this.activeTool = obj.tool || this.activeTool;
    (obj.marks || []).forEach(m => this.addMark(m.x, m.y, m.type, m.side, m.zone));
    (obj.brushes || []).forEach(b => this.addBrush(b.x, b.y, b.r));
  }

  burnArea() {
    const total = [...this.brushLayer.querySelectorAll('circle')].reduce((sum, c) => {
      const r = Number(c.dataset.r);
      return sum + Math.PI * r * r;
    }, 0);
    return (total * 100) / TOTAL_AREA;
  }

  updateBurnTotal() {
    const el = document.querySelector('#burnTotal');
    if (!el) return;
    const pct = this.burnArea().toFixed(1);
    el.textContent = `${pct}%`;
  }

  zoneCounts() {
    const counts = {};
    zones.forEach(z => { counts[z.id] = { label: z.label, burned: 0 }; });
    this.marksLayer.querySelectorAll('use').forEach(el => {
      const zone = el.dataset.zone;
      const type = el.dataset.type;
      if (!counts[zone]) counts[zone] = { label: ZONE_LABELS[zone] || '', burned: 0 };
      counts[zone][type] = (counts[zone][type] || 0) + 1;
    });
    this.brushLayer.querySelectorAll('circle').forEach(c => {
      const x = Number(c.dataset.x);
      const y = Number(c.dataset.y);
      const r = Number(c.dataset.r);
      const area = Math.PI * r * r;
      const zone = zones.find(z => x >= z.bbox[0] && x <= z.bbox[2] && y >= z.bbox[1] && y <= z.bbox[3]);
      if (zone) counts[zone.id].burned += (area * 100) / zone.area;
    });
    return counts;
  }

  // Atspausdinimui – <use> simbolius paverčia tikromis figūromis,
  // kad eksportuojamas SVG būtų matomas be išorinių nuorodų.
  async embedSilhouettes(svg) {
    const root = svg || this.svg;
    if (!root) return svg;

    root.querySelectorAll('use').forEach(use => {
      const href = use.getAttribute('href') || use.getAttribute('xlink:href');
      if (!href || !href.startsWith('#')) return;
      const ref = root.querySelector(href);
      if (!ref) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      [...use.attributes].forEach(attr => {
        if (attr.name === 'href' || attr.name === 'xlink:href') return;
        g.setAttribute(attr.name, attr.value);
      });

      const refClone = ref.cloneNode(true);
      if (refClone.tagName.toLowerCase() === 'symbol') {
        while (refClone.firstChild) {
          g.appendChild(refClone.firstChild);
        }
      } else {
        g.appendChild(refClone);
      }

      use.replaceWith(g);
    });

    return root;
  }
}

