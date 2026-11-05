'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('device overview only exposes counters and status; full notices live in app settings', () => {
  const driver = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'drivers', 'location', 'driver.compose.json')));
  for (let i = 1; i <= 5; i += 1) assert.equal(driver.capabilities.includes(`notice_recent_${i}`), false);
  for (const name of ['notice_count_new','notice_count_today','notice_count_week','notice_status']) assert.ok(driver.capabilities.includes(name));
  for (const id of ['notice_last_title','notice_last_category','notice_last_authority','notice_last_date']) {
    assert.equal(driver.capabilities.includes(id), false);
  }
});

test('new notice Flow keeps full publication detail tokens', () => {
  const flow = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'drivers', 'location', 'driver.flow.compose.json')));
  const trigger = flow.triggers.find(item => item.id === 'new_notice');
  assert.ok(trigger);
  const names = trigger.tokens.map(token => token.name);
  for (const name of ['title','category','authority','publication_date','location','url','identifier']) {
    assert.ok(names.includes(name), `missing Flow token ${name}`);
  }
});
