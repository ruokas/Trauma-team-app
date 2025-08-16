import { $, $$, nowHM } from './utils.js';
import { initTabs, showTab } from './tabs.js';
import { initChips, listChips, setChipActive, isChipActive } from './chips.js';
import { initAutoActivate } from './autoActivate.js';
import { initActions } from './actions.js';

/* ===== Imaging / Labs / Team ===== */
const IMG_CT=['Galvos KT','Kaklo KT','Viso kūno KT'];
const IMG_XRAY=['Krūtinės Ro','Dubens Ro'];
const LABS=['BKT','Biocheminis tyrimas','Krešumai','Fibrinogenas','ROTEM','Kraujo grupė','Kraujo dujos'];
const TEAM_ROLES=['Komandos vadovas','Raštininkas','ED gydytojas 1','ED gydytojas 2','Slaugytoja 1','Slaugytoja 2','Anesteziologas','Chirurgas','Ortopedas'];

const imgCtWrap=$('#imaging_ct'); IMG_CT.forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; imgCtWrap.appendChild(s);});
const imgXrayWrap=$('#imaging_xray'); IMG_XRAY.forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; imgXrayWrap.appendChild(s);});
const imgOtherWrap=$('#imaging_other_group'); ['Kita'].forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; imgOtherWrap.appendChild(s);});
const labsWrap=$('#labs_basic'); LABS.forEach(n=>{const s=document.createElement('span'); s.className='chip'; s.dataset.value=n; s.textContent=n; labsWrap.appendChild(s);});
const btnBloodOrder=$('#btnBloodOrder');
if(btnBloodOrder){
  btnBloodOrder.addEventListener('click',()=>{
    const units=prompt('Įveskite užsakomų vienetų skaičių');
    if(!units) return;
    const group=prompt('Įveskite kraujo grupę');
    if(!group) return;
    const val=`Kraujo užsakymas: ${units} vnt ${group}`;
    const chip=document.createElement('span');
    chip.className='chip';
    chip.dataset.value=val;
    chip.textContent=val;
    labsWrap.appendChild(chip);
    setChipActive(chip,true);
    saveAll();
  });
}
const IMAGING_GROUPS=['#imaging_ct','#imaging_xray','#imaging_other_group'];
const CHIP_GROUPS=['#chips_red','#chips_yellow',...IMAGING_GROUPS,'#labs_basic','#a_airway_group','#b_breath_left_group','#b_breath_right_group','#d_pupil_left_group','#d_pupil_right_group','#spr_decision_group'];
const fastAreas=['Perikardas','Dešinė pleura','Kairė pleura','RUQ','LUQ','Dubuo']; const fastWrap=$('#fastGrid');
fastAreas.forEach(a=>{const box=document.createElement('div'); box.innerHTML=`<label>${a}</label><div class="row"><label class="pill"><input type="radio" name="fast_${a}" value="Yra"> Yra</label><label class="pill"><input type="radio" name="fast_${a}" value="Nėra"> Nėra</label></div>`; fastWrap.appendChild(box);});
const teamWrap=$('#teamGrid'); TEAM_ROLES.forEach(r=>{
  const slug=r.replace(/\s+/g,'_');
  const box=document.createElement('div');
  box.innerHTML=`<label>${r}</label><input type="text" data-team="${r}" data-field="team_${slug}" placeholder="Vardas Pavardė">`;
  teamWrap.appendChild(box);
});

/* ===== SVG Body Map (no canvas) ===== */
const BodySVG=(function(){
  const svg=$('#bodySvg'); const front=$('#layer-front'), back=$('#layer-back'), marks=$('#marks');
  const btnSide=$('#btnSide'), btnUndo=$('#btnUndo'), btnClear=$('#btnClearMap'), btnExport=$('#btnExportSvg');
  const tools=$$('.map-toolbar .tool[data-tool]'); let activeTool='Ž', side='front';
  function setTool(t){ activeTool=t; tools.forEach(b=>b.classList.toggle('active', b.dataset.tool===t)); }
  tools.forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool))); setTool('Ž');

  btnSide.addEventListener('click',()=>{ side=(side==='front')?'back':'front'; front.classList.toggle('hidden', side!=='front'); back.classList.toggle('hidden', side!=='back'); btnSide.textContent='↺ Rodyti: '+(side==='front'?'Priekis':'Nugara'); saveAll(); });

  function svgPoint(evt){
    const pt=svg.createSVGPoint(); pt.x=evt.clientX; pt.y=evt.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function addMark(x,y,t,s){
    let use=document.createElementNS('http://www.w3.org/2000/svg','use');
    if(t==='Ž') use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-wound');
    if(t==='S') use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-bruise');
    if(t==='N') use.setAttributeNS('http://www.w3.org/1999/xlink','href','#sym-burn');
    use.setAttribute('transform',`translate(${x},${y})`);
    use.dataset.type=t; use.dataset.side=s;
    marks.appendChild(use); saveAll();
  }
  ['front-shape','back-shape'].forEach(id=>{
    $('#'+id).addEventListener('click',evt=>{
      const p=svgPoint(evt); addMark(p.x,p.y,activeTool,side);
    });
  });

  btnUndo.addEventListener('click',()=>{
    const list=[...marks.querySelectorAll('use')].filter(u=>u.dataset.side===side);
    const last=list.pop(); if(last){ last.remove(); saveAll(); }
  });
  btnClear.addEventListener('click',()=>{ if(confirm('Išvalyti visas žymas (priekis ir nugara)?')){ marks.innerHTML=''; saveAll(); }});

  btnExport.addEventListener('click',()=>{
    const clone=svg.cloneNode(true);
    (clone.querySelector('#layer-front')).classList.toggle('hidden', side!=='front');
    (clone.querySelector('#layer-back')).classList.toggle('hidden', side!=='back');
    const ser=new XMLSerializer(); const src=ser.serializeToString(clone);
    const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(src);
    const a=document.createElement('a'); a.href=url; a.download=('kuno-zemelapis-'+side+'.svg'); a.click();
  });

  function serialize(){
    const arr=[...marks.querySelectorAll('use')].map(u=>{
      const tr=u.getAttribute('transform'); const m=/translate\(([-\d.]+),([-\d.]+)\)/.exec(tr)||[0,0,0];
      return {x:+m[1], y:+m[2], type:u.dataset.type, side:u.dataset.side};
    });
    return JSON.stringify({side,tool:activeTool,marks:arr});
  }
  function load(raw){
    try{
      const o=typeof raw==='string'?JSON.parse(raw):raw;
      side=o.side||'front'; activeTool=o.tool||'Ž';
      front.classList.toggle('hidden', side!=='front'); back.classList.toggle('hidden', side!=='back');
      btnSide.textContent='↺ Rodyti: '+(side==='front'?'Priekis':'Nugara');
      setTool(activeTool);
      marks.innerHTML='';
      (o.marks||[]).forEach(m=>addMark(m.x,m.y,m.type,m.side));
    }catch(e){}
  }
  function counts(){
    const arr=[...marks.querySelectorAll('use')].map(u=>({type:u.dataset.type, side:u.dataset.side}));
    const cnt={front:{Ž:0,S:0,N:0}, back:{Ž:0,S:0,N:0}};
    arr.forEach(m=>{ if(cnt[m.side] && (m.type in cnt[m.side])) cnt[m.side][m.type]++; });
    return cnt;
  }

  return {serialize,load,counts,get side(){return side;},get tool(){return activeTool;}};
})();

/* ===== Activation indicator ===== */
function ensureSingleTeam(){
  const red=$('#chips_red');
  const yellow=$('#chips_yellow');
  const redActive=$$('.chip.active', red).length>0;
  const yellowActive=$$('.chip.active', yellow).length>0;
  if(redActive && yellowActive){
    $$('.chip', yellow).forEach(c=>setChipActive(c,false));
  }
}
function updateActivationIndicator(){
  const dot=$('#activationIndicator');
  const redActive=$$('.chip.active', $('#chips_red')).length>0;
  const yellowActive=$$('.chip.active', $('#chips_yellow')).length>0;
  dot.classList.remove('red','yellow');
  dot.style.display='none';
  if(redActive){ dot.classList.add('red'); dot.style.display='inline-block'; }
  else if(yellowActive){ dot.classList.add('yellow'); dot.style.display='inline-block'; }
}
function setupActivationControls(){
  const redGroup=$('#chips_red');
  const yellowGroup=$('#chips_yellow');
  redGroup.addEventListener('click',e=>{
    const chip=e.target.closest('.chip');
    if(!chip) return;
    if(isChipActive(chip)){
      $$('.chip', yellowGroup).forEach(c=>setChipActive(c,false));
    }
    ensureSingleTeam();
    updateActivationIndicator();
    saveAll();
  });
  yellowGroup.addEventListener('click',e=>{
    const chip=e.target.closest('.chip');
    if(!chip) return;
    if(isChipActive(chip)){
      $$('.chip', redGroup).forEach(c=>setChipActive(c,false));
    }
    ensureSingleTeam();
    updateActivationIndicator();
    saveAll();
  });
}
window.updateActivationIndicator=updateActivationIndicator;
window.ensureSingleTeam=ensureSingleTeam;

/* ===== Save / Load ===== */
const FIELD_SELECTORS='input[type="text"],input[type="number"],input[type="time"],input[type="date"],textarea,select';

function expandOutput(){
  const ta = $('#output');
  if(!ta) return;
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function saveAll(){
  const data={};
  $$(FIELD_SELECTORS).forEach(el=>{
    const key=el.dataset.field || el.id || el.name;
    if(!key) return;
    if(el.type==='radio'){ if(el.checked) data[key+'__'+el.value]=true; }
    else if(el.type==='checkbox'){ data[key]=el.checked?'__checked__':(el.value||''); }
    else{ data[key]=el.value; }
  });
  CHIP_GROUPS.forEach(sel=>{ const arr=$$('.chip.active',$(sel)).map(c=>c.dataset.value); data['chips:'+sel]=arr; });
  function pack(container){ return Array.from(container.children).map(card=>({ name:(card.querySelector('.act_custom_name')?card.querySelector('.act_custom_name').value:card.querySelector('.act_name').textContent.trim()), on:card.querySelector('.act_chk').checked, time:card.querySelector('.act_time').value, dose:card.querySelector('.act_dose').value, note:card.querySelector('.act_note').value }));}
  data['pain_meds']=pack($('#pain_meds')); data['bleeding_meds']=pack($('#bleeding_meds')); data['other_meds']=pack($('#other_meds')); data['procs']=pack($('#procedures'));
  data['bodymap_svg']=BodySVG.serialize();
  localStorage.setItem('trauma_v9', JSON.stringify(data));
}
function loadAll(){
  const raw=localStorage.getItem('trauma_v9'); if(!raw) return;
  try{
    const data=JSON.parse(raw);
    $$(FIELD_SELECTORS).forEach(el=>{
      const key=el.dataset.field || el.id || el.name;
      if(!key) return;
      if(el.type==='radio'){ if(data[key+'__'+el.value]) el.checked=true; }
      else if(el.type==='checkbox'){ el.checked=(data[key]==='__checked__'); }
      else{ if(data[key]!=null) el.value=data[key]; }
    });
  CHIP_GROUPS.forEach(sel=>{ const arr=data['chips:'+sel]||[]; $$('.chip',$(sel)).forEach(c=>c.classList.toggle('active',arr.includes(c.dataset.value))); });
  const labsArr=data['chips:#labs_basic']||[];
  const labsContainer=$('#labs_basic');
  labsArr.forEach(val=>{
    if(!$$('.chip',labsContainer).some(c=>c.dataset.value===val)){
      const chip=document.createElement('span');
      chip.className='chip';
      chip.dataset.value=val;
      chip.textContent=val;
      labsContainer.appendChild(chip);
    }
  });
  $$('.chip',labsContainer).forEach(c=>c.classList.toggle('active',labsArr.includes(c.dataset.value)));
    function unpack(container,records){ if(!Array.isArray(records)) return; Array.from(container.children).forEach((card,i)=>{ const r=records[i]; if(!r) return; card.querySelector('.act_chk').checked=!!r.on; card.querySelector('.act_time').value=r.time||''; card.querySelector('.act_dose').value=r.dose||''; card.querySelector('.act_note').value=r.note||''; const cn=card.querySelector('.act_custom_name'); if(cn) cn.value=r.name||'';});}
    unpack($('#pain_meds'),data['pain_meds']); unpack($('#bleeding_meds'),data['bleeding_meds']); unpack($('#other_meds'),data['other_meds']); unpack($('#procedures'),data['procs']);
    if(data['bodymap_svg']) BodySVG.load(data['bodymap_svg']);
    $('#d_pupil_left_note').style.display = ($$('.chip.active', $('#d_pupil_left_group')).some(c=>c.dataset.value==='kita'))?'block':'none';
    $('#d_pupil_right_note').style.display = ($$('.chip.active', $('#d_pupil_right_group')).some(c=>c.dataset.value==='kita'))?'block':'none';
    $('#oxygenFields').style.display = ($('#b_oxygen_liters').value || $('#b_oxygen_type').value) ? 'flex' : 'none';
    $('#dpvFields').style.display = $('#b_dpv_fio2').value ? 'flex' : 'none';
    $('#spr_skyrius_container').style.display = ($$('.chip.active', $('#spr_decision_group')).some(c=>c.dataset.value==='Stacionarizavimas'))?'block':'none';
    $('#spr_ligonine_container').style.display = ($$('.chip.active', $('#spr_decision_group')).some(c=>c.dataset.value==='Pervežimas į kitą ligoninę'))?'block':'none';
    $('#spr_skyrius_kita').style.display = ($('#spr_skyrius').value === 'Kita') ? 'block' : 'none';
    $('#imaging_other').style.display = (IMAGING_GROUPS.some(sel=>$$('.chip.active', $(sel)).some(c=>c.dataset.value==='Kita')))?'block':'none';
    ensureSingleTeam();
    updateActivationIndicator();
    expandOutput();
  }catch(e){}
}

/* ===== Other UI ===== */
$('#btnGCS15').addEventListener('click',()=>{
  $('#d_gksa').value=4; $('#d_gksk').value=5; $('#d_gksm').value=6;
  ['#d_gksa','#d_gksk','#d_gksm'].forEach(sel=>$(sel).dispatchEvent(new Event('input')));
  saveAll();
});
$('#btnGCSCalc').addEventListener('click',()=>{
  const choose=(title,opts)=>{
    const msg=[title].concat(opts.map(o=>`${o.value} - ${o.text}`)).join('\n');
    const val=parseInt(prompt(msg)||'',10);
    return opts.some(o=>o.value===val)?val:0;
  };
  const a=choose('Akių atmerkimas (A)',[
    {value:4,text:'spontaniškai'},
    {value:3,text:'į garsą'},
    {value:2,text:'į skausmą'},
    {value:1,text:'nereaguoja'}
  ]);
  const k=choose('Kalba (K)',[
    {value:5,text:'orientuotas'},
    {value:4,text:'paini'},
    {value:3,text:'žodžiai'},
    {value:2,text:'garsai'},
    {value:1,text:'nėra'}
  ]);
  const m=choose('Judesių reakcija (M)',[
    {value:6,text:'vykdo komandas'},
    {value:5,text:'lokalizuoja skausmą'},
    {value:4,text:'atitraukia nuo skausmo'},
    {value:3,text:'lenkia nuo skausmo'},
    {value:2,text:'atpalaiduoja'},
    {value:1,text:'nereaguoja'}
  ]);
  if(a) $('#d_gksa').value=a;
  if(k) $('#d_gksk').value=k;
  if(m) $('#d_gksm').value=m;
  ['#d_gksa','#d_gksk','#d_gksm'].forEach(sel=>$(sel).dispatchEvent(new Event('input')));
  saveAll();
});
$('#e_back_ny').addEventListener('change',e=>{ $('#e_back_notes').disabled=e.target.checked; if(e.target.checked) $('#e_back_notes').value=''; saveAll();});

function clampNumberInputs(){
  const clamp=el=>{
    if(el.value==='') return;
    const min=el.getAttribute('min');
    const max=el.getAttribute('max');
    let val=parseFloat(el.value);
    if(min!==null && val<parseFloat(min)) val=parseFloat(min);
    if(max!==null && val>parseFloat(max)) val=parseFloat(max);
    el.value=val;
  };
  $$('input[type="number"]').forEach(el=>{
    const min=el.getAttribute('min');
    const max=el.getAttribute('max');
    if(min!==null || max!==null){
      ['input','change'].forEach(evt=>el.addEventListener(evt,()=>clamp(el)));
      clamp(el);
    }
  });
}

/* ===== Init modules ===== */
function init(){
  initTabs();
  initChips(saveAll);
  initAutoActivate(saveAll);
    initActions(saveAll);
    setupActivationControls();
    document.addEventListener('input', saveAll);
    const updateDGksTotal=()=>{
      $('#d_gks_total').textContent=gksSum($('#d_gksa').value,$('#d_gksk').value,$('#d_gksm').value);
    };
    ['#d_gksa','#d_gksk','#d_gksm'].forEach(sel=>$(sel).addEventListener('input', updateDGksTotal));
    const updateGmpGksTotal=()=>{
      $('#gmp_gks_total').textContent=gksSum($('#gmp_gksa').value,$('#gmp_gksk').value,$('#gmp_gksm').value);
    };
    ['#gmp_gksa','#gmp_gksk','#gmp_gksm'].forEach(sel=>$(sel).addEventListener('input', updateGmpGksTotal));
    $('#btnGmpNow').addEventListener('click', ()=>{ $('#gmp_time').value=nowHM(); saveAll(); });
    $('#btnSprNow').addEventListener('click', ()=>{ $('#spr_time').value=nowHM(); saveAll(); });
  $('#btnOxygen').addEventListener('click', ()=>{
    const box = $('#oxygenFields');
    const show = getComputedStyle(box).display === 'none';
    box.style.display = show ? 'flex' : 'none';
    saveAll();
  });
  $('#btnDPV').addEventListener('click', ()=>{
    const box = $('#dpvFields');
    const show = getComputedStyle(box).display === 'none';
    box.style.display = show ? 'flex' : 'none';
    saveAll();
  });
    $('#spr_skyrius').addEventListener('change', e=>{
      const show = e.target.value === 'Kita';
      $('#spr_skyrius_kita').style.display = show ? 'block' : 'none';
      if(!show) $('#spr_skyrius_kita').value='';
      saveAll();
    });
    $('#output').addEventListener('input', expandOutput);
    loadAll();
    clampNumberInputs();
    updateDGksTotal();
    updateGmpGksTotal();
  }
  init();

/* ===== Report ===== */
function gksSum(a,k,m){ a=+a||0;k=+k||0;m=+m||0; return (a&&k&&m)?(a+k+m):''; }
const getSingleValue=sel=>listChips(sel)[0]||'';
function bodymapSummary(){
  try{
    const data=JSON.parse(localStorage.getItem('trauma_v9')||'{}'); if(!data.bodymap_svg) return '';
    const o=JSON.parse(data.bodymap_svg); const cnt={front:{Ž:0,S:0,N:0}, back:{Ž:0,S:0,N:0}};
    (o.marks||[]).forEach(m=>{ if(cnt[m.side] && cnt[m.side][m.type]!=null) cnt[m.side][m.type]++; });
    const total=(cnt.front.Ž+cnt.front.S+cnt.front.N)+(cnt.back.Ž+cnt.back.S+cnt.back.N);
    if(!total) return '';
    const pack=side=>`(${cnt[side]['Ž']} Ž, ${cnt[side]['S']} S, ${cnt[side]['N']} N)`;
    return `Žemėlapis: Priekis ${pack('front')}, Nugara ${pack('back')} — viso ${total} žymos.`;
  }catch(e){ return ''; }
}

document.getElementById('btnGen').addEventListener('click',()=>{
  const out=[];
  const red=listChips('#chips_red'), yellow=listChips('#chips_yellow');
  const gmp={ hr:$('#gmp_hr').value, rr:$('#gmp_rr').value, spo2:$('#gmp_spo2').value, sbp:$('#gmp_sbp').value, dbp:$('#gmp_dbp').value, gksa:$('#gmp_gksa').value, gksk:$('#gmp_gksk').value, gksm:$('#gmp_gksm').value, time:$('#gmp_time').value, mechanism:$('#gmp_mechanism').value, notes:$('#gmp_notes').value };
  const gksGMP=gksSum(gmp.gksa,gmp.gksk,gmp.gksm);
  const gmpMeta=[gmp.time?`GMP ${gmp.time}`:null, gmp.mechanism?`Mechanizmas: ${gmp.mechanism}`:null].filter(Boolean).join('; ');
  const gmpLine=[gmp.hr?`ŠSD ${gmp.hr}/min`:null, gmp.rr?`KD ${gmp.rr}/min`:null, gmp.spo2?`SpO₂ ${gmp.spo2}%`:null, (gmp.sbp||gmp.dbp)?`AKS ${gmp.sbp}/${gmp.dbp}`:null, gksGMP?`GKS ${gksGMP} (A${gmp.gksa}-K${gmp.gksk}-M${gmp.gksm})`:null].filter(Boolean).join('; ');
  out.push('--- Aktyvacija ---'); if(gmpMeta) out.push(gmpMeta); if(gmpLine) out.push(gmpLine); if(gmp.notes) out.push('Pastabos: '+gmp.notes); if(red.length) out.push('RAUDONA: '+red.join(', ')); if(yellow.length) out.push('GELTONA: '+yellow.join(', '));

  out.push('\n--- A Kvėpavimo takai ---'); out.push(['Takai: '+(getSingleValue('#a_airway_group')||'-'), $('#a_notes').value?('Pastabos: '+$('#a_notes').value):null].filter(Boolean).join(' | '));

  out.push('\n--- B Kvėpavimas ---'); out.push([
    $('#b_rr').value?('KD '+$('#b_rr').value+'/min'):null,
    $('#b_spo2').value?('SpO₂ '+$('#b_spo2').value+'%'):null,
    'Alsavimas kairė '+(getSingleValue('#b_breath_left_group')||'–')+', dešinė '+(getSingleValue('#b_breath_right_group')||'–'),
    ($('#b_oxygen_liters').value||$('#b_oxygen_type').value)?('O2 '+($('#b_oxygen_liters').value?$('#b_oxygen_liters').value+' L/min ':'')+($('#b_oxygen_type').value?$('#b_oxygen_type').value:'')):null,
    $('#b_dpv_fio2').value?('DPV FiO₂ '+$('#b_dpv_fio2').value):null
  ].filter(Boolean).join('; '));

  out.push('\n--- C Kraujotaka ---'); out.push([$('#c_hr').value?('ŠSD '+$('#c_hr').value+'/min'):null, ($('#c_sbp').value||$('#c_dbp').value)?('AKS '+$('#c_sbp').value+'/'+$('#c_dbp').value):null, $('#c_caprefill').value?('KPL '+$('#c_caprefill').value+'s'):null].filter(Boolean).join('; '));

  const dgks=gksSum($('#d_gksa').value,$('#d_gksk').value,$('#d_gksm').value); const left=getSingleValue('#d_pupil_left_group'); const right=getSingleValue('#d_pupil_right_group');
  out.push('\n--- D Sąmonė ---'); out.push([dgks?('GKS '+dgks+' (A'+$('#d_gksa').value+'-K'+$('#d_gksk').value+'-M'+$('#d_gksm').value+')'):null, left?('Vyzdžiai kairė: '+left+ (left==='kita'&&$('#d_pupil_left_note').value?(' ('+$('#d_pupil_left_note').value+')'):'') ):null, right?('Vyzdžiai dešinė: '+right+ (right==='kita'&&$('#d_pupil_right_note').value?(' ('+$('#d_pupil_right_note').value+')'):'') ):null, $('#d_notes').value?('Pastabos: '+$('#d_notes').value):null].filter(Boolean).join(' | '));

  out.push('\n--- E Kita ---'); out.push([$('#e_temp').value?('T '+$('#e_temp').value+'°C'):null, $('#e_back_ny').checked?'Nugara: n.y.':($('#e_back_notes').value?('Nugara: '+$('#e_back_notes').value):null), $('#e_other').value?('Kita: '+$('#e_other').value):null, bodymapSummary()].filter(Boolean).join(' | '));

  function collect(container){ return Array.from(container.children).map(card=>{ const on=card.querySelector('.act_chk').checked; if(!on) return null; const nameInput=card.querySelector('.act_custom_name'); const base=card.querySelector('.act_name').textContent.trim(); const customName=nameInput?nameInput.value.trim():''; const name=nameInput?customName:base; if(nameInput && !customName) return null; const time=card.querySelector('.act_time').value; const dose=card.querySelector('.act_dose').value; const note=card.querySelector('.act_note').value; return [name, time?('laikas '+time):null, dose?('dozė '+dose):null, note?('pastabos '+note):null].filter(Boolean).join(' | '); }).filter(Boolean);}
  const pain=collect($('#pain_meds')), bleeding=collect($('#bleeding_meds')), other=collect($('#other_meds')), procs=collect($('#procedures'));
  if(pain.length||bleeding.length||other.length||procs.length){
    out.push('\n--- Intervencijos ---');
    if(pain.length) out.push('Medikamentai (skausmo kontrolė):\n'+pain.join('\n'));
    if(bleeding.length) out.push('Medikamentai (kraujavimo kontrolė):\n'+bleeding.join('\n'));
    if(other.length) out.push('Medikamentai (kita):\n'+other.join('\n'));
    if(procs.length) out.push('Procedūros:\n'+procs.join('\n'));
  }

  let imgs=[...listChips('#imaging_ct'), ...listChips('#imaging_xray')];
  if(listChips('#imaging_other_group').includes('Kita')){
    const other=$('#imaging_other').value.trim();
    if(other) imgs.push(other);
  }
  const fr=fastAreas.map(a=>{ const y=document.querySelector('input[name="fast_'+a+'"][value="Yra"]')?.checked; const n=document.querySelector('input[name="fast_'+a+'"][value="Nėra"]')?.checked; return y? a+': skystis Yra' : (n? a+': skystis Nėra' : null); }).filter(Boolean);
  if(imgs.length||fr.length){ out.push('\n--- Vaizdiniai tyrimai ---'); if(imgs.length) out.push('Užsakyta: '+imgs.join(', ')); if(fr.length) out.push('FAST: '+fr.join(' | ')); }

  const labs=listChips('#labs_basic'); if(labs.length){ out.push('\n--- Laboratorija ---'); out.push(labs.join(', ')); }

  const team=TEAM_ROLES.map(r=>{ const el=document.querySelector('input[data-team="'+r+'"]'); const v=el?.value?.trim(); return v? r+': '+v : null; }).filter(Boolean); if(team.length){ out.push('\n--- Komanda ---'); out.push(team.join(' | ')); }

    const sprDecision=getSingleValue('#spr_decision_group');
    const sprSkyrius = sprDecision==='Stacionarizavimas'
      ? ($('#spr_skyrius').value==='Kita' ? $('#spr_skyrius_kita').value : $('#spr_skyrius').value)
      : '';
    const sprLigonine = sprDecision==='Pervežimas į kitą ligoninę'
      ? $('#spr_ligonine').value
      : '';
    const sprGks=gksSum($('#spr_gksa').value,$('#spr_gksk').value,$('#spr_gksm').value);
    const sprVitals=[
      $('#spr_hr').value?('ŠSD '+$('#spr_hr').value+'/min'):null,
      $('#spr_rr').value?('KD '+$('#spr_rr').value+'/min'):null,
      $('#spr_spo2').value?('SpO₂ '+$('#spr_spo2').value+'%'):null,
      ($('#spr_sbp').value||$('#spr_dbp').value)?('AKS '+$('#spr_sbp').value+'/'+$('#spr_dbp').value):null,
      sprGks?(`GKS ${sprGks} (A${$('#spr_gksa').value}-K${$('#spr_gksk').value}-M${$('#spr_gksm').value})`):null
    ].filter(Boolean).join('; ');
    if(sprDecision || $('#spr_time').value || sprVitals){
      out.push('\n--- Sprendimas ---');
      const meta=[
        $('#spr_time').value?('Laikas '+$('#spr_time').value):null,
        sprDecision?('Sprendimas: '+sprDecision):null,
        sprDecision==='Stacionarizavimas' && sprSkyrius?('Skyrius: '+sprSkyrius):null,
        sprDecision==='Pervežimas į kitą ligoninę' && sprLigonine?('Ligoninė: '+sprLigonine):null
      ].filter(Boolean).join(' | ');
      if(meta) out.push(meta);
      if(sprVitals) out.push(sprVitals);
    }

    $('#output').value=out.filter(Boolean).join('\n');
    expandOutput();
    showTab('Ataskaita');
    saveAll();
  });

document.getElementById('btnCopy').addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText($('#output').value||''); alert('Nukopijuota.'); }catch(e){ alert('Nepavyko nukopijuoti.'); }});
document.getElementById('btnSave').addEventListener('click',()=>{ saveAll(); alert('Išsaugota naršyklėje.');});
document.getElementById('btnClear').addEventListener('click',()=>{ if(confirm('Išvalyti viską?')){ localStorage.removeItem('trauma_v9'); location.reload(); }});
document.getElementById('btnPrint').addEventListener('click',()=>{
  const prevTab=localStorage.getItem('v9_activeTab');
  document.getElementById('btnGen').click();
  window.print();
  if(prevTab) showTab(prevTab);
});
