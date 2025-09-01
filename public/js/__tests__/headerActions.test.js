import { setupHeaderActions } from '../headerActions.js';
import { setTheme } from '../sessionManager.js';

describe('setupHeaderActions', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className='';
    document.body.innerHTML='';
    setTheme('dark');
  });

  test('handles missing action buttons gracefully', () => {
    expect(() => setupHeaderActions({ validateForm: () => true })).not.toThrow();
  });

  test('toggles theme when btnTheme is present', () => {
    document.body.innerHTML='<div id="desktopActions"><button id="btnTheme" class="btn"></button></div>';
    setupHeaderActions({ validateForm: () => true });
    const btn=document.getElementById('btnTheme');
    expect(btn.textContent).toBe('Light mode');
    btn.click();
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(btn.textContent).toBe('Dark mode');
  });
});
