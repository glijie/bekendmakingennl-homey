'use strict';
function haystack(record) {
  return [record.title, record.type, record.subject, record.description].filter(Boolean).join(' ').toLowerCase();
}
function flags(record) {
  const t=haystack(record);
  return {
    permit: /vergunning|omgevingsvergunning|ontheffing|vergunningaanvraag|vergunningverlening/.test(t),
    traffic: /verkeersbesluit|verkeersmaatregel|wegafsluit|wegwerk|parkeerverbod|verkeer/.test(t),
    tree: /kapvergunning|kappen|kapmelding|boom|bomen|houtopstand/.test(t),
    event: /evenement|festival|marktvergunning|evenementenvergunning/.test(t),
    plan: /omgevingsplan|bestemmingsplan|ruimtelijk plan|wijzigingsplan|projectbesluit/.test(t),
    regulation: /verordening|beleidsregel|regeling|algemeen verbindend voorschrift/.test(t),
  };
}
function primaryCategory(record) {
  const f=flags(record);
  if(f.tree) return 'tree';
  if(f.traffic) return 'traffic';
  if(f.event) return 'event';
  if(f.plan) return 'plan';
  if(f.permit) return 'permit';
  if(f.regulation) return 'regulation';
  return 'other';
}
module.exports={flags,primaryCategory};
