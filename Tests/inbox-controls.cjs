const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {JSDOM}=require(process.env.VECTOR_JSDOM||'jsdom');
const url='https://www.facebook.com/marketplace/inbox';
const d=new JSDOM('<main><div id="row" role="button"></div><button>Confirm</button><div role="dialog"><div id="popup" role="button"></div><div id="conversation-details">Conversation details</div><div id="open-messenger">Open in Messenger</div></div></main>',{url,runScripts:'outside-only'});
const w=d.window;for(const e of w.document.querySelectorAll('*')){e.getClientRects=()=>[{}];e.innerText=e.textContent}
for(const id of ['row','popup'])w.document.getElementById(id).innerText='Sameh\n· Chair\nPlease confirm whether it works';
w.eval(fs.readFileSync(__dirname+'/../Extension/observer.js','utf8'));const observation=w.vectorObserve(),nodes=observation.nodes;
const row=nodes.find(n=>n.kind==='inbox-conversation');assert(row);assert.equal(nodes.filter(n=>n.kind==='inbox-conversation').length,1,'dialog controls remain protected');
assert(nodes.some(n=>n.label==='Open in Messenger'),'Facebook plain-text Messenger navigation receives a guarded control ID');
assert(nodes.some(n=>n.label==='Conversation details'),'Facebook plain-text conversation details receives a guarded control ID');
assert.deepEqual(JSON.parse(JSON.stringify(observation.inboxRows)),[{label:'Sameh\n· Chair\nPlease confirm whether it works',person:'Sameh',listing:'Chair',preview:'Please confirm whether it works'}]);
const noop={addListener(){}};let clicks=0;
const chrome={runtime:{onMessage:noop,onStartup:noop,onInstalled:noop},storage:{local:{get:async()=>({}),set:async()=>{}}},action:{setBadgeText:async()=>{}},tabs:{onRemoved:noop,get:async()=>({id:1,url})},scripting:{executeScript:async()=>{clicks++;return [{result:{acted:true}}]}}};
const c=vm.createContext({chrome,URL,Date,Promise,setTimeout});vm.runInContext(fs.readFileSync(__dirname+'/../Extension/background.js','utf8'),c);
(async()=>{await new Promise(setImmediate);vm.runInContext('ready=true;tabId=1;epoch=1',c);
for(const node of [row,{id:2,label:'Confirm',kind:'control'}]){c.fixture={url,nodes:[node]};vm.runInContext('observation=fixture',c);const action=c.dispatch({method:'action',args:{action:'click',id:node.id,epoch:1}});if(node===row)await action;else await assert.rejects(action,/Read-only action blocked/)}
assert.equal(clicks,1);d.window.close();console.log('PASS inbox preview text does not block opening rows; actual confirmation and dialog controls stay protected');})().catch(e=>{console.error(e);process.exitCode=1});
