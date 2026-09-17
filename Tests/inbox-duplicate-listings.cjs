const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const rows=[{id:1,name:'iPhone 12 Pro',view:'Buying',url:'https://www.facebook.com/marketplace/item/101/'},{id:2,name:'iPhone 12 Pro',view:'Buying',url:'https://www.facebook.com/marketplace/item/102/'}];
const works={1:{enabled:true,leads:[{id:'Kenzie',url:'https://www.facebook.com/messages/t/201/',last:'Okk'}]},2:{enabled:true,leads:[{id:'Alex',url:'https://www.facebook.com/messages/t/202/',last:'Price firm'}]}},queued=[];
const row={listing:'iPhone 12 Pro',person:'Kenzie',preview:'The screen protector is cracked',label:'Kenzie iPhone 12 Pro The screen protector is cracked'};
const c=vm.createContext({Date,Map,Set,String,JSON,Error,Array,Object,rows,nativeState:{jobs:[],inboxFingerprintVersionBuying:2},monitoringWanted:()=>true,workFor:r=>works[r.id],marketplaceID:url=>String(url||'').match(/item\/(\d+)/)?.[1]||'',validThreadURL:url=>/^https:\/\/www\.facebook\.com\/messages\/t\/\d+\/?$/.test(url||''),delay:async()=>{},saveSoon(){},queueJob:(kind,r,extra)=>queued.push({kind,itemId:r.id,...extra}),nativeCall:async method=>method==='observeInbox'?{url:'https://www.facebook.com/marketplace/inbox?targetTab=BUYER',inboxRows:[row]}:{}});
vm.runInContext(fs.readFileSync(__dirname+'/../Web/conversations.js','utf8'),c);
(async()=>{
 assert.equal(c.matchInboxListing(row,rows)?.id,1,'a verified seller distinguishes identical Buying titles');
 await c.pollInbox({kind:'poll',side:'Buying'});
 assert.equal(queued.length,1,'previously skipped incoming reply queues a read');assert.equal(queued[0].itemId,1);assert.equal(queued[0].incremental,true);
 await c.pollInbox({kind:'poll',side:'Buying'});assert.equal(queued.length,1,'unchanged preview does not queue repeatedly');
 works[2].leads[0].id='Kenzie';assert.equal(c.matchInboxListing(row,rows),null,'same seller name on both listings stays ambiguous');
 assert.equal(c.inboxNeedsThreadLinks({inboxRows:[row]},rows),true,'unresolved duplicate titles trigger exact-thread recovery');
 const linked={...row,url:'https://www.facebook.com/messages/t/201'};assert.equal(c.matchInboxListing(linked,rows)?.id,1,'saved thread identity resolves duplicate seller names');
 works[1].leads[0].url='';assert.equal(c.matchInboxListing(row,rows),null,'an unverified seller label cannot resolve a duplicate');
 works[1].leads[0].url='https://www.facebook.com/messages/t/201/';rows.forEach(r=>r.view='Selling');works[2].leads[0].id='Alex';assert.equal(c.matchInboxListing(row,rows),null,'Selling must not assign a buyer to an identical listing by name');
 assert.equal(c.matchInboxListing({...row,listingURL:rows[1].url},rows)?.id,2,'observed listing identity is authoritative');
 console.log('PASS identical listings retain distinct seller threads and detect new replies');
})().catch(e=>{console.error(e);process.exitCode=1});
