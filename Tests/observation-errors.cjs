const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const noop={addListener(){}},url='https://www.facebook.com/messages/t/123';
let observations=0;
const page=vm.createContext({vectorObserve(){observations++;throw Error('Finish Facebook sign-in or restore your Messenger history in Chrome.')}});
const chrome={runtime:{onMessage:noop,onStartup:noop,onInstalled:noop},storage:{local:{get:async()=>({}),set:async()=>{}}},action:{setBadgeText:async()=>{}},tabs:{onRemoved:noop,get:async()=>({id:1,url})},scripting:{executeScript:async a=>{
 if(a.injectImmediately)return [{result:{usable:true,url}}];
 if(a.files)return [{documentId:'doc-1'}];
 // Match the case where an uncaught page exception would yield no result.
 try{return [{result:vm.runInContext('('+a.func.toString()+')()',page)}]}catch{return [{result:null}]}
}}};
const c=vm.createContext({chrome,URL,Date,Promise,setTimeout});
vm.runInContext(fs.readFileSync(__dirname+'/../Extension/background.js','utf8'),c);
(async()=>{await new Promise(setImmediate);vm.runInContext('ready=true;tabId=1',c);
 await assert.rejects(c.dispatch({method:'observe'}),/restore your Messenger history/);
 assert.equal(observations,1);assert.equal(vm.runInContext('observation',c),null);
 console.log('PASS injected observer errors retain their actionable cause without retrying or retaining stale controls');
})().catch(e=>{console.error(e);process.exitCode=1});
