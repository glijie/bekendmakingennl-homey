'use strict';
function decodeXml(s='') {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function stripTags(s='') { return decodeXml(String(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g,' ').trim(); }
function allTagValues(xml, localName) {
  const esc = localName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${esc}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${esc}>`, 'gi');
  const out=[]; let m; while((m=re.exec(xml))) out.push(stripTags(m[1])); return out;
}
function firstTagValue(xml, names) {
  for (const n of names) { const a=allTagValues(xml,n); if(a.length && a[0]) return a[0]; }
  return '';
}
function recordBlocks(xml) {
  const re=/<(?:(?:[A-Za-z_][\w.-]*):)?record\b[^>]*>([\s\S]*?)<\/(?:(?:[A-Za-z_][\w.-]*):)?record>/gi;
  const out=[]; let m; while((m=re.exec(xml))) out.push(m[1]); return out;
}
function numberOfRecords(xml) {
  const v=firstTagValue(xml,['numberOfRecords']); return Number.parseInt(v,10)||0;
}
module.exports={decodeXml,stripTags,allTagValues,firstTagValue,recordBlocks,numberOfRecords};
