const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const noop={addListener(){}};const calls=[];
const chrome={runtime:{onMessage:noop,onStartup:noop,onInstalled:noop},tabs:{onRemoved:noop,get:async()=>({id:1,url:'https://www.facebook.com/marketplace/',status:'complete'})},storage:{local:{get:async()=>({}),set:async()=>{}}},action:{setBadgeText:async()=>{}},scripting:{executeScript:async a=>{calls.push(a);return [{result:{acted:true}}]}}};
const c=vm.createContext({chrome,URL,Date,Promise,setTimeout});vm.runInContext(fs.readFileSync(__dirname+'/../Extension/background.js','utf8'),c);
(async()=>{await new Promise(setImmediate);
for(const u of ['https://evil.com/marketplace/','https://www.facebook.com/settings','https://www.facebook.com/marketplace-fake','http://www.facebook.com/marketplace/'])assert.equal(vm.runInContext(`allowed(${JSON.stringify(u)})`,c),false);
vm.runInContext("ready=true;tabId=1;epoch=3;observation={url:'https://www.facebook.com/marketplace/',nodes:[{id:1,label:'Send'},{id:2,label:'Password'}]}",c);
async function reject(a,pattern){await assert.rejects(vm.runInContext(`dispatch(${JSON.stringify({method:'action',args:a})})`,c),pattern)}
await reject({action:'click',id:1,epoch:2},/changed/);
await reject({action:'click',id:1,epoch:3},/Read-only action blocked/);
await reject({action:'fill',id:2,epoch:3},/yourself/);
await reject({action:'eval',epoch:3},/Unsupported/);
await reject({action:'navigate',url:'https://example.com'},/outside/);
assert.equal(calls.length,0);let release;chrome.tabs.get=()=>new Promise(r=>release=r);const pending=vm.runInContext('run(()=>({acted:true}))',c);vm.runInContext('ready=false',c);release({id:1,url:'https://www.facebook.com/marketplace/'});await assert.rejects(pending,/disconnected/);assert.equal(calls.length,0);console.log('PASS: Chrome rejects unrelated URLs, stale observations, unauthorized sends, credentials, and arbitrary execution and disconnect-during-action before page interaction.');
})();
