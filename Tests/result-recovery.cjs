const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../Web/native.js','utf8');
const agentSource=source.slice(source.indexOf('async function browserAgent('),source.indexOf('async function executeJob('));
async function scenario(results){
 const calls=[],prompts=[],observed={url:'https://www.facebook.com/marketplace/inbox',text:'Observed listing',nodes:[],listings:[]};let n=0;
 const context=vm.createContext({Map,JSON,Error,Array,Object,stopGeneration:0,itemRevision:()=>1,jobAllowed:()=>true,settings:false,actionSchema:{},saveSoon(){},validListingURL:()=>false,nativeCall:async method=>{calls.push(method);assert.equal(method,'observe');return observed},infer:async prompt=>{prompts.push(prompt);return {action:'done',result:results[Math.min(n++,results.length-1)],note:'Finished'}}});
 vm.runInContext(agentSource,context);
 return {run:()=>context.browserAgent({},'Return a verified summary'),calls,prompts};
}
(async()=>{
 for(const bad of ['```json\n{}\n```','invalid','null','[]','',undefined]){
  const s=await scenario([bad,'{"complete":false,"coverage":"Partial"}']);const out=await s.run();
  assert.equal(out.result.complete,false);assert.equal(out.evidence.length,1);assert.equal(s.prompts.length,2);assert(s.prompts[1].includes('Result format was invalid'));assert.deepEqual(s.calls,['observe']);
 }
 const s=await scenario(['broken']);await assert.rejects(s.run(),/after two corrections/);assert.equal(s.prompts.length,3);assert.deepEqual(s.calls,['observe']);
 console.log('PASS malformed completion results are corrected without repeating browser actions; retries are bounded');
})().catch(e=>{console.error(e);process.exitCode=1});
