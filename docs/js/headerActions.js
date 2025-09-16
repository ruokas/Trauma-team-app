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
      const module = await import('jspdf');
      const { jsPDF } = module.default || module;
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
      let svg=doc.importNode(document.getElementById('bodySvg'), true);
      svg=await bodyMap.embedSilhouettes(svg);
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
      themeBtn.className='btn icon-btn';
      themeBtn.id='btnTheme';
      actionsBar.appendChild(themeBtn);
    }else{
      themeBtn.classList.add('icon-btn');
    }
    const sunSvg='<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
    const moonSvg='<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>';
    const updateThemeBtn=()=>{
      const dark=document.documentElement.classList.contains('dark');
      themeBtn.innerHTML=dark?sunSvg:moonSvg;
      const label=dark?'Šviesus režimas':'Tamsus režimas';
      themeBtn.setAttribute('title',label);
      themeBtn.setAttribute('aria-label',label);
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
      btn.className='btn icon-btn';
      btn.id='btnLogout';
      btn.innerHTML='<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>';
      btn.setAttribute('title','Atsijungti');
      btn.setAttribute('aria-label','Atsijungti');
      btn.addEventListener('click',()=>logout());
      actionsBar.appendChild(btn);
    }
  }
}
