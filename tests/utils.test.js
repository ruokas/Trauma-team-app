import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { $, $$, nowHM } from '../js/utils.js';

describe('$ and $$ selectors', () => {
  const dom = new JSDOM(`<!DOCTYPE html><div id="root">
    <p class="item">First</p>
    <p class="item">Second</p>
  </div>`);
  const { document } = dom.window;

  it('returns first matching element', () => {
    const firstP = $('p', document);
    assert.equal(firstP.textContent, 'First');
  });

  it('returns all matching elements', () => {
    const paragraphs = $$('p', document);
    assert.equal(paragraphs.length, 2);
    assert.equal(paragraphs[1].textContent, 'Second');
  });
});

describe('nowHM', () => {
  it('formats hours and minutes with leading zeros', () => {
    const RealDate = global.Date;
    global.Date = class extends RealDate {
      constructor(...args) {
        if (args.length) return new RealDate(...args);
        return new RealDate('2023-01-01T09:05:00');
      }
    };

    assert.equal(nowHM(), '09:05');

    global.Date = RealDate;
  });
});
