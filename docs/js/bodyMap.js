import { $, $$ } from './utils.js';
import { notify } from './alerts.js';
import zones from './bodyMapZones.js';

let svg, marks, btnUndo, btnClear, btnExport, btnDelete, tools, burnTotalEl, selectedList;
export const TOOLS = { WOUND: 'Ž', BRUISE: 'S', BURN: 'N' };
let activeTool = TOOLS.WOUND;
let saveCb = () => {};
const burns = new Set();
const zoneMap = new Map();
let markIdSeq = 0;

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

function addMark(x, y, t, s, zone, id){
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

export function initBodyMap(saveAll){
  saveCb = saveAll || (()=>{});
  svg = $('#bodySvg');
  marks = $('#marks');
  btnUndo = $('#btnUndo');
  btnClear = $('#btnClearMap');
  btnExport = $('#btnExportSvg');
  btnDelete = $('#btnDelete');
  tools = $$('.map-toolbar .tool[data-tool]');
  burnTotalEl = $('#burnTotal');
  selectedList = $('#selectedLocations');
  if(!svg || !marks) return;

  tools.forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
  setTool(TOOLS.WOUND);

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
        z.classList.toggle('burned');
        if(z.classList.contains('burned')) burns.add(name); else burns.delete(name);
        updateBurnDisplay();
        saveCb();
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

  const removeMark = (m)=>{
    if(!m) return;
    if(selectedList && m.dataset.zone){
      selectedList.querySelector(`[data-id="${m.dataset.id}"]`)?.remove();
    }
    m.remove();
    saveCb();
  };

  btnUndo?.addEventListener('click',()=>{
    const sel = marks.querySelector('use.selected');
    if(sel){
      removeMark(sel);
    }else{
      const list=[...marks.querySelectorAll('use')];
      removeMark(list.pop());
    }
  });

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

  btnExport?.addEventListener('click',()=>{
    const clone=svg.cloneNode(true);
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
    (o.marks||[]).forEach(m=>addMark(m.x,m.y,m.type,m.side,m.zone,m.id));
    (o.burns||[]).forEach(b=>{
      const el=zoneMap.get(b.zone);
      if(el){ el.classList.add('burned'); burns.add(b.zone); }
    });
    updateBurnDisplay();
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
