import { initBodyMap, load, counts, serialize, zoneCounts } from '../bodyMap.js';

describe('body map serialization', () => {
  test('counts marks after load', () => {
    document.body.innerHTML = `
      <svg id="bodySvg"><g id="layer-front"></g><g id="layer-back"></g><g id="marks"></g></svg>
      <button id="btnSide"></button>
      <button id="btnUndo"></button>
      <button id="btnClearMap"></button>
      <button id="btnExportSvg"></button>
      <div class="map-toolbar"><button class="tool" data-tool="Ž"></button></div>
    `;
    initBodyMap(()=>{});
    load({side:'front', tool:'Ž', marks:[{x:1,y:2,type:'Ž',side:'front'},{x:0,y:0,type:'S',side:'back'}]});
    const c=counts();
    expect(c.front['Ž']).toBe(1);
    expect(c.back['S']).toBe(1);
  });
});

test('selects and deletes marks', () => {
  document.body.innerHTML = `
    <svg id="bodySvg"><g id="layer-front"></g><g id="layer-back"></g><g id="marks"></g></svg>
    <button id="btnUndo"></button>
    <button id="btnClearMap"></button>
    <button id="btnExportSvg"></button>
    <button id="btnDelete"></button>
    <div class="map-toolbar"><button class="tool" data-tool="Ž"></button></div>
  `;
  const show = jest.fn();
  window.showWoundDetails = show;
  initBodyMap(()=>{});
  load({tool:'Ž', marks:[{id:1,x:1,y:2,type:'Ž',side:'front'},{id:2,x:3,y:4,type:'S',side:'front'}]});
  const marksGroup=document.getElementById('marks');
  const [m1] = marksGroup.querySelectorAll('use');
  m1.dispatchEvent(new Event('click',{bubbles:true}));
  expect(m1.classList.contains('selected')).toBe(true);
  expect(show).toHaveBeenCalledWith('1');
  document.getElementById('btnDelete').click();
  expect(marksGroup.querySelectorAll('use').length).toBe(1);
});

test('undo removes selected mark first', () => {
  document.body.innerHTML = `
    <svg id="bodySvg"><g id="layer-front"></g><g id="layer-back"></g><g id="marks"></g></svg>
    <button id="btnUndo"></button>
    <button id="btnClearMap"></button>
    <button id="btnExportSvg"></button>
    <button id="btnDelete"></button>
    <div class="map-toolbar"><button class="tool" data-tool="Ž"></button></div>
  `;
  initBodyMap(()=>{});
  load({tool:'Ž', marks:[{id:1,x:0,y:0,type:'Ž',side:'front'},{id:2,x:1,y:1,type:'Ž',side:'front'}]});
  const marksGroup=document.getElementById('marks');
  const [m1] = marksGroup.querySelectorAll('use');
  m1.dispatchEvent(new Event('click',{bubbles:true}));
  document.getElementById('btnUndo').click();
  expect(marksGroup.querySelectorAll('use').length).toBe(1);
  expect(marksGroup.querySelector('use').dataset.id).toBe('2');
  document.getElementById('btnUndo').click();
  expect(marksGroup.querySelectorAll('use').length).toBe(0);
});

test('zoneCounts groups marks and burns by zone', () => {
  document.body.innerHTML = `
    <svg id="bodySvg">
      <g id="layer-front">
        <g id="zones-front">
          <polygon class="zone" data-zone="head-front" data-area="5"></polygon>
        </g>
      </g>
      <g id="layer-back"></g>
      <g id="marks"></g>
    </svg>
    <div id="burnTotal"></div>
    <div class="map-toolbar"><button class="tool" data-tool="Ž"></button></div>
    <button id="btnUndo"></button>
    <button id="btnClearMap"></button>
    <button id="btnExportSvg"></button>
  `;
  initBodyMap(()=>{});
  load({tool:'Ž', marks:[{x:1,y:1,type:'Ž',side:'front',zone:'head-front'},{x:2,y:2,type:'S',side:'front',zone:'head-front'}], burns:[{zone:'head-front', side:'front'}]});
  const z=zoneCounts();
  expect(z['head-front']['Ž']).toBe(1);
  expect(z['head-front']['S']).toBe(1);
  expect(z['head-front'].burned).toBe(5);
});

test('restores burn zones and counts area', () => {
  document.body.innerHTML = `
    <svg id="bodySvg">
      <g id="layer-front">
        <g id="zones-front">
          <polygon class="zone" data-zone="head-front" data-area="4.5"></polygon>
        </g>
      </g>
      <g id="layer-back"></g>
      <g id="marks"></g>
    </svg>
    <div id="burnTotal"></div>
    <div class="map-toolbar"><button class="tool" data-tool="Ž"></button></div>
    <button id="btnUndo"></button>
    <button id="btnClearMap"></button>
    <button id="btnExportSvg"></button>
  `;
  initBodyMap(()=>{});
  load({tool:'N', marks:[], burns:[{zone:'head-front', side:'front'}]});
  expect(counts().burned).toBe(4.5);
  expect(document.getElementById('burnTotal').textContent).toBe('Nudegimai: 4.5%');
  const s=JSON.parse(serialize());
  expect(s.burns[0].zone).toBe('head-front');
});

test('ignores invalid burn areas when displaying total', () => {
  document.body.innerHTML = `
    <svg id="bodySvg">
      <g id="layer-front">
        <g id="zones-front">
          <polygon class="zone" data-zone="head-front" data-area="abc"></polygon>
        </g>
      </g>
      <g id="layer-back"></g>
      <g id="marks"></g>
    </svg>
    <div id="burnTotal"></div>
    <div class="map-toolbar"><button class="tool" data-tool="Ž"></button></div>
    <button id="btnUndo"></button>
    <button id="btnClearMap"></button>
    <button id="btnExportSvg"></button>
  `;
  initBodyMap(()=>{});
  load({tool:'N', marks:[], burns:[{zone:'head-front', side:'front'}]});
  expect(counts().burned).toBe(0);
  expect(document.getElementById('burnTotal').textContent).toBe('');
});
