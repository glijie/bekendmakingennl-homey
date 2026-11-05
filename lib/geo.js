'use strict';
// PDOK Locatieserver geometrie_ll is WKT in lon/lat (ETRS89/WGS84 compatible for NL).
// Only coordinates in sane ranges are accepted; never silently convert RD coordinates.
function parsePoint(value) {
 const m=String(value||'').match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
 if(!m) return null;
 const lon=Number(m[1]),lat=Number(m[2]);
 return Number.isFinite(lon)&&Number.isFinite(lat)&&lon>=-180&&lon<=180&&lat>=-90&&lat<=90?{lat,lon}:null;
}
function parseWktArea(value) {
 const str=String(value||'').trim();
 const match=str.match(/^(MULTIPOLYGON|POLYGON)\s*(\([\s\S]*\))$/i);
 if(!match||str.length>1250000) throw new Error('PDOK leverde geen bruikbare gebiedsgrens');
 const tokens=match[2].match(/\(|\)|,|[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g)||[];
 let i=0, points=0;
 const parseNested=()=>{
  if(tokens[i++]!=='(') throw new Error('Ongeldige PDOK-geometrie');
  const res=[];
  while(i<tokens.length){
   if(tokens[i]===')'){i++;return res}
   if(tokens[i]===','){i++;continue}
   if(tokens[i]==='('){res.push(parseNested());continue}
   const lon=Number(tokens[i++]);const lat=Number(tokens[i++]);
   if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon<-180||lon>180||lat<-90||lat>90) throw new Error('Ongeldige coördinaten in PDOK-grens');
   res.push([lon,lat]);points++;if(points>60000) throw new Error('PDOK-grens is te complex');
  }
  throw new Error('Onvolledige PDOK-grens');
 };
 const shape=parseNested();
 if(i!==tokens.length||points<4) throw new Error('Lege of ongeldige PDOK-grens');
 const polygons=match[1].toUpperCase()==='POLYGON'?[shape]:shape;
 const rings=polygons.flat();
 if(!polygons.length||rings.some(r=>!Array.isArray(r)||r.length<4)) throw new Error('Geen geldige PDOK-polygonen');
 const flat=rings.flat();
 let minLon=Infinity,maxLon=-Infinity,minLat=Infinity,maxLat=-Infinity;
 for(const pt of flat){minLon=Math.min(minLon,pt[0]);maxLon=Math.max(maxLon,pt[0]);minLat=Math.min(minLat,pt[1]);maxLat=Math.max(maxLat,pt[1]);}
 const bounds={minLon,maxLon,minLat,maxLat};
 return {polygons,bounds};
}
function inRing(point, ring) {
 let inside=false;
 const x=point.lon, y=point.lat;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  const cross=(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
  if(Math.abs(cross)<1e-11&&x>=Math.min(a[0],b[0])-1e-10&&x<=Math.max(a[0],b[0])+1e-10&&y>=Math.min(a[1],b[1])-1e-10&&y<=Math.max(a[1],b[1])+1e-10)return true;
  if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])) inside=!inside;
 }
 return inside;
}
function inArea(point,area) {
 if(!point||!area?.polygons) return false;
 const b=area.bounds;
 if(b&&(point.lon<b.minLon||point.lon>b.maxLon||point.lat<b.minLat||point.lat>b.maxLat))return false;
 return area.polygons.some(poly=>poly.length&&inRing(point,poly[0])&&!poly.slice(1).some(hole=>inRing(point,hole)));
}
function exactWordMatch(text,word) {
 const needle=String(word||'').toLocaleLowerCase('nl').trim();
 if(needle.length<2)return false;
 const hay=String(text||'').toLocaleLowerCase('nl');
 const boundary=c=>!c||!/[\p{L}\p{N}]/u.test(c);
 let at=0;
 while((at=hay.indexOf(needle,at))>=0){
  if(boundary(hay[at-1])&&boundary(hay[at+needle.length]))return true;
  at+=needle.length;
 }
 return false;
}
function classifyAreaMatch(record, area) {
 if(!record || !area) return {include:false,quality:'none'};
 // Geometry is conclusive only when a usable point is actually supplied.
 if(record.geoPoint) {
  const inside=inArea(record.geoPoint,area);
  return {include:inside,quality:inside?'exact':'none'};
 }
 const name=area.name||'';
 const sourceKinds=record.sourceKinds||[];
 const spatial=[record.location,record.spatialText,record.municipality].filter(Boolean);
 if(spatial.some(s=>exactWordMatch(s,name))) return {include:true,quality:'place'};
 if(exactWordMatch(record.title,name)) return {include:true,quality:'text'};
 // A municipality publisher can issue plans/regulations that cover the whole
 // municipality without any single geographic point.
 if(area.type==='gemeente' && exactWordMatch(record.creator,name)) {
  return {include:true,quality:'municipality'};
 }
 // KOOP itself matched this publication geographically (point or derived area)
 // inside the PDOK bounding rectangle. No point geometry in the metadata means
 // the exact municipality/district polygon could not be verified locally.
 // Preserve as a POSSIBLE match instead of silently dropping the notice.
 if(sourceKinds.includes('geo')) return {include:true,quality:'possible'};
 // KOOP's full-text index may match metadata that is not exported in GZD.
 // This is an explicitly uncertain result, never asserted to be within area.
 if(sourceKinds.includes('name')) return {include:true,quality:'possible'};
 return {include:false,quality:'none'};
}
function belongsToArea(record,area) {return classifyAreaMatch(record,area).include;}
module.exports={parsePoint,parseWktArea,inArea,belongsToArea,classifyAreaMatch,exactWordMatch};
