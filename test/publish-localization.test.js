'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(base,p), 'utf8'));
test('User-facing settings and location verification are localized in both languages', () => {
  const settings=read('drivers/location/driver.settings.compose.json');
  const manifest=read('app.json');
  assert.deepEqual(manifest.drivers.find(d=>d.id==='location').settings,settings);
  const display=settings.find(s=>s.id==='view_full_notices');
  for(const lang of ['nl','en']) {
    const locale=read(`locales/${lang}.json`);
    assert.ok(display.hint[lang]);
    for(const key of ['exact','place','text','municipality','possible','unconfirmed']) assert.ok(locale.location_match[key]);
    for(const key of ['invalid_area_mode','area_boundary_missing','ambiguous_area','unknown_monitor']) assert.ok(locale.errors[key]);
  }
});
