import { $, $$ } from '../utils.js';
import { notify } from '../alerts.js';
import zones from '../bodyMapZones.js';
import { TOOLS } from '../BodyMapTools.js';

const LABELS = Object.fromEntries(zones.map(z => [z.id, z.label]));

export default class BodyMap {
  constructor() {
    this.svg = null;
    this.markLayer = null;
    this.toolButtons = [];
    this.burnTotalEl = null;
    this.selectedList = null;
    this.activeTool = TOOLS.WOUND.char;
    this.save = () => {};
    this.zoneMap = new Map();
    this.burns = new Set();
    this.seq = 0;
    this.drag = null;
    this.initialized = false;
    this.undoStack = [];
    this.redoStack = [];
    this.btnUndo = null;
    this.btnRedo = null;
    this.btnClear = null;
    this.btnExport = null;
    this.btnDelete = null;
    this.tooltip = null;
  }

  setTool(t) {
    this.activeTool = t;
    this.toolButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  }

  svgPoint(evt) {
    const p = this.svg.createSVGPoint();
    p.x = evt.clientX;
    p.y = evt.clientY;
    return p.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  clamp(x, y, side) {
    const target = side ? this.svg.querySelector(`#layer-${side}`) : this.svg;
    let box;
    try {
      box = target.getBBox();
    } catch {
      box = null;
    }
    if (!box || (box.width === 0 && box.height === 0)) {
      const vb = this.svg.getAttribute('viewBox')?.split(/\s+/).map(Number);
      if (vb) box = { x: vb[0], y: vb[1], width: vb[2], height: vb[3] };
    }
    if (!box) return { x, y };
    return {
      x: Math.min(Math.max(x, box.x), box.x + box.width),
      y: Math.min(Math.max(y, box.y), box.y + box.height)
    };
  }

  startDrag(evt) {
    const el = evt.currentTarget;
    const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(el.getAttribute('transform')) || [0, 0, 0];
    this.drag = { el, startX: evt.clientX, startY: evt.clientY, origX: +m[1], origY: +m[2] };
    document.addEventListener('pointermove', this.moveDrag);
    document.addEventListener('pointerup', this.endDrag);
  }

  moveDrag = evt => {
    if (!this.drag) return;
    const dx = evt.clientX - this.drag.startX;
    const dy = evt.clientY - this.drag.startY;
    let x = this.drag.origX + dx;
    let y = this.drag.origY + dy;
    ({ x, y } = this.clamp(x, y, this.drag.el.dataset.side));
    this.drag.el.setAttribute('transform', `translate(${x},${y})`);
  };

  endDrag = () => {
    if (!this.drag) return;
    document.removeEventListener('pointermove', this.moveDrag);
    document.removeEventListener('pointerup', this.endDrag);
    this.drag = null;
    this.save();
  };

  addMark(x, y, t = this.activeTool, side, zone, id, record = true) {
    ({ x, y } = this.clamp(x, y, side));
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const symbol = Object.values(TOOLS).find(tool => tool.char === t)?.symbol;
    if (symbol) use.setAttribute('href', symbol);
    use.setAttribute('transform', `translate(${x},${y})`);
    use.dataset.type = t;
    use.dataset.side = side;
    const mid = id || ++this.seq;
    use.dataset.id = mid;
    if (mid > this.seq) this.seq = mid;
    if (zone) {
      use.dataset.zone = zone;
      if (this.selectedList) {
        const d = document.createElement('div');
        d.textContent = LABELS[zone] || zone;
        d.dataset.id = mid;
        this.selectedList.appendChild(d);
      }
    }
    this.markLayer.appendChild(use);
    use.addEventListener('pointerdown', this.startDrag.bind(this));
    if (record) {
      this.undoStack.push({ type: 'add', mark: { id: mid, x, y, type: t, side, zone } });
      this.redoStack = [];
      this.updateUndoRedo();
    }
    this.save();
  }

  toggleZoneBurn(name, record = true) {
    const el = this.zoneMap.get(name);
    if (!el) return;
    el.classList.toggle('burned');
    if (el.classList.contains('burned')) this.burns.add(name); else this.burns.delete(name);
    if (record) {
      this.undoStack.push({ type: 'burn', zone: name });
      this.redoStack = [];
      this.updateUndoRedo();
    }
    this.updateBurnDisplay();
    this.save();
  }

  burnArea() {
    let s = 0;
    this.burns.forEach(z => {
      const el = this.zoneMap.get(z);
      const a = parseFloat(el?.dataset.area);
      s += isNaN(a) ? 0 : a;
    });
    return s;
  }

  updateBurnDisplay() {
    if (this.burnTotalEl) {
      const t = this.burnArea();
      this.burnTotalEl.textContent = t ? `Nudegimai: ${t}%` : '';
    }
  }

  updateUndoRedo() {
    if (this.btnUndo) this.btnUndo.disabled = this.undoStack.length === 0;
    if (this.btnRedo) this.btnRedo.disabled = this.redoStack.length === 0;
  }

  removeMark(m, record = true) {
    if (!m) return;
    if (this.selectedList && m.dataset.zone) {
      this.selectedList.querySelector(`[data-id="${m.dataset.id}"]`)?.remove();
    }
    const tr = m.getAttribute('transform');
    const r = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tr) || [0, 0, 0];
    const data = { id: +m.dataset.id, x: +r[1], y: +r[2], type: m.dataset.type, side: m.dataset.side, zone: m.dataset.zone };
    m.remove();
    if (record) {
      this.undoStack.push({ type: 'delete', mark: data });
      this.redoStack = [];
      this.updateUndoRedo();
    }
    this.save();
  }

  undo() {
    const a = this.undoStack.pop();
    if (!a) return;
    switch (a.type) {
      case 'add': {
        const m = this.markLayer.querySelector(`use[data-id="${a.mark.id}"]`);
        this.removeMark(m, false);
        break;
      }
      case 'delete': {
        const m = a.mark;
        this.addMark(m.x, m.y, m.type, m.side, m.zone, m.id, false);
        break;
      }
      case 'burn':
        this.toggleZoneBurn(a.zone, false);
        break;
    }
    this.redoStack.push(a);
    this.updateUndoRedo();
  }

  redo() {
    const a = this.redoStack.pop();
    if (!a) return;
    switch (a.type) {
      case 'add': {
        const m = a.mark;
        this.addMark(m.x, m.y, m.type, m.side, m.zone, m.id, false);
        break;
      }
      case 'delete': {
        const m = this.markLayer.querySelector(`use[data-id="${a.mark.id}"]`);
        this.removeMark(m, false);
        break;
      }
      case 'burn':
        this.toggleZoneBurn(a.zone, false);
        break;
    }
    this.undoStack.push(a);
    this.updateUndoRedo();
  }

  showTooltip(evt, label) {
    if (!this.tooltip) {
      const t = document.createElement('div');
      t.className = 'zone-tooltip';
      Object.assign(t.style, {
        position: 'absolute',
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.75)',
        color: '#fff',
        padding: '2px 4px',
        borderRadius: '3px',
        fontSize: '0.75rem',
        display: 'none'
      });
      document.body.appendChild(t);
      this.tooltip = t;
    }
    this.tooltip.textContent = label;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${evt.pageX + 10}px`;
    this.tooltip.style.top = `${evt.pageY + 10}px`;
  }

  hideTooltip() {
    if (this.tooltip) this.tooltip.style.display = 'none';
  }

  init(saveAll) {
    if (this.initialized) return;
    this.save = saveAll || (() => {});
    this.svg = $('#bodySvg');
    this.markLayer = $('#marks');
    this.btnUndo = $('#btnUndo');
    this.btnRedo = $('#btnRedo');
    this.btnClear = $('#btnClearMap');
    this.btnExport = $('#btnExportSvg');
    this.btnDelete = $('#btnDelete');
    this.toolButtons = $$('.map-toolbar .tool[data-tool]');
    this.burnTotalEl = $('#burnTotal');
    this.selectedList = $('#selectedLocations');
    if (!this.svg || !this.markLayer) return;
    this.initialized = true;

    const layers = { front: $('#layer-front'), back: $('#layer-back') };
    if (!this.svg.querySelector('.zone')) {
      zones.forEach(z => {
        let container = layers[z.side].querySelector('.zones');
        if (!container) {
          container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          container.classList.add('zones');
          const shape = layers[z.side].querySelector(`#${z.side}-shape`);
          const tr = shape?.getAttribute('transform');
          if (tr) container.setAttribute('transform', tr);
          layers[z.side].appendChild(container);
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('zone');
        path.dataset.zone = z.id;
        path.dataset.area = z.area;
        path.setAttribute('d', z.path);
        path.setAttribute('aria-label', z.label);
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = z.label;
        path.appendChild(title);
        path.addEventListener('pointerenter', e => this.showTooltip(e, z.label));
        path.addEventListener('pointermove', e => this.showTooltip(e, z.label));
        path.addEventListener('pointerleave', () => this.hideTooltip());
        container.appendChild(path);
      });
    }

    this.toolButtons.forEach(b => b.addEventListener('click', () => this.setTool(b.dataset.tool)));
    this.setTool(this.activeTool);
    this.updateUndoRedo();

    ['front-shape', 'back-shape'].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('click', evt => {
        const p = this.svgPoint(evt);
        this.addMark(p.x, p.y, this.activeTool, el.dataset.side);
      });
    });

    $$('.zone', this.svg).forEach(z => {
      const name = z.dataset.zone;
      this.zoneMap.set(name, z);
      z.addEventListener('click', evt => {
        const side = z.closest('#layer-back') ? 'back' : 'front';
        if (this.activeTool === TOOLS.BURN.char) {
          this.toggleZoneBurn(name);
        } else {
          const p = this.svgPoint(evt);
          this.addMark(p.x, p.y, this.activeTool, side, name);
        }
      });
    });

    this.markLayer.addEventListener('click', e => {
      const u = e.target.closest('use');
      if (!u) return;
      this.markLayer.querySelector('.selected')?.classList.remove('selected');
      u.classList.add('selected');
      if (typeof window.showWoundDetails === 'function') window.showWoundDetails(u.dataset.id);
    });

    this.btnUndo?.addEventListener('click', () => this.undo());
    this.btnRedo?.addEventListener('click', () => this.redo());

    this.btnDelete?.addEventListener('click', () => {
      const sel = this.markLayer.querySelector('use.selected');
      if (sel) this.removeMark(sel);
    });

    this.btnClear?.addEventListener('click', async () => {
      if (await notify({ type: 'confirm', message: 'Išvalyti visas žymas (priekis ir nugara)?' })) {
        this.markLayer.innerHTML = '';
        this.burns.clear();
        $$('.zone', this.svg).forEach(z => z.classList.remove('burned'));
        this.updateBurnDisplay();
        this.selectedList && (this.selectedList.innerHTML = '');
        this.save();
      }
    });

    this.btnExport?.addEventListener('click', () => {
      const clone = this.svg.cloneNode(true);
      const ser = new XMLSerializer(); const src = ser.serializeToString(clone);
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
      const a = document.createElement('a'); a.href = url; a.download = 'kuno-zemelapis.svg'; a.click();
    });

    this.updateBurnDisplay();
  }

  serialize() {
    const marks = [...this.markLayer.querySelectorAll('use')].map(u => {
      const tr = u.getAttribute('transform');
      const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tr) || [0, 0, 0];
      return { id: +u.dataset.id, x: +m[1], y: +m[2], type: u.dataset.type, side: u.dataset.side, zone: u.dataset.zone };
    });
    const burnArr = [...this.burns].map(z => {
      const el = this.zoneMap.get(z);
      const side = el?.closest('#layer-back') ? 'back' : 'front';
      return { zone: z, side };
    });
    return JSON.stringify({ tool: this.activeTool, marks, burns: burnArr });
  }

  load(raw) {
    try {
      const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
      this.activeTool = o.tool || TOOLS.WOUND.char;
      this.setTool(this.activeTool);
      this.markLayer.innerHTML = '';
      this.burns.clear();
      $$('.zone', this.svg).forEach(z => z.classList.remove('burned'));
      this.selectedList && (this.selectedList.innerHTML = '');
    this.undoStack = [];
    this.redoStack = [];
      (o.marks || []).forEach(m => this.addMark(m.x, m.y, m.type, m.side, m.zone, m.id, false));
      (o.burns || []).forEach(b => {
        const el = this.zoneMap.get(b.zone);
        if (el) { el.classList.add('burned'); this.burns.add(b.zone); }
      });
      this.updateBurnDisplay();
      this.updateUndoRedo();
    } catch (e) { console.error(e); }
  }

  counts() {
    const types = Object.values(TOOLS).map(t => t.char);
    const res = { front: {}, back: {} };
    types.forEach(t => { res.front[t] = 0; res.back[t] = 0; });
    const arr = [...this.markLayer.querySelectorAll('use')].map(u => ({ type: u.dataset.type, side: u.dataset.side }));
    arr.forEach(m => { if (res[m.side] && (m.type in res[m.side])) res[m.side][m.type]++; });
    res.burned = this.burnArea();
    return res;
  }

  zoneCounts() {
    const types = Object.values(TOOLS).map(t => t.char);
    const out = {};
    this.markLayer && [...this.markLayer.querySelectorAll('use')].forEach(u => {
      const z = u.dataset.zone;
      if (!z) return;
      if (!out[z]) {
        out[z] = { burned: 0, label: LABELS[z] || z };
        types.forEach(t => out[z][t] = 0);
      }
      out[z][u.dataset.type] = (out[z][u.dataset.type] || 0) + 1;
    });
    this.burns.forEach(z => {
      if (!out[z]) {
        out[z] = { burned: 0, label: LABELS[z] || z };
        types.forEach(t => out[z][t] = 0);
      }
      const area = parseFloat(this.zoneMap.get(z)?.dataset.area);
      out[z].burned += isNaN(area) ? 0 : area;
    });
    return out;
  }
}
