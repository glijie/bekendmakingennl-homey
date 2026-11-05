'use strict';
const { get } = require('./http');

const BASE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';

function parsePoint(value) {
  const m = String(value || '').match(/POINT\s*\(\s*([-0-9.]+)\s+([-0-9.]+)\s*\)/i);
  if (!m) throw new Error('PDOK returned no usable coordinates');
  return { lon: Number(m[1]), lat: Number(m[2]) };
}

async function geocodeAddress(address) {
  const q = String(address || '').trim();
  if (q.length < 4) throw new Error('Enter a complete address');
  const params = new URLSearchParams({ q, fq: 'type:adres', rows: '5' });
  const { body } = await get(`${BASE}?${params.toString()}`, { headers: { Accept: 'application/json' } });
  const json = JSON.parse(body);
  const docs = json?.response?.docs || [];
  if (!docs.length) throw new Error('Address not found');
  const d = docs[0];
  const p = parsePoint(d.centroide_ll);
  return {
    id: d.id,
    displayName: d.weergavenaam || q,
    lat: p.lat,
    lon: p.lon,
    street: d.straatnaam || '',
    houseNumber: d.huis_nlt || '',
    postcode: d.postcode || '',
    city: d.woonplaatsnaam || '',
    municipality: d.gemeentenaam || '',
  };
}

module.exports = { geocodeAddress, parsePoint };
