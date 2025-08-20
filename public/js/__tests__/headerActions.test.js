import { setupHeaderActions } from '../headerActions.js';

describe('setupHeaderActions', () => {
  test('calls saveAll when save button clicked and valid', () => {
    const saveAll = jest.fn();
    const validateForm = jest.fn(() => true);
    document.body.innerHTML = `<button id="btnSave"></button>`;
    setupHeaderActions({ validateForm, saveAll });
    document.getElementById('btnSave').click();
    expect(saveAll).toHaveBeenCalled();
  });
});
