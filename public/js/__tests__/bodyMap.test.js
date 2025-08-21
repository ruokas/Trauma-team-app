import { initBodyMap, load, counts, serialize } from '../bodyMap.js';

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
    <div class="map-toolbar"><button class="tool" data-tool="Ž"></button></div>
    <button id="btnUndo"></button>
    <button id="btnClearMap"></button>
    <button id="btnExportSvg"></button>
  `;
  initBodyMap(()=>{});
  load({tool:'N', marks:[], burns:[{zone:'head-front', side:'front'}]});
  expect(counts().burned).toBe(4.5);
  const s=JSON.parse(serialize());
  expect(s.burns[0].zone).toBe('head-front');
});
