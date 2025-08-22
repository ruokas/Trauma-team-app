import zones from '../bodyMapZones.js';
import BodyMap from '../components/BodyMap.js';
import { TOOLS } from '../BodyMapTools.js';

const headZone = zones.find(z => z.id === 'head-front');

function setupDom() {
  document.body.innerHTML = `
    <svg id="bodySvg"><g id="layer-front"></g><g id="layer-back"></g><g id="marks"></g></svg>
    <div id="burnTotal"></div>
    <div id="selectedLocations"></div>
    <div class="map-toolbar">
      <button class="tool" data-tool="${TOOLS.WOUND.char}"></button>
      <button class="tool" data-tool="${TOOLS.BURN.char}"></button>
    </div>
    <button id="btnUndo"></button>
    <button id="btnClearMap"></button>
    <button id="btnExportSvg"></button>
    <button id="btnDelete"></button>
  `;
}

describe('BodyMap instance', () => {
  test('addMark and serialize', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addMark(10, 20, TOOLS.WOUND.char, 'front', 'head-front');
    const mark = document.querySelector('#marks use');
    expect(mark.dataset.zone).toBe('head-front');
    const data = JSON.parse(bm.serialize());
    expect(data.marks[0]).toMatchObject({ x: 10, y: 20, type: TOOLS.WOUND.char, side: 'front', zone: 'head-front' });
  });

  test('load restores marks and burn zones', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.load({
      tool: TOOLS.WOUND.char,
      marks: [{ id: 1, x: 5, y: 5, type: TOOLS.WOUND.char, side: 'front', zone: 'head-front' }],
      burns: [{ zone: 'head-front', side: 'front' }]
    });
    const zone = document.querySelector('.zone[data-zone="head-front"]');
    expect(document.querySelectorAll('#marks use').length).toBe(1);
    expect(zone.classList.contains('burned')).toBe(true);
    expect(bm.counts().burned).toBe(headZone.area);
    const serialized = JSON.parse(bm.serialize());
    expect(serialized.burns[0].zone).toBe('head-front');
  });

  test('zoneCounts aggregates marks and burn area', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addMark(1, 1, TOOLS.WOUND.char, 'front', 'head-front');
    bm.setTool(TOOLS.BURN.char);
    const zone = document.querySelector('.zone[data-zone="head-front"]');
    zone.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const z = bm.zoneCounts();
    expect(z['head-front'][TOOLS.WOUND.char]).toBe(1);
    expect(z['head-front'].burned).toBe(headZone.area);
    expect(z['head-front'].label).toBe(headZone.label);
    expect(document.getElementById('burnTotal').textContent).toBe(`Nudegimai: ${headZone.area}%`);
  });

  test('toggleZoneBurn toggles burn state and saves', () => {
    setupDom();
    const save = jest.fn();
    const bm = new BodyMap();
    bm.init(save);
    bm.toggleZoneBurn('head-front');
    const zone = document.querySelector('.zone[data-zone="head-front"]');
    expect(zone.classList.contains('burned')).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    bm.toggleZoneBurn('head-front');
    expect(zone.classList.contains('burned')).toBe(false);
    expect(save).toHaveBeenCalledTimes(2);
  });

  test('pointer events move mark and save', () => {
    setupDom();
    const save = jest.fn();
    const bm = new BodyMap();
    bm.init(save);
    bm.load({ tool: TOOLS.WOUND.char, marks: [{ id: 1, x: 10, y: 20, type: TOOLS.WOUND.char, side: 'front' }] });
    const mark = document.querySelector('#marks use');
    mark.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 20 }));
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 30, clientY: 40 }));
    document.dispatchEvent(new MouseEvent('pointerup', { clientX: 30, clientY: 40 }));
    expect(mark.getAttribute('transform')).toBe('translate(30,40)');
    expect(save).toHaveBeenCalledTimes(2);
  });

  test('delete removes selected mark', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.load({ tool: TOOLS.WOUND.char, marks: [
      { id: 1, x: 1, y: 2, type: TOOLS.WOUND.char, side: 'front' },
      { id: 2, x: 3, y: 4, type: TOOLS.BRUISE.char, side: 'front' }
    ] });
    const show = jest.fn();
    window.showWoundDetails = show;
    const [m1] = document.querySelectorAll('#marks use');
    m1.dispatchEvent(new Event('click', { bubbles: true }));
    expect(m1.classList.contains('selected')).toBe(true);
    document.getElementById('btnDelete').click();
    expect(document.querySelectorAll('#marks use').length).toBe(1);
  });

  test('init only runs once and avoids duplicating listeners', () => {
    setupDom();
    const save = jest.fn();
    const bm = new BodyMap();
    bm.init(save);
    bm.init(save);
    bm.setTool(TOOLS.BURN.char);
    const zone = document.querySelector('.zone[data-zone="head-front"]');
    zone.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(zone.classList.contains('burned')).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
