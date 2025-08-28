import { validateField, validateVitals, validatePatient } from '../validation.js';

describe('validateField', () => {
  test('returns error for required empty field', () => {
    document.body.innerHTML = '<input id="test" required />';
    const input = document.getElementById('test');
    validateField(input);
    const err = document.getElementById('test_error');
    expect(err).not.toBeNull();
    expect(err.textContent).toBe('Privalomas laukas');
    expect(input.classList.contains('invalid')).toBe(true);
  });

  test('returns error for non-numeric value in numeric field', () => {
    document.body.innerHTML = '<input id="num" min="1" max="5" value="abc" />';
    const input = document.getElementById('num');
    validateField(input);
    const err = document.getElementById('num_error');
    expect(err).not.toBeNull();
    expect(err.textContent).toBe('Netinkama reikšmė');
    expect(input.classList.contains('invalid')).toBe(true);
  });

  test('returns error for value outside numeric range', () => {
    document.body.innerHTML = '<input id="num" min="1" max="5" value="10" />';
    const input = document.getElementById('num');
    validateField(input);
    const err = document.getElementById('num_error');
    expect(err).not.toBeNull();
    expect(err.textContent).toBe('Leistina 1–5');
    expect(input.classList.contains('invalid')).toBe(true);
  });
});

describe('validatePatient', () => {
  test('checks top level fields with custom messages', () => {
    document.body.innerHTML = `
      <input id="patient_age" type="number" required />
      <select id="patient_sex" required>
        <option value=""></option>
        <option value="M">M</option>
      </select>
      <input id="patient_history" required />
    `;
    expect(validatePatient()).toBe(false);
    expect(document.getElementById('patient_age_error').textContent).toBe('Amžius 0-120');
    expect(document.getElementById('patient_sex_error').textContent).toBe('Pasirinkite lytį');
    expect(document.getElementById('patient_history_error').textContent).toBe('Ligos istorijos nr. privalomas');

    document.getElementById('patient_age').value = '25';
    document.getElementById('patient_sex').value = 'M';
    document.getElementById('patient_history').value = 'H123';
    expect(validatePatient()).toBe(true);
  });
});

describe('validateVitals', () => {
  test('invalid numeric field', () => {
    document.body.innerHTML = '<input id="gmp_hr" min="0" max="250" value="abc" />';
    expect(validateVitals()).toBe(false);
    expect(document.getElementById('gmp_hr_error').textContent).toBe('Netinkama reikšmė');
    document.getElementById('gmp_hr').value = '100';
    expect(validateVitals()).toBe(true);
  });
});
