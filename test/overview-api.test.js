'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../api');
const { toOverviewRecords, safePublicationUrl } = require('../lib/overview');

test('overview record keeps full title, date, authority and secure publication URL', () => {
  const records = toOverviewRecords([{
    identifier: 'gmb-2026-15',
    title: 'Omgevingsvergunning voor verbouwing aan Dorpsweg 12, Rozenburg',
    category: 'permit', creator: 'Gemeente Rotterdam', modified: '2026-09-25',
    location: 'Dorpsweg 12', url: 'https://zoek.officielebekendmakingen.nl/gmb-2026-15.html',
  }]);
  assert.equal(records[0].title, 'Omgevingsvergunning voor verbouwing aan Dorpsweg 12, Rozenburg');
  assert.equal(records[0].authority, 'Gemeente Rotterdam');
  assert.match(records[0].url, /gmb-2026-15/);
  assert.equal(records[0].publication_date,'2026-09-25');
});

test('overview keeps up to fifty records, sanitizes URLs', () => {
  const input=Array.from({length:80},(_,i)=>({title:`Bericht ${i}`,url:i%2?'javascript:alert(1)':'https://zoek.officielebekendmakingen.nl/'}));
  const saved=toOverviewRecords(input);
  assert.equal(saved.length,50);
  assert.equal(saved[49].title,'Bericht 49');
  assert.equal(saved[1].url,'');
  assert.equal(safePublicationUrl('http://example.com'), '');
  assert.equal(safePublicationUrl('https://user:password@example.com/'), '');
});

function mockDevice(id, name, address, records) {
  return {
    getData:()=>({id}), getName:()=>name,
    getSetting:k=>({address,radius_m:2000})[k],
    getStoreValue:k=>({recent_notices:records,last_checked_at:'2026-09-25T12:00:00.000Z'})[k],
  };
}
const device1 = mockDevice('address1','Thuis','Esdoornlaan 106',[{title:'Verleende vergunning A',url:'https://zoek.officielebekendmakingen.nl/gmb-2026-1.html'}]);
const device2 = mockDevice('address2','Werk','Botlek',[{title:'Bekendmaking B',url:'https://zoek.officielebekendmakingen.nl/gmb-2026-2.html'}]);
const homey={drivers:{getDriver:id=>{assert.equal(id,'location');return{getDevices:()=>[device1,device2]}}}};

test('API lists all addresses but displays records only for selected address', async () => {
  const list=await api.getMonitors({homey});
  assert.deepEqual(list.map(x=>x.name), ['Thuis','Werk']);
  const data=await api.getRecentNotices({homey, params:{id:'address2'}});
  assert.equal(data.address,'Botlek');
  assert.equal(data.notices[0].title,'Bekendmaking B');
  await assert.rejects(()=>api.getRecentNotices({homey,params:{id:'nonexistent'}}),/Unknown monitored address/);
});
