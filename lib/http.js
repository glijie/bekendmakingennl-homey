'use strict';
const https = require('https');

function get(url, { timeout = 15000, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'BekendmakingenNL/1.0 Homey',
        'Accept': '*/*',
        ...headers,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.setTimeout(timeout, () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
  });
}

module.exports = { get };
