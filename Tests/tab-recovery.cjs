const assert=require('assert'),fs=require('fs'),vm=require('vm');
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn)},emit(...args){for(const fn of this.listeners)fn(...args)}});
let store={reconnectEnabled:true,marketplaceTabId:17},writes=[],port,tabs=[{id:42,url:'https://www.facebook.com/marketplace/toronto/',windowId:2,active:true}],messages=event(),removed=event();
const chrome={
 storage:{local:{get:async keys=>Object.fromEntries(keys.map(k=>[k,store[k]])),set:async value=>{Object.assign(store,value);writes.push(value)}},onChanged:event()},
 action:{setBadgeText:async()=>{}},alarms:{create(){},clear(){},onAlarm:event()},
 tabs:{get:async id=>{const t=tabs.find(x=>x.id===id);if(!t)throw Error('missing');return t},query:async()=>tabs,onRemoved:removed,update:async()=>{}},
 windows:{get:async()=>({tabs}),create:async()=>({tabs}),update:async()=>{}},
 scripting:{executeScript:async()=>[{result:{url:tabs[0]?.url,usable:true}}]},
 runtime:{getManifest:()=>({version:'0.2.21'}),connectNative(){return port={onMessage:event(),onDisconnect:event(),postMessage(){},disconnect(){}}},onMessage:messages,onStartup:event(),onInstalled:event(),id:'test',getURL:x=>'extension/'+x}
};
const context=vm.createContext({chrome,URL,setTimeout:()=>1,clearTimeout(){},console,Date,Promise,Set});
vm.runInContext(fs.readFileSync('Extension/background.js','utf8'),context);
const tick=()=>new Promise(setImmediate);
(async()=>{
 await tick();port.onMessage.emit({event:'ready'});await tick();
 const handler=messages.listeners[0];
 const ask=()=>new Promise(resolve=>handler({action:'status'},{id:'test',url:'extension/popup.html'},resolve));
 let status=await ask();
 assert.deepEqual(status,{connected:true,tabConnected:true});
 assert.equal(store.marketplaceTabId,42,'stale tab is replaced with an open Marketplace tab');
 removed.emit(42);await tick();
 assert.equal(store.marketplaceTabId,null,'closed target is cleared durably');
 tabs=[];status=await ask();
 assert.deepEqual(status,{connected:true,tabConnected:false});
 console.log('PASS stale and closed Marketplace tabs recover automatically without another Connect click');
})().catch(e=>{console.error(e);process.exitCode=1});
