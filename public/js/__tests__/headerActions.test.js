import { setupHeaderActions } from '../headerActions.js';

describe('setupHeaderActions', () => {
  test('handles missing action buttons gracefully', () => {
    document.body.innerHTML = '';
    expect(() => setupHeaderActions({ validateForm: () => true })).not.toThrow();
  });
});
