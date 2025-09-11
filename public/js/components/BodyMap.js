import { $ } from '../utils.js';
import zones, { CANVAS } from '../bodyMapZones.js';
import { TOOLS } from '../BodyMapTools.js';

const TOOL_SYMBOL = Object.values(TOOLS).reduce((acc, t) => {
  if (t.symbol) acc[t.char] = t.symbol;
  return acc;
}, {});

const ZONE_LABELS = zones.reduce((acc, z) => {
  acc[z.id] = z.label;
  return acc;
}, {});

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
    this.brushSize = 20;
    this.saveCb = () => {};
    this.idSeq = 1;
    this.undoStack = [];
    this.redoStack = [];
  }

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
        const vb = this.svg.viewBox?.baseVal;
        const sx = vb ? (vb.width / 2) / CANVAS.WIDTH : 1;
        const sy = vb ? vb.height / CANVAS.HEIGHT : 1;
        group.setAttribute('transform', `scale(${sx} ${sy})`);
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
        this.addBrush(pt.x, pt.y, this.brushSize);
      } else if (this.activeTool === TOOLS.BURN_ERASE.char) {
        this.eraseBrush(pt.x, pt.y, this.brushSize);
      } else {
        this.addMark(pt.x, pt.y, this.activeTool, zone.dataset.side, zone.dataset.zone);
      }
      this.saveCb();
    });

    this.initialized = true;
  }

  svgPoint(evt){
    const pt=this.svg.createSVGPoint();
    pt.x=evt.clientX; pt.y=evt.clientY;
    const {x,y}=pt.matrixTransform(this.svg.getScreenCTM().inverse());
    return {x,y};
  }

  setTool(tool) { this.activeTool = tool; }

  setMarkScale(scale) {
    const s = parseFloat(scale);
    if (!isNaN(s) && s > 0) this.markScale = s;
  }

  setBrushSize(size) {
    const s = parseFloat(size);
    if (!isNaN(s) && s > 0) this.brushSize = s;
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
    this.undoStack.push({ type: 'addMark', el: use });
    this.redoStack = [];
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
    this.undoStack.push({ type: 'addBrush', el: c });
    this.redoStack = [];
    return c;
  }

  /** Remove burn marks within the eraser radius. */
  eraseBrush(x, y, r) {
    const circles = [...this.brushLayer.querySelectorAll('circle')];
    const removed = [];
    circles.forEach(c => {
      const cx = Number(c.dataset.x);
      const cy = Number(c.dataset.y);
      const cr = Number(c.dataset.r);
      const dx = cx - x;
      const dy = cy - y;
      if (Math.hypot(dx, dy) <= r + cr) {
        removed.push(c);
        c.remove();
      }
    });
    if (removed.length) {
      this.undoStack.push({ type: 'eraseBrush', els: removed });
      this.redoStack = [];
    }
  }

  clear() {
    this.marksLayer.innerHTML = '';
    this.brushLayer.innerHTML = '';
    this.undoStack = [];
    this.redoStack = [];
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

  zoneCounts() {
    const counts = {};
    zones.forEach(z => { counts[z.id] = { label: z.label, burned: 0 }; });
    this.marksLayer.querySelectorAll('use').forEach(el => {
      const zone = el.dataset.zone;
      const type = el.dataset.type;
      if (!counts[zone]) counts[zone] = { label: ZONE_LABELS[zone] || '', burned: 0 };
      counts[zone][type] = (counts[zone][type] || 0) + 1;
    });
    const vb = this.svg.viewBox?.baseVal;
    const sx = vb ? (vb.width / 2) / CANVAS.WIDTH : 1;
    const sy = vb ? vb.height / CANVAS.HEIGHT : 1;
    this.brushLayer.querySelectorAll('circle').forEach(c => {
      const x = Number(c.dataset.x);
      const y = Number(c.dataset.y);
      const r = Number(c.dataset.r);
      const area = Math.PI * r * r;
      const zone = zones.find(z =>
        x >= z.bbox[0] * sx && x <= z.bbox[2] * sx &&
        y >= z.bbox[1] * sy && y <= z.bbox[3] * sy);
      if (zone) counts[zone.id].burned += (area * 100) / zone.area;
    });
    return counts;
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) return;
    switch (action.type) {
      case 'addMark':
      case 'addBrush':
        action.el.remove();
        break;
      case 'eraseBrush':
        action.els.forEach(el => this.brushLayer.appendChild(el));
        break;
      default:
        break;
    }
    this.redoStack.push(action);
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) return;
    switch (action.type) {
      case 'addMark':
        this.marksLayer.appendChild(action.el);
        break;
      case 'addBrush':
        this.brushLayer.appendChild(action.el);
        break;
      case 'eraseBrush':
        action.els.forEach(el => el.remove());
        break;
      default:
        break;
    }
    this.undoStack.push(action);
  }

  async embedSilhouettes(svg) {
    return svg;
  }
}

