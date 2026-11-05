'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(id, parent, isMain) {
  if (id === 'homey') return { Device: class Device {} };
  return originalLoad.apply(this, arguments);
};
const LocationDevice = require('../drivers/location/device');
Module._load = originalLoad;

test('existing installed devices remove unreadable recent tiles while preserving counters', async () => {
  const removed = [];
  const existing = new Set(['notice_count_new','notice_count_today','notice_count_week','notice_status',
    ...Array.from({length:5},(_,i)=>`notice_recent_${i+1}`)]);
  const device = new LocationDevice();
  device.hasCapability = id => existing.has(id);
  device.removeCapability = async id => {existing.delete(id);removed.push(id)};
  device.addCapability = async id => existing.add(id);
  await device._ensureCapabilities();
  assert.equal(removed.length, 5);
  assert.ok(existing.has('notice_count_new'));
  assert.ok(existing.has('notice_status'));
});
