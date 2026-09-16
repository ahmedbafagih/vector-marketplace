const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(__dirname+'/../Web/conversations.js','utf8'),listing='https://www.facebook.com/marketplace/item/44/',thread='https://www.facebook.com/messages/t/77',lead={url:thread,last:'Yes, it is available'};
const c=vm.createContext({marketplaceID:u=>u?.match(/item\/(\d+)/)?.[1],validThreadURL:u=>/^https:\/\/www\.facebook\.com\/messages\/t\/\d+$/.test(u||'')});
for(const name of ['sameThreadAddress','threadResultIssue'])vm.runInContext(source.split('\n').find(l=>l.startsWith('function '+name+'(')),c);
const proof=url=>[{url:thread,text:lead.last,listings:[{url}]}];
assert.equal(c.threadResultIssue({lead},proof(listing),{url:listing,view:'Buying'}),'');
assert.match(c.threadResultIssue({lead},proof('https://www.facebook.com/marketplace/item/45/'),{url:listing,view:'Buying'}),/listing banner/);
console.log('PASS purchase conversations require the exact sourced listing banner and message evidence');
