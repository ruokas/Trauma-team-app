import { $, nowHM } from './utils.js';

export const MEDS = ['TXA','Fentanilis','Paracetamolis','Ketoprofenas','O- kraujas','Fibryga','Ca gliukonatas'];
export const PROCS = ['Intubacija','Krikotirotomija','Pleuros drenažas','Adatinė dekompresija','Kūno šildymas','Turniketas','Dubens diržas','Gipsavimas','Siuvimas','Repocizija'];

function buildActionCard(group, name, saveAll){
  const card=document.createElement('div');
  card.className='card p-10 rounded-10';
  const slug=name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  card.innerHTML=`<label class="pill"><input type="checkbox" class="act_chk" data-field="${group}_${slug}_chk"> ${name}</label>
      <div class="grid grid-cols-3 mt-6">
      <div><label>Laikas</label><input type="time" class="act_time" data-field="${group}_${slug}_time"></div>
      <div><label>Dozė/kiekis</label><input type="text" class="act_dose" data-field="${group}_${slug}_dose"></div>
      <div><label>Pastabos</label><input type="text" class="act_note" data-field="${group}_${slug}_note"></div>
    </div>`;
  const chk=card.querySelector('.act_chk');
  const time=card.querySelector('.act_time');
  chk.addEventListener('change',()=>{ if(chk.checked && !time.value) time.value=nowHM(); if(typeof saveAll==='function') saveAll(); });
  card.querySelector('label.pill').addEventListener('click',()=>{ setTimeout(()=>{ if(chk.checked && !time.value){ time.value=nowHM(); if(typeof saveAll==='function') saveAll(); }},0);});
  return card;
}

export function initActions(saveAll){
  const medsWrap=$('#medications');
  const procsWrap=$('#procedures');
  MEDS.forEach(n=>medsWrap.appendChild(buildActionCard('med', n, saveAll)));
  PROCS.forEach(n=>procsWrap.appendChild(buildActionCard('proc', n, saveAll)));
}
