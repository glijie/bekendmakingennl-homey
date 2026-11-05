'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
class Element {
 constructor(id){this.id=id;this.value='';this.hidden=false;this.disabled=false;this.textContent='';this.items=[];this.listeners={};}
 addEventListener(k,cb){this.listeners[k]=cb}
 replaceChildren(){this.items=[]}
 append(e){this.items.push(e);if(!this.value)this.value=e.value}
}
function init(){
 const html=fs.readFileSync(path.resolve(__dirname,'../drivers/location/pair/address.html'),'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 const elems={};const calls=[];
 const document={getElementById(id){return elems[id]||(elems[id]=new Element(id))},createElement(tag){return new Element(tag)}};
 const Homey={setTitle(){},emit:async(name,args)=>{
  calls.push({name,args});
  if(name==='search_areas')return [{id:'pdok-1',type:'woonplaats',name:'Rozenburg',label:'Rozenburg (Rotterdam)'}];
  if(name==='validate_area')return {name:'Rozenburg',data:{id:'x'}};
  if(name==='validate_address')return {name:'Dorpsweg 1',data:{id:'y'}};
  throw new Error('unexpected '+name)
 },createDevice:async device=>{calls.push({name:'created',device})},done(){calls.push({name:'done'})},alert:async()=>{}};
 const context={Homey,document,console,Number,Array,Error};vm.createContext(context);vm.runInContext(scripts[0][1],context);
 return {elems,calls};
}
test('area pairing requires searching and explicitly selecting a PDOK area',async()=>{
 const {elems,calls}=init();
 elems.mode.value='woonplaats';elems.mode.listeners.change();
 elems['area-query'].value='Rozenburg';
 await elems.find.listeners.click();
 assert.equal(elems['results-group'].hidden,false);
 assert.equal(elems['area-results'].items[0].textContent,'Rozenburg (Rotterdam)');
 elems['area-results'].value='pdok-1';
 await elems.form.listeners.submit({preventDefault(){}});
 assert.deepEqual(calls.map(c=>c.name),['search_areas','validate_area','created','done']);
 assert.equal(calls[1].args.id,'pdok-1');
});
test('existing address pairing uses old backend handler',async()=>{
 const {elems,calls}=init();elems.mode.value='address';elems.address=new Element('address');elems.radius=new Element('radius');elems.address.value='Dorpsweg 1 Rotterdam';elems.radius.value='2000';
 await elems.form.listeners.submit({preventDefault(){}});
 assert.equal(calls[0].name,'validate_address');assert.equal(calls[0].args.radiusM,2000);
});
