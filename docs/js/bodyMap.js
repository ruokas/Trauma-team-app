import { $, $$ } from './utils.js';
import { notify } from './alerts.js';
import zones from './bodyMapZones.js';

let svg, marks, btnUndo, btnRedo, btnClear, btnExport, btnDelete, tools, burnTotalEl, selectedList;
export const TOOLS = { WOUND: 'Ž', BRUISE: 'S', BURN: 'N' };
let activeTool = TOOLS.WOUND;
let saveCb = () => {};
const burns = new Set();
const zoneMap = new Map();
let markIdSeq = 0;
const undoStack = [];
const redoStack = [];

// Mapping of zone identifiers to human‑readable labels
export const ZONE_LABELS = zones.reduce((acc, z) => {
  acc[z.id] = z.label;
  return acc;
}, {});

function setTool(t){
  activeTool = t;
  tools.forEach(b => b.classList.toggle('active', b.dataset.tool === t));
}

function svgPoint(evt){
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function addMark(x, y, t, s, zone, id, record = true){
  const use = document.createElementNS('http://www.w3.org/2000/svg','use');
  if(t===TOOLS.WOUND) use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-wound');
  if(t===TOOLS.BRUISE) use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-bruise');
  if(t===TOOLS.BURN) use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-burn');
  use.setAttribute('transform',`translate(${x},${y})`);
  use.dataset.type = t;
  use.dataset.side = s;
  const mid = id || ++markIdSeq;
  use.dataset.id = mid;
  if(mid > markIdSeq) markIdSeq = mid;
  if(zone){
    use.dataset.zone = zone;
    if(selectedList){
      const el=document.createElement('div');
      el.textContent = ZONE_LABELS[zone] || zone;
      el.dataset.id = mid;
      selectedList.appendChild(el);
    }
  }
  marks.appendChild(use);
  if(record){
    undoStack.push({type:'addMark', mark:{id:mid,x,y,type:t,side:s,zone}});
    redoStack.length = 0;
    updateUndoRedoButtons();
  }
  saveCb();
}

function toggleZoneBurn(name, record = true){
  const el = zoneMap.get(name);
  if(!el) return;
  el.classList.toggle('burned');
  if(el.classList.contains('burned')) burns.add(name); else burns.delete(name);
  if(record){
    undoStack.push({type:'toggleBurn', zone:name});
    redoStack.length = 0;
    updateUndoRedoButtons();
  }
  updateBurnDisplay();
  saveCb();
}

function burnArea(){
  let s=0;
  burns.forEach(z=>{
    const el = zoneMap.get(z);
    const area = el ? parseFloat(el.dataset.area) : 0;
    s += isNaN(area) ? 0 : area;
  });
  return s;
}

function updateBurnDisplay(){
  if(burnTotalEl){
    const t=burnArea();
    burnTotalEl.textContent = t?`Nudegimai: ${t}%`:'';
  }
}

function updateUndoRedoButtons(){
  if(btnUndo) btnUndo.disabled = undoStack.length === 0;
  if(btnRedo) btnRedo.disabled = redoStack.length === 0;
}

function removeMark(m, record = true){
  if(!m) return;
  if(selectedList && m.dataset.zone){
    selectedList.querySelector(`[data-id="${m.dataset.id}"]`)?.remove();
  }
  const tr=m.getAttribute('transform');
  const r=/translate\(([-\d.]+),([-\d.]+)\)/.exec(tr)||[0,0,0];
  const data={id:+m.dataset.id,x:+r[1],y:+r[2],type:m.dataset.type,side:m.dataset.side,zone:m.dataset.zone};
  m.remove();
  if(record){
    undoStack.push({type:'deleteMark', mark:data});
    redoStack.length = 0;
    updateUndoRedoButtons();
  }
  saveCb();
}

function undo(){
  const action = undoStack.pop();
  if(!action) return;
  switch(action.type){
    case 'addMark':{
      const m = marks.querySelector(`use[data-id="${action.mark.id}"]`);
      removeMark(m,false);
      break;
    }
    case 'deleteMark':{
      const a = action.mark;
      addMark(a.x,a.y,a.type,a.side,a.zone,a.id,false);
      break;
    }
    case 'toggleBurn':
      toggleZoneBurn(action.zone,false);
      break;
  }
  redoStack.push(action);
  updateUndoRedoButtons();
}

function redo(){
  const action = redoStack.pop();
  if(!action) return;
  switch(action.type){
    case 'addMark':{
      const a = action.mark;
      addMark(a.x,a.y,a.type,a.side,a.zone,a.id,false);
      break;
    }
    case 'deleteMark':{
      const m = marks.querySelector(`use[data-id="${action.mark.id}"]`);
      removeMark(m,false);
      break;
    }
    case 'toggleBurn':
      toggleZoneBurn(action.zone,false);
      break;
  }
  undoStack.push(action);
  updateUndoRedoButtons();
}

export function initBodyMap(saveAll){
  saveCb = saveAll || (()=>{});
  svg = $('#bodySvg');
  marks = $('#marks');
  btnUndo = $('#btnUndo');
  btnRedo = $('#btnRedo');
  btnClear = $('#btnClearMap');
  btnExport = $('#btnExportSvg');
  btnDelete = $('#btnDelete');
  tools = $$('.map-toolbar .tool[data-tool]');
  burnTotalEl = $('#burnTotal');
  selectedList = $('#selectedLocations');
  if(!svg || !marks) return;

  tools.forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
  setTool(TOOLS.WOUND);
  updateUndoRedoButtons();

  ['front-shape','back-shape'].forEach(id=>{
    const el = document.getElementById(id);
    el?.addEventListener('click',evt=>{
      const p = svgPoint(evt);
      addMark(p.x,p.y,activeTool,el.dataset.side);
    });
  });

  $$('.zone').forEach(z=>{
    const name=z.dataset.zone;
    zoneMap.set(name,z);
    z.addEventListener('click',evt=>{
      const side=z.closest('#layer-back')?'back':'front';
      if(activeTool===TOOLS.BURN){
        toggleZoneBurn(name);
      }else{
        const p=svgPoint(evt);
        addMark(p.x,p.y,activeTool,side,name);
      }
    });
  });

  updateBurnDisplay();

  marks.addEventListener('click', e => {
    const u = e.target.closest('use');
    if(!u) return;
    marks.querySelector('.selected')?.classList.remove('selected');
    u.classList.add('selected');
    if(typeof window.showWoundDetails === 'function') window.showWoundDetails(u.dataset.id);
  });

  btnUndo?.addEventListener('click',undo);
  btnRedo?.addEventListener('click',redo);

  btnDelete?.addEventListener('click',()=>{
    const sel = marks.querySelector('use.selected');
    if(sel) removeMark(sel);
  });

  btnClear?.addEventListener('click', async ()=>{
    if(await notify({type:'confirm', message:'Išvalyti visas žymas (priekis ir nugara)?'})){
      marks.innerHTML='';
      burns.clear();
      $$('.zone').forEach(z=>z.classList.remove('burned'));
      updateBurnDisplay();
      selectedList && (selectedList.innerHTML='');
      saveCb();
    }
  });

  btnExport?.addEventListener('click',async()=>{
    const clone=svg.cloneNode(true);
    const uses=[...clone.querySelectorAll('use[data-src]')];
    for(const u of uses){
      const ref=u.dataset.src; if(!ref) continue;
      const [url,hash]=ref.split('#');
      try{
        const res=await fetch(url); if(!res.ok) continue;
        const txt=await res.text();
        const doc=new DOMParser().parseFromString(txt,'image/svg+xml');
        const el=doc.getElementById(hash); if(!el) continue;
        const replacement=el.cloneNode(true);
        [...u.attributes].forEach(a=>{if(!['href','xlink:href','data-src'].includes(a.name))replacement.setAttribute(a.name,a.value);});
        u.replaceWith(replacement);
      }catch(e){console.error(e);}
    }
    const style=document.createElement('style');
      style.textContent=`#bodySvg{display:block;width:100%;height:auto;aspect-ratio:1500/900;max-width:40rem;max-height:80vh;border:1px solid #2d3b4f;border-radius:0.75rem;background:#0b141e}
.silhouette{fill:none;stroke:#2d3b4f;stroke-width:2}
.mark-w{stroke:#ef5350;stroke-width:3;fill:none}
.mark-b{fill:#64b5f6}
.mark-n{fill:#ffd54f;stroke:#6b540e;stroke-width:2}
.zone{fill:transparent;cursor:pointer;transition:fill .2s}
.zone:hover{fill:rgba(78,160,245,0.6)}
.zone.selected{fill:rgba(78,160,245,0.8)}
.zone.burned{fill:rgba(229,57,53,0.9)}`;
    clone.insertBefore(style,clone.firstChild);
    const ser=new XMLSerializer(); const src=ser.serializeToString(clone);
    const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src);
    const a=document.createElement('a'); a.href=url; a.download='kuno-zemelapis.svg'; a.click();
  });
}

export function serialize(){
  const arr=[...marks.querySelectorAll('use')].map(u=>{
    const tr=u.getAttribute('transform');
    const m=/translate\(([-\d.]+),([-\d.]+)\)/.exec(tr)||[0,0,0];
    return {id:+u.dataset.id, x:+m[1], y:+m[2], type:u.dataset.type, side:u.dataset.side, zone:u.dataset.zone};
  });
  const burnArr=[...burns].map(z=>{
    const el=zoneMap.get(z);
    const side=el?.closest('#layer-back')?'back':'front';
    return {zone:z, side};
  });
  return JSON.stringify({tool:activeTool,marks:arr,burns:burnArr});
}

export function load(raw){
  try{
    const o=typeof raw==='string'?JSON.parse(raw):raw;
    activeTool=o.tool||TOOLS.WOUND;
    setTool(activeTool);
    marks.innerHTML='';
    burns.clear();
    $$('.zone').forEach(z=>z.classList.remove('burned'));
    selectedList && (selectedList.innerHTML='');
    undoStack.length = 0;
    redoStack.length = 0;
    (o.marks||[]).forEach(m=>addMark(m.x,m.y,m.type,m.side,m.zone,m.id,false));
    (o.burns||[]).forEach(b=>{
      const el=zoneMap.get(b.zone);
      if(el){ el.classList.add('burned'); burns.add(b.zone); }
    });
    updateBurnDisplay();
    updateUndoRedoButtons();
  }catch(e){ console.error(e); }
}

export function counts(){
  const arr=[...marks.querySelectorAll('use')].map(u=>({type:u.dataset.type, side:u.dataset.side}));
  const cnt={
    front:{[TOOLS.WOUND]:0,[TOOLS.BRUISE]:0,[TOOLS.BURN]:0},
    back:{[TOOLS.WOUND]:0,[TOOLS.BRUISE]:0,[TOOLS.BURN]:0}
  };
  arr.forEach(m=>{ if(cnt[m.side] && (m.type in cnt[m.side])) cnt[m.side][m.type]++; });
  cnt.burned=burnArea();
  return cnt;
}

// Returns counts of marks and burn areas grouped by body zones
export function zoneCounts(){
  const zones={};
  // accumulate mark counts per zone
  marks && [...marks.querySelectorAll('use')].forEach(u=>{
    const z=u.dataset.zone;
    if(!z) return;
    if(!zones[z]) zones[z]={[TOOLS.WOUND]:0,[TOOLS.BRUISE]:0,[TOOLS.BURN]:0,burned:0,label:ZONE_LABELS[z]||z};
    zones[z][u.dataset.type]=(zones[z][u.dataset.type]||0)+1;
  });
  // add burned area per zone
  burns.forEach(z=>{
    if(!zones[z]) zones[z]={[TOOLS.WOUND]:0,[TOOLS.BRUISE]:0,[TOOLS.BURN]:0,burned:0,label:ZONE_LABELS[z]||z};
    const area=parseFloat(zoneMap.get(z)?.dataset.area);
    zones[z].burned+=isNaN(area)?0:area;
  });
  return zones;
}
