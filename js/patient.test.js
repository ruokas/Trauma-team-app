const mockSave = jest.fn();
const mockJsPDF = jest.fn().mockImplementation(() => ({
  splitTextToSize: jest.fn(() => []),
  text: jest.fn(),
  save: mockSave
}));
jest.mock('./lib/jspdf.umd.min.js', () => ({ jsPDF: mockJsPDF }));

const setupDom = () => {
  document.body.innerHTML = `
    <button id="btnCopy"></button>
    <button id="btnSave"></button>
    <button id="btnClear"></button>
    <button id="btnPrint"></button>
    <button id="btnPdf"></button>
    <button id="btnAtvyko"></button>
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
  const textInputs=['a_notes','gmp_mechanism','gmp_notes','b_oxygen_type','b_dpv_fio2','d_pupil_left_note','d_pupil_right_note','d_notes','e_back_notes','e_other','spr_skyrius_kita','spr_ligonine','patient_history'];
  textInputs.forEach(id=>{ const i=document.createElement('input'); i.id=id; i.type='text'; document.body.appendChild(i); });
  const numberInputs=['b_rr','b_spo2','b_oxygen_liters','c_hr','c_sbp','c_dbp','c_caprefill','d_gksa','d_gksk','d_gksm','e_temp',
    'spr_hr','spr_rr','spr_spo2','spr_sbp','spr_dbp','spr_gksa','spr_gksk','spr_gksm','patient_age','gmp_hr','gmp_rr','gmp_spo2',
    'gmp_sbp','gmp_dbp','gmp_gksa','gmp_gksk','gmp_gksm'];
  numberInputs.forEach(id=>{ const i=document.createElement('input'); i.id=id; i.type='number'; document.body.appendChild(i); });
  const timeInputs=['gmp_time','spr_time'];
  timeInputs.forEach(id=>{ const i=document.createElement('input'); i.id=id; i.type='time'; document.body.appendChild(i); });
  const patientSex=document.createElement('select'); patientSex.id='patient_sex'; ['','M','F','O'].forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; patientSex.appendChild(o); }); document.body.appendChild(patientSex);
  const sprSkyrius=document.createElement('select'); sprSkyrius.id='spr_skyrius'; sprSkyrius.appendChild(document.createElement('option')); document.body.appendChild(sprSkyrius);
};

describe('patient fields', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    setupDom();
    localStorage.setItem('trauma_current_session','test');
    mockJsPDF.mockClear();
    mockSave.mockClear();
  });

  test('persist with saveAll/loadAll', () => {
    const { saveAll, loadAll } = require('./app.js');
    document.getElementById('patient_age').value='25';
    document.getElementById('patient_sex').value='M';
    document.getElementById('patient_history').value='H123';
    saveAll();
    const stored = JSON.parse(localStorage.getItem('trauma_v10_test'));
    expect(stored.patient_age).toBe('25');
    expect(stored.patient_sex).toBe('M');
    expect(stored.patient_history).toBe('H123');
    document.getElementById('patient_age').value='';
    document.getElementById('patient_sex').value='';
    document.getElementById('patient_history').value='';
    loadAll();
    expect(document.getElementById('patient_age').value).toBe('25');
    expect(document.getElementById('patient_sex').value).toBe('M');
    expect(document.getElementById('patient_history').value).toBe('H123');
  });

  test('report includes patient info', () => {
    const { generateReport } = require('./app.js');
    document.getElementById('patient_age').value='25';
    document.getElementById('patient_sex').value='M';
    document.getElementById('patient_history').value='H123';
    generateReport();
    const report=document.getElementById('output').value;
    expect(report.startsWith('--- Pacientas ---')).toBe(true);
    expect(report).toContain('25');
    expect(report).toContain('M');
    expect(report).toContain('H123');
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

  test('PDF button generates file via jsPDF', async () => {
    require('./app.js');
    document.getElementById('patient_age').value='25';
    document.getElementById('patient_sex').value='M';
    document.getElementById('patient_history').value='H123';
    document.getElementById('btnPdf').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockJsPDF).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith('report.pdf');
  });

  test('print window contains body map', () => {
    const newDoc = document.implementation.createHTMLDocument();
    const openMock = jest.spyOn(window, 'open').mockReturnValue({
      document: newDoc,
      focus: jest.fn(),
      print: jest.fn(),
      close: jest.fn()
    });
    require('./app.js');
    document.getElementById('patient_age').value='25';
    document.getElementById('patient_sex').value='M';
    document.getElementById('patient_history').value='H123';
    document.getElementById('btnPrint').click();
    const svg = newDoc.querySelector('#bodySvg');
    expect(svg).not.toBeNull();
    openMock.mockRestore();
  });

  test('validation flags out-of-range values', () => {
    const { initValidation } = require('./validation.js');
    initValidation();
    const age = document.getElementById('patient_age');
    age.setAttribute('min','0');
    age.setAttribute('max','120');
    age.value = '130';
    age.dispatchEvent(new Event('input', { bubbles: true }));
    expect(age.classList.contains('invalid')).toBe(true);
    const err = age.nextElementSibling;
    expect(err).not.toBeNull();
    expect(err.textContent).toContain('Leistina');
  });
});
