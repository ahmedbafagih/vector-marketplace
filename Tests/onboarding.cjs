const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');

const auto={mode:'Find only',budget:2000,maxOffer:300,categories:['All']};
const nativeState={provider:'Codex',connected:false};
const laneEnabled={Buying:false,Selling:false};
const intakePolicy={location:'Toronto'};
const context=vm.createContext({
 console,
 document:{getElementById:()=>null,querySelector:()=>null},
 globalThis:null,
 auto,nativeState,laneEnabled,intakePolicy,
 radius:65,maxPrice:500,minProfit:50,
 sourcingPolicy:()=>({preset:'compact',targets:[],city:'Toronto, ON',originAddress:'',outsideRange:'review',minROI:30,space:'Car boot',aiDailyLimit:100,maxDiscount:20}),
 normalizeSourcingTargets:value=>String(value||'').split(/[\n,]+/).map(x=>x.trim()).filter(Boolean),
 esc:value=>String(value),money:value=>'$'+value,
 root:{append:()=>{}},nativeCall:async()=>({}),infer:async()=>({status:'ready'}),objectSchema:value=>value,companionIssue:()=>'',
 render:()=>{},startAutopilot:()=>{},addActivity:()=>{},saveSoon:()=>{},feedback:()=>{},settings:false,view:'Stock',category:'All',selected:null
});
context.globalThis=context;
vm.runInContext(fs.readFileSync(path.join(__dirname,'../Web/onboarding.js'),'utf8'),context);
const qa=context.vectorOnboardingQA;
const fresh=qa.defaults();

assert.equal(fresh.targets,'');
assert.equal(fresh.radius,35);
assert.equal(fresh.maxPrice,300);
assert.equal(fresh.budget,2000);
assert.equal(fresh.minProfit,35);
assert.equal(fresh.minROI,30);
assert.equal(fresh.mode,'Find only');
assert.equal(qa.choiceValue('radius','35'),35);
assert.equal(typeof qa.choiceValue('radius','35'),'number');
assert.equal(qa.choiceValue('mode','Find only'),'Find only');
assert.equal(qa.validate({targets:''},1),'Add at least one item or model to find.');
assert.equal(qa.validate({targets:'iPhone 11'},1),'');
assert.match(qa.validate({city:'Toronto, ON',originAddress:'',radius:35},2),/starting address/);
assert.equal(qa.validate({city:'Toronto, ON',originAddress:'123 King St',radius:35},2),'');
assert.match(qa.validate({maxPrice:500,budget:300,minProfit:35,minROI:30},3),/commitment limit/);
assert.equal(qa.validate({maxPrice:300,budget:2000,minProfit:35,minROI:30},3),'');

qa.apply({targets:'iPhone 11\nHerman Miller Aeron',city:'Toronto, ON',originAddress:'123 King St',radius:35,maxPrice:300,budget:2000,minProfit:35,minROI:30,mode:'Find only',outsideRange:'review',provider:'Codex',aiReady:true});
assert.deepEqual(Array.from(auto.sourcing.targets),['iPhone 11','Herman Miller Aeron']);
assert.equal(auto.sourcing.originAddress,'123 King St');
assert.equal(context.radius,35);
assert.equal(context.maxPrice,300);
assert.equal(context.minProfit,35);
assert.equal(auto.mode,'Find only');
assert.equal(auto.maxOffer,300);
assert.equal(nativeState.onboardingVersion,2);
assert.match(vm.runInContext('VECTOR_COMPANION_STORE_URL',context),/^https:\/\/chromewebstore\.google\.com\/detail\//);
assert.equal(nativeState.connected,true);
assert.equal(laneEnabled.Buying,true);
assert.equal(laneEnabled.Selling,true);
console.log('PASS onboarding validation and production settings mapping');
