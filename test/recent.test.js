'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compactRecent, simplifyTitle, firstLocationPart } = require('../lib/recent');

test('uses street/location first for compact mobile tile', () => {
  const value = compactRecent({
    category: 'permit',
    title: 'Verleende omgevingsvergunning, Esdoornlaan 106, Rozenburg',
    location: 'Esdoornlaan 106, Rozenburg',
  }, 'Verg.');
  assert.equal(value, 'Verg. · Esdoornlaan 106');
  assert.ok(value.length <= 28);
});

test('extracts address-like part from common permit title', () => {
  assert.equal(
    simplifyTitle('Verleende omgevingsvergunning, Rubenslaan 1A, Rozenburg'),
    'Rubenslaan 1A',
  );
});

test('limits long values for narrow Homey mobile tiles', () => {
  const value = compactRecent({
    title: 'BESLUIT zeer lange omschrijving van een verkeersmaatregel in het centrum',
  }, 'Verkeer');
  assert.ok(value.length <= 28);
  assert.match(value, /^Verkeer · /);
});

test('takes first readable spatial segment', () => {
  assert.equal(firstLocationPart('Esdoornlaan 106, Rozenburg | extra'), 'Esdoornlaan 106');
});
