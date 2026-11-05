'use strict';

const { toOverviewRecords } = require('./lib/overview');

function monitorsForHomey(homey) {
  const driver = homey.drivers.getDriver('location');
  return driver.getDevices();
}

module.exports = {
  async getMonitors({ homey }) {
    const devices = monitorsForHomey(homey);
    return devices.map(device => ({
      id: String(device.getData().id),
      name: device.getName(),
      address: device.getSetting('address') || device.getSetting('area_query') || '',
      search_mode:device.getSetting('search_mode')||'address',
      radius_m: Number(device.getSetting('radius_m')) || 1000,
    }));
  },

  async getRecentNotices({ homey, params }) {
    const id = String(params?.id || '');
    const device = monitorsForHomey(homey)
      .find(candidate => String(candidate.getData().id) === id);
    if (!device) throw new Error(typeof homey.__ === 'function' ? homey.__('errors.unknown_monitor') : 'Unknown monitored address');

    return {
      id,
      name: device.getName(),
      address: device.getSetting('address') || device.getSetting('area_query') || '',
      search_mode:device.getSetting('search_mode')||'address',
      radius_m: Number(device.getSetting('radius_m')) || 1000,
      checked_at: device.getStoreValue('last_checked_at') || null,
      limited: device.getStoreValue('last_search_limited') === true,
      possible_count: Number(device.getStoreValue('last_search_possible_count') || 0),
      notices: toOverviewRecords(device.getStoreValue('recent_notices')),
    };
  },
};
