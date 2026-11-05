'use strict';
const Homey = require('homey');

class BekendmakingenNLApp extends Homey.App {
  async onInit() {
    this.log('Bekendmakingen NL v1.0.0 initialized');
  }
}

module.exports = BekendmakingenNLApp;
