describe('$ and $$ when document is undefined', () => {
  const originalDocument = global.document;
  beforeEach(() => {
    global.document = undefined;
    jest.resetModules();
  });
  afterEach(() => {
    global.document = originalDocument;
    jest.resetModules();
  });

  test('$ returns null when document is undefined', () => {
    const { $ } = require('./utils.js');
    expect($('div')).toBeNull();
  });

  test('$$ returns [] when document is undefined', () => {
    const { $$ } = require('./utils.js');
    expect($$('div')).toEqual([]);
  });
});
