const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const noop={addListener(){}},url='https://www.facebook.com/marketplace/you/selling/';
let now=0,documentState='interactive',body={},locationURL=url,currentURL=url,pendingURL,checks=0,actions=0,finishPending=false;
const chrome={runtime:{onMessage:noop,onStartup:noop,onInstalled:noop,getManifest:()=>({version:'0.2.0'})},storage:{local:{get:async()=>({}),set:async()=>{}}},action:{setBadgeText:async()=>{}},tabs:{onRemoved:noop,get:async()=>({id:1,url:currentURL,status:'loading',pendingUrl:pendingURL})},scripting:{executeScript:async a=>{checks++;assert.equal(a.injectImmediately,true);return [{result:vm.runInNewContext('('+a.func.toString()+')()',{document:{body,readyState:documentState},location:{href:locationURL}})}]}}};
const c=vm.createContext({chrome,URL,Promise,Error,Date:{now:()=>now},setTimeout:f=>{now+=200;if(finishPending){currentURL=pendingURL;locationURL=pendingURL;pendingURL=undefined;finishPending=false}f()}});vm.runInContext(fs.readFileSync(__dirname+'/../Extension/background.js','utf8'),c);
(async()=>{
await c.settled(1);assert.equal(checks,1,'usable page accepted while Chrome still reports loading');
checks=0;documentState='loading';await assert.rejects(c.settled(1),/document is not ready/);assert(checks>1);
now=0;checks=0;documentState='interactive';pendingURL=url;await assert.rejects(c.settled(1),/document is not ready/);assert.equal(checks,0,'never read the previous document during pending navigation');
now=0;pendingURL=undefined;locationURL='https://www.facebook.com/marketplace/';await assert.rejects(c.settled(1),/document is not ready/);
now=0;checks=0;currentURL='about:blank';locationURL=url;pendingURL=url;finishPending=true;await c.settled(1);assert.equal(checks,1,'a newly created tab may start blank while its allowed destination is pending');
console.log('PASS usable DOM during loading, bounded loading wait, pending navigation and wrong-document rejection; no browser reload');
})().catch(e=>{console.error(e);process.exitCode=1});
