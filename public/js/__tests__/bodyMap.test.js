import BodyMap from '../components/BodyMap.js';
import { TOOLS } from '../BodyMapTools.js';

function setupDom() {
  document.body.innerHTML = `
    <div id="burnTotal"></div>
    <svg id="bodySvg"><g id="layer-front"></g><g id="layer-back"></g><g id="marks"></g></svg>
  `;
}

describe('BodyMap minimal', () => {
  test('init builds zones', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    expect(document.querySelectorAll('.zone').length).toBeGreaterThan(0);
  });

  test('addMark serializes data', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addMark(10, 20, TOOLS.WOUND.char, 'front', 'front-chest');
    const data = JSON.parse(bm.serialize());
    expect(data.marks[0]).toMatchObject({ x: 10, y: 20, type: TOOLS.WOUND.char, zone: 'front-chest' });
  });

  test('addBrush uses provided coordinates', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    const brush = bm.addBrush(15, 25, 5);
    expect(brush.getAttribute('cx')).toBe('15');
    expect(brush.getAttribute('cy')).toBe('25');
  });

  test('load restores marks and brushes', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.load({ tool: TOOLS.WOUND.char, marks:[{id:1,x:5,y:5,type:TOOLS.WOUND.char,side:'front',zone:'front-chest'}], brushes:[{id:1,x:10,y:10,r:20}] });
    expect(document.querySelectorAll('#marks use').length).toBe(1);
    expect(bm.brushLayer.querySelectorAll('circle').length).toBe(1);
  });

  test('zoneCounts tallies marks and burns', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addMark(5,5,TOOLS.WOUND.char,'front','front-chest');
    bm.addBrush(240,250,5);
    const counts = bm.zoneCounts();
    expect(counts['front-chest'][TOOLS.WOUND.char]).toBe(1);
    expect(counts['front-chest'].burned).toBeGreaterThan(0);
  });

  test('undo and redo revert mark operations', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addMark(10,20,TOOLS.WOUND.char,'front','front-chest');
    expect(bm.marksLayer.querySelectorAll('use').length).toBe(1);
    bm.undo();
    expect(bm.marksLayer.querySelectorAll('use').length).toBe(0);
    bm.redo();
    expect(bm.marksLayer.querySelectorAll('use').length).toBe(1);
  });

  test('undo restores erased brush', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addBrush(10,10,5);
    bm.eraseBrush(10,10,5);
    expect(bm.brushLayer.querySelectorAll('circle').length).toBe(0);
    bm.undo();
    expect(bm.brushLayer.querySelectorAll('circle').length).toBe(1);
    bm.redo();
    expect(bm.brushLayer.querySelectorAll('circle').length).toBe(0);
  });

  test('burnTotal updates after brush changes', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    const totalEl = document.getElementById('burnTotal');
    bm.addBrush(10,10,5);
    expect(totalEl.textContent).toBe(`${bm.burnArea().toFixed(1)}%`);
    bm.eraseBrush(10,10,5);
    expect(totalEl.textContent).toBe(`${bm.burnArea().toFixed(1)}%`);
  });
});

