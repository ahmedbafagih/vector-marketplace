const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../Web/native.js','utf8');
const start=source.indexOf('function latestUnresolvedItemJob('),end=source.indexOf('async function tickWorker(');
const row={id:7,name:'Chair',view:'Selling',inventoryNote:''},thread='https://www.facebook.com/messages/t/7',work={needs:true,last:'',enabled:true,leads:[{url:thread,last:'Still available?',incoming:'Still available?',unanswered:true}]},activity=[];
const c=vm.createContext({Date,Math,Map,String,rows:[row],laneEnabled:{Selling:true},workFor:()=>work,addActivity:text=>activity.push(text),nativeState:{jobs:[
 {id:'old',kind:'sync',itemId:7,state:'needs_you',created:1,note:'Chat settings could not be opened for the matching seller conversation.'},
 {id:'new',kind:'sync',itemId:7,state:'needs_you',created:2,note:'Chat settings could not be opened for the matching seller conversation.'},
 {id:'offer',kind:'offer',itemId:7,state:'needs_you',created:3,note:'Step limit reached. Review the Marketplace window, then retry.'},
 {id:'reply',kind:'reply',itemId:7,leadURL:thread,incoming:'Still available?',state:'needs_you',created:4,note:'The message composer did not accept the exact approved text.'}
]},saveSoon(){}});
vm.runInContext(source.slice(start,end),c);
assert.equal(c.recoverableConversationFailure({kind:'sync'},'Temporary Facebook UI: controls unavailable.'),true);
assert.equal(c.recoverableConversationFailure({kind:'reply'},'The message composer did not accept the approved text.'),true);
assert.equal(c.recoverableConversationFailure({kind:'reply'},'Reply exceeds the listing price limit.'),false);
const retry={kind:'sync',itemId:7,state:'running'};c.holdForAutomaticRetry(retry,'Temporary Facebook UI: controls unavailable.');
assert.equal(retry.state,'queued');assert(retry.retryAt>Date.now());assert.equal(work.needs,false);assert.match(retry.note,/Retrying automatically/);
assert.equal(c.recoverableConversationFailure({kind:'sync'},'Step limit reached.'),true);const exhausted={kind:'sync',itemId:7,state:'running'};for(let i=0;i<7;i++)c.holdForAutomaticRetry(exhausted,'Step limit reached.');assert.equal(exhausted.state,'needs_you');assert.match(exhausted.note,/after 6 retries/);
assert.equal(c.recoverableConversationFailure({kind:'scan'},'Codex request failed. Retry from Activity.'),true);
assert.equal(c.recoverableConversationFailure({kind:'scan'},'Codex sign-in needs attention.'),false);
assert.equal(c.recoverableConversationFailure({kind:'offer'},'Codex request failed. Retry from Activity.'),false);
const aiRetry={kind:'scan',state:'running'};c.holdForAutomaticRetry(aiRetry,'Codex request failed. Retry from Activity.');assert.equal(aiRetry.state,'queued');assert.match(aiRetry.note,/AI request did not finish/);for(let i=0;i<6;i++)c.holdForAutomaticRetry(aiRetry,'Codex request failed. Retry from Activity.');assert.equal(aiRetry.state,'needs_you');assert.match(aiRetry.note,/AI request failed after 6/);
c.recoverStoredConversationFailures();
assert.equal(c.nativeState.jobs[0].state,'cancelled');assert.equal(c.nativeState.jobs[1].state,'queued');assert.match(c.nativeState.jobs[1].note,/saved conversation link/);assert.equal(c.nativeState.jobs[3].state,'queued');assert.match(c.nativeState.jobs[3].note,/saved buyer conversation/);assert.equal(c.nativeState.conversationRecoveryVersion,4);
c.recoverStoredOfferFailures();assert.equal(c.nativeState.jobs[2].state,'queued');assert.match(c.nativeState.jobs[2].note,/exact seller listing/);assert.equal(c.nativeState.offerRecoveryVersion,1);
console.log('PASS temporary conversation UI failures retry automatically and duplicate terminal failures migrate once');
