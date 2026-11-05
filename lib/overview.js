'use strict';

const MAX_RECENT = 50;

function limitedText(value, maxLen = 1000) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLen);
}

function safePublicationUrl(value) {
  const text = limitedText(value, 2048);
  try {
    const url = new URL(text);
    // No javascript:, file:, data:, credentials, or insecure plain HTTP links.
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.href;
  } catch (_error) {
    return '';
  }
}

function toOverviewRecord(record) {
  return {
    identifier: limitedText(record.identifier, 240),
    title: limitedText(record.title, 1600),
    category: limitedText(record.category || 'other', 40),
    match_quality: limitedText(record.matchQuality || 'unknown', 24),
    authority: limitedText(record.creator, 200),
    publication_date: limitedText(record.modified, 100),
    location: limitedText(record.location, 300),
    url: safePublicationUrl(record.url),
  };
}

function toOverviewRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.slice(0, MAX_RECENT).map(toOverviewRecord);
}

module.exports = { MAX_RECENT, limitedText, safePublicationUrl, toOverviewRecord, toOverviewRecords };
