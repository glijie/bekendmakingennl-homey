'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const source = read('drivers/location/driver.flow.compose.json');
const compiled = read('app.json');
const allowed = ['new_notice','new_permit','new_traffic','new_tree','new_event','new_plan'];

test('Athom: all Flow titles are clean and do not expose raw device placeholders', () => {
  assert.deepEqual(source.triggers.map(item => item.id), allowed);
  assert.deepEqual(source.conditions.map(item => item.id), ['has_new_notices']);
  assert.deepEqual(source.actions.map(item => item.id), ['check_now']);
  for (const kind of ['triggers','conditions','actions']) {
    for (const card of source[kind]) {
      assert.ok(card.title?.nl && card.title?.en, `${card.id} missing title`);
      assert.ok(card.titleFormatted?.nl && card.titleFormatted?.en, `${card.id} missing formatted title`);
      for (const lang of ['nl','en']) {
        assert.equal(card.titleFormatted[lang], card.title[lang], `${card.id} formatted ${lang} title must be clean`);
        assert.ok(!card.title[lang].includes('[[device]]'), 'Do not expose device placeholders in public Flow titles');
      }
    }
  }
});

test('Athom: generated app.json Flow cards mirror Compose and keep the device argument', () => {
  for (const kind of ['triggers','conditions','actions']) {
    const cards = compiled.flow?.[kind];
    assert.ok(Array.isArray(cards), `Missing generated flow ${kind}`);
    assert.equal(cards.length, source[kind].length);
    for (let idx=0;idx<source[kind].length;idx++) {
      const sourceCard=source[kind][idx],built=cards[idx];
      assert.equal(built.id, sourceCard.id);
      assert.equal(built.args?.[0]?.name, 'device');
      assert.equal(built.args?.[0]?.type, 'device');
      assert.equal(built.args?.[0]?.filter, 'driver_id=location');
      assert.deepEqual(built.title,sourceCard.title);
      assert.deepEqual(built.titleFormatted,sourceCard.titleFormatted);
      assert.deepEqual(built.tokens || [],sourceCard.tokens || []);
    }
  }
});

test('Athom: version and app identity are consistent across all files', () => {
  const compose = read('.homeycompose/app.json');
  const pkg = read('package.json');
  assert.equal(compiled.id,compose.id);
  assert.equal(compiled.version,compose.version);
  assert.equal(pkg.version,compose.version);
  assert.equal(compiled.version,'1.0.0');
});
