import { $, $$ } from '../utils.js';
import { notify } from '../alerts.js';
import zones from '../bodyMapZones.js';
import { TOOLS } from '../BodyMapTools.js';

const ZONE_LABELS = zones.reduce((acc, z) => {
  acc[z.id] = z.label;
  return acc;
}, {});

export default class BodyMap {
  constructor() {
    this.svg = null;
    this.marks = null;
    this.btnUndo = null;
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
  }

  setTool(t) {
    this.activeTool = t;
    this.tools.forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  }

  svgPoint(evt) {
    const pt = this.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  dragStart = (evt) => {
    const el = evt.currentTarget;
    const tr = el.getAttribute('transform');
    const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(tr) || [0,0,0];
    this.dragInfo = {
      el,
      startX: evt.clientX,
      startY: evt.clientY,
      origX: +m[1],
      origY: +m[2]
    };
    document.addEventListener('pointermove', this.dragMove);
    document.addEventListener('pointerup', this.dragEnd);
  };

  dragMove = (evt) => {
    if(!this.dragInfo) return;
    const dx = evt.clientX - this.dragInfo.startX;
    const dy = evt.clientY - this.dragInfo.startY;
    const x = this.dragInfo.origX + dx;
    const y = this.dragInfo.origY + dy;
    this.dragInfo.el.setAttribute('transform', `translate(${x},${y})`);
  };

  dragEnd = () => {
    if(!this.dragInfo) return;
    document.removeEventListener('pointermove', this.dragMove);
    document.removeEventListener('pointerup', this.dragEnd);
    this.dragInfo = null;
    this.saveCb();
  };

  addMark(x, y, t = this.activeTool, s, zone, id){
    const use = document.createElementNS('http://www.w3.org/2000/svg','use');
    const symbol = Object.values(TOOLS).find(tool => tool.char === t)?.symbol;
    if(symbol) use.setAttributeNS('http://www.w3.org/1999/xlink','href',symbol);
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
    this.saveCb();
  }

  toggleZoneBurn(name){
    const el = this.zoneMap.get(name);
    if(!el) return;
    el.classList.toggle('burned');
    if(el.classList.contains('burned')) this.burns.add(name); else this.burns.delete(name);
    this.updateBurnDisplay();
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

  updateBurnDisplay(){
    if(this.burnTotalEl){
      const t=this.burnArea();
      this.burnTotalEl.textContent = t?`Nudegimai: ${t}%`:'';
    }
  }

  init(saveAll){
    this.saveCb = saveAll || (()=>{});
    this.svg = $('#bodySvg');
    this.marks = $('#marks');
    this.btnUndo = $('#btnUndo');
    this.btnClear = $('#btnClearMap');
    this.btnExport = $('#btnExportSvg');
    this.btnDelete = $('#btnDelete');
    this.tools = $$('.map-toolbar .tool[data-tool]');
    this.burnTotalEl = $('#burnTotal');
    this.selectedList = $('#selectedLocations');
    if(!this.svg || !this.marks) return;

    if(!this.svg.querySelector('.zone')){
      const layers = { front: $('#layer-front'), back: $('#layer-back') };
      zones.forEach(z => {
        let container = layers[z.side].querySelector('.zones');
        if(!container){
          container = document.createElementNS('http://www.w3.org/2000/svg','g');
          container.classList.add('zones');
          layers[z.side].appendChild(container);
        }
        const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
        poly.classList.add('zone');
        poly.dataset.zone = z.id;
        poly.dataset.area = z.area;
        poly.setAttribute('points', z.polygonPoints);
        container.appendChild(poly);
      });
    }

    this.tools.forEach(b=>b.addEventListener('click',()=>this.setTool(b.dataset.tool)));
    this.setTool(this.activeTool);

    ['front-shape','back-shape'].forEach(id=>{
      const el = document.getElementById(id);
      el?.addEventListener('click',evt=>{
        const p = this.svgPoint(evt);
        this.addMark(p.x,p.y,this.activeTool,el.dataset.side);
      });
    });

    $$('.zone').forEach(z=>{
      const name=z.dataset.zone;
      this.zoneMap.set(name,z);
      z.addEventListener('click',evt=>{
        const side=z.closest('#layer-back')?'back':'front';
        if(this.activeTool===TOOLS.BURN.char){
          this.toggleZoneBurn(name);
          this.saveCb();
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

    const removeMark = (m)=>{
      if(!m) return;
      if(this.selectedList && m.dataset.zone){
        this.selectedList.querySelector(`[data-id="${m.dataset.id}"]`)?.remove();
      }
      m.remove();
      this.saveCb();
    };

    this.btnUndo?.addEventListener('click',()=>{
      const sel = this.marks.querySelector('use.selected');
      if(sel){
        removeMark(sel);
      }else{
        const list=[...this.marks.querySelectorAll('use')];
        removeMark(list.pop());
      }
    });

    this.btnDelete?.addEventListener('click',()=>{
      const sel = this.marks.querySelector('use.selected');
      if(sel) removeMark(sel);
    });

    this.btnClear?.addEventListener('click', async ()=>{
      if(await notify({type:'confirm', message:'Išvalyti visas žymas (priekis ir nugara)?'})){
        this.marks.innerHTML='';
        this.burns.clear();
        $$('.zone').forEach(z=>z.classList.remove('burned'));
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
      const side=el?.closest('#layer-back')?'back':'front';
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
      $$('.zone').forEach(z=>z.classList.remove('burned'));
      this.selectedList && (this.selectedList.innerHTML='');
      (o.marks||[]).forEach(m=>this.addMark(m.x,m.y,m.type,m.side,m.zone,m.id));
      (o.burns||[]).forEach(b=>{
        const el=this.zoneMap.get(b.zone);
        if(el){ el.classList.add('burned'); this.burns.add(b.zone); }
      });
      this.updateBurnDisplay();
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
