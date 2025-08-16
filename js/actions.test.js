import { DEFAULT_DOSES, initActions } from './actions.js';

describe('initActions default doses', () => {
  test('fills default dose on check and allows edits', () => {
    document.body.innerHTML = `
      <div id="pain_meds"></div>
      <div id="bleeding_meds"></div>
      <div id="other_meds"></div>
      <div id="procedures"></div>
      <input id="medSearch" />
    `;
    initActions(() => {});
    const card = [...document.querySelectorAll('#pain_meds .card')]
      .find(c => c.querySelector('label').textContent.includes('Fentanilis'));
    const chk = card.querySelector('.act_chk');
    const dose = card.querySelector('.act_dose');
    chk.checked = true;
    chk.dispatchEvent(new Event('change'));
    expect(dose.value).toBe(DEFAULT_DOSES['Fentanilis']);
    dose.value = '150 mcg';
    chk.checked = false;
    chk.dispatchEvent(new Event('change'));
    chk.checked = true;
    chk.dispatchEvent(new Event('change'));
    expect(dose.value).toBe('150 mcg');
  });

  test.each(['O- kraujas', 'Ondansetronas'])(
    'fills default dose for %s',
    (med) => {
      document.body.innerHTML = `
        <div id="pain_meds"></div>
        <div id="bleeding_meds"></div>
        <div id="other_meds"></div>
        <div id="procedures"></div>
        <input id="medSearch" />
      `;
      initActions(() => {});
      const card = [...document.querySelectorAll('.card')]
        .find(c => c.querySelector('label').textContent.includes(med));
      const chk = card.querySelector('.act_chk');
      const dose = card.querySelector('.act_dose');
      chk.checked = true;
      chk.dispatchEvent(new Event('change'));
      expect(dose.value).toBe(DEFAULT_DOSES[med]);
    }
  );
});
