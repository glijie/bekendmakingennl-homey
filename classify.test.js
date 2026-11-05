'use strict';
const test=require('node:test'); const assert=require('node:assert/strict'); const {flags,primaryCategory}=require('../lib/classify');
test('kapvergunning is both permit and tree',()=>{const r={title:'Omgevingsvergunning voor het kappen van een boom'}; assert.equal(flags(r).permit,true); assert.equal(flags(r).tree,true); assert.equal(primaryCategory(r),'tree');});
test('traffic decision',()=>{const r={title:'Verkeersbesluit parkeerverbod'}; assert.equal(flags(r).traffic,true); assert.equal(primaryCategory(r),'traffic');});
