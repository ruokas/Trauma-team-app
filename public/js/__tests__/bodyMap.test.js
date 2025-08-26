import zones from '../bodyMapZones.js';
import BodyMap from '../components/BodyMap.js';
import { TOOLS } from '../BodyMapTools.js';

// Use the torso zone for tests
const frontZone = zones.find(z => z.id === 'front-torso');

function setupDom() {
  document.body.innerHTML = `
    <svg id="bodySvg"><g id="layer-front"></g><g id="layer-back"></g><g id="marks"></g></svg>
    <div id="burnTotal"></div>
      <div class="map-toolbar">
        <button class="tool" data-tool="${TOOLS.WOUND.char}"></button>
        <button class="tool" data-tool="${TOOLS.BURN.char}"></button>
        <button class="tool" data-tool="${TOOLS.BURN_ERASE.char}"></button>
        <input id="brushSize" type="range" value="20">
      </div>
    <button id="btnUndo"></button>
    <button id="btnRedo"></button>
    <button id="btnClearMap"></button>
    <button id="btnExportSvg"></button>
  `;
}

describe('BodyMap instance', () => {
  test('addMark and serialize', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addMark(10, 20, TOOLS.WOUND.char, 'front', 'front-torso');
    const mark = document.querySelector('#marks use');
    expect(mark.dataset.zone).toBe('front-torso');
    expect(mark.getAttribute('href')).toBe(TOOLS.WOUND.symbol);
    const data = JSON.parse(bm.serialize());
    expect(data.marks[0]).toMatchObject({ x: 10, y: 20, type: TOOLS.WOUND.char, side: 'front', zone: 'front-torso' });
  });

    test('load restores marks and brushes', () => {
      setupDom();
      const bm = new BodyMap();
      bm.init(() => {});
      bm.load({
        tool: TOOLS.WOUND.char,
        marks: [{ id: 1, x: 5, y: 5, type: TOOLS.WOUND.char, side: 'front', zone: 'front-torso' }],
        brushes: [{ id: 1, x: 10, y: 10, r: 20 }]
      });
      expect(document.querySelectorAll('#marks use').length).toBe(1);
      expect(bm.brushLayer.querySelectorAll('circle').length).toBe(1);
      const serialized = JSON.parse(bm.serialize());
      expect(serialized.brushes.length).toBe(1);
    });

    test('zoneCounts aggregates marks', () => {
      setupDom();
      const bm = new BodyMap();
      bm.init(() => {});
      bm.addMark(1, 1, TOOLS.WOUND.char, 'front', 'front-torso');
      const z = bm.zoneCounts();
      expect(z['front-torso'][TOOLS.WOUND.char]).toBe(1);
      expect(z['front-torso'].label).toBe(frontZone.label);
    });

    test('zoneCounts calculates burn coverage', () => {
      setupDom();
      const bm = new BodyMap();
      bm.init(() => {});
      bm.addBrush(24, 30, 5); // inside front-torso
      const z = bm.zoneCounts();
      const expected = bm.burnArea() * (100 / frontZone.area);
      expect(z['front-torso'].burned).toBeCloseTo(expected, 2);
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

    test('init only runs once and avoids duplicating listeners', () => {
      setupDom();
      const save = jest.fn();
      const bm = new BodyMap();
      bm.init(save);
      bm.init(save);
      bm.setTool(TOOLS.BURN.char);
      bm.svgPoint = () => ({ x: 10, y: 10 });
      const zone = document.querySelector('.zone[data-zone="front-torso"]');
      zone.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(bm.brushLayer.childElementCount).toBe(1);
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

  test('overlapping burn brushes are counted once', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addBrush(50, 50, 20);
    const area1 = bm.burnArea();
    const text1 = bm.burnTotalEl.textContent;
    bm.addBrush(50, 50, 20);
    expect(bm.burnArea()).toBeCloseTo(area1);
    expect(bm.burnTotalEl.textContent).toBe(text1);
  });

  test('burn brush only paints over body zones', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
      bm.setTool(TOOLS.BURN.char);
    // deterministic coordinates
    bm.svgPoint = () => ({ x: 10, y: 10 });

    // outside body -> no brush
    bm.svg.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(bm.brushLayer.childElementCount).toBe(0);

    // inside body -> brush added
    const zone = document.querySelector('.zone[data-zone="front-torso"]');
    zone.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(bm.brushLayer.childElementCount).toBe(1);
  });

  test('eraser removes burn brush', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    bm.addBrush(10, 10, 20);
    bm.setTool(TOOLS.BURN_ERASE.char);
    const circle = bm.brushLayer.querySelector('circle');
    document.elementFromPoint = () => circle;
    bm.svg.dispatchEvent(new MouseEvent('pointerdown', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(new MouseEvent('pointerup'));
    expect(bm.brushLayer.childElementCount).toBe(0);
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
