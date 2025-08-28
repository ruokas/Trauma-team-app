import { $ } from './utils.js';
import { listChips } from './chips.js';
import bodyMap, { TOOLS } from './bodyMap.js';
import { TEAM_ROLES } from './constants.js';

const fastAreas=[
  {name:'Perikardas', marker:'skystis'},
  {name:'Dešinė pleura', marker:'skystis ar oras'},
  {name:'Kairė pleura', marker:'skystis ar oras'},
  {name:'RUQ', marker:'skystis'},
  {name:'LUQ', marker:'skystis'},
  {name:'Dubuo', marker:'skystis'}
];

export function gksSum(a,k,m){ a=+a||0;k=+k||0;m=+m||0; return (a&&k&&m)?(a+k+m):''; }
const getSingleValue=sel=>listChips(sel)[0]||'';

export function bodymapSummary(){
  const zones=bodyMap.zoneCounts();
  const parts=Object.values(zones).map(z=>{
    const seg=[];
    if(z[TOOLS.WOUND.char]) seg.push(`${z[TOOLS.WOUND.char]} ${TOOLS.WOUND.char}`);
    if(z[TOOLS.BRUISE.char]) seg.push(`${z[TOOLS.BRUISE.char]} ${TOOLS.BRUISE.char}`);
    if(z.burned) seg.push(`nudegimai ${z.burned.toFixed(1)}%`);
    return seg.length?`${z.label}: ${seg.join(', ')}`:null;
  }).filter(Boolean);
  return parts.length?`Žemėlapis: ${parts.join('; ')}`:'';
}

export function generateReport(){
  const out=[];
  const patient={ age:$('#patient_age').value, sex:$('#patient_sex').value, history:$('#patient_history').value };
  const patientLine=[patient.age?`Amžius ${patient.age}`:null, patient.sex?`Lytis ${patient.sex}`:null, patient.history?`Ligos istorijos nr. ${patient.history}`:null].filter(Boolean).join('; ');
  if(patientLine){ out.push('--- Pacientas ---'); out.push(patientLine); }
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

  const chr=$('#c_hr').value, csbp=$('#c_sbp').value, cdbp=$('#c_dbp').value;
  const cmap = (csbp && cdbp) ? Math.round((+csbp + 2*+cdbp)/3) : '';
  const csi = (chr && csbp) ? (+chr / +csbp).toFixed(2) : '';
  const radial=getSingleValue('#c_pulse_radial_group');
  const femoral=getSingleValue('#c_pulse_femoral_group');
  const skinTemp=getSingleValue('#c_skin_temp_group');
  const skinColorChip=getSingleValue('#c_skin_color_group');
  const skinColor=skinColorChip==='Kita'?$('#c_skin_color_other').value:skinColorChip;
  const skinParts=[skinTemp, skinColor].filter(Boolean);
  const skin=skinParts.length?('Oda: '+skinParts.join(', ')):null;
  out.push('\n--- C Kraujotaka ---'); out.push([
    chr?('ŠSD '+chr+'/min'):null,
    (csbp||cdbp)?('AKS '+csbp+'/'+cdbp):null,
    cmap?('VAS '+cmap):null,
    csi?('ŠI '+csi):null,
    $('#c_caprefill').value?('KPL '+$('#c_caprefill').value+'s'):null,
    radial?('Radialinis pulsas '+radial):null,
    femoral?('Femoralis pulsas '+femoral):null,
    skin
  ].filter(Boolean).join('; '));

  const dgks=gksSum($('#d_gksa').value,$('#d_gksk').value,$('#d_gksm').value); const left=getSingleValue('#d_pupil_left_group'); const right=getSingleValue('#d_pupil_right_group');
  out.push('\n--- D Sąmonė ---'); out.push([dgks?('GKS '+dgks+' (A'+$('#d_gksa').value+'-K'+$('#d_gksk').value+'-M'+$('#d_gksm').value+')'):null, left?('Vyzdžiai kairė: '+left+ (left==='kita'&&$('#d_pupil_left_note').value?(' ('+$('#d_pupil_left_note').value+')'):'') ):null, right?('Vyzdžiai dešinė: '+right+ (right==='kita'&&$('#d_pupil_right_note').value?(' ('+$('#d_pupil_right_note').value+')'):'') ):null, $('#d_notes').value?('Pastabos: '+$('#d_notes').value):null].filter(Boolean).join(' | '));

  const back=getSingleValue('#e_back_group');
  const abdomen=getSingleValue('#e_abdomen_group');
  out.push('\n--- E Kita ---'); out.push([$('#e_temp').value?('T '+$('#e_temp').value+'°C'):null, back==='Be pakitimų'?'Nugara: be pakitimų':(back==='Pakitimai'&&$('#e_back_notes').value?('Nugara: '+$('#e_back_notes').value):null), abdomen==='Be pakitimų'?'Pilvas: be pakitimų':(abdomen==='Pakitimai'&&$('#e_abdomen_notes').value?('Pilvas: '+$('#e_abdomen_notes').value):null), $('#e_other').value?('Kita: '+$('#e_other').value):null, bodymapSummary()].filter(Boolean).join(' | '));

  function collect(container){ return Array.from(container.children).map(card=>{ const on=card.querySelector('.act_chk').checked; if(!on) return null; const nameInput=card.querySelector('.act_custom_name'); const base=card.querySelector('.act_name').textContent.trim(); const customName=nameInput?nameInput.value.trim():''; const name=nameInput?customName:base; if(nameInput && !customName) return null; const time=card.querySelector('.act_time').value; const doseInput=card.querySelector('.act_dose'); const dose=doseInput?doseInput.value:''; const note=card.querySelector('.act_note').value; return [name, time?('laikas '+time):null, dose?('dozė '+dose):null, note?('pastabos '+note):null].filter(Boolean).join(' | '); }).filter(Boolean);}
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
  const fr=fastAreas.map(({name,marker})=>{
    const y=document.querySelector('input[name="fast_'+name+'"][value="Yra"]')?.checked;
    const n=document.querySelector('input[name="fast_'+name+'"][value="Nėra"]')?.checked;
    return y? `${name}: ${marker} Yra` : (n? `${name}: ${marker} Nėra` : null);
  }).filter(Boolean);
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
}
