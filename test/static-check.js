'use strict';
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
function json(rel){return JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));}
const a=json('.homeycompose/app.json');
if(a.sdk!==3) throw new Error('SDK must be 3');
if(!a.brandColor) throw new Error('brandColor required');
if(a.version!=='1.0.0') throw new Error('version mismatch');
const d=json('drivers/location/driver.compose.json');
for(const p of ['assets/icon.svg','assets/images/small.png','assets/images/large.png','drivers/location/assets/icon.svg','drivers/location/assets/images/small.png','drivers/location/assets/images/large.png','drivers/location/pair/address.html']) if(!fs.existsSync(path.join(root,p))) throw new Error(`Missing ${p}`);
for(const c of d.capabilities) if(!fs.existsSync(path.join(root,'.homeycompose/capabilities',`${c}.json`))) throw new Error(`Missing capability ${c}`);
for(const p of ['new.svg','today.svg','week.svg','status.svg','last.svg','category.svg','authority.svg','date.svg','recent.svg']) if(!fs.existsSync(path.join(root,'assets','capabilities',p))) throw new Error(`Missing icon ${p}`);
const flow=json('drivers/location/driver.flow.compose.json');
if(!flow.triggers.some(x=>x.id==='new_notice')) throw new Error('Missing general trigger');
for(let i=1;i<=5;i++) if(d.capabilities.includes(`notice_recent_${i}`)) throw new Error(`Old recent tile still visible ${i}`);
if (!fs.existsSync(path.join(root,'settings/index.html'))) throw new Error('Missing settings overview');
const manifest = json('app.json');
for (const endpoint of ['getMonitors','getRecentNotices']) {
  if (!a.api?.[endpoint] || !manifest.api?.[endpoint]) throw new Error(`Missing overview API endpoint: ${endpoint}`);
}
if (!fs.existsSync(path.join(root,'api.js'))) throw new Error('Missing read-only API handler');
console.log('Static project checks passed');

const compose = json('.homeycompose/app.json');
const changelog = JSON.parse(fs.readFileSync(path.join(root, '.homeychangelog.json'), 'utf8'));
if (!changelog[compose.version]) throw new Error('Homey Store changelog missing for current version');
if (!fs.existsSync(path.join(root, 'CHANGELOG.md'))) throw new Error('CHANGELOG.md missing');
if (!fs.existsSync(path.join(root, 'PRIVACY.md'))) throw new Error('PRIVACY.md missing');
if (compose.description.nl.startsWith('Bekendmakingen NL')) throw new Error('NL description should not repeat app name');
if (compose.description.en.startsWith('Bekendmakingen NL')) throw new Error('EN description should not repeat app name');
console.log('Publish metadata checks passed');


const triggerIds = flow.triggers.map(x => x.id);
const expectedTriggers = ['new_notice','new_permit','new_traffic','new_tree','new_event','new_plan'];
if (triggerIds.length !== expectedTriggers.length || expectedTriggers.some(id => !triggerIds.includes(id))) {
  throw new Error(`Unexpected trigger set: ${triggerIds.join(', ')}`);
}
const single = flow.triggers.find(x => x.id === 'new_notice');
for (const forbidden of ['measure_notices_new','measure_notices_today','measure_notices_week']) {
  if (d.capabilities.includes(forbidden)) throw new Error(`Generic Flow-card capability still attached: ${forbidden}`);
}
for (const required of ['notice_count_new','notice_count_today','notice_count_week']) {
  if (!d.capabilities.includes(required)) throw new Error(`Missing display counter: ${required}`);
}
console.log('Flow trigger cleanup checks passed');

if ((flow.triggers || []).some(card => card.id === 'new_notice_batch')) throw new Error('Summary trigger should be removed');

// Geographic search modes are defined in Compose and the generated manifest.
const ds=json('drivers/location/driver.settings.compose.json');
const generated=json('app.json').drivers.find(x=>x.id==='location');
if(JSON.stringify(ds)!==JSON.stringify(generated.settings))throw new Error('Generated driver settings differ from Compose');
for(const id of ['search_mode','area_query','address','radius_m'])if(!ds.some(x=>x.id===id))throw new Error(`Missing area setting ${id}`);
for(const rel of ['lib/geo.js','lib/areas.js'])if(!fs.existsSync(path.join(root,rel)))throw new Error(`Missing geographic module ${rel}`);
if(!fs.readFileSync(path.join(root,'drivers/location/pair/address.html'),'utf8').includes('validate_area'))throw new Error('Pairing lacks area selection');
console.log('Area search manifest checks passed');
