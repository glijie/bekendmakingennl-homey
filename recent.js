'use strict';

const MAX_RECENT_LENGTH = 28;

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function trimPunctuation(value) {
  return clean(value).replace(/^[\s,;:–—\-]+|[\s,;:–—\-]+$/g, '').trim();
}

function firstLocationPart(location) {
  const value = clean(location);
  if (!value) return '';

  // KOOP spatial values can contain more information than fits a Homey mobile tile.
  // Prefer the first human-readable location part (usually street + house number).
  const parts = value
    .split(/\s*[|;]\s*|,\s*/)
    .map(trimPunctuation)
    .filter(Boolean);

  return parts[0] || value;
}

function simplifyTitle(title) {
  let value = clean(title);
  if (!value) return '';

  const prefixes = [
    /^(?:verleende?|verleend|aangevraagde?|aangevraagd|geweigerde?|geweigerd|ingetrokken)\s+omgevingsvergunning\b\s*(?:voor\b)?\s*/i,
    /^omgevingsvergunning\b\s*(?:voor\b)?\s*/i,
    /^(?:kennisgeving\s+)?melding\b\s*(?:van\b|voor\b)?\s*/i,
    /^verkeersbesluit\b\s*/i,
    /^besluit\b\s*(?:tot\b|voor\b|inzake\b)?\s*/i,
    /^(?:aanvraag|aangevraagd)\b\s*(?:voor\b)?\s*/i,
    /^(?:vergunning|bekendmaking)\b\s*(?:voor\b)?\s*/i,
  ];

  for (const prefix of prefixes) value = value.replace(prefix, '');
  value = trimPunctuation(value);

  const parts = value
    .split(/\s*[|•;]\s*|,\s*/)
    .map(trimPunctuation)
    .filter(Boolean);

  // An address-like segment is generally the most useful thing in the compact tile.
  const addressLike = parts.find(part => /[A-Za-zÀ-ÿ].*\d|\d.*[A-Za-zÀ-ÿ]/.test(part));
  if (addressLike) return addressLike;

  return parts[0] || value;
}

function compactRecent(record, categoryLabel, fallback = 'Bekendmaking', maxLength = MAX_RECENT_LENGTH) {
  if (!record) return '—';

  const category = clean(categoryLabel) || '•';
  const detail = firstLocationPart(record.location)
    || simplifyTitle(record.title)
    || clean(fallback);

  const prefix = `${category} · `;
  const budget = Math.max(4, maxLength - prefix.length);
  let shortDetail = detail;
  if (shortDetail.length > budget) shortDetail = `${shortDetail.slice(0, Math.max(1, budget - 1)).trimEnd()}…`;

  return `${prefix}${shortDetail}`.slice(0, maxLength);
}

module.exports = {
  MAX_RECENT_LENGTH,
  firstLocationPart,
  simplifyTitle,
  compactRecent,
};
