'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname,'../settings/index.html'),'utf8');
const inlineScripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
assert.equal(inlineScripts.length, 1);

class Element {
  constructor(tag='div') { this.tag=tag; this.children=[]; this.listeners={}; this.value=''; this.textContent='';this.hidden=false;this.disabled=false; }
  append(...items) {this.children.push(...items)}
  replaceChildren(...items) {this.children=items}
  addEventListener(name,callback) {this.listeners[name]=callback}
  dispatch(name) {this.listeners[name]?.({preventDefault(){}})}
  get className(){return this._className||''}
  set className(value){this._className=value}
}

function allText(element) {
  return [element.textContent,...element.children.flatMap(child=>allText(child))].filter(Boolean).join(' ');
}

async function flush() { await new Promise(resolve=>setImmediate(resolve)) }

test('settings page allows saved notice count per monitor and full official links',async()=>{
  const elements={};
  const document={
    getElementById(id){return elements[id]||(elements[id]=new Element())},
    createElement(tag){return new Element(tag)},
  };
  // Homey can run settings in an opaque-origin sandbox: accessing browser
  // storage throws SecurityError, even when checking window.sessionStorage.
  const window = {};
  Object.defineProperty(window, 'sessionStorage', {
    get() { throw new Error('SecurityError: sessionStorage is blocked by Homey sandbox'); },
  });
  const responseMonitors=[{id:'1',name:'Thuis',address:'Dorpsweg 12'},{id:'2',name:'Werk',address:'Botlek'}];
  const twentyTwo=Array.from({length:22},(_,i)=>({title:`Volledige bekendmaking ${i+1} over bouwactiviteiten in de woonomgeving`,category:'permit',authority:'Gemeente Rotterdam',publication_date:'2026-09-25',location:'Dorpsweg 12',url:`https://zoek.officielebekendmakingen.nl/gmb-2026-${i+1}.html`}));
  const savedSettings={};
  const service={
    get(name,cb){cb(null,savedSettings[name]||null)},
    set(name,value,cb){savedSettings[name]=value;cb(null)},
    api(method,p,body,cb){
      if(p==='/monitors') return cb(null,responseMonitors);
      if(p==='/monitors/1/notices') return cb(null,{address:'Dorpsweg 12',radius_m:2000,checked_at:'2026-09-25T12:00:00.000Z',notices:twentyTwo});
      if(p==='/monitors/2/notices') return cb(null,{address:'Botlek',radius_m:500,notices:[{title:'Eén melding op werklocatie',url:'https://zoek.officielebekendmakingen.nl/gmb-2026-11.html'}]});
      return cb(new Error('Unknown route'));
    },
    ready(){this.readyCalled=true},openURL(value){this.lastUrl=value},
  };
  const context={URL,Intl,Promise,Map,console,navigator:{language:'nl-NL'},window,document};
  vm.createContext(context);
  vm.runInContext(inlineScripts[0],context);
  context.window.onHomeyReady(service);
  await flush();await flush();await flush();
  assert.equal(service.readyCalled,true);
  assert.equal(elements.notices.children.length,5);
  assert.equal(elements.count.value,'5');
  assert.match(allText(elements.notices),/Volledige bekendmaking 5 over bouwactiviteiten/);
  assert.ok(!allText(elements.notices).includes('Volledige bekendmaking 6'));
  elements.count.value='12';
  elements['save-count'].dispatch('click');
  await flush();await flush();
  assert.equal(elements.notices.children.length,12);
  assert.match(allText(elements.notices),/Volledige bekendmaking 12 over bouwactiviteiten/);
  assert.equal(savedSettings.overview_visible_counts['1'],12);
  assert.match(allText(elements.notices),/Gemeente Rotterdam/);
  const link=elements.notices.children[0].children.find(el=>el.tag==='a');
  assert.match(link.href,/gmb-2026-1.html/);
  link.dispatch('click');
  assert.match(service.lastUrl,/gmb-2026-1.html/);
  elements.monitor.value='2';
  elements.monitor.dispatch('change');
  await flush();await flush();
  assert.equal(elements.count.value,'5');
  assert.equal(elements.notices.children.length,1);
  assert.match(allText(elements.notices),/Eén melding op werklocatie/);
  assert.ok(!allText(elements.notices).includes('Volledige bekendmaking 1'));
  elements.count.value='1';
  elements['save-count'].dispatch('click');
  await flush();await flush();
  assert.equal(savedSettings.overview_visible_counts['2'],1);
  elements.monitor.value='1';
  elements.monitor.dispatch('change');
  await flush();await flush();
  assert.equal(elements.count.value,'12');
  assert.equal(elements.notices.children.length,12);
  elements.count.value='51';
  elements['save-count'].dispatch('click');
  await flush();
  assert.equal(savedSettings.overview_visible_counts['1'],12);
  assert.match(elements.status.textContent,/1 en 50/);
});
