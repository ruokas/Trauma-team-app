import { initBodyMap, load, counts } from '../bodyMap.js';

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
