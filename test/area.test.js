'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseWktArea,inArea,belongsToArea,exactWordMatch}=require('../lib/geo');
const {buildQuery}=require('../lib/koop');
const {normalize}=require('../lib/areas');
test('PDOK polygon bounds and point-in-area exclude adjacent locations',()=>{
 const shape=parseWktArea('POLYGON((4.10 51.90, 4.11 51.90, 4.11 51.91, 4.10 51.91, 4.10 51.90))');
 assert.deepEqual(shape.bounds,{minLon:4.10,maxLon:4.11,minLat:51.90,maxLat:51.91});
 assert.equal(inArea({lat:51.905,lon:4.105},shape),true);
 assert.equal(inArea({lat:51.925,lon:4.105},shape),false);
 const area={...shape,name:'Rozenburg',type:'woonplaats'};
 assert.equal(belongsToArea({geoPoint:{lat:51.905,lon:4.105},title:'Test'},area),true);
 assert.equal(belongsToArea({geoPoint:{lat:51.925,lon:4.105},title:'Rozenburg'},area),false);
 assert.equal(belongsToArea({title:'Melding in Rozenburg',location:'Rozenburg'},area),true);
 assert.equal(belongsToArea({title:'Melding Rotterdam',location:'Gemeente Rotterdam'},area),false);
});
test('PDOK hole and multipolygon remain excluded',()=>{
 const area=parseWktArea('MULTIPOLYGON(((4 51,6 51,6 53,4 53,4 51),(4.5 51.5,5.5 51.5,5.5 52.5,4.5 52.5,4.5 51.5)),((7 50,8 50,8 51,7 51,7 50)))');
 assert.equal(inArea({lon:5,lat:52},area),false);
 assert.equal(inArea({lon:4.2,lat:52},area),true);
 assert.equal(inArea({lon:7.5,lat:50.5},area),true);
 assert.equal(inArea({lon:10,lat:52},area),false);
});
test('municipality and exact name matching do not confuse Rozenburg with Rotterdam',()=>{
 assert.equal(exactWordMatch('Rozenburg', 'Rozenburg'),true);
 assert.equal(exactWordMatch('Rozenburgseweg', 'Rozenburg'),false);
 const a={...parseWktArea('POLYGON((4 51,6 51,6 53,4 53,4 51))'),name:'Rotterdam',type:'gemeente'};
 assert.equal(belongsToArea({municipality:'Rotterdam'},a),true);
 assert.equal(belongsToArea({municipality:'Westland'},a),false);
});
test('KOOP geographic bbox only when area bounds are supplied',()=>{
 const q=buildQuery({areaBounds:{minLon:4.1,maxLon:4.2,minLat:51.8,maxLat:51.9}});
 assert.match(q,/within\/nwse\.etrs89 "51\.9000000 4\.1000000 51\.8000000 4\.2000000"/);
 const old=buildQuery({lat:51.9,lon:4.1,radiusM:2000});
 assert.match(old,/within\/etrs89 "51\.9000000 4\.1000000 2\.000"/);
});
test('PDOK result name is typed and independently selectable',()=>{
 const n=normalize({id:'x',type:'woonplaats',woonplaatsnaam:'Rozenburg',weergavenaam:'Rozenburg, Rotterdam',centroide_ll:'POINT(4.13 51.90)'},'woonplaats');
 assert.equal(n.name,'Rozenburg'); assert.equal(n.lat,51.9);
});
