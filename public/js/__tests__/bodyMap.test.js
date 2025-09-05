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
  test('init exits gracefully when SVG structure is incomplete', () => {
    document.body.innerHTML = '<svg id="bodySvg"></svg>';
    const bm = new BodyMap();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => bm.init(() => {})).not.toThrow();
    expect(warn).toHaveBeenCalled();
    expect(bm.initialized).toBe(false);
    warn.mockRestore();
  });

  test('init skips zones for missing layer elements', () => {
    setupDom();
    document.querySelector('#layer-back').remove();
    const bm = new BodyMap();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => bm.init(() => {})).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

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

  test('load does not invoke save callback', () => {
    setupDom();
    const save = jest.fn();
    const bm = new BodyMap();
    bm.init(save);
    bm.load({
      tool: TOOLS.WOUND.char,
      marks: [{ id: 1, x: 5, y: 5, type: TOOLS.WOUND.char, side: 'front', zone: 'front-torso' }],
      brushes: [{ id: 1, x: 10, y: 10, r: 20 }]
    });
    expect(save).not.toHaveBeenCalled();
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

    test('clicking a zone adds a mark', () => {
      setupDom();
      const bm = new BodyMap();
      bm.init(() => {});
      // deterministic position inside body
      bm.svgPoint = () => ({ x: 10, y: 10 });
      const zone = document.querySelector('.zone[data-zone="front-torso"]');
      zone.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(document.querySelectorAll('#marks use').length).toBe(1);
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
    expect(save).toHaveBeenCalledTimes(1);
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
      zone.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      expect(bm.brushLayer.childElementCount).toBe(1);
      expect(save).toHaveBeenCalledTimes(1);
    });

  test('clicking silhouettes adds marks', () => {
    setupDom();
    document.querySelector('#layer-front').innerHTML = '<image id="front-shape" data-side="front"></image>';
    document.querySelector('#layer-back').innerHTML = '<image id="back-shape" data-side="back"></image>';
    const bm = new BodyMap();
    bm.init(() => {});
    // Provide deterministic coordinates
    bm.svgPoint = () => ({ x: 1, y: 1 });
    document.getElementById('front-shape').dispatchEvent(new MouseEvent('click'));
    document.getElementById('back-shape').dispatchEvent(new MouseEvent('click'));
    expect(document.querySelectorAll('#marks use').length).toBe(2);
  });

  test('selecting wound tool and clicking map adds a mark', () => {
    setupDom();
    document.querySelector('#layer-front').innerHTML = '<g id="front-shape" data-side="front"><path></path></g>';
    const bm = new BodyMap();
    bm.init(() => {});
    const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } };
    bm.svg.getScreenCTM = () => identity;
    bm.svg.createSVGPoint = () => ({
      x: 0,
      y: 0,
      matrixTransform(m) {
        return {
          x: this.x * m.a + this.y * m.c + m.e,
          y: this.x * m.b + this.y * m.d + m.f,
          matrixTransform: this.matrixTransform
        };
      }
    });
    const shape = document.getElementById('front-shape');
    shape.getScreenCTM = () => ({
      a: 2,
      b: 0,
      c: 0,
      d: 2,
      e: 100,
      f: 100,
      inverse() {
        return {
          a: 0.5,
          b: 0,
          c: 0,
          d: 0.5,
          e: -50,
          f: -50,
          inverse() { return shape.getScreenCTM(); }
        };
      }
    });
    const path = shape.querySelector('path');
    path.isPointInFill = jest.fn(pt => pt.x >= 0 && pt.x <= 10 && pt.y >= 0 && pt.y <= 10);
    bm.setTool(TOOLS.WOUND.char);
    bm.svgPoint = () => ({ x: 110, y: 110 });
    shape.dispatchEvent(new MouseEvent('click'));
    expect(document.querySelectorAll('#marks use').length).toBe(1);
    expect(path.isPointInFill).toHaveBeenCalledWith(expect.objectContaining({ x: 5, y: 5 }));
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

  test('overlapping burn brushes do not double count area', () => {
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

  test('partially overlapping burn brushes count overlap once', () => {
    setupDom();
    const bm = new BodyMap();
    bm.init(() => {});
    const r = 20;
    bm.addBrush(30, 30, r);
    bm.addBrush(50, 30, r); // offset to create partial overlap
    const result = bm.burnArea();
    const d = 20; // distance between centres
    const intersection =
      2 * r * r * Math.acos(d / (2 * r)) -
      (d / 2) * Math.sqrt(4 * r * r - d * d);
    const union = 2 * Math.PI * r * r - intersection;
    const expected = (union / bm.totalArea) * 100;
    expect(result).toBeCloseTo(expected, 3);
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

  test('undo and redo do not invoke save callback', () => {
    setupDom();
    const save = jest.fn();
    const bm = new BodyMap();
    bm.init(save);
    bm.addMark(5, 5, TOOLS.WOUND.char, 'front');
    save.mockClear();
    bm.undo();
    expect(save).not.toHaveBeenCalled();
    bm.redo();
    expect(save).not.toHaveBeenCalled();
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
