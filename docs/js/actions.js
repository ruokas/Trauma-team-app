import { $, $$, nowHM } from './utils.js';
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
  const gridClass=(includeDose || custom)?'cols-3 cols-auto':'cols-2 cols-auto';

  // Build label section
  const label=document.createElement('label');
  label.className='pill';
  const chk=document.createElement('input');
  chk.type='checkbox';
  chk.className='act_chk';
  chk.dataset.field=`${group}_${slug}_chk`;
  const nameSpan=document.createElement('span');
  nameSpan.className='act_name';
  nameSpan.textContent=name;
  nameSpan.title = DEFAULT_DOSES[name] || '';
  label.appendChild(chk);
  label.appendChild(nameSpan);

  // Detail section
  const detail=document.createElement('div');
  detail.className='detail collapsed';
  const grid=document.createElement('div');
  grid.className=`grid ${gridClass}`;
  grid.style.marginTop='4px';

  if(custom){
    const customDiv=document.createElement('div');
    const customLabel=document.createElement('label');
    customLabel.textContent='Pavadinimas';
    const customInput=document.createElement('input');
    customInput.type='text';
    customInput.className='act_custom_name';
    customInput.dataset.field=`${group}_${slug}_custom`;
    customDiv.appendChild(customLabel);
    customDiv.appendChild(customInput);
    grid.appendChild(customDiv);
  }

  const timeDiv=document.createElement('div');
  const timeLabel=document.createElement('label');
  timeLabel.textContent='Laikas';
  const timeInput=document.createElement('input');
  timeInput.type='time';
  timeInput.className='act_time';
  timeInput.dataset.field=`${group}_${slug}_time`;
  timeDiv.appendChild(timeLabel);
  timeDiv.appendChild(timeInput);
  grid.appendChild(timeDiv);

  if(includeDose){
    const doseDiv=document.createElement('div');
    const doseLabel=document.createElement('label');
    doseLabel.textContent='Dozė/kiekis';
    const doseInput=document.createElement('input');
    doseInput.type='text';
    doseInput.className='act_dose';
    doseInput.dataset.field=`${group}_${slug}_dose`;
    doseDiv.appendChild(doseLabel);
    doseDiv.appendChild(doseInput);
    grid.appendChild(doseDiv);
  }

  const noteDiv=document.createElement('div');
  const noteLabel=document.createElement('label');
  noteLabel.textContent='Pastabos';
  const noteInput=document.createElement('input');
  noteInput.type='text';
  noteInput.className='act_note';
  noteInput.dataset.field=`${group}_${slug}_note`;
  noteDiv.appendChild(noteLabel);
  noteDiv.appendChild(noteInput);
  grid.appendChild(noteDiv);

  detail.appendChild(grid);
  card.appendChild(label);
  card.appendChild(detail);

  function update(){
    if(chk.checked || card.classList.contains('expanded')) detail.classList.remove('collapsed');
    else detail.classList.add('collapsed');
  }

  update();
  return card;
}

export function initActions(saveAll){
  const painWrap=$('#pain_meds');
  const bleedingWrap=$('#bleeding_meds');
  const otherWrap=$('#other_meds');
  const procsWrap=$('#procedures');
  const sortedPainMeds = PAIN_MEDS.slice().sort((a,b)=>a.localeCompare(b));
  const sortedBleedingMeds = BLEEDING_MEDS.slice().sort((a,b)=>a.localeCompare(b));
  const sortedOtherMeds = OTHER_MEDS.slice().sort((a,b)=>a.localeCompare(b));

  const painFrag=document.createDocumentFragment();
  sortedPainMeds.forEach(n=>painFrag.appendChild(buildActionCard('med', n, saveAll)));
  painWrap.appendChild(painFrag);

  const bleedingFrag=document.createDocumentFragment();
  sortedBleedingMeds.forEach(n=>bleedingFrag.appendChild(buildActionCard('med', n, saveAll)));
  bleedingWrap.appendChild(bleedingFrag);

  const otherFrag=document.createDocumentFragment();
  sortedOtherMeds.forEach(n=>otherFrag.appendChild(buildActionCard('med', n, saveAll)));
  otherFrag.appendChild(buildActionCard('med','Kita', saveAll, {custom:true}));
  otherWrap.appendChild(otherFrag);

  const procsFrag=document.createDocumentFragment();
  PROCS.forEach(n=>procsFrag.appendChild(buildActionCard('proc', n, saveAll)));
  procsWrap.appendChild(procsFrag);

  const wraps=[painWrap,bleedingWrap,otherWrap,procsWrap];

  function handleAction(e){
    const card=e.target.closest('.card');
    if(!card) return;
    const chk=card.querySelector('.act_chk');
    const detail=card.querySelector('.detail');
    const time=card.querySelector('.act_time');
    const dose=card.querySelector('.act_dose');
    const name=card.querySelector('.act_name').textContent;
    const includeDose=!!dose;
    const field=chk.dataset.field||'';
    const group=field.split('_')[0];

    const update=()=>{
      if(chk.checked || card.classList.contains('expanded')) detail.classList.remove('collapsed');
      else detail.classList.add('collapsed');
    };

    if(e.type==='change' && e.target.matches('.act_chk')){
      if(chk.checked){
        if(!time.value) time.value=nowHM();
        if(includeDose && !dose.value && DEFAULT_DOSES[name]) dose.value=DEFAULT_DOSES[name];
        logEvent(group, name, includeDose && dose ? dose.value : '', time.value);
      }
      update();
      if(typeof saveAll==='function') saveAll();
    } else if(e.type==='click') {
      if(e.target.closest('label.pill') || e.target.closest('.detail')) return;
      card.classList.toggle('expanded');
      update();
    }
  }

  wraps.forEach(wrap=>{
    wrap.addEventListener('click', handleAction);
    wrap.addEventListener('change', handleAction);
  });

  const medSearch=$('#medSearch');
  if(medSearch){
    const medWraps=[painWrap,bleedingWrap,otherWrap,procsWrap];
    medSearch.addEventListener('input',()=>{
      const q=medSearch.value.trim().toLowerCase();
      medWraps.forEach(wrap=>{
        wrap.querySelectorAll('.card').forEach(card=>{
          const name=card.querySelector('.act_name').textContent.toLowerCase();
          card.style.display=name.includes(q)?'':'none';
        });
      });
    });
  }

  $$('.interv-toggle').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const group=btn.closest('.interv-group');
      const collapsed=group.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
  });
}
