'use strict';
const Homey = require('homey');
const { geocodeAddress } = require('../../lib/pdok');
const {searchAreas,resolveArea,TYPES}=require('../../lib/areas');
const {classifyAreaMatch}=require('../../lib/geo');
const { fetchNotices } = require('../../lib/koop');
const { toOverviewRecords } = require('../../lib/overview');

const RECENT_COUNT = 5;

class LocationDevice extends Homey.Device {
  async onInit() {
    this._timer = null;
    this._polling = false;
    this._destroyed = false;
    await this._ensureCapabilities();
    await this._ensureCoordinates();
    await this._setInitialValues();
    this._schedule();
    this.homey.setTimeout(() => this.poll().catch(err => this.error(err)), 3000);
  }

  async _ensureCapabilities() {
    // Migrate the original measure_* counters. Homey automatically adds generic
    // threshold Flow cards to measure_* capabilities; these counters are display-only.
    const migrations = [
      ['measure_notices_new', 'notice_count_new'],
      ['measure_notices_today', 'notice_count_today'],
      ['measure_notices_week', 'notice_count_week'],
    ];

    for (const [oldId, newId] of migrations) {
      if (this.hasCapability(oldId)) {
        const oldValue = this.getCapabilityValue(oldId);
        if (!this.hasCapability(newId)) await this.addCapability(newId);
        if (oldValue !== null && oldValue !== undefined) {
          await this.setCapabilityValue(newId, oldValue).catch(() => {});
        }
        await this.removeCapability(oldId);
      }
    }

    // Full notice titles belong in the app's own settings overview. The device
    // grid retains only short counters/status; Flow tokens remain unchanged.
    const detailCapabilities = [
      'notice_last_title',
      'notice_last_category',
      'notice_last_authority',
      'notice_last_date',
    ];
    for (let index = 1; index <= RECENT_COUNT; index += 1) {
      detailCapabilities.push(`notice_recent_${index}`);
    }
    for (const id of detailCapabilities) {
      if (this.hasCapability(id)) await this.removeCapability(id);
    }

    const required = [
      'notice_count_new',
      'notice_count_today',
      'notice_count_week',
      'notice_status',
    ];

    for (const id of required) {
      if (!this.hasCapability(id)) await this.addCapability(id);
    }
  }

  async _setInitialValues() {
    const defaults = {
      notice_count_new: 0,
      notice_count_today: 0,
      notice_count_week: 0,
      notice_status: 'checking',
    };

    for (const [id, value] of Object.entries(defaults)) {
      if (this.getCapabilityValue(id) === null) await this.setCapabilityValue(id, value);
    }
  }

  async _ensureCoordinates() {
    const mode=this.getSetting('search_mode')||'address';
    if(mode!=='address') {
      if(!TYPES.includes(mode))throw new Error(this.homey.__('errors.invalid_area_mode'));
      if(this.getStoreValue('area_geometry')?.polygons)return;
      const id=this.getStoreValue('pdok_area_id');
      const area=await resolveArea(mode,id);
      await this.setStoreValue('area_geometry',area.geometry);
      await this.setStoreValue('area_name',area.name);
      await this.setStoreValue('area_municipality_name',area.municipalityName || (mode==='gemeente' ? area.name : ''));
      await this.setStoreValue('lat',area.lat);
      await this.setStoreValue('lon',area.lon);
      return;
    }
    const lat = Number(this.getStoreValue('lat'));
    const lon = Number(this.getStoreValue('lon'));
    if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) return;

    const geocoded = await geocodeAddress(this.getSetting('address'));
    await this.setStoreValue('lat', geocoded.lat);
    await this.setStoreValue('lon', geocoded.lon);
    await this.setStoreValue('pdok_id', geocoded.id);
    await this.setStoreValue('resolved_address', geocoded.displayName);
  }

  _schedule() {
    if (this._timer) this.homey.clearInterval(this._timer);
    const minutes = Math.min(1440, Math.max(5, Number(this.getSetting('check_interval_min')) || 15));
    this._timer = this.homey.setInterval(
      () => this.poll().catch(err => this.error(err)),
      minutes * 60000,
    );
  }

  _dateKey(value) {
    if (!value) return null;
    const direct = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct) return direct[1];
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  _todayNL() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Amsterdam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  _categoryLabel(id) {
    return this.homey.__(`categories.${id}`) || id;
  }

  _tokens(record) {
    return {
      title: record.title || '',
      category: this._categoryLabel(record.category || 'other'),
      category_id: record.category || 'other',
      authority: record.creator || '',
      publication_date: record.modified || '',
      // Never substitute the watched area for a publication without location.
      location: record.location || '',
      url: record.url || '',
      identifier: record.identifier || '',
      location_match: this.homey.__(`location_match.${['exact','place','text','municipality','possible'].includes(record.matchQuality) ? record.matchQuality : 'unconfirmed'}`),
    };
  }

  async poll({ manual = false } = {}) {
    if (this._polling || this._destroyed) return false;
    this._polling = true;

    try {
      await this.setCapabilityValue('notice_status', 'checking');

      const lat = Number(this.getStoreValue('lat'));
      const lon = Number(this.getStoreValue('lon'));
      const radiusM = Number(this.getSetting('radius_m')) || 1000;
      const mode=this.getSetting('search_mode')||'address';
      const areaGeometry=mode==='address'?null:this.getStoreValue('area_geometry');
      if(mode!=='address'&&!areaGeometry?.bounds)throw new Error(this.homey.__('errors.area_boundary_missing'));
      const areaName=this.getStoreValue('area_name')||this.getSetting('area_query')||'';
      const area=areaGeometry?{...areaGeometry,type:mode,name:areaName}:null;
      const result=await fetchNotices({
        lat,lon,radiusM,areaBounds:areaGeometry?.bounds,areaType:mode,
        areaName:area?.name,
        municipalityName:mode==='gemeente'?(this.getStoreValue('area_municipality_name')||areaName):'',
        days:7,
      });
      const records=area?result.records.flatMap(record=>{
        const match=classifyAreaMatch(record,area);
        if(!match.include)return [];
        return [{...record,matchQuality:match.quality}];
      }):result.records.map(record=>({...record,matchQuality:record.geoPoint?'exact':'possible'}));
      const possibleCount=records.filter(record=>record.matchQuality==='possible').length;
      const today = this._todayNL();
      const todayCount = records.filter(record => this._dateKey(record.modified) === today).length;

      const oldSeen = new Set(
        Array.isArray(this.getStoreValue('seen_ids')) ? this.getStoreValue('seen_ids') : [],
      );
      const baselineReady = this.getStoreValue('baseline_ready') === true;
      // One-time migration baseline: avoid mass historical alerts when search
      // coverage is expanded from point-only to point+area+metadata searches.
      const coverageReady=this.getStoreValue('search_coverage_revision')===2;
      const newRecords = baselineReady && coverageReady
        ? records.filter(record => record.identifier && !oldSeen.has(record.identifier))
        : [];

      const merged = [
        ...records.map(record => record.identifier).filter(Boolean),
        ...oldSeen,
      ];
      const unique = [];
      const seen = new Set();
      for (const id of merged) {
        if (!seen.has(id)) {
          seen.add(id);
          unique.push(id);
        }
        if (unique.length >= 5000) break;
      }

      await this.setStoreValue('seen_ids', unique);
      if (!baselineReady) await this.setStoreValue('baseline_ready', true);
      if (!coverageReady) await this.setStoreValue('search_coverage_revision',2);

      await this.setCapabilityValue('notice_count_new', newRecords.length);
      await this.setCapabilityValue('notice_count_today', todayCount);
      await this.setCapabilityValue('notice_count_week', records.length);
      // Only after a successful KOOP fetch, store bounded details for the
      // HTML overview (one cache per monitored Homey device/address).
      await this.setStoreValue('recent_notices', toOverviewRecords(records));
      await this.setStoreValue('last_checked_at', new Date().toISOString());
      await this.setStoreValue('last_search_limited', Boolean(result.limited));
      await this.setStoreValue('last_search_possible_count', possibleCount);
      await this.setStoreValue('last_search_source_totals', result.sourceTotals);

      await this.setCapabilityValue('notice_status', result.limited ? 'limited' : 'ok');

      if (baselineReady && coverageReady && newRecords.length > 0) {
        // First emit every individual publication so existing flows keep working.
        for (const record of newRecords.slice().reverse()) {
          const tokens = this._tokens(record);
          const state = { identifier: record.identifier || '' };
          await this.driver.triggerNotice('new_notice', this, tokens, state);
          if (record.flags?.permit) await this.driver.triggerNotice('new_permit', this, tokens, state);
          if (record.flags?.traffic) await this.driver.triggerNotice('new_traffic', this, tokens, state);
          if (record.flags?.tree) await this.driver.triggerNotice('new_tree', this, tokens, state);
          if (record.flags?.event) await this.driver.triggerNotice('new_event', this, tokens, state);
          if (record.flags?.plan) await this.driver.triggerNotice('new_plan', this, tokens, state);
        }
      }

      return {
        manual,
        total: result.total,
        returned: records.length,
        new: newRecords.length,
        limited: result.limited,
        possible: possibleCount,
      };
    } catch (err) {
      this.error('Poll failed:', err);
      await this.setCapabilityValue('notice_status', 'error').catch(() => {});
      throw err;
    } finally {
      this._polling = false;
    }
  }

  async onSettings({newSettings,changedKeys}) {
    const mode=newSettings.search_mode||'address';
    if(mode!=='address'&&!TYPES.includes(mode))throw new Error('Onbekende zoekmethode');
    const interval=Number(newSettings.check_interval_min);
    if(!Number.isFinite(interval)||interval<5||interval>1440)throw new Error(this.homey.__('errors.interval'));
    const radius=Number(newSettings.radius_m);
    if(mode==='address'&&(!Number.isFinite(radius)||radius<50||radius>50000))throw new Error(this.homey.__('errors.radius'));
    let selected=null, geocoded=null;
    const changedLocation=changedKeys.some(key=>['address','radius_m','search_mode','area_query'].includes(key));
    if(changedLocation){
      if(mode==='address') geocoded=await geocodeAddress(newSettings.address);
      else {
        const query=String(newSettings.area_query||'').trim();
        const matches=await searchAreas(mode,query);
        // Never silently choose one from multiple identically named places.
        const normalized=query.replace(/\s+(?:Z[-. ]?H|N[-. ]?H|Zuid-Holland|Noord-Holland)$/i,'').trim().toLocaleLowerCase('nl');
        const same=matches.filter(area=>area.name.toLocaleLowerCase('nl')===normalized);
        if(same.length!==1)throw new Error(this.homey.__('errors.ambiguous_area'));
        selected=await resolveArea(mode,same[0].id);
      }
    }
    if(geocoded){
      await this.setStoreValue('lat',geocoded.lat);
      await this.setStoreValue('lon',geocoded.lon);
      await this.setStoreValue('pdok_id',geocoded.id);
      await this.setStoreValue('resolved_address',geocoded.displayName);
      await this.setStoreValue('area_geometry',null);
      await this.setStoreValue('area_name',null);
      await this.setStoreValue('area_municipality_name',null);
      await this.setStoreValue('pdok_area_id',null);
    }
    if(selected){
      await this.setStoreValue('lat',selected.lat);
      await this.setStoreValue('lon',selected.lon);
      await this.setStoreValue('pdok_area_id',selected.id);
      await this.setStoreValue('area_name',selected.name);
      await this.setStoreValue('area_municipality_name',selected.municipalityName || (mode==='gemeente' ? selected.name : ''));
      await this.setStoreValue('area_geometry',selected.geometry);
      await this.setStoreValue('resolved_address',selected.label);
    }
    if(changedLocation){
      await this.setStoreValue('seen_ids',[]);
      await this.setStoreValue('baseline_ready',false);
      await this.setStoreValue('search_coverage_revision',2);
      await this.setStoreValue('recent_notices',[]);
      await this.setStoreValue('last_checked_at',null);
    }
    if(changedKeys.includes('check_interval_min'))this._schedule();
    this.homey.setTimeout(()=>this.poll().catch(err=>this.error(err)),1000);
  }

  async onDeleted() {
    this._destroyed = true;
    if (this._timer) this.homey.clearInterval(this._timer);
  }
}

module.exports = LocationDevice;
