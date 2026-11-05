'use strict';
// KOOP SRU 2.0 official publications. No category restriction: all publications.
const { get } = require('./http');
const { recordBlocks, firstTagValue, allTagValues, numberOfRecords } = require('./xml');
const { primaryCategory, flags } = require('./classify');
const BASE = 'https://repository.overheid.nl/sru';
const PAGE_SIZE = 250;
const MAX_PAGES_PER_QUERY = 4; // transparently report incomplete results

function isoDateDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}
function quoteCql(value) {
  const text = String(value || '').trim().replace(/[\x00-\x1f\x7f]/g, ' ');
  if (!text || text.length > 120 || /["\\]/.test(text)) throw new Error('Ongeldige gebiedsnaam in zoekopdracht');
  return `"${text}"`;
}
function areaBox(areaBounds) {
  const b = areaBounds;
  if (![b.maxLat, b.minLat, b.minLon, b.maxLon].every(Number.isFinite)) throw new Error('Ongeldige geografische grenzen');
  return `within/nwse.etrs89 "${Number(b.maxLat).toFixed(7)} ${Number(b.minLon).toFixed(7)} ${Number(b.minLat).toFixed(7)} ${Number(b.maxLon).toFixed(7)}"`;
}
function locationExpression({lat,lon,radiusM,areaBounds}) {
  const geo = areaBounds ? areaBox(areaBounds) : (() => {
    if (![Number(lat), Number(lon), Number(radiusM)].every(Number.isFinite)) throw new Error('Ongeldige adrescoördinaten');
    return `within/etrs89 "${Number(lat).toFixed(7)} ${Number(lon).toFixed(7)} ${(Number(radiusM)/1000).toFixed(3)}"`;
  })();
  // The official KOOP geobrowse query considers both points and derived areas.
  return `(w.locatiepunt ${geo} OR cd.afgeleideLocatiegebied ${geo})`;
}
function buildQuery(opts = {}) {
  const days = Math.min(30, Math.max(1, Number(opts.days) || 7));
  const base = `(c.product-area=="officielepublicaties" AND dt.modified>=${isoDateDaysAgo(days)})`;
  let terms;
  switch (opts.kind || 'geo') {
    case 'geo': terms = locationExpression(opts); break;
    case 'name': {
      const name = quoteCql(opts.areaName);
      terms = `(dt.spatial=${name} OR dt.title=${name} OR cql.textAndIndexes=${name})`;
      break;
    }
    case 'municipality': terms = `dt.creator=${quoteCql(opts.municipalityName)}`; break;
    default: throw new Error('Onbekende KOOP zoekmethode');
  }
  return `${base} AND ${terms} sortBy dt.modified /sort.descending`;
}
function bboxQueries(bounds) {
  if(!bounds)return [null];
  const minLat=Number(bounds.minLat),maxLat=Number(bounds.maxLat);
  const minLon=Number(bounds.minLon),maxLon=Number(bounds.maxLon);
  if (![minLat,maxLat,minLon,maxLon].every(Number.isFinite) || minLat>=maxLat || minLon>=maxLon) {
    throw new Error('Ongeldige geografische gebiedsgrenzen');
  }
  // KOOP documents an area limit of ~350 km² for geographic polygon queries.
  // Tiling avoids losing large Dutch municipalities to that limit.
  const latKm=(maxLat-minLat)*111.32;
  const lonKm=(maxLon-minLon)*111.32*Math.cos(minLat*Math.PI/180);
  let nLat=1,nLon=1;
  while(latKm*lonKm/(nLat*nLon)>230 && nLat*nLon<24) {
    if(latKm/nLat >= lonKm/nLon) nLat++; else nLon++;
  }
  if(latKm*lonKm/(nLat*nLon)>230) throw new Error('Gebied te groot voor veilige KOOP-kaartzoekopdracht');
  const result=[];
  for(let y=0;y<nLat;y++)for(let x=0;x<nLon;x++) {
    result.push({
      minLat:minLat+(maxLat-minLat)*y/nLat,
      maxLat:minLat+(maxLat-minLat)*(y+1)/nLat,
      minLon:minLon+(maxLon-minLon)*x/nLon,
      maxLon:minLon+(maxLon-minLon)*(x+1)/nLon,
    });
  }
  return result;
}
function buildQueries(opts = {}) {
  const queries=bboxQueries(opts.areaBounds).map((bounds,index)=>({
    kind:'geo',name:bounds?`geo_${index+1}`:'geo',
    query:buildQuery({...opts,areaBounds:bounds||opts.areaBounds,kind:'geo'}),
  }));
  if (opts.areaBounds && opts.areaName && String(opts.areaName).trim().length >= 3) {
    queries.push({kind:'name',name:'name',query:buildQuery({...opts,kind:'name'})});
  }
  // Publisher-wide notices make sense only for a WHOLE municipality monitor.
  if (opts.areaBounds && opts.areaType === 'gemeente' && opts.municipalityName) {
    queries.push({kind:'municipality',name:'municipality',query:buildQuery({...opts,kind:'municipality'})});
  }
  return queries;
}
function officialUrl(identifier) {
  const id=String(identifier||'').trim();
  const simple=id.match(/(?:^|\/)([a-z]+-\d{4}-\d+)(?:$|[./])/i);
  if(simple) return `https://zoek.officielebekendmakingen.nl/${simple[1]}.html`;
  if(/^https?:\/\//i.test(id)) return id;
  return 'https://zoek.officielebekendmakingen.nl/';
}
function parseRecord(block) {
  const identifier=firstTagValue(block,['identifier','recordIdentifier']);
  const title=firstTagValue(block,['title']) || identifier || 'Officiële bekendmaking';
  const modified=firstTagValue(block,['modified','issued','date']);
  const creator=firstTagValue(block,['creator','authority','publisher']);
  const type=firstTagValue(block,['type']);
  const subjects=allTagValues(block,'subject').filter(Boolean);
  const spatials=allTagValues(block,'spatial').filter(Boolean);
  const description=firstTagValue(block,['abstract','description']);
  const preferredUrl=firstTagValue(block,['preferredUrl']);
  const record={identifier,title,modified,creator,type,subject:subjects.join(' · '),location:spatials[0]||'',spatialText:spatials.join(' · '),municipality:firstTagValue(block,['gemeentenaam']),description};
  const {parsePoint}=require('./geo');
  record.geoPoint=parsePoint(firstTagValue(block,['locatiepunt']));
  record.category=primaryCategory(record);
  record.flags=flags(record);
  record.url=/^https?:\/\//i.test(preferredUrl) ? preferredUrl : officialUrl(identifier);
  return record;
}
function diagnose(body) {
  // SRU errors can return HTTP 200 with <diagnostics> instead of results.
  if (/<(?:\w+:)?diagnostics\b/i.test(body) || /<(?:\w+:)?diagnostic\b/i.test(body)) {
    const reason=firstTagValue(body,['message','details']) || 'KOOP heeft de zoekopdracht geweigerd';
    throw new Error(`KOOP zoekfout: ${reason.slice(0,180)}`);
  }
  if (!/<(?:\w+:)?searchRetrieveResponse\b/i.test(body)) throw new Error('KOOP leverde geen geldig SRU-antwoord');
}
async function fetchQuery(query, getFn=get, {maxPages=MAX_PAGES_PER_QUERY} = {}) {
  const records=[]; let total=0; let incomplete=false;
  for(let page=0; page<maxPages; page++) {
    const startRecord=page*PAGE_SIZE+1;
    const params=new URLSearchParams({version:'2.0',operation:'searchRetrieve',query,startRecord:String(startRecord),maximumRecords:String(PAGE_SIZE),recordSchema:'gzd'});
    const {body}=await getFn(`${BASE}?${params.toString()}`,{headers:{Accept:'application/xml'}});
    diagnose(body);
    total=numberOfRecords(body);
    const batch=recordBlocks(body).map(parseRecord).filter(r=>r.identifier||r.title);
    records.push(...batch);
    if (!batch.length && total > records.length) {incomplete=true;break;}
    if (records.length>=total) break;
    if (batch.length<PAGE_SIZE) {incomplete=total>records.length;break;}
  }
  if (total>records.length) incomplete=true;
  return {total,records,incomplete};
}
async function fetchNotices(opts, {request=get,maxPages} = {}) {
  const searches=buildQueries(opts);
  const combined=new Map(); const sourceTotals={}; let limited=false;
  for(const {kind,name,query} of searches) {
    const result=await fetchQuery(query,request,{maxPages:maxPages||MAX_PAGES_PER_QUERY});
    sourceTotals[name]={reported:result.total,received:result.records.length};
    limited=limited||result.incomplete;
    for(const record of result.records) {
      const key=record.identifier || record.url;
      if(combined.has(key)) {
        const existing=combined.get(key);
        if(!existing.sourceKinds.includes(kind)) existing.sourceKinds.push(kind);
      }else {
        record.sourceKinds=[kind];
        combined.set(key,record);
      }
    }
  }
  const records=[...combined.values()].sort((a,b)=>String(b.modified||'').localeCompare(String(a.modified||'')) || a.identifier.localeCompare(b.identifier));
  return {total:records.length,records,limited,sourceTotals,queries:searches.map(s=>({kind:s.kind,query:s.query}))};
}
module.exports={buildQuery,buildQueries,bboxQueries,fetchNotices,fetchQuery,parseRecord,officialUrl,diagnose,PAGE_SIZE};
