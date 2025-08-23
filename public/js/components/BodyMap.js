import { $, $$ } from '../utils.js';
import { notify } from '../alerts.js';
import zones from '../bodyMapZones.js';
import { TOOLS } from '../BodyMapTools.js';

const ZONE_LABELS = zones.reduce((acc, z) => {
  acc[z.id] = z.label;
  return acc;
}, {});

function parseTransform(str){
  if(!str) return { a:1, b:0, c:0, d:1, e:0, f:0 };
  const m = str.match(/matrix\(([^)]+)\)/);
  if(m){
    const [a,b,c,d,e,f] = m[1].split(/[,\s]+/).map(Number);
    return { a,b,c,d,e,f };
  }
  const ops = str.match(/\w+\([^)]+\)/g);
  let cur = { a:1, b:0, c:0, d:1, e:0, f:0 };
  ops?.forEach(op=>{
    const [name, argsStr] = op.split('(');
    const args = argsStr.slice(0,-1).split(/[,\s]+/).map(Number);
    let t;
    switch(name){
      case 'translate':{
        const tx=args[0]||0, ty=args[1]||0;
        t={a:1,b:0,c:0,d:1,e:tx,f:ty};
        break;
      }
      case 'scale':{
        const sx=args[0], sy=args[1]??args[0];
        t={a:sx,b:0,c:0,d:sy,e:0,f:0};
        break;
      }
      case 'rotate':{
        const ang=(args[0]||0)*Math.PI/180; const cos=Math.cos(ang); const sin=Math.sin(ang);
        t={a:cos,b:sin,c:-sin,d:cos,e:0,f:0};
        break;
      }
      default:
        t={a:1,b:0,c:0,d:1,e:0,f:0};
    }
    cur={
      a: cur.a*t.a + cur.c*t.b,
      b: cur.b*t.a + cur.d*t.b,
      c: cur.a*t.c + cur.c*t.d,
      d: cur.b*t.c + cur.d*t.d,
      e: cur.a*t.e + cur.c*t.f + cur.e,
      f: cur.b*t.e + cur.d*t.f + cur.f
    };
  });
  return cur;
}

export default class BodyMap {
  constructor() {
    this.svg = null;
    this.marks = null;
    this.btnUndo = null;
    this.btnRedo = null;
    this.btnClear = null;
    this.btnExport = null;
    this.btnDelete = null;
    this.tools = [];
    this.burnTotalEl = null;
    this.selectedList = null;
    this.activeTool = TOOLS.WOUND.char;
    this.saveCb = () => {};
    this.burns = new Set();
    this.zoneMap = new Map();
    this.markIdSeq = 0;
    this.dragInfo = null;
    this.dragStart = this.dragStart.bind(this);
    this.dragMove = this.dragMove.bind(this);
    this.dragEnd = this.dragEnd.bind(this);
    this.initialized = false;
    this.tooltip = null;
    this.undoStack = [];
    this.redoStack = [];
  }

  setTool(t) {
    this.activeTool = t;
    this.tools.forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  }

  svgPoint(evt) {
    const pt = this.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = typeof this.svg.getScreenCTM === 'function' ? this.svg.getScreenCTM() : null;
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: pt.x, y: pt.y };
  }

  clampToBody(x, y, side) {
    const target = side ? this.svg.querySelector(`#layer-${side}`) : this.svg;
    let bbox;
    if (typeof target?.getBBox === 'function') {
      try {
        bbox = target.getBBox();
      } catch {
        bbox = null;
      }
    }
    if (!bbox || (bbox.width === 0 && bbox.height === 0)) {
      const vb = this.svg.getAttribute('viewBox')?.split(/\s+/).map(Number);
      bbox = vb ? { x: vb[0], y: vb[1], width: vb[2], height: vb[3] } : null;
    }
    if (!bbox) {
      const rect = target?.getBoundingClientRect?.();
      const ctm = typeof this.svg.getScreenCTM === 'function' ? this.svg.getScreenCTM() : null;
      if (rect && ctm) {
        const pt1 = this.svg.createSVGPoint();
        pt1.x = rect.left; pt1.y = rect.top;
        const pt2 = this.svg.createSVGPoint();
        pt2.x = rect.right; pt2.y = rect.bottom;
        const inv = ctm.inverse();
        const tl = pt1.matrixTransform(inv);
        const br = pt2.matrixTransform(inv);
        bbox = { x: tl.x, y: tl.y, width: br.x - tl.x, height: br.y - tl.y };
      }
    }
    if (!bbox) return { x, y };
    return {
      x: Math.min(Math.max(x, bbox.x), bbox.x + bbox.width),
      y: Math.min(Math.max(y, bbox.y), bbox.y + bbox.height)
    };
  }

  dragStart(evt) {
    const el = evt.currentTarget;
    const base = el.transform?.baseVal?.consolidate();
    const matrix = base ? base.matrix : parseTransform(el.getAttribute('transform'));
    this.dragInfo = {
      el,
      startX: evt.clientX,
      startY: evt.clientY,
      matrix,
      hasTransformList: !!el.transform?.baseVal
    };
    document.addEventListener('pointermove', this.dragMove);
    document.addEventListener('pointerup', this.dragEnd);
  }

  dragMove(evt) {
    if(!this.dragInfo) return;
    const { el, startX, startY, matrix, hasTransformList } = this.dragInfo;
    const dx = evt.clientX - startX;
    const dy = evt.clientY - startY;
    let x = matrix.e + dx;
    let y = matrix.f + dy;
    ({ x, y } = this.clampToBody(x, y, el.dataset.side));
    const newMatrix = { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: x, f: y };
    if (hasTransformList && el.transform?.baseVal && this.svg.createSVGTransformFromMatrix && this.svg.createSVGMatrix) {
      const m = this.svg.createSVGMatrix();
      m.a = newMatrix.a; m.b = newMatrix.b; m.c = newMatrix.c; m.d = newMatrix.d; m.e = newMatrix.e; m.f = newMatrix.f;
      const t = this.svg.createSVGTransformFromMatrix(m);
      el.transform.baseVal.initialize(t);
    } else {
      el.setAttribute('transform', `matrix(${newMatrix.a} ${newMatrix.b} ${newMatrix.c} ${newMatrix.d} ${newMatrix.e} ${newMatrix.f})`);
    }
  }

  dragEnd() {
    if(!this.dragInfo) return;
    document.removeEventListener('pointermove', this.dragMove);
    document.removeEventListener('pointerup', this.dragEnd);
    this.dragInfo = null;
    this.saveCb();
  }

  addMark(x, y, t = this.activeTool, s, zone, id, record = true){
    ({ x, y } = this.clampToBody(x, y, s));
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const symbol = Object.values(TOOLS).find(tool => tool.char === t)?.symbol;
    if (symbol) {
      use.setAttribute('href', symbol);
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', symbol);
    }
    use.setAttribute('transform',`translate(${x},${y})`);
    use.dataset.type = t;
    use.dataset.side = s;
    const mid = id || ++this.markIdSeq;
    use.dataset.id = mid;
    if(mid > this.markIdSeq) this.markIdSeq = mid;
    if(zone){
      use.dataset.zone = zone;
      if(this.selectedList){
        const el=document.createElement('div');
        el.textContent = ZONE_LABELS[zone] || zone;
        el.dataset.id = mid;
        this.selectedList.appendChild(el);
      }
    }
    this.marks.appendChild(use);
    use.addEventListener('pointerdown', this.dragStart);
    if(record){
      this.undoStack.push({type:'addMark', mark:{id:mid,x,y,type:t,side:s,zone}});
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
    this.saveCb();
  }

  toggleZoneBurn(name, record = true){
    const el = this.zoneMap.get(name);
    if(!el) return;
    el.classList.toggle('burned');
    if(el.classList.contains('burned')) this.burns.add(name); else this.burns.delete(name);
    if(record){
      this.undoStack.push({type:'toggleBurn', zone:name});
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
    this.updateBurnDisplay();
    this.saveCb();
  }

  burnArea(){
    let s=0;
    this.burns.forEach(z=>{
      const el = this.zoneMap.get(z);
      const area = el ? parseFloat(el.dataset.area) : 0;
      s += isNaN(area) ? 0 : area;
    });
    return s;
  }

  updateUndoRedoButtons(){
    if(this.btnUndo) this.btnUndo.disabled = this.undoStack.length === 0;
    if(this.btnRedo) this.btnRedo.disabled = this.redoStack.length === 0;
  }

  removeMark(m, record = true){
    if(!m) return;
    if(this.selectedList && m.dataset.zone){
      this.selectedList.querySelector(`[data-id="${m.dataset.id}"]`)?.remove();
    }
    const tr = m.getAttribute('transform');
    const r = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tr) || [0,0,0];
    const data = {id:+m.dataset.id, x:+r[1], y:+r[2], type:m.dataset.type, side:m.dataset.side, zone:m.dataset.zone};
    m.remove();
    if(record){
      this.undoStack.push({type:'deleteMark', mark:data});
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
    this.saveCb();
  }

  undo(){
    const action = this.undoStack.pop();
    if(!action) return;
    switch(action.type){
      case 'addMark':{
        const m = this.marks.querySelector(`use[data-id="${action.mark.id}"]`);
        this.removeMark(m, false);
        break;
      }
      case 'deleteMark':{
        const a = action.mark;
        this.addMark(a.x, a.y, a.type, a.side, a.zone, a.id, false);
        break;
      }
      case 'toggleBurn':
        this.toggleZoneBurn(action.zone, false);
        break;
    }
    this.redoStack.push(action);
    this.updateUndoRedoButtons();
  }

  redo(){
    const action = this.redoStack.pop();
    if(!action) return;
    switch(action.type){
      case 'addMark':{
        const a = action.mark;
        this.addMark(a.x, a.y, a.type, a.side, a.zone, a.id, false);
        break;
      }
      case 'deleteMark':{
        const m = this.marks.querySelector(`use[data-id="${action.mark.id}"]`);
        this.removeMark(m, false);
        break;
      }
      case 'toggleBurn':
        this.toggleZoneBurn(action.zone, false);
        break;
    }
    this.undoStack.push(action);
    this.updateUndoRedoButtons();
  }

    updateBurnDisplay(){
      if(this.burnTotalEl){
        const t=this.burnArea();
        this.burnTotalEl.textContent = t?`Nudegimai: ${t}%`:'';
      }
    }

    showTooltip(evt, label){
      if(!this.tooltip){
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'zone-tooltip';
        Object.assign(this.tooltip.style, {
          position: 'absolute',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '0.75rem',
          display: 'none'
        });
        document.body.appendChild(this.tooltip);
      }
      this.tooltip.textContent = label;
      this.tooltip.style.display = 'block';
      this.tooltip.style.left = `${evt.pageX + 10}px`;
      this.tooltip.style.top = `${evt.pageY + 10}px`;
    }

    hideTooltip(){
      if(this.tooltip) this.tooltip.style.display = 'none';
    }

  init(saveAll){
    if(this.initialized) return;
    this.zoneMap.clear();
    this.saveCb = saveAll || (()=>{});
    this.svg = $('#bodySvg');
    this.marks = $('#marks');
    this.btnUndo = $('#btnUndo');
    this.btnRedo = $('#btnRedo');
    this.btnClear = $('#btnClearMap');
    this.btnExport = $('#btnExportSvg');
    this.btnDelete = $('#btnDelete');
    this.tools = $$('.map-toolbar .tool[data-tool]');
    this.burnTotalEl = $('#burnTotal');
    this.selectedList = $('#selectedLocations');
    if(!this.svg || !this.marks) return;
    this.initialized = true;

    if(!this.svg.querySelector('.zone')){
      const layers = { front: $('#layer-front'), back: $('#layer-back') };
      zones.forEach(z => {
        const layer = layers[z.side];
        if(!layer){
          console.warn(`Missing layer for side ${z.side}`);
          return;
        }
        let container = layer.querySelector('.zones');
        if(!container){
          container = document.createElementNS('http://www.w3.org/2000/svg','g');
          container.classList.add('zones');
          const shape = layer.querySelector(`#${z.side}-shape`);
          const tr = shape?.getAttribute('transform');
          if(tr) container.setAttribute('transform', tr);
          layer.appendChild(container);
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
        path.classList.add('zone');
        path.dataset.zone = z.id;
        path.dataset.side = z.side;
        path.dataset.area = z.area;
        path.setAttribute('d', z.path);
        path.setAttribute('aria-label', z.label);
        const title = document.createElementNS('http://www.w3.org/2000/svg','title');
        title.textContent = z.label;
        path.appendChild(title);
        path.addEventListener('pointerenter', e => this.showTooltip(e, z.label));
        path.addEventListener('pointermove', e => this.showTooltip(e, z.label));
        path.addEventListener('pointerleave', () => this.hideTooltip());
        container.appendChild(path);
      });
    }

    this.tools.forEach(b=>b.addEventListener('click',()=>this.setTool(b.dataset.tool)));
    this.setTool(this.activeTool);
    this.updateUndoRedoButtons();

    ['front-shape','back-shape'].forEach(id=>{
      const el = document.getElementById(id);
      el?.addEventListener('click',evt=>{
        const p = this.svgPoint(evt);
        this.addMark(p.x,p.y,this.activeTool,el.dataset.side);
      });
    });

      $$('.zone', this.svg).forEach(z=>{
        const name=z.dataset.zone;
        z.dataset.side = z.dataset.side || (z.closest('#layer-back') ? 'back' : 'front');
        this.zoneMap.set(name,z);
        z.addEventListener('click',evt=>{
          const side=z.dataset.side;
          if(this.activeTool===TOOLS.BURN.char){
            this.toggleZoneBurn(name);
          }else{
            const p=this.svgPoint(evt);
            this.addMark(p.x,p.y,this.activeTool,side,name);
          }
        });
      });

    this.updateBurnDisplay();

    this.marks.addEventListener('click', e => {
      const u = e.target.closest('use');
      if(!u) return;
      this.marks.querySelector('.selected')?.classList.remove('selected');
      u.classList.add('selected');
      if(typeof window.showWoundDetails === 'function') window.showWoundDetails(u.dataset.id);
    });

    this.btnUndo?.addEventListener('click',()=>this.undo());
    this.btnRedo?.addEventListener('click',()=>this.redo());

    this.btnDelete?.addEventListener('click',()=>{
      const sel = this.marks.querySelector('use.selected');
      if(sel) this.removeMark(sel);
    });

    this.btnClear?.addEventListener('click', async ()=>{
      if(await notify({type:'confirm', message:'Išvalyti visas žymas (priekis ir nugara)?'})){
        this.marks.innerHTML='';
        this.burns.clear();
        $$('.zone', this.svg).forEach(z=>z.classList.remove('burned'));
        this.updateBurnDisplay();
        this.selectedList && (this.selectedList.innerHTML='');
        this.saveCb();
      }
    });

    this.btnExport?.addEventListener('click',()=>{
      const clone=this.svg.cloneNode(true);
      const ser=new XMLSerializer(); const src=ser.serializeToString(clone);
      const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src);
      const a=document.createElement('a'); a.href=url; a.download='kuno-zemelapis.svg'; a.click();
    });
  }

  serialize(){
    const arr=[...this.marks.querySelectorAll('use')].map(u=>{
      const tr=u.getAttribute('transform');
      const m=/translate\(([-\d.]+),([-\d.]+)\)/.exec(tr)||[0,0,0];
      return {id:+u.dataset.id, x:+m[1], y:+m[2], type:u.dataset.type, side:u.dataset.side, zone:u.dataset.zone};
    });
      const burnArr=[...this.burns].map(z=>{
        const el=this.zoneMap.get(z);
        const side=el?.dataset.side;
        return {zone:z, side};
      });
    return JSON.stringify({tool:this.activeTool,marks:arr,burns:burnArr});
  }

  load(raw){
    try{
      const o=typeof raw==='string'?JSON.parse(raw):raw;
      this.activeTool=o.tool||TOOLS.WOUND.char;
      this.setTool(this.activeTool);
      this.marks.innerHTML='';
      this.burns.clear();
      $$('.zone', this.svg).forEach(z=>z.classList.remove('burned'));
      this.selectedList && (this.selectedList.innerHTML='');
      this.undoStack = [];
      this.redoStack = [];
      (o.marks||[]).forEach(m=>this.addMark(m.x,m.y,m.type,m.side,m.zone,m.id,false));
      (o.burns||[]).forEach(b=>{
        const el=this.zoneMap.get(b.zone);
        if(el){ el.classList.add('burned'); this.burns.add(b.zone); }
      });
      this.updateBurnDisplay();
      this.updateUndoRedoButtons();
    }catch(e){ console.error(e); }
  }

  counts(){
    const types = Object.values(TOOLS).map(t=>t.char);
    const cnt={ front:{}, back:{} };
    types.forEach(t=>{ cnt.front[t]=0; cnt.back[t]=0; });
    const arr=[...this.marks.querySelectorAll('use')].map(u=>({type:u.dataset.type, side:u.dataset.side}));
    arr.forEach(m=>{ if(cnt[m.side] && (m.type in cnt[m.side])) cnt[m.side][m.type]++; });
    cnt.burned=this.burnArea();
    return cnt;
  }

  zoneCounts(){
    const types = Object.values(TOOLS).map(t=>t.char);
    const zonesRes={};
    this.marks && [...this.marks.querySelectorAll('use')].forEach(u=>{
      const z=u.dataset.zone;
      if(!z) return;
      if(!zonesRes[z]){
        zonesRes[z]={burned:0,label:ZONE_LABELS[z]||z};
        types.forEach(t=>zonesRes[z][t]=0);
      }
      zonesRes[z][u.dataset.type]=(zonesRes[z][u.dataset.type]||0)+1;
    });
    this.burns.forEach(z=>{
      if(!zonesRes[z]){
        zonesRes[z]={burned:0,label:ZONE_LABELS[z]||z};
        types.forEach(t=>zonesRes[z][t]=0);
      }
      const area=parseFloat(this.zoneMap.get(z)?.dataset.area);
      zonesRes[z].burned+=isNaN(area)?0:area;
    });
    return zonesRes;
  }
}
