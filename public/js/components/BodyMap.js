import { $, $$ } from '../utils.js';
import { notify } from '../alerts.js';
import zones from '../bodyMapZones.js';
import { TOOLS } from '../BodyMapTools.js';

// Map tool characters to their SVG symbol references for quick lookup
const TOOL_SYMBOL = Object.values(TOOLS).reduce((acc, t) => {
  acc[t.char] = t.symbol;
  return acc;
}, {});

// Mapping of zone id to human friendly label
const ZONE_LABELS = zones.reduce((acc, z) => {
  acc[z.id] = z.label;
  return acc;
}, {});

// A complete rewrite of the body map logic.  The original implementation
// grew organically and was difficult to follow.  This version focuses on a
// small, well documented API while keeping behaviour compatible with the
// existing UI and tests.
export default class BodyMap {
  constructor() {
    this.initialized = false;

    // DOM references
    this.svg = null;
    this.marks = null;
    this.tools = [];
    this.btnUndo = null;
    this.btnRedo = null;
    this.btnClear = null;
    this.btnExport = null;
    this.btnDelete = null;
    this.burnTotalEl = null;
    this.selectedList = null;

    // state
    this.activeTool = TOOLS.WOUND.char;
    this.saveCb = () => {};
    this.burns = new Set();
    this.zoneMap = new Map();
    this.markSeq = 0;
    this.undoStack = [];
    this.redoStack = [];

    // dragging
    this.drag = null;
    this.onDragMove = this.onDragMove.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
  }

  /** Initialise DOM references and event listeners. */
  init(saveCb) {
    if (this.initialized) return;
    this.initialized = true;

    this.saveCb = typeof saveCb === 'function' ? saveCb : () => {};

    this.svg = $('#bodySvg');
    this.marks = $('#marks');
    this.tools = $$('.map-toolbar .tool[data-tool]');
    this.btnUndo = $('#btnUndo');
    this.btnRedo = $('#btnRedo');
    this.btnClear = $('#btnClearMap');
    this.btnExport = $('#btnExportSvg');
    this.btnDelete = $('#btnDelete');
    this.burnTotalEl = $('#burnTotal');
    this.selectedList = $('#selectedLocations');

    // Build zone paths if they are not already present in the SVG.  Tests
    // provide a bare bones SVG so we create the required paths here.
    if (this.svg && !this.svg.querySelector('.zone')) {
      const layers = { front: $('#layer-front'), back: $('#layer-back') };
      zones.forEach(z => {
        let group = layers[z.side].querySelector('.zones');
        if (!group) {
          group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          group.classList.add('zones');
          const shape = layers[z.side].querySelector(`#${z.side}-shape`);
          const tr = shape?.getAttribute('transform');
          if (tr) group.setAttribute('transform', tr);
          layers[z.side].appendChild(group);
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
        group.appendChild(path);
      });
    }

    // Cache zone elements and attach click handlers
    $$('.zone', this.svg).forEach(el => {
      const id = el.dataset.zone;
      this.zoneMap.set(id, el);
      el.addEventListener('click', evt => {
        const side = el.closest('#layer-back') ? 'back' : 'front';
        if (this.activeTool === TOOLS.BURN.char) {
          this.toggleZoneBurn(id);
        } else {
          const p = this.svgPoint(evt);
          this.addMark(p.x, p.y, this.activeTool, side, id);
        }
      });
    });

    // Tool buttons
    this.tools.forEach(btn =>
      btn.addEventListener('click', () => this.setTool(btn.dataset.tool))
    );
    this.setTool(this.activeTool);

    // Clicking on body silhouettes adds marks
    ['front-shape', 'back-shape'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', evt => {
        const p = this.svgPoint(evt);
        this.addMark(p.x, p.y, this.activeTool, el.dataset.side);
      });
    });

    // Mark selection and dragging
    this.marks.addEventListener('click', e => {
      const u = e.target.closest('use');
      if (!u) return;
      this.marks.querySelector('.selected')?.classList.remove('selected');
      u.classList.add('selected');
      if (typeof window.showWoundDetails === 'function') {
        window.showWoundDetails(u.dataset.id);
      }
    });

    // Basic controls
    this.btnDelete?.addEventListener('click', () => {
      const sel = this.marks.querySelector('use.selected');
      if (sel) this.removeMark(sel);
    });
    this.btnUndo?.addEventListener('click', () => this.undo());
    this.btnRedo?.addEventListener('click', () => this.redo());
    this.btnClear?.addEventListener('click', async () => {
      if (await notify({ type: 'confirm', message: 'Išvalyti visas žymas (priekis ir nugara)?' })) {
        this.marks.innerHTML = '';
        this.burns.clear();
        this.zoneMap.forEach(z => z.classList.remove('burned'));
        this.selectedList && (this.selectedList.innerHTML = '');
        this.markSeq = 0;
        this.undoStack = [];
        this.redoStack = [];
        this.updateBurnDisplay();
        this.updateUndoRedoButtons();
        this.saveCb();
      }
    });
    this.btnExport?.addEventListener('click', () => this.exportSvg());

    this.updateBurnDisplay();
    this.updateUndoRedoButtons();
  }

  /** Switch the active drawing tool. */
  setTool(tool) {
    this.activeTool = tool;
    this.tools.forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  }

  /** Convert client coordinates to SVG coordinates. */
  svgPoint(evt) {
    const pt = this.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  /** Keep coordinates within the body outline. */
  clampToBody(x, y, side) {
    const target = side ? this.svg.querySelector(`#layer-${side}`) : this.svg;
    let bbox;
    if (target && typeof target.getBBox === 'function') {
      try { bbox = target.getBBox(); } catch { bbox = null; }
    }
    if (!bbox || (bbox.width === 0 && bbox.height === 0)) {
      const vb = this.svg.getAttribute('viewBox')?.split(/\s+/).map(Number);
      if (vb) bbox = { x: vb[0], y: vb[1], width: vb[2], height: vb[3] };
    }
    if (!bbox) return { x, y };
    return {
      x: Math.min(Math.max(x, bbox.x), bbox.x + bbox.width),
      y: Math.min(Math.max(y, bbox.y), bbox.y + bbox.height)
    };
  }

  /** Add a new mark to the map. */
  addMark(x, y, type = this.activeTool, side, zone, id, record = true) {
    ({ x, y } = this.clampToBody(x, y, side));
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const symbol = TOOL_SYMBOL[type];
    if (symbol) use.setAttribute('href', symbol);
    use.setAttribute('transform', `translate(${x},${y})`);
    const mid = id || ++this.markSeq;
    use.dataset.id = mid;
    use.dataset.type = type;
    use.dataset.side = side;
    if (mid > this.markSeq) this.markSeq = mid;
    if (zone) {
      use.dataset.zone = zone;
      if (this.selectedList) {
        const el = document.createElement('div');
        el.textContent = ZONE_LABELS[zone] || zone;
        el.dataset.id = mid;
        this.selectedList.appendChild(el);
      }
    }
    use.addEventListener('pointerdown', e => this.startDrag(e, use));
    this.marks.appendChild(use);
    if (record) {
      this.undoStack.push({ type: 'add', mark: { id: mid, x, y, type, side, zone } });
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
    this.saveCb();
  }

  /** Begin dragging a mark. */
  startDrag(evt, el) {
    const tr = el.getAttribute('transform');
    const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tr) || [0, 0, 0];
    this.drag = { el, startX: evt.clientX, startY: evt.clientY, origX: +m[1], origY: +m[2] };
    document.addEventListener('pointermove', this.onDragMove);
    document.addEventListener('pointerup', this.onDragEnd);
  }

  onDragMove(evt) {
    if (!this.drag) return;
    const dx = evt.clientX - this.drag.startX;
    const dy = evt.clientY - this.drag.startY;
    let x = this.drag.origX + dx;
    let y = this.drag.origY + dy;
    ({ x, y } = this.clampToBody(x, y, this.drag.el.dataset.side));
    this.drag.el.setAttribute('transform', `translate(${x},${y})`);
  }

  onDragEnd() {
    if (!this.drag) return;
    document.removeEventListener('pointermove', this.onDragMove);
    document.removeEventListener('pointerup', this.onDragEnd);
    this.drag = null;
    this.saveCb();
  }

  /** Remove a mark from the map. */
  removeMark(el, record = true) {
    if (!el) return;
    if (this.selectedList && el.dataset.zone) {
      this.selectedList.querySelector(`[data-id="${el.dataset.id}"]`)?.remove();
    }
    const tr = el.getAttribute('transform');
    const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tr) || [0, 0, 0];
    const data = {
      id: +el.dataset.id,
      x: +m[1],
      y: +m[2],
      type: el.dataset.type,
      side: el.dataset.side,
      zone: el.dataset.zone
    };
    el.remove();
    if (record) {
      this.undoStack.push({ type: 'delete', mark: data });
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
    this.saveCb();
  }

  /** Toggle burn state for a zone. */
  toggleZoneBurn(name, record = true) {
    const el = this.zoneMap.get(name);
    if (!el) return;
    const burned = el.classList.toggle('burned');
    if (burned) this.burns.add(name); else this.burns.delete(name);
    if (record) {
      this.undoStack.push({ type: 'burn', zone: name });
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
    this.updateBurnDisplay();
    this.saveCb();
  }

  /** Compute total burned area percentage. */
  burnArea() {
    let total = 0;
    this.burns.forEach(z => {
      const area = parseFloat(this.zoneMap.get(z)?.dataset.area);
      total += isNaN(area) ? 0 : area;
    });
    return total;
  }

  /** Display burn percentage in the UI. */
  updateBurnDisplay() {
    if (!this.burnTotalEl) return;
    const t = this.burnArea();
    this.burnTotalEl.textContent = t ? `Nudegimai: ${t}%` : '';
  }

  /** Enable/disable undo and redo buttons. */
  updateUndoRedoButtons() {
    if (this.btnUndo) this.btnUndo.disabled = this.undoStack.length === 0;
    if (this.btnRedo) this.btnRedo.disabled = this.redoStack.length === 0;
  }

  /** Export a self-contained SVG with embedded silhouettes. */
  async exportSvg() {
    const clone = this.svg.cloneNode(true);
    const uses = [...clone.querySelectorAll('use[data-src]')];
    for (const u of uses) {
      const ref = u.dataset.src;
      if (!ref) continue;
      const [url, hash] = ref.split('#');
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const txt = await res.text();
        const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
        const el = doc.getElementById(hash);
        if (!el) continue;
        const replacement = el.cloneNode(true);
        // Copy non-href attributes from original <use>
        [...u.attributes].forEach(attr => {
          if (!['href', 'xlink:href', 'data-src'].includes(attr.name)) {
            replacement.setAttribute(attr.name, attr.value);
          }
        });
        u.replaceWith(replacement);
      } catch (e) {
        console.error(e);
      }
    }
    const style = document.createElement('style');
      style.textContent = `#bodySvg{display:block;width:100%;height:auto;aspect-ratio:1500/900;max-width:40rem;max-height:80vh;border:1px solid #2d3b4f;border-radius:0.75rem;background:#0b141e}
.silhouette{fill:none;stroke:#2d3b4f;stroke-width:2}
.mark-w{stroke:#ef5350;stroke-width:3;fill:none}
.mark-b{fill:#64b5f6}
.mark-n{fill:#ffd54f;stroke:#6b540e;stroke-width:2}
.zone{fill:transparent;cursor:pointer;transition:fill .2s}
.zone:hover{fill:rgba(78,160,245,0.6)}
.zone.selected{fill:rgba(78,160,245,0.8)}
.zone.burned{fill:rgba(229,57,53,0.9)}`;
    clone.insertBefore(style, clone.firstChild);
    const ser = new XMLSerializer();
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ser.serializeToString(clone));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kuno-zemelapis.svg';
    a.click();
  }

  /** Undo the last action. */
  undo() {
    const action = this.undoStack.pop();
    if (!action) return;
    switch (action.type) {
      case 'add': {
        const m = this.marks.querySelector(`use[data-id="${action.mark.id}"]`);
        this.removeMark(m, false);
        break;
      }
      case 'delete': {
        const m = action.mark;
        this.addMark(m.x, m.y, m.type, m.side, m.zone, m.id, false);
        break;
      }
      case 'burn':
        this.toggleZoneBurn(action.zone, false);
        break;
    }
    this.redoStack.push(action);
    this.updateUndoRedoButtons();
  }

  /** Redo a previously undone action. */
  redo() {
    const action = this.redoStack.pop();
    if (!action) return;
    switch (action.type) {
      case 'add': {
        const m = action.mark;
        this.addMark(m.x, m.y, m.type, m.side, m.zone, m.id, false);
        break;
      }
      case 'delete': {
        const m = this.marks.querySelector(`use[data-id="${action.mark.id}"]`);
        this.removeMark(m, false);
        break;
      }
      case 'burn':
        this.toggleZoneBurn(action.zone, false);
        break;
    }
    this.undoStack.push(action);
    this.updateUndoRedoButtons();
  }

  /** Serialize current map state. */
  serialize() {
    const marks = [...this.marks.querySelectorAll('use')].map(u => {
      const tr = u.getAttribute('transform');
      const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tr) || [0, 0, 0];
      return {
        id: +u.dataset.id,
        x: +m[1],
        y: +m[2],
        type: u.dataset.type,
        side: u.dataset.side,
        zone: u.dataset.zone
      };
    });
    const burns = [...this.burns].map(z => ({
      zone: z,
      side: this.zoneMap.get(z)?.closest('#layer-back') ? 'back' : 'front'
    }));
    return JSON.stringify({ tool: this.activeTool, marks, burns });
  }

  /** Load previously serialized state. */
  load(raw) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      this.activeTool = data.tool || TOOLS.WOUND.char;
      this.setTool(this.activeTool);
      this.marks.innerHTML = '';
      this.burns.clear();
      this.zoneMap.forEach(z => z.classList.remove('burned'));
      this.selectedList && (this.selectedList.innerHTML = '');
      this.undoStack = [];
      this.redoStack = [];
      (data.marks || []).forEach(m => this.addMark(m.x, m.y, m.type, m.side, m.zone, m.id, false));
      (data.burns || []).forEach(b => this.toggleZoneBurn(b.zone, false));
      this.updateBurnDisplay();
      this.updateUndoRedoButtons();
    } catch (e) {
      console.error(e);
    }
  }

  /** Count marks by side and tool and include burn percentage. */
  counts() {
    const res = { front: {}, back: {}, burned: this.burnArea() };
    Object.values(TOOLS).forEach(t => {
      res.front[t.char] = 0;
      res.back[t.char] = 0;
    });
    [...this.marks.querySelectorAll('use')].forEach(u => {
      const side = u.dataset.side;
      const type = u.dataset.type;
      if (res[side] && type in res[side]) res[side][type]++;
    });
    return res;
  }

  /** Aggregated counts per zone including burn areas. */
  zoneCounts() {
    const res = {};
    const types = Object.values(TOOLS).map(t => t.char);
    [...this.marks.querySelectorAll('use')].forEach(u => {
      const z = u.dataset.zone;
      if (!z) return;
      if (!res[z]) {
        res[z] = { burned: 0, label: ZONE_LABELS[z] || z };
        types.forEach(t => (res[z][t] = 0));
      }
      res[z][u.dataset.type] = (res[z][u.dataset.type] || 0) + 1;
    });
    this.burns.forEach(z => {
      if (!res[z]) {
        res[z] = { burned: 0, label: ZONE_LABELS[z] || z };
        types.forEach(t => (res[z][t] = 0));
      }
      const area = parseFloat(this.zoneMap.get(z)?.dataset.area);
      res[z].burned += isNaN(area) ? 0 : area;
    });
    return res;
  }
}

