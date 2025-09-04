import { validateField, validateVitals } from '../validation.js';

describe('validateField', () => {
  test('returns error for required empty field', () => {
    document.body.innerHTML = '<input id="test" required />';
    const input = document.getElementById('test');
    validateField(input);
    const err = input.nextElementSibling;
    expect(err).not.toBeNull();
    expect(err.textContent).toBe('Privalomas laukas');
    expect(input.classList.contains('invalid')).toBe(true);
  });

  test('returns error for non-numeric value in numeric field', () => {
    document.body.innerHTML = '<input id="num" min="1" max="5" value="abc" />';
    const input = document.getElementById('num');
    validateField(input);
    const err = input.nextElementSibling;
    expect(err).not.toBeNull();
    expect(err.textContent).toBe('Netinkama reikšmė');
    expect(input.classList.contains('invalid')).toBe(true);
  });

  test('returns error for value outside numeric range', () => {
    document.body.innerHTML = '<input id="num" min="1" max="5" value="10" />';
    const input = document.getElementById('num');
    validateField(input);
    const err = input.nextElementSibling;
    expect(err).not.toBeNull();
    expect(err.textContent).toBe('Leistina 1–5');
    expect(input.classList.contains('invalid')).toBe(true);
  });
});

describe('validateVitals', () => {
  test('checks required text and select fields', () => {
      document.body.innerHTML = `
        <input id="patient_age" type="number" value="25" required />
        <select id="patient_sex" required>
          <option value=""></option>
          <option value="M">M</option>
        </select>
      `;
      expect(validateVitals()).toBe(false);
      const sexErr = document.querySelector('#patient_sex').nextElementSibling;
      expect(sexErr.textContent).toBe('Privalomas laukas');

      document.getElementById('patient_sex').value = 'M';
      validateVitals();
      expect(document.getElementById('patient_sex').classList.contains('invalid')).toBe(false);
    });
  });
