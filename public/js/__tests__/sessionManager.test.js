jest.mock('../bodyMap.js', () => ({ __esModule: true, default: { serialize: () => '' } }));

const realFetch = global.fetch;

describe('sessionManager utilities', () => {
  afterEach(() => {
    jest.resetModules();
    localStorage.clear();
    if(realFetch){
      global.fetch = realFetch;
    }else{
      delete global.fetch;
    }
  });

  test('sessionKey returns key with current session id', () => {
    const { sessionKey, setCurrentSessionId } = require('../sessionManager.js');
    setCurrentSessionId('abc');
    expect(sessionKey()).toBe('trauma_v10_abc');
  });

  test('serializeFields and loadFields round trip', () => {
    document.body.innerHTML = `
      <input id="f1" type="text" value="abc" />
      <input id="f2" type="checkbox" value="x" />
      <input name="grp" type="radio" value="a" />
      <input name="grp" type="radio" value="b" checked />
    `;
    document.getElementById('f2').checked = true;
    const { serializeFields, loadFields } = require('../formSerialization.js');
    const data = serializeFields();
    expect(data).toMatchObject({ f1: 'abc', f2: '__checked__', 'grp__b': true });
    document.getElementById('f1').value = '';
    document.getElementById('f2').checked = false;
    document.querySelectorAll('input[name="grp"]').forEach(r => (r.checked = false));
    loadFields(data);
    expect(document.getElementById('f1').value).toBe('abc');
    expect(document.getElementById('f2').checked).toBe(true);
    expect(document.querySelector('input[name="grp"][value="b"]').checked).toBe(true);
  });

  test('serializeChips and loadChips round trip', () => {
    document.body.innerHTML = `
      <div id="group">
        <span class="chip" data-value="a"></span>
        <span class="chip active" data-value="b"></span>
      </div>
      <div id="labs_basic"></div>
    `;
    const { serializeChips, loadChips } = require('../chipState.js');
    const data = serializeChips(['#group']);
    expect(data['chips:#group']).toEqual(['b']);
    document.querySelectorAll('#group .chip').forEach(c => c.classList.remove('active'));
    loadChips(data, ['#group']);
    expect(document.querySelector('#group .chip[data-value="b"]').classList.contains('active')).toBe(true);
  });

  test('updateDomToggles responds to chip state', () => {
    document.body.innerHTML = `
      <div id="d_pupil_left_group"><span class="chip" data-value="kita"></span></div>
      <fieldset id="d_pupil_left_wrapper"><label for="d_pupil_left_note"></label><input id="d_pupil_left_note" class="hidden" /></fieldset>
      <div id="d_pupil_right_group"></div>
      <fieldset id="d_pupil_right_wrapper"><label for="d_pupil_right_note"></label><input id="d_pupil_right_note" /></fieldset>
      <div id="e_back_group"></div><div id="e_back_notes"></div>
      <div id="e_abdomen_group"></div><div id="e_abdomen_notes"></div>
      <div id="c_skin_color_group"></div><input id="c_skin_color_other" />
      <div id="oxygenFields"></div><input id="b_oxygen_liters"><input id="b_oxygen_type">
      <div id="dpvFields"></div><input id="b_dpv_fio2">
      <div id="spr_decision_group"></div>
      <div id="spr_skyrius_container"></div>
      <div id="spr_ligonine_container"></div>
      <select id="spr_skyrius"></select>
      <div id="spr_skyrius_kita"></div>
      <div id="imaging_ct"></div>
      <div id="imaging_xray"></div>
      <div id="imaging_other_group"></div>
      <div id="imaging_other" class="hidden"></div>
    `;
    const { updateDomToggles } = require('../domToggles.js');
    const chip = document.querySelector('#d_pupil_left_group .chip');
    updateDomToggles();
    expect(document.getElementById('d_pupil_left_note').classList.contains('hidden')).toBe(true);
    chip.classList.add('active');
    updateDomToggles();
    expect(document.getElementById('d_pupil_left_note').classList.contains('hidden')).toBe(false);
  });

  test('saveAll resolves and updates status text', async () => {
    localStorage.setItem('trauma_current_session', 'test');
    localStorage.setItem('trauma_token', 'token');
    document.body.innerHTML = `
      <input id="field" type="text" />
      <div id="saveStatus"></div>
      <div id="pain_meds"></div>
      <div id="bleeding_meds"></div>
      <div id="other_meds"></div>
      <div id="procedures_it"></div>
      <div id="procedures_other"></div>
    `;
    const mockFetch = jest.fn(() => Promise.resolve({ ok: true }));
    global.fetch = mockFetch;
    const { saveAll, setCurrentSessionId } = require('../sessionManager.js');
    setCurrentSessionId('test');
    const promise = saveAll();
    expect(document.getElementById('saveStatus').textContent).toBe('Saving...');
    await promise;
    expect(document.getElementById('saveStatus').textContent).toBe('Saved');
    expect(mockFetch).toHaveBeenCalled();
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(payload).toMatchObject({
      pain_meds: [],
      bleeding_meds: [],
      other_meds: [],
      procs: [],
      bodymap_svg: ''
    });
  });

  test('setAuthToken stores and clears token', () => {
    const { setAuthToken, getAuthToken } = require('../sessionManager.js');
    setAuthToken('abc123');
    expect(getAuthToken()).toBe('abc123');
    expect(localStorage.getItem('trauma_token')).toBe('abc123');
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
    expect(localStorage.getItem('trauma_token')).toBeNull();
  });
});

