'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root=path.resolve(__dirname,'..');
const pairHtml=fs.readFileSync(path.join(root,'drivers/location/pair/address.html'),'utf8');
const translations={nl:require('../locales/nl.json'),en:require('../locales/en.json')};

class Element {
  constructor(id){this.id=id;this.value='';this.hidden=false;this.disabled=false;this.textContent='';this.listeners={};this.items=[];this.placeholder=''}
  addEventListener(key,cb){this.listeners[key]=cb}
  replaceChildren(){this.items=[]}
  append(el){this.items.push(el);if(!this.value)this.value=el.value}
}
function initialize(locale){
  const script=[...pairHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(script.length,1);
  const elements={};const calls=[];
  const document={getElementById(id){return elements[id]||(elements[id]=new Element(id))},createElement(tag){return new Element(tag)}};
  const dict=translations[locale];
  const Homey={
    __(key){return key.split('.').reduce((current,piece)=>current?.[piece],dict)||key},
    setTitle(title){calls.push(['title',title])},
    emit:async(name)=>name==='search_areas'?[{id:'1',label:'Rozenburg (Rotterdam)',type:'woonplaats'}]:{name:'Rozenburg',data:{id:'2'}},
    createDevice:async()=>{},done:()=>{},alert:async()=>{}
  };
  const context={Homey,document,console,Array,Number,Error,Object,RegExp};
  vm.createContext(context);vm.runInContext(script[0][1],context);
  return {elements,calls};
}

test('all Homey pairing translation keys exist in NL and EN',()=>{
  const keys=[...new Set([...Object.keys(translations.nl.pair),...Object.keys(translations.en.pair)])];
  assert.ok(keys.length>10);
  for(const key of keys){
    assert.equal(typeof translations.nl.pair[key],'string',`NL ${key}`);
    assert.equal(typeof translations.en.pair[key],'string',`EN ${key}`);
    assert.ok(translations.nl.pair[key].length>0);
    assert.ok(translations.en.pair[key].length>0);
  }
});

test('pairing view displays English titles, descriptions and live messages',async()=>{
  const {elements}=initialize('en');
  assert.equal(elements.legend.textContent,'Monitor a location or address');
  assert.equal(elements['mode-label'].textContent,'Search method');
  assert.equal(elements['radius-label'].textContent,'Radius in metres');
  assert.equal(elements.add.textContent,'Add to Homey');
  elements.mode.value='woonplaats';elements.mode.listeners.change();
  assert.equal(elements['address-fields'].hidden,true);
  elements['area-query'].value='Rozenburg';
  await elements.find.listeners.click();
  assert.match(elements.result.textContent,/1 possible area/);
  elements['area-query'].value='X';
  await elements.find.listeners.click();
  assert.equal(elements.result.textContent,'Enter at least 2 characters.');
});

test('pairing view displays Dutch after changing language',()=>{
  const {elements}=initialize('nl');
  assert.equal(elements.legend.textContent,'Gebied of adres volgen');
  assert.equal(elements['mode-label'].textContent,'Zoekmethode');
  assert.equal(elements['radius-label'].textContent,'Afstand in meters');
  assert.equal(elements.add.textContent,'Toevoegen aan Homey');
});

test('Store metadata uses short bilingual plain text and current privacy retention',()=>{
  for(const name of ['README.txt','README.nl.txt']){
    const str=fs.readFileSync(path.join(root,name),'utf8').trim();
    assert.equal(str.split(/\n\s*\n/).length,2,`${name} should have two paragraphs`);
    assert.ok(!/^\s*#|https?:\/\//m.test(str),`${name} cannot have headings or URLs`);
  }
  const privacy=fs.readFileSync(path.join(root,'PRIVACY.md'),'utf8');
  assert.match(privacy,/maximaal 50/);
  assert.match(privacy,/up to 50/);
  const a=JSON.parse(fs.readFileSync(path.join(root,'.homeycompose/app.json'),'utf8'));
  const b=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
  for(const key of Object.keys(a))assert.deepEqual(b[key],a[key],`manifest mismatch: ${key}`);
});

test('app settings use Homey language even when browser language differs',async()=>{
  const source=fs.readFileSync(path.join(root,'settings/index.html'),'utf8');
  const scripts=[...source.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
  assert.equal(scripts.length,1);
  const elements={};
  const document={getElementById(id){return elements[id]||(elements[id]={textContent:'',value:'',hidden:false,disabled:false,addEventListener(){},replaceChildren(){},append(){},setAttribute(){}})},createElement(){return {textContent:'',value:''}}};
  const window={};
  const context={URL,Intl,Promise,Map,console,navigator:{language:'nl-NL'},document,window};
  vm.createContext(context);vm.runInContext(scripts[0],context);
  const Homey={
    __(key){return key==='settings_ui.lang'?'en':key},
    ready(){},
    get(_name,cb){cb(null,null)},
    api(_method,path,_body,cb){if(path==='/monitors')cb(null,[]);else cb(new Error('Unexpected request'))},
  };
  window.onHomeyReady(Homey);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(elements.heading.textContent,'Latest public notices');
  assert.equal(elements['address-label'].textContent,'Monitored location');
  assert.equal(elements.refresh.textContent,'Refresh overview');
});
