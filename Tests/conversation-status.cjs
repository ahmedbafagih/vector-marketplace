const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const url='https://www.facebook.com/messages/t/123',listing='https://www.facebook.com/marketplace/item/99/';
const row={id:99,name:'Chair',view:'Selling',liveURL:listing};
const lead={id:'Buyer',url,last:'No thanks, I already found a chair',state:'Declined',stateQuote:'I already found a chair',unanswered:false};
const proof={url,text:lead.last,listings:[{url:listing}]};
const c=vm.createContext({URL,Date,Map,Set,String,JSON,Error,Array,Object,marketplaceID:u=>u?.match(/item\/(\d+)/)?.[1]});
vm.runInContext(fs.readFileSync(__dirname+'/../Web/native.js','utf8').split('\n').find(l=>l.startsWith('function validThreadURL(')),c);
vm.runInContext(fs.readFileSync(__dirname+'/../Web/conversations.js','utf8'),c);
assert.equal(c.threadResultIssue({lead},[proof],row),'');
assert.match(c.threadResultIssue({lead:{...lead,stateQuote:''}},[proof],row),/exact quote/);
assert.match(c.threadResultIssue({lead:{...lead,stateQuote:'Invented rejection'}},[proof],row),/exact quote/);
const active={...lead,last:'Would you take less?',state:'Negotiating',stateQuote:''};
assert.equal(c.threadResultIssue({lead:active},[{...proof,text:active.last}],row),'');
const source=fs.readFileSync(__dirname+'/../Template.html','utf8');vm.runInContext(source.split('\n').find(l=>l.startsWith('function activeBuyerCount(')),c);
assert.equal(c.activeBuyerCount({leads:[lead,active,{state:'Interested'},{state:'Pickup booked'},{state:'Confirming pickup'},{state:'Backup buyer'},{state:'Awaiting reply'}]}),5);
console.log('PASS declined status requires observed evidence and is excluded from active interest counts');

const buying={...row,view:'Buying',url:listing};
assert.match(c.buyingThreadResultIssue({lead:{...lead,availability:{state:'unavailable',quote:'Made up'}}},[proof],buying,{},url),/exact quote/);
assert.equal(c.buyingThreadResultIssue({lead:{...lead,availability:{state:'unavailable',quote:'No longer available'}}},[{...proof,text:proof.text+' No longer available'}],buying,{},url),'');

const decline='Thanks, I will pass.';c.workFor=()=>({leads:[{url,reply:decline}]});
const passed={...lead,state:'Passed',passQuote:decline,last:'200 firm',unanswered:false};
assert.equal(c.buyingThreadResultIssue({lead:passed},[{...proof,text:passed.last+'\n'+decline}],buying,{},url),'');
assert.match(c.buyingThreadResultIssue({lead:{...passed,passQuote:'Invented decline'}},[{...proof,text:passed.last+'\n'+decline}],buying,{},url),/exact saved outgoing/);
assert.match(c.buyingThreadResultIssue({lead:{...passed,unanswered:true}},[{...proof,text:passed.last+'\n'+decline}],buying,{},url),/no later unanswered/);
