const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../Web/native.js','utf8');
const agentSource=source.slice(source.indexOf('async function browserAgent('),source.indexOf('async function executeJob('));
let actions=0,calls=0;const prompts=[];
const observation={url:'https://www.facebook.com/marketplace/search?query=test',text:'Same results',nodes:[{id:1,label:'Listing'}],listings:[],epoch:1};
const context=vm.createContext({Map,JSON,Error,Array,Object,Number,stopGeneration:0,itemRevision:()=>1,jobAllowed:()=>true,settings:false,actionSchema:{},saveSoon(){},signalCore(){},delay:async()=>{},validListingURL:()=>false,nativeCall:async method=>method==='observe'?observation:(actions++,{}),infer:async prompt=>{prompts.push(prompt);calls++;return calls===4?{action:'done',result:'{"complete":false}',note:'Finished with available evidence'}:{action:'click',id:1,note:'Inspect listing'};}});
vm.runInContext(agentSource,context);
(async()=>{const out=await context.browserAgent({},'Research one item',{maxSteps:5,maxActions:2});assert.equal(actions,2);assert.equal(out.result.complete,false);assert(prompts[2].includes('Browser actions remaining: 0'));assert(prompts[2].includes('Return done now'));console.log('PASS read-only browser work stops acting at its configured budget and requests a supported partial result')})().catch(e=>{console.error(e);process.exitCode=1});
