const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const d=new JSDOM('<div role="grid" aria-label="Marketplace"><a href="/messages/t/101/">Alex</a><div role="status" aria-label="Loading..."></div></div><main><div role="status" aria-label="Loading messages"></div></main>',{url:'https://www.facebook.com/messages/t/101/',runScripts:'outside-only'});
for(const el of d.window.document.querySelectorAll('*')){el.getClientRects=()=>[{}];el.innerText=el.textContent}
d.window.document.querySelector('a').innerText='Alex · Oak chair\nHello\n·\n1m';
d.window.eval(fs.readFileSync(__dirname+'/../Extension/observer.js','utf8'));
let observation=d.window.vectorObserve();
assert.deepEqual([...observation.loading],['Loading messages']);
assert.deepEqual([...observation.inboxLoading],['Loading...']);
d.window.document.querySelector('[role="grid"] [role="status"]').remove();
observation=d.window.vectorObserve();
assert.deepEqual([...observation.inboxLoading],[],'finished inbox is independent of conversation loading');
assert.deepEqual([...observation.loading],['Loading messages']);
d.window.document.querySelector('[role="grid"]').remove();
assert.equal(d.window.vectorObserve().inboxLoading,null,'missing inbox is unknown, not loaded');
d.window.close();
console.log('PASS Marketplace inbox loading is scoped separately from conversation loading');
