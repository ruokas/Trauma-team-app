import { $, nowHM } from './utils.js';

export const PAIN_MEDS = ['Fentanilis','Paracetamolis','Ketoprofenas'];
export const BLEEDING_MEDS = ['TXA','O- kraujas','Fibryga','Ca gliukonatas'];
export const OTHER_MEDS = ['Ringerio tirpalas','Noradrenalinas','Metoklopramidas','Ondansetronas'];
export const PROCS = ['Intubacija','Krikotirotomija','Pleuros drenažas','Adatinė dekompresija','Kūno šildymas','Turniketas','Dubens diržas','Gipsavimas','Siuvimas','Repocizija'];

function buildActionCard(group, name, saveAll){
  const card=document.createElement('div');
  card.className='card';
  card.style.padding='10px';
  card.style.borderRadius='10px';
  const slug=name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  card.innerHTML=`<label class="pill"><input type="checkbox" class="act_chk" data-field="${group}_${slug}_chk"> ${name}</label>
    <div class="grid cols-3" style="margin-top:6px">
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
  PROCS.forEach(n=>procsWrap.appendChild(buildActionCard('proc', n, saveAll)));
  const medSearch=$('#medSearch');
  if(medSearch){
    const wraps=[painWrap,bleedingWrap,otherWrap];
    medSearch.addEventListener('input',()=>{
      const q=medSearch.value.trim().toLowerCase();
      wraps.forEach(wrap=>{
        wrap.querySelectorAll('.card').forEach(card=>{
          const name=card.querySelector('label').textContent.toLowerCase();
          card.style.display=name.includes(q)?'':'none';
        });
      });
    });
  }
}
