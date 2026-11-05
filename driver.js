'use strict';
const Homey = require('homey');
const crypto = require('crypto');
const { geocodeAddress } = require('../../lib/pdok');
const { searchAreas, resolveArea, TYPES } = require('../../lib/areas');

class LocationDriver extends Homey.Driver {
  async onInit() {
    this._triggers = {};
    for (const id of ['new_notice','new_permit','new_traffic','new_tree','new_event','new_plan']) {
      this._triggers[id] = this.homey.flow.getDeviceTriggerCard(id);
    }

    this.homey.flow.getActionCard('check_now').registerRunListener(async ({ device }) => {
      await device.poll({ manual: true });
      return true;
    });

    this.homey.flow.getConditionCard('has_new_notices').registerRunListener(async ({ device }) => {
      return Number(device.getCapabilityValue('notice_count_new') || 0) > 0;
    });
  }

  async onPair(session) {
    const knownAreas = new Map();
    session.setHandler('search_areas', async ({type,query}) => {
      const results=await searchAreas(type,query);
      knownAreas.clear();
      for(const area of results) knownAreas.set(area.id,area.type);
      return results;
    });
    session.setHandler('validate_area', async ({type,id}) => {
      if (!TYPES.includes(type)||knownAreas.get(String(id))!==type) throw new Error(this.homey.__('pair.area_selection_invalid'));
      const area=await resolveArea(type,id);
      const unique=crypto.randomBytes(12).toString('hex');
      return {
        name:area.label, data:{id:unique},
        settings:{search_mode:type,area_query:area.name,address:'',radius_m:1000,check_interval_min:15},
        store:{pdok_area_id:area.id,area_geometry:area.geometry,area_name:area.name,area_municipality_name:area.municipalityName || (type==='gemeente'?area.name:''),area_type:type,lat:area.lat,lon:area.lon,baseline_ready:false,search_coverage_revision:2,seen_ids:[],recent_notices:[],resolved_address:area.label},
      };
    });
    session.setHandler('validate_address', async ({ address, radiusM }) => {
      const radius = Math.round(Number(radiusM));
      if (!Number.isFinite(radius) || radius < 50 || radius > 50000) {
        throw new Error(this.homey.__('pair.bad_radius'));
      }

      let result;
      try {
        result = await geocodeAddress(address);
      } catch (error) {
        const message = String(error?.message || '');
        const translations = {
          'Enter a complete address': 'pair.address_short',
          'Address not found': 'pair.address_not_found',
          'PDOK returned no usable coordinates': 'pair.address_coordinates',
        };
        if (translations[message]) throw new Error(this.homey.__(translations[message]));
        throw error;
      }
      const unique = crypto.createHash('sha256')
        .update(`${result.id}|${Date.now()}|${Math.random()}`)
        .digest('hex')
        .slice(0, 24);

      return {
        name: result.displayName,
        data: { id: unique },
        settings: {
          search_mode:'address',
          area_query:'',
          address: result.displayName,
          radius_m: radius,
          check_interval_min: 15,
        },
        store: {
          pdok_id: result.id,
          lat: result.lat,
          lon: result.lon,
          baseline_ready: false,
          seen_ids: [],
          resolved_address: result.displayName,
        },
      };
    });
  }

  async triggerNotice(cardId, device, tokens, state = {}) {
    const card = this._triggers?.[cardId];
    if (card) await card.trigger(device, tokens, state);
  }
}

module.exports = LocationDriver;
