// DOM-level tests for Compass. index.html is booted in jsdom; each test
// gets a fresh window and a fresh localStorage.
//
//   cd tests && npm install && npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SW = readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const KEY = 'compass:v1';

// Boot the page. `seed` pre-populates localStorage (values are JSON-encoded).
function boot({ seed = {} } = {}) {
  const dom = new JSDOM(HTML, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, JSON.stringify(v));
    },
  });
  const w = dom.window;
  return {
    w,
    $: s => w.document.querySelector(s),
    $$: s => [...w.document.querySelectorAll(s)],
    stored: () => { const r = w.localStorage.getItem(KEY); return r == null ? null : JSON.parse(r); },
  };
}

// The local calendar day, the same way the page computes it.
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = dayKey(new Date());
const YESTERDAY = dayKey(new Date(Date.now() - 86400000));

// Made-up content only — the real goals are typed on the phone.
const GOALS = [
  { text: 'Repaint the lighthouse lamp room', why: 'So the beam is seen from the far reef' },
  { text: 'Log every ship that passes', why: 'The harbour master trusts the book' },
];

// Tap a piece of text, type into the inline editor, press a key.
function editAndPress(t, selector, value, key = 'Enter') {
  t.$(selector).click();
  const input = t.$('input.edit');
  input.value = value;
  input.dispatchEvent(new t.w.KeyboardEvent('keydown', { key, bubbles: true }));
}
function setRule(t, ifText, thenText) {
  t.$('#if').value = ifText;
  t.$('#then').value = thenText;
  t.$('#set').click();
}

test('a fresh page shows two empty goals and the rule form', () => {
  const t = boot();
  assert.equal(t.$$('.goal').length, 2);
  assert.equal(t.$$('.text.empty').length, 2);
  assert.match(t.$('[data-edit="g0.text"]').textContent, /Quarterly goal 1/);
  assert.ok(t.$('#if') && t.$('#then') && t.$('#set'));
  assert.equal(t.$('#rule'), null);
});

test('a goal and its why are typed by tapping, and persist', () => {
  const t = boot();
  editAndPress(t, '[data-edit="g0.text"]', GOALS[0].text);
  editAndPress(t, '[data-edit="g0.why"]', GOALS[0].why);
  assert.equal(t.$('[data-edit="g0.text"]').textContent, GOALS[0].text);
  assert.equal(t.$('[data-edit="g0.why"]').textContent, GOALS[0].why);
  assert.deepEqual(t.stored().goals[0], GOALS[0]);
});

test('editing never deletes: an empty edit or Escape keeps the goal', () => {
  const t = boot({ seed: { [KEY]: { goals: GOALS, days: {} } } });
  editAndPress(t, '[data-edit="g1.text"]', '   ');
  assert.equal(t.$('[data-edit="g1.text"]').textContent, GOALS[1].text);
  editAndPress(t, '[data-edit="g1.text"]', 'something else', 'Escape');
  assert.equal(t.$('[data-edit="g1.text"]').textContent, GOALS[1].text);
});

test("setting today's rule shows it as one sentence and stores it by date", () => {
  const t = boot();
  setRule(t, 'the gulls start a fight on the gallery.', 'I finish the logbook line first');
  assert.equal(t.$('#rule').textContent,
    'If the gulls start a fight on the gallery, then I finish the logbook line first.');
  const day = t.stored().days[TODAY];
  assert.equal(day.if, 'the gulls start a fight on the gallery');
  assert.equal(day.then, 'I finish the logbook line first');
  assert.equal(t.$('#if'), null);
});

test('a rule needs both halves', () => {
  const t = boot();
  setRule(t, 'a storm rolls in', '  ');
  assert.equal(t.$('#rule'), null);
  assert.match(t.$('#status').textContent, /needs both/);
  assert.equal(t.stored(), null);
});

test("today's rule is changed by tapping a half", () => {
  const t = boot({ seed: { [KEY]: { goals: GOALS, days: { [TODAY]: { if: 'a storm rolls in', then: 'I trim the wick', at: 1 } } } } });
  editAndPress(t, '[data-edit="rule.then"]', 'I check the shutters.');
  assert.equal(t.$('#rule').textContent, 'If a storm rolls in, then I check the shutters.');
  assert.equal(t.stored().days[TODAY].then, 'I check the shutters');
});

test("yesterday's rule is kept but a new day starts blank", () => {
  const t = boot({ seed: { [KEY]: { goals: GOALS, days: { [YESTERDAY]: { if: 'old', then: 'older', at: 1 } } } } });
  assert.equal(t.$('#rule'), null);
  assert.ok(t.$('#if'));
  setRule(t, 'fog comes', 'I sound the horn');
  const days = t.stored().days;
  assert.equal(days[YESTERDAY].then, 'older');
  assert.equal(days[TODAY].then, 'I sound the horn');
});

test('typed text is escaped, never markup', () => {
  const t = boot();
  setRule(t, '<b>bold</b>', 'x');
  assert.equal(t.$('#rule b'), null);
  assert.equal(t.$('[data-edit="rule.if"]').textContent, '<b>bold</b>');
});

test('the version marker matches the service-worker cache name', () => {
  const { $ } = boot();
  const cache = SW.match(/const CACHE = '([^']+)'/)[1];
  assert.equal($('.ver').textContent, cache);
});
