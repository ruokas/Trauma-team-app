import { $, nowHM } from './utils.js';
import { logEvent } from './timeline.js';

export const PAIN_MEDS = ['Fentanilis','Paracetamolis','Ketoprofenas'];
export const BLEEDING_MEDS = ['TXA','O- kraujas','Fibryga','Ca gliukonatas'];
export const OTHER_MEDS = ['Ringerio tirpalas','Noradrenalinas','Metoklopramidas','Ondansetronas'];
export const PROCS = ['Intubacija','Krikotirotomija','Pleuros drenažas','Adatinė dekompresija','Kūno šildymas','Turniketas','Dubens diržas','Gipsavimas','Siuvimas','Repocizija'];

// Default doses for medications
export const DEFAULT_DOSES = {
  'Fentanilis': '100 mcg',
  'Paracetamolis': '1 g',
  'Ketoprofenas': '100 mg',
  'TXA': '1 g',
  'O- kraujas': '2 V',
  'Fibryga': '1 g',
  'Ca gliukonatas': '1 g',
  'Ringerio tirpalas': '500 ml',
  'Noradrenalinas': '0.1 µg/kg/min',
  'Metoklopramidas': '10 mg',
  'Ondansetronas': '8 mg'
};

function buildActionCard(group, name, saveAll, opts={}){
  const custom = opts.custom;
  const includeDose = group !== 'proc';
  const card=document.createElement('div');
  card.className='card';
  card.style.padding='6px';
  card.style.borderRadius='10px';
  const slug=name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  const gridClass=(includeDose || custom)?'cols-3':'cols-2';
  card.innerHTML=`<label class="pill"><input type="checkbox" class="act_chk" data-field="${group}_${slug}_chk"><span class="act_name">${name}</span></label>
    <div class="detail collapsed">
      <div class="grid ${gridClass}" style="margin-top:4px">
        ${custom?`<div><label>Pavadinimas</label><input type="text" class="act_custom_name" data-field="${group}_${slug}_custom"></div>`:''}
        <div><label>Laikas</label><input type="time" class="act_time" data-field="${group}_${slug}_time"></div>
        ${includeDose?`<div><label>Dozė/kiekis</label><input type="text" class="act_dose" data-field="${group}_${slug}_dose"></div>`:''}
        <div><label>Pastabos</label><input type="text" class="act_note" data-field="${group}_${slug}_note"></div>
      </div>
    </div>`;

  const chk=card.querySelector('.act_chk');
  const time=card.querySelector('.act_time');
  const dose=includeDose?card.querySelector('.act_dose'):null;
  const detail=card.querySelector('.detail');

  function update(){
    if(chk.checked || card.classList.contains('expanded')) detail.classList.remove('collapsed');
    else detail.classList.add('collapsed');
  }

  chk.addEventListener('change',()=>{
    if(chk.checked){
      if(!time.value) time.value=nowHM();
      if(includeDose && dose && !dose.value && DEFAULT_DOSES[name]) dose.value = DEFAULT_DOSES[name];
      logEvent(group, name, includeDose && dose ? dose.value : '', time.value);
    }
    update();
    if(typeof saveAll==='function') saveAll();
  });

  card.addEventListener('click',e=>{
    if(e.target.closest('label.pill') || e.target.closest('.detail')) return;
    card.classList.toggle('expanded');
    update();
  });

  card.querySelector('label.pill').addEventListener('click',()=>{
    setTimeout(()=>{
      if(chk.checked){
        if(!time.value) time.value=nowHM();
        if(includeDose && dose && !dose.value && DEFAULT_DOSES[name]) dose.value = DEFAULT_DOSES[name];
        if(typeof saveAll==='function') saveAll();
      }
    },0);
  });

  update();
  return card;
}

export function initActions(saveAll){
  const painWrap=$('#pain_meds');
  const bleedingWrap=$('#bleeding_meds');
  const otherWrap=$('#other_meds');
  const procsWrap=$('#procedures');
  PAIN_MEDS.sort((a,b)=>a.localeCompare(b));
  BLEEDING_MEDS.sort((a,b)=>a.localeCompare(b));
  OTHER_MEDS.sort((a,b)=>a.localeCompare(b));
  PAIN_MEDS.forEach(n=>painWrap.appendChild(buildActionCard('med', n, saveAll)));
  BLEEDING_MEDS.forEach(n=>bleedingWrap.appendChild(buildActionCard('med', n, saveAll)));
  OTHER_MEDS.forEach(n=>otherWrap.appendChild(buildActionCard('med', n, saveAll)));
  otherWrap.appendChild(buildActionCard('med','Kita', saveAll, {custom:true}));
  PROCS.forEach(n=>procsWrap.appendChild(buildActionCard('proc', n, saveAll)));
  const medSearch=$('#medSearch');
  if(medSearch){
    const wraps=[painWrap,bleedingWrap,otherWrap];
    medSearch.addEventListener('input',()=>{
      const q=medSearch.value.trim().toLowerCase();
      wraps.forEach(wrap=>{
        wrap.querySelectorAll('.card').forEach(card=>{
          const name=card.querySelector('.act_name').textContent.toLowerCase();
          card.style.display=name.includes(q)?'':'none';
        });
      });
    });
  }
}
