import { $, $$ } from './utils.js';
import { notify } from './alerts.js';

let svg, marks, btnUndo, btnClear, btnExport, tools;
let activeTool = 'Ž';
let saveCb = () => {};

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

function addMark(x, y, t, s){
  const use = document.createElementNS('http://www.w3.org/2000/svg','use');
  if(t==='Ž') use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-wound');
  if(t==='S') use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-bruise');
  if(t==='N') use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-burn');
  use.setAttribute('transform',`translate(${x},${y})`);
  use.dataset.type = t;
  use.dataset.side = s;
  marks.appendChild(use);
  saveCb();
}

export function initBodyMap(saveAll){
  saveCb = saveAll || (()=>{});
  svg = $('#bodySvg');
  marks = $('#marks');
  btnUndo = $('#btnUndo');
  btnClear = $('#btnClearMap');
  btnExport = $('#btnExportSvg');
  tools = $$('.map-toolbar .tool[data-tool]');
  if(!svg || !marks) return;

  tools.forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
  setTool('Ž');

  ['front-shape','back-shape'].forEach(id=>{
    const el = document.getElementById(id);
    el?.addEventListener('click',evt=>{
      const p = svgPoint(evt);
      addMark(p.x,p.y,activeTool,el.dataset.side);
    });
  });

  btnUndo?.addEventListener('click',()=>{
    const list=[...marks.querySelectorAll('use')];
    const last=list.pop(); if(last){ last.remove(); saveCb(); }
  });

  btnClear?.addEventListener('click', async ()=>{
    if(await notify({type:'confirm', message:'Išvalyti visas žymas (priekis ir nugara)?'})){
      marks.innerHTML='';
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
    return {x:+m[1], y:+m[2], type:u.dataset.type, side:u.dataset.side};
  });
  return JSON.stringify({tool:activeTool,marks:arr});
}

export function load(raw){
  try{
    const o=typeof raw==='string'?JSON.parse(raw):raw;
    activeTool=o.tool||'Ž';
    setTool(activeTool);
    marks.innerHTML='';
    (o.marks||[]).forEach(m=>addMark(m.x,m.y,m.type,m.side));
  }catch(e){ /* ignore */ }
}

export function counts(){
  const arr=[...marks.querySelectorAll('use')].map(u=>({type:u.dataset.type, side:u.dataset.side}));
  const cnt={front:{Ž:0,S:0,N:0}, back:{Ž:0,S:0,N:0}};
  arr.forEach(m=>{ if(cnt[m.side] && (m.type in cnt[m.side])) cnt[m.side][m.type]++; });
  return cnt;
}

export function getState(){
  return { tool: activeTool };
}
