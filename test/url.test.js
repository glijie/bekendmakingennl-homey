'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const { parseRecord }=require('../lib/koop');

test('preferred official URL is used when KOOP provides it',()=>{
  const xml=`<record><identifier>gmb-2026-123</identifier><title>Test</title><preferredUrl>https://zoek.officielebekendmakingen.nl/gmb-2026-123.html</preferredUrl></record>`;
  const r=parseRecord(xml);
  assert.equal(r.url,'https://zoek.officielebekendmakingen.nl/gmb-2026-123.html');
});
