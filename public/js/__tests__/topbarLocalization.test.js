import { initTopbar } from '../components/topbar.js';
import fs from 'fs';
import path from 'path';

describe('topbar', () => {
  test('loads without actions button', async () => {
    const html = fs.readFileSync(path.join(__dirname, '../../assets/partials/topbar.html'), 'utf8');
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve(html) }));
    document.body.innerHTML = '<header id="appHeader"></header><nav></nav>';
    window.matchMedia = window.matchMedia || function(){
      return { matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} };
    };
    await initTopbar();
    expect(document.getElementById('actionsToggle')).toBeNull();
    ['btnCopy','btnSave','btnClear','btnPdf','btnPrint'].forEach(id=>{
      expect(document.getElementById(id)).toBeNull();
    });
  });
});
