'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {buildQueries,fetchNotices,fetchQuery,diagnose} = require('../lib/koop');
const {parseWktArea,classifyAreaMatch,exactWordMatch} = require('../lib/geo');
const {toOverviewRecord}=require('../lib/overview');
const opts={areaBounds:{minLat:51.90,maxLat:51.98,minLon:4.1,maxLon:4.2},areaType:'woonplaats',areaName:'Rozenburg',municipalityName:'Rotterdam',days:7};
const area={...parseWktArea('POLYGON((4.1 51.9,4.2 51.9,4.2 51.98,4.1 51.98,4.1 51.9))'),name:'Rozenburg',type:'woonplaats'};
function record(id,title,loc='') {return `<srw:record><srw:recordData><gzd:originalData><dcterms:identifier>${id}</dcterms:identifier><dcterms:title>${title}</dcterms:title><dcterms:modified>2026-11-04</dcterms:modified><dcterms:spatial>${loc}</dcterms:spatial></gzd:originalData></srw:recordData></srw:record>`}
function answer(total,body) {return `<srw:searchRetrieveResponse xmlns:srw="http://www.loc.gov/zing/srw/"><srw:numberOfRecords>${total}</srw:numberOfRecords><srw:records>${body}</srw:records></srw:searchRetrieveResponse>`}

test('All categories: geospatial, derived-area and metadata queries, no permit-only filter',()=>{
  const q=buildQueries(opts);
  assert.equal(q.length,2);
  assert.match(q[0].query,/w\.locatiepunt within\/nwse\.etrs89/);
  assert.match(q[0].query,/cd\.afgeleideLocatiegebied within\/nwse\.etrs89/);
  assert.match(q[1].query,/dt\.spatial="Rozenburg"/);
  assert.match(q[1].query,/cql\.textAndIndexes="Rozenburg"/);
  assert.doesNotMatch(q.map(x=>x.query).join(' '),/dt\.type/);
  assert.equal(buildQueries({...opts,areaType:'gemeente',areaName:'Rotterdam'})[2].kind,'municipality');
  assert.equal(buildQueries({...opts,areaType:'wijk'}).length,2);
  assert.equal(buildQueries({lat:51.9,lon:4.1,radiusM:2000}).length,1);
});
test('Each SRU result is de-duplicated across different official sources',async()=>{
  const calls=[];
  const request=async url=>{
    const q=new URL(url).searchParams.get('query'); calls.push(q);
    const xml=q.includes('cd.afgeleideLocatiegebied')?answer(2,record('gmb-2026-1','Verkeersbesluit Rozenburg')+record('gmb-2026-2','Verleende vergunning Rozenburg')):answer(2,record('gmb-2026-1','Verkeersbesluit Rozenburg')+record('gmb-2026-3','Evenement in Rozenburg'));
    return {body:xml};
  };
  const r=await fetchNotices(opts,{request,maxPages:1});
  assert.equal(calls.length,2);
  assert.equal(r.records.length,3);
  assert.equal(r.total,3);
  assert.deepEqual(r.records.find(x=>x.identifier==='gmb-2026-1').sourceKinds,['geo','name']);
  assert.equal(r.limited,false);
});
test('Search results with missing point are not silently discarded but marked possible',()=>{
  assert.deepEqual(classifyAreaMatch({title:'Energieverordening',sourceKinds:['geo']},area),{include:true,quality:'possible'});
  assert.deepEqual(classifyAreaMatch({title:'Omgevingsvergunning Rozenburg',sourceKinds:['name']},area),{include:true,quality:'text'});
  assert.deepEqual(classifyAreaMatch({title:'Kappen boom',location:'Rozenburg',sourceKinds:['name']},area),{include:true,quality:'place'});
  assert.deepEqual(classifyAreaMatch({title:'Jaarstukken',sourceKinds:[]},area),{include:false,quality:'none'});
  assert.equal(classifyAreaMatch({title:'Rozenburg',geoPoint:{lat:52.2,lon:4.1},sourceKinds:['geo']},area).include,false);
  const municipal={...area,type:'gemeente',name:'Rotterdam'};
  assert.equal(classifyAreaMatch({creator:'Gemeente Rotterdam',sourceKinds:['municipality']},municipal).quality,'municipality');
  assert.equal(classifyAreaMatch({creator:'Gemeente Rotterdam',sourceKinds:['municipality']},area).include,false);
  assert.equal(exactWordMatch('Rozenburgseweg en Rozenburg','Rozenburg'),true);
});
test('Use SRU 2.0 pagination and visibly mark incomplete results',async()=>{
  const request=async url=>{
    const params=new URL(url).searchParams;
    assert.equal(params.get('version'),'2.0');
    assert.equal(params.get('maximumRecords'),'250');
    return {body:answer(1001,record('gmb-2026-1','Bekendmaking'))};
  };
  const r=await fetchQuery(buildQueries(opts)[0].query,request,{maxPages:1});
  assert.equal(r.incomplete,true);
  assert.equal(r.total,1001);
  assert.throws(()=>diagnose('<srw:diagnostics><srw:diagnostic><srw:message>Invalid search field</srw:message></srw:diagnostic></srw:diagnostics>'),/KOOP zoekfout/);
});
test('Overview preserves uncertainty label and original data',()=>{
 const r=toOverviewRecord({identifier:'gmb-2026-3',title:'Vergunning voor woningen',matchQuality:'possible',creator:'Gemeente Rotterdam',url:'https://zoek.officielebekendmakingen.nl/gmb-2026-3.html'});
 assert.equal(r.match_quality,'possible');
 assert.equal(r.title,'Vergunning voor woningen');
 assert.match(r.url,/gmb-2026-3/);
});
test('large municipalities use bounded grid queries without silently skipping areas',()=>{
  const {bboxQueries}=require('../lib/koop');
  const large={minLat:52,maxLat:52.6,minLon:5,maxLon:5.8};
  const tiles=bboxQueries(large);
  assert.ok(tiles.length>1);
  assert.equal(Math.min(...tiles.map(t=>t.minLat)),large.minLat);
  assert.equal(Math.max(...tiles.map(t=>t.maxLat)),large.maxLat);
  assert.equal(Math.min(...tiles.map(t=>t.minLon)),large.minLon);
  assert.equal(Math.max(...tiles.map(t=>t.maxLon)),large.maxLon);
  assert.equal(buildQueries({...opts,areaBounds:large}).length,tiles.length+1);
});
