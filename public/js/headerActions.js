import { $ } from './utils.js';
import { notify } from './alerts.js';
import { startArrivalTimer } from './arrival.js';
import { showTab } from './tabs.js';
import { getAuthToken, logout, setTheme } from './sessionManager.js';
import bodyMap from './bodyMap.js';

export function setupHeaderActions({ validateForm }){
  const btnAtvyko=document.getElementById('btnAtvyko');
  if(btnAtvyko) btnAtvyko.addEventListener('click', ()=>startArrivalTimer(true));

  const arrivalTimer=document.getElementById('arrivalTimer');
  if(arrivalTimer) arrivalTimer.addEventListener('dblclick',()=>startArrivalTimer(true));

  const copyButtons=[$('#btnCopyReport')].filter(Boolean);
  copyButtons.forEach(btn=>btn.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText($('#output').value||'');
      notify({message:'Nukopijuota.', type:'success'});
    }catch(e){
      notify({message:'Nepavyko nukopijuoti.', type:'error'});
    }
  }));

  const pdfButtons=[$('#btnPdfReport')].filter(Boolean);
  pdfButtons.forEach(btn=>btn.addEventListener('click', async () => {
    if(!validateForm()) return;
    showTab('Santrauka');
    const text = $('#output').value || '';
    try {
      const module = await import('./lib/jspdf.umd.min.js');
      const { jsPDF } = module.default;
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(text, 180);
      doc.text(lines, 10, 10);
      doc.save('report.pdf');
    } catch (e) {
      notify({message:'Nepavyko sugeneruoti PDF.', type:'error'});
      console.error('PDF generation failed', e);
    }
  }));

  const printButtons=[$('#btnPrintReport')].filter(Boolean);
  printButtons.forEach(btn=>btn.addEventListener('click', async () => {
    if(!validateForm()) return;
    const prevTab=localStorage.getItem('v10_activeTab');
    showTab('Santrauka');
    const text=$('#output').value||'';
    const printWin=window.open('','_blank');
    if(printWin){
      const doc=printWin.document;
      doc.open();
      doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Santrauka</title><link rel="stylesheet" href="/css/main.css"><style>body{font-family:sans-serif;padding:20px;} pre{white-space:pre-wrap;}</style></head><body></body></html>');
      doc.close();
      const svg=doc.importNode(document.getElementById('bodySvg'), true);
      await bodyMap.embedSilhouettes(svg);
      const front=svg.querySelector('#layer-front');
      const back=svg.querySelector('#layer-back');
      if(front) front.classList.remove('hidden');
      if(back) back.classList.remove('hidden');
      const pre=doc.createElement('pre');
      pre.textContent=text;
      doc.body.appendChild(pre);
      doc.body.appendChild(svg);
      printWin.focus();
      printWin.print();
      printWin.close();
    }else{
      window.print();
    }
    if(prevTab) showTab(prevTab);
  }));

  const actionsBar=document.getElementById('desktopActions');
  if(actionsBar){
    let themeBtn=document.getElementById('btnTheme');
    if(!themeBtn){
      themeBtn=document.createElement('button');
      themeBtn.type='button';
      themeBtn.className='btn';
      themeBtn.id='btnTheme';
      actionsBar.appendChild(themeBtn);
    }
    const updateThemeBtn=()=>{
      const dark=document.documentElement.classList.contains('dark');
      themeBtn.textContent=dark?'Light mode':'Dark mode';
    };
    themeBtn.addEventListener('click',()=>{
      const next=document.documentElement.classList.contains('dark')?'light':'dark';
      setTheme(next);
      updateThemeBtn();
    });
    updateThemeBtn();

    if(getAuthToken() && !document.getElementById('btnLogout')){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='btn';
      btn.id='btnLogout';
      btn.textContent='Logout';
      btn.addEventListener('click',()=>logout());
      actionsBar.appendChild(btn);
    }
  }
}
