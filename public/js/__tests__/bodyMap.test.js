import BodyMap from '../components/BodyMap.js';
import { TOOLS } from '../BodyMapTools.js';

function setupDom() {
  document.body.innerHTML = `
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
    bm.addMark(10, 20, TOOLS.WOUND.char, 'front', 'front-torso');
    const data = JSON.parse(bm.serialize());
    expect(data.marks[0]).toMatchObject({ x: 10, y: 20, type: TOOLS.WOUND.char, zone: 'front-torso' });
  });

  test('load restores marks and brushes', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.load({ tool: TOOLS.WOUND.char, marks:[{id:1,x:5,y:5,type:TOOLS.WOUND.char,side:'front',zone:'front-torso'}], brushes:[{id:1,x:10,y:10,r:20}] });
    expect(document.querySelectorAll('#marks use').length).toBe(1);
    expect(bm.brushLayer.querySelectorAll('circle').length).toBe(1);
  });

  test('zoneCounts tallies marks and burns', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addMark(5,5,TOOLS.WOUND.char,'front','front-torso');
    bm.addBrush(24,30,5);
    const counts = bm.zoneCounts();
    expect(counts['front-torso'][TOOLS.WOUND.char]).toBe(1);
    expect(counts['front-torso'].burned).toBeGreaterThan(0);
  });
});

