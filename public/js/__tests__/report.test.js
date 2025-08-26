import { gksSum, generateReport } from '../report.js';
import bodyMap from '../bodyMap.js';

describe('gksSum', () => {
  test('sums three values when all present', () => {
    expect(gksSum(1,2,3)).toBe(6);
  });
  test('returns empty string if any value missing', () => {
    expect(gksSum(1,0,3)).toBe('');
  });
});

describe('generateReport circulation metrics', () => {
  test('includes MAP and shock index', () => {
    document.body.innerHTML = `
      <input id="patient_age"><input id="patient_sex"><input id="patient_history">
      <input id="gmp_hr"><input id="gmp_rr"><input id="gmp_spo2"><input id="gmp_sbp"><input id="gmp_dbp">
      <input id="gmp_gksa"><input id="gmp_gksk"><input id="gmp_gksm"><input id="gmp_time"><input id="gmp_mechanism"><input id="gmp_notes">
      <input id="a_notes">
      <input id="b_rr"><input id="b_spo2"><input id="b_oxygen_liters"><input id="b_oxygen_type"><input id="b_dpv_fio2">
      <input id="c_hr"><input id="c_sbp"><input id="c_dbp"><input id="c_caprefill">
      <input id="d_gksa"><input id="d_gksk"><input id="d_gksm"><input id="d_notes">
      <input id="e_temp"><input id="e_back_notes"><input id="e_other">
      <div id="imaging_ct"></div><div id="imaging_xray"></div><div id="imaging_other_group"></div><input id="imaging_other">
      <div id="pain_meds"></div><div id="bleeding_meds"></div><div id="other_meds"></div><div id="procedures"></div>
      <div id="labs_basic"></div>
      <input id="spr_time"><input id="spr_hr"><input id="spr_rr"><input id="spr_spo2"><input id="spr_sbp"><input id="spr_dbp">
      <input id="spr_gksa"><input id="spr_gksk"><input id="spr_gksm">
      <textarea id="output"></textarea>
    `;
    bodyMap.zoneCounts = () => ({ });
    document.querySelector('#c_hr').value = '90';
    document.querySelector('#c_sbp').value = '120';
    document.querySelector('#c_dbp').value = '60';
    generateReport();
    const out = document.querySelector('#output').value;
    expect(out).toContain('MAP 80');
    expect(out).toContain('SI 0.75');
  });
});
