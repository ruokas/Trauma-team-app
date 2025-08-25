import zones from '../bodyMapZones.js';
import BodyMap from '../components/BodyMap.js';
import { TOOLS } from '../BodyMapTools.js';

const frontZone = zones.find(z => z.id === 'front');

function setupDom() {
  document.body.innerHTML = `
    <svg id="bodySvg"><g id="layer-front"></g><g id="layer-back"></g><g id="marks"></g></svg>
    <div id="burnTotal"></div>
    <div id="selectedLocations"></div>
    <div class="map-toolbar">
      <button class="tool" data-tool="${TOOLS.WOUND.char}"></button>
      <button class="tool" data-tool="${TOOLS.BURN.char}"></button>
      <button class="tool" data-tool="${TOOLS.BURN_BRUSH.char}"></button>
      <input id="brushSize" type="range" value="20">
    </div>
    <button id="btnUndo"></button>
    <button id="btnRedo"></button>
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
    bm.addMark(10, 20, TOOLS.WOUND.char, 'front', 'front');
    const mark = document.querySelector('#marks use');
    expect(mark.dataset.zone).toBe('front');
    expect(mark.getAttribute('href')).toBe(TOOLS.WOUND.symbol);
    const data = JSON.parse(bm.serialize());
    expect(data.marks[0]).toMatchObject({ x: 10, y: 20, type: TOOLS.WOUND.char, side: 'front', zone: 'front' });
  });

  test('load restores marks and burn zones', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.load({
      tool: TOOLS.WOUND.char,
      marks: [{ id: 1, x: 5, y: 5, type: TOOLS.WOUND.char, side: 'front', zone: 'front' }],
      burns: [{ zone: 'front', side: 'front' }]
    });
    const zone = document.querySelector('.zone[data-zone="front"]');
    expect(document.querySelectorAll('#marks use').length).toBe(1);
    expect(zone.classList.contains('burned')).toBe(true);
    expect(bm.counts().burned).toBe(frontZone.area);
    const serialized = JSON.parse(bm.serialize());
    expect(serialized.burns[0].zone).toBe('front');
  });

  test('zoneCounts aggregates marks and burn area', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addMark(1, 1, TOOLS.WOUND.char, 'front', 'front');
    bm.setTool(TOOLS.BURN.char);
    const zone = document.querySelector('.zone[data-zone="front"]');
    zone.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const z = bm.zoneCounts();
    expect(z['front'][TOOLS.WOUND.char]).toBe(1);
    expect(z['front'].burned).toBe(frontZone.area);
    expect(z['front'].label).toBe(frontZone.label);
    expect(document.getElementById('burnTotal').textContent).toBe(`Nudegimai: ${frontZone.area}%`);
  });

  test('toggleZoneBurn toggles burn state and saves', () => {
    setupDom();
    const save = jest.fn();
    const bm = new BodyMap();
    bm.init(save);
    bm.toggleZoneBurn('front');
    const zone = document.querySelector('.zone[data-zone="front"]');
    expect(zone.classList.contains('burned')).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    bm.toggleZoneBurn('front');
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
    const zone = document.querySelector('.zone[data-zone="front"]');
    zone.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(zone.classList.contains('burned')).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  test('clicking silhouettes adds marks', () => {
    setupDom();
    document.querySelector('#layer-front').innerHTML = '<use id="front-shape" data-side="front"></use>';
    document.querySelector('#layer-back').innerHTML = '<use id="back-shape" data-side="back"></use>';
    const bm = new BodyMap();
    bm.init(() => {});
    // Provide deterministic coordinates
    bm.svgPoint = () => ({ x: 1, y: 1 });
    document.getElementById('front-shape').dispatchEvent(new MouseEvent('click'));
    document.getElementById('back-shape').dispatchEvent(new MouseEvent('click'));
    expect(document.querySelectorAll('#marks use').length).toBe(2);
  });

  test('addBrush increases burn area and serializes', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    const before = bm.burnArea();
    bm.addBrush(10, 10, 20);
    expect(bm.burnArea()).toBeGreaterThan(before);
    const data = JSON.parse(bm.serialize());
    expect(data.brushes.length).toBe(1);
    const bm2 = new BodyMap();
    bm2.init(() => {});
    bm2.load(data);
    expect(bm2.burnArea()).toBeGreaterThan(0);
  });

  test('burn brush only paints over body zones', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.setTool(TOOLS.BURN_BRUSH.char);
    // deterministic coordinates
    bm.svgPoint = () => ({ x: 10, y: 10 });

    // outside body -> no brush
    bm.svg.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(bm.brushLayer.childElementCount).toBe(0);

    // inside body -> brush added
    const zone = document.querySelector('.zone[data-zone="front"]');
    zone.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(bm.brushLayer.childElementCount).toBe(1);
  });

  test('undo and redo actions manage stacks and buttons', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    const undoBtn = document.getElementById('btnUndo');
    const redoBtn = document.getElementById('btnRedo');
    expect(undoBtn.disabled).toBe(true);
    bm.addMark(5, 5, TOOLS.WOUND.char, 'front');
    expect(undoBtn.disabled).toBe(false);
    bm.undo();
    expect(document.querySelectorAll('#marks use').length).toBe(0);
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(false);
    bm.redo();
    expect(document.querySelectorAll('#marks use').length).toBe(1);
    expect(redoBtn.disabled).toBe(true);
  });
});
