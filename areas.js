'use strict';
const {get}=require('./http');
const {parsePoint,parseWktArea}=require('./geo');
const BASE='https://api.pdok.nl/bzk/locatieserver/search/v3_1';
const TYPES=['woonplaats','wijk','buurt','gemeente'];
function validType(type){if(!TYPES.includes(type))throw new Error('Onbekend gebiedstype');return type}
function areaName(doc) {
 const type=doc.type;
 if(type==='woonplaats')return String(doc.woonplaatsnaam||doc.weergavenaam||'').split(',')[0].trim();
 if(type==='wijk')return String(doc.wijknaam||doc.weergavenaam||'').split(',')[0].trim();
 if(type==='buurt')return String(doc.buurtnaam||doc.weergavenaam||'').split(',')[0].trim();
 return String(doc.gemeentenaam||doc.weergavenaam||'').split(',')[0].trim();
}
function normalize(doc,type){
 const center=parsePoint(doc.centroide_ll);
 const id=String(doc.id||'');
 if(!id||!center)return null;
 return {id,type,name:areaName(doc),label:String(doc.weergavenaam||areaName(doc)),municipalityName:String(doc.gemeentenaam|| (type==='gemeente'?areaName(doc):'')),lat:center.lat,lon:center.lon};
}
async function searchAreas(type,query){
 validType(type);
 const q=String(query||'').trim();
 if(q.length<2||q.length>100)throw new Error('Vul minimaal 2 tekens in voor het gebied');
 const params=new URLSearchParams({q,rows:'10',fq:`type:${type}`,fl:'id,type,weergavenaam,centroide_ll,woonplaatsnaam,wijknaam,buurtnaam,gemeentenaam'});
 const lookup=async params=>{
  const {body}=await get(`${BASE}/free?${params}`,{headers:{Accept:'application/json'}});
  return JSON.parse(body)?.response?.docs||[];
 };
 let docs=await lookup(params);
 // PDOK often indexes the official name without informal suffixes 'ZH'/'NH'.
 // Only retry the shorter name when the full search returned nothing; users
 // still explicitly select the correct result among similarly named places.
 if(!docs.length && /\s+(?:Z[-. ]?H|N[-. ]?H|Zuid-Holland|Noord-Holland)$/i.test(q)) {
  const short=q.replace(/\s+(?:Z[-. ]?H|N[-. ]?H|Zuid-Holland|Noord-Holland)$/i,'').trim();
  if(short.length>=2){params.set('q',short);docs=await lookup(params);}
 }
 return docs.map(d=>normalize(d,type)).filter(Boolean);
}
async function resolveArea(type,id){
 validType(type);
 const safeId=String(id||'').trim();
 if(!safeId||safeId.length>200)throw new Error('Geen geldig PDOK-gebied gekozen');
 const params=new URLSearchParams({id:safeId,fl:'id,type,weergavenaam,woonplaatsnaam,wijknaam,buurtnaam,gemeentenaam,centroide_ll,geometrie_ll'});
 const {body}=await get(`${BASE}/lookup?${params}`,{headers:{Accept:'application/json'}});
 const docs=JSON.parse(body)?.response?.docs||[];
 const d=docs.find(item=>String(item.id)===safeId&&item.type===type);
 if(!d)throw new Error('Het geselecteerde gebied is niet meer beschikbaar bij PDOK');
 const base=normalize(d,type);
 if(!base)throw new Error('PDOK heeft geen coördinaten voor dit gebied');
 const shape=parseWktArea(d.geometrie_ll);
 const box=shape.bounds;
 if(!Number.isFinite(box.minLat)||box.maxLat-box.minLat>3||box.maxLon-box.minLon>3)throw new Error('Gekozen gebied is te groot om betrouwbaar te bewaken');
 return {...base,geometry:shape};
}
module.exports={TYPES,searchAreas,resolveArea,areaName,normalize};
