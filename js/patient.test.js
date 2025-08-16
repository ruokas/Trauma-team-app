const setupDom = () => {
  document.body.innerHTML = `
    <button id="btnCopy"></button>
    <button id="btnSave"></button>
    <button id="btnClear"></button>
    <button id="btnPrint"></button>
    <button id="btnPdf"></button>
    <button id="btnGCS15"></button>
    <button id="btnGCSCalc"></button>
    <div id="d_gcs_calc" style="display:none">
      <select id="d_gcs_calc_a"></select>
      <select id="d_gcs_calc_k"></select>
      <select id="d_gcs_calc_m"></select>
      <button id="d_gcs_apply"></button>
      <span id="d_gcs_calc_total"></span>
    </div>
    <input type="checkbox" id="e_back_ny" />
    <button id="btnGen"></button>
    <textarea id="output"></textarea>
    <svg id="bodySvg"><g id="layer-front"></g><g id="layer-back"></g><g id="marks"></g></svg>
    <div id="front-shape"></div>
    <div id="back-shape"></div>
    <button id="btnSide"></button>
    <button id="btnUndo"></button>
    <button id="btnClearMap"></button>
    <button id="btnExportSvg"></button>
    <div class="map-toolbar"><button class="tool" data-tool="Ž"></button></div>
  `;
  const divIds = [
    'chips_red','chips_yellow','imaging_ct','imaging_xray','imaging_other_group','labs_basic',
    'a_airway_group','b_breath_left_group','b_breath_right_group','d_pupil_left_group','d_pupil_right_group','spr_decision_group',
    'pain_meds','bleeding_meds','other_meds','procedures','fastGrid','teamGrid','oxygenFields','dpvFields',
    'spr_skyrius_container','spr_ligonine_container','imaging_other'
  ];
  divIds.forEach(id=>{ const d=document.createElement('div'); d.id=id; document.body.appendChild(d); });
  const textInputs=['a_notes','gmp_mechanism','gmp_notes','b_oxygen_type','b_dpv_fio2','d_pupil_left_note','d_pupil_right_note','d_notes','e_back_notes','e_other','spr_skyrius_kita','spr_ligonine','patient_name','patient_id'];
  textInputs.forEach(id=>{ const i=document.createElement('input'); i.id=id; i.type='text'; document.body.appendChild(i); });
  const numberInputs=['b_rr','b_spo2','b_oxygen_liters','c_hr','c_sbp','c_dbp','c_caprefill','d_gksa','d_gksk','d_gksm','e_temp',
    'spr_hr','spr_rr','spr_spo2','spr_sbp','spr_dbp','spr_gksa','spr_gksk','spr_gksm','patient_age','gmp_hr','gmp_rr','gmp_spo2',
    'gmp_sbp','gmp_dbp','gmp_gksa','gmp_gksk','gmp_gksm'];
  numberInputs.forEach(id=>{ const i=document.createElement('input'); i.id=id; i.type='number'; document.body.appendChild(i); });
  const timeInputs=['gmp_time','spr_time'];
  timeInputs.forEach(id=>{ const i=document.createElement('input'); i.id=id; i.type='time'; document.body.appendChild(i); });
  const patientSex=document.createElement('select'); patientSex.id='patient_sex'; ['','M','F'].forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; patientSex.appendChild(o); }); document.body.appendChild(patientSex);
  const sprSkyrius=document.createElement('select'); sprSkyrius.id='spr_skyrius'; sprSkyrius.appendChild(document.createElement('option')); document.body.appendChild(sprSkyrius);
};

describe('patient fields', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    setupDom();
    localStorage.setItem('trauma_current_session','test');
  });

  test('persist with saveAll/loadAll', () => {
    const { saveAll, loadAll } = require('./app.js');
    document.getElementById('patient_name').value='Jonas';
    document.getElementById('patient_age').value='25';
    document.getElementById('patient_sex').value='M';
    document.getElementById('patient_id').value='ID123';
    saveAll();
    const stored = JSON.parse(localStorage.getItem('trauma_v10_test'));
    expect(stored.patient_name).toBe('Jonas');
    expect(stored.patient_age).toBe('25');
    expect(stored.patient_sex).toBe('M');
    expect(stored.patient_id).toBe('ID123');
    document.getElementById('patient_name').value='';
    document.getElementById('patient_age').value='';
    document.getElementById('patient_sex').value='';
    document.getElementById('patient_id').value='';
    loadAll();
    expect(document.getElementById('patient_name').value).toBe('Jonas');
    expect(document.getElementById('patient_age').value).toBe('25');
    expect(document.getElementById('patient_sex').value).toBe('M');
    expect(document.getElementById('patient_id').value).toBe('ID123');
  });

  test('report includes patient info', () => {
    const { generateReport } = require('./app.js');
    document.getElementById('patient_name').value='Jonas';
    document.getElementById('patient_age').value='25';
    document.getElementById('patient_sex').value='M';
    document.getElementById('patient_id').value='ID123';
    generateReport();
    const report=document.getElementById('output').value;
    expect(report.startsWith('--- Pacientas ---')).toBe(true);
    expect(report).toContain('Jonas');
    expect(report).toContain('25');
    expect(report).toContain('M');
    expect(report).toContain('ID123');
  });

  test('GCS panel focuses first select and closes on Escape', () => {
    require('./app.js');
    const btn=document.getElementById('btnGCSCalc');
    const panel=document.getElementById('d_gcs_calc');
    const selA=document.getElementById('d_gcs_calc_a');

    btn.click();
    expect(panel.style.display).toBe('block');
    expect(document.activeElement).toBe(selA);

    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
    expect(panel.style.display).toBe('none');
    expect(document.activeElement).toBe(btn);
  });

  test('GCS panel closes when clicking outside', () => {
    require('./app.js');
    const btn=document.getElementById('btnGCSCalc');
    const panel=document.getElementById('d_gcs_calc');

    btn.click();
    expect(panel.style.display).toBe('block');

    document.body.click();
    expect(panel.style.display).toBe('none');
    expect(document.activeElement).toBe(btn);
  });
});
