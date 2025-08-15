import {describe, it, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {initTabs, showTab, TABS} from '../js/tabs.js';

function createMockDOM(){
  const nav = {
    id: 'tabs',
    children: [],
    appendChild(child){ this.children.push(child); }
  };
  const views = [];
  const document = {
    querySelectorAll(selector){
      if(selector === '.view') return views;
      if(selector === 'nav .tab') return nav.children.filter(ch => ch.className.includes('tab'));
      return [];
    },
    getElementById(id){ return id === 'tabs' ? nav : null; },
    createElement(tag){
      const el = {
        tagName: tag,
        className: '',
        textContent: '',
        dataset: {},
        style: {},
        children: [],
        classList: {
          toggle(cls, force){
            const classes = new Set(el.className.split(/\s+/).filter(Boolean));
            const add = force === undefined ? !classes.has(cls) : force;
            if(add) classes.add(cls); else classes.delete(cls);
            el.className = Array.from(classes).join(' ');
          }
        },
        appendChild(child){ this.children.push(child); }
      };
      return el;
    }
  };
  return {document, nav, views};
}

describe('tabs', () => {
  let views;
  beforeEach(() => {
    // mock localStorage
    const store = {};
    global.localStorage = {
      setItem(key, val){ store[key] = String(val); },
      getItem(key){ return store[key]; }
    };

    // mock DOM
    const {document, views: v} = createMockDOM();
    global.document = document;
    views = v;

    const createView = name => ({dataset: {tab: name}, style: {}});
    views.push(createView(TABS[0]));
    views.push(createView(TABS[1]));
  });

  it('shows only selected tab view and saves name to localStorage', () => {
    initTabs();
    showTab(TABS[1]);
    assert.equal(views[0].style.display, 'none');
    assert.equal(views[1].style.display, 'block');
    assert.equal(localStorage.getItem('v9_activeTab'), TABS[1]);
  });
});
