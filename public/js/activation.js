import { $, $$ } from './utils.js';
import { setChipActive, isChipActive } from './chips.js';
import { saveAll } from './sessionManager.js';

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
  const status=$('#activationStatusText');
  const redActive=$$('.chip.active', $('#chips_red')).length>0;
  const yellowActive=$$('.chip.active', $('#chips_yellow')).length>0;
  if(!dot) return;
  dot.classList.remove('red','yellow');
  dot.style.display='none';
  let text='No team activated';
  if(redActive){
    dot.classList.add('red');
    dot.style.display='inline-block';
    text='Red team activated';
  } else if(yellowActive){
    dot.classList.add('yellow');
    dot.style.display='inline-block';
    text='Yellow team activated';
  }
  if(status) status.textContent=text;
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

export { ensureSingleTeam, updateActivationIndicator, setupActivationControls };
