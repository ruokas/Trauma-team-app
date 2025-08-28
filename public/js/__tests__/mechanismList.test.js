describe('mechanismList', () => {
  let init;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<datalist id="gmp_mechanism_list"><option value="Existing"></option></datalist><input id="gmp_mechanism">';
    ({ init } = require('../mechanismList.js'));
  });

  test('loads stored mechanisms', () => {
    localStorage.setItem('traumos_mechanizmai', JSON.stringify(['Stored']));
    init();
    const options = Array.from(document.querySelectorAll('#gmp_mechanism_list option')).map(o => o.value);
    expect(options).toContain('Stored');
  });

  test('adds new mechanism to list and storage', () => {
    init();
    const input = document.getElementById('gmp_mechanism');
    input.value = 'NewMech';
    input.dispatchEvent(new Event('change'));
    const options = Array.from(document.querySelectorAll('#gmp_mechanism_list option')).map(o => o.value);
    expect(options).toContain('NewMech');
    expect(JSON.parse(localStorage.getItem('traumos_mechanizmai'))).toContain('NewMech');
  });

  test('gracefully handles missing elements', () => {
    document.body.innerHTML = '';
    expect(() => init()).not.toThrow();
  });
});

