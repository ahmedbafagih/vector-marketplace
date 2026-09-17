'use strict';
let port=null, ready=false, tabId=null, photo=null, epoch=0, observation=null, chain=Promise.resolve(), reconnectEnabled=false, reconnectTimer=null, retryDelay=1000;
const allowed = value => {try{const u=new URL(value);return u.protocol==='https:'&&['www.facebook.com','facebook.com','m.facebook.com'].includes(u.hostname)&&(u.pathname==='/marketplace'||u.pathname.startsWith('/marketplace/')||/^\/messages\/t\/[^/]+\/?$/.test(u.pathname))}catch{return false}};
async function updateStatus(message){await chrome.storage.local.set({status:message,connected:ready});await chrome.action.setBadgeText({text:ready?'ON':''})}
function scheduleReconnect(){if(!reconnectEnabled)return;clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect()},retryDelay);retryDelay=Math.min(30000,retryDelay*2);chrome.alarms?.create('vector-reconnect',{delayInMinutes:.5})}
function lostConnection(p){if(port!==p)return;port=null;ready=false;photo=null;observation=null;updateStatus(reconnectEnabled?'Reconnecting to Marketplace AI…':'Disconnected');scheduleReconnect()}
function connect(){if(port||!reconnectEnabled)return;let p;try{p=chrome.runtime.connectNative('com.vector.marketplace')}catch(e){updateStatus('Waiting for Marketplace AI');scheduleReconnect();return}port=p;
 p.onMessage.addListener(m=>{if(port!==p)return;if(m.event==='ready'){ready=true;retryDelay=1000;clearTimeout(reconnectTimer);chrome.alarms?.clear('vector-reconnect');updateStatus('Connected to Marketplace AI');return}if(m.event==='unavailable'){lostConnection(p);p.disconnect();return}if(!m.id)return;const handle=async()=>{if(port!==p)return;if(Date.now()>m.expiresAt){p.postMessage({id:m.id,ok:false,error:'Browser request expired before execution. No action was taken.'});return}try{const value=await dispatch(m);if(port===p)p.postMessage({id:m.id,ok:true,value})}catch(e){if(port===p)p.postMessage({id:m.id,ok:false,error:e.message})}};if(m.method==='status')void handle();else chain=chain.then(handle)});
 p.onDisconnect.addListener(()=>{void chrome.runtime.lastError;lostConnection(p)});p.postMessage({event:'hello',version:chrome.runtime.getManifest().version});
}
async function restoreConnection(){const s=await chrome.storage.local.get(['reconnectEnabled','marketplaceTabId']);reconnectEnabled=s.reconnectEnabled===true;tabId=s.marketplaceTabId??null;if(reconnectEnabled)connect()}
chrome.alarms?.onAlarm.addListener(a=>{if(a.name==='vector-reconnect')connect()});
restoreConnection();
async function discoverMarketplaceTab(){
 const candidates=await chrome.tabs.query({url:['https://www.facebook.com/marketplace/*','https://facebook.com/marketplace/*','https://m.facebook.com/marketplace/*','https://www.facebook.com/messages/t/*','https://facebook.com/messages/t/*','https://m.facebook.com/messages/t/*']});
 const match=candidates.find(t=>allowed(t.url));
 if(!match)return null;
 tabId=match.id;await chrome.storage.local.set({marketplaceTabId:tabId});return match;
}
async function target(){
 let t=null;
 if(tabId!==null){try{t=await chrome.tabs.get(tabId)}catch{tabId=null;await chrome.storage.local.set({marketplaceTabId:null})}}
 if(!t||!allowed(t.url))t=await discoverMarketplaceTab();
 if(!t)throw Error('Open Facebook Marketplace in Chrome. Marketplace AI will connect automatically.');
 if(!allowed(t.url))throw Error('Finish Facebook verification in Chrome, then return to Marketplace.');return t
}
// Readiness is the usable document, not completion of every image/network request.
async function settled(id){
 const until=Date.now()+20000;
 while(Date.now()<until){
  const t=await chrome.tabs.get(id);
  if(!allowed(t.url)){if(allowed(t.pendingUrl)){await new Promise(r=>setTimeout(r,200));continue}throw Error('Finish Facebook verification in Chrome, then return to Marketplace.');}
  if(!t.pendingUrl){
   const result=await chrome.scripting.executeScript({target:{tabId:id},injectImmediately:true,func:()=>({url:location.href,usable:!!document.body&&document.readyState!=='loading'})});
   if(result[0]?.result?.usable&&result[0].result.url===t.url)return;
  }
  await new Promise(r=>setTimeout(r,200));
 }
 throw Error('Marketplace document is not ready yet. No action was taken.');
}
async function run(func,args=[]){const session=port;const t=await target();if(!ready||port!==session)throw Error('Marketplace AI disconnected before action.');const result=await chrome.scripting.executeScript({target:{tabId:t.id},func,args});return result[0]?.result}
async function ensureWorkspace(id,focus=false){
 const tab=await chrome.tabs.get(id),win=await chrome.windows.get(tab.windowId,{populate:true});
 // Keep Marketplace active in its own window without selecting a different
 // tab in the user's everyday browsing window. Hidden tabs can stall loading.
 if(win.tabs.length!==1){await chrome.windows.create({tabId:id,type:'normal',focused:focus,width:1200,height:900});return}
 if(!tab.active)await chrome.tabs.update(id,{active:true});
 if(win.state==='minimized')await chrome.windows.update(win.id,{state:'normal',focused:focus});
 else if(focus)await chrome.windows.update(win.id,{focused:true});
}
const sameAddress=(a,b)=>{try{const x=new URL(a),y=new URL(b);return x.origin===y.origin&&x.pathname.replace(/\/$/,'')===y.pathname.replace(/\/$/,'')&&x.search===y.search}catch{return false}};
async function openMarketplace(url,focus=false){const session=port;if(!allowed(url))throw Error('This URL is outside Marketplace.');if(tabId!==null){try{await chrome.tabs.get(tabId)}catch{tabId=null}}
 if(tabId===null){const candidates=await chrome.tabs.query({url:['https://www.facebook.com/marketplace/*','https://facebook.com/marketplace/*']});tabId=candidates[0]?.id??null}
 if(port!==session)throw Error('Marketplace AI disconnected before navigation.');
 if(tabId===null){const win=await chrome.windows.create({url,type:'normal',focused:focus,width:1200,height:900});tabId=win.tabs[0].id}else{await ensureWorkspace(tabId,focus);if(port!==session)throw Error('Marketplace AI disconnected before navigation.');const current=await chrome.tabs.get(tabId),thread=/^https:\/\/(?:www\.)?facebook\.com\/messages\/t\//.test(url);if(thread&&!sameAddress(current.url,url)&&!sameAddress(current.pendingUrl,url)){const fresh=await chrome.tabs.create({windowId:current.windowId,url,active:true});try{await settled(fresh.id);const opened=await chrome.tabs.get(fresh.id);if(!sameAddress(opened.url,url))throw Error('Facebook did not keep the selected Messenger conversation open.');await chrome.tabs.remove(current.id);tabId=fresh.id}catch(e){await chrome.tabs.remove(fresh.id).catch(()=>{});throw e}}else if(!sameAddress(current.url,url)&&!sameAddress(current.pendingUrl,url))await chrome.tabs.update(tabId,{url})}
 chrome.storage.local.set({marketplaceTabId:tabId});observation=null;await settled(tabId);return {opened:true};
}
async function adoptOpenedThread(previousTabId,knownTabIds){
 const until=Date.now()+3000;
 while(Date.now()<until){
  const current=await chrome.tabs.get(previousTabId);if(/^https:\/\/(?:www\.)?facebook\.com\/messages\/t\//.test(current.url||'')){await settled(previousTabId);return}
  const tabs=await chrome.tabs.query({url:['https://www.facebook.com/messages/t/*','https://facebook.com/messages/t/*']});const opened=tabs.find(x=>!knownTabIds.has(x.id));if(opened){tabId=opened.id;await chrome.storage.local.set({marketplaceTabId:tabId});await chrome.tabs.remove(previousTabId);await settled(tabId);return}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw Error('Messenger thread did not open in the Marketplace AI browser window.');
}
async function dispatch(m){
 if(!ready)throw Error('Marketplace AI disconnected.');const a=m.args||{};
 if(m.method==='status'){let tabConnected=false;try{await target();tabConnected=true}catch{}return {connected:true,tabConnected,version:chrome.runtime.getManifest().version,protocol:1,readiness:'document-v6'}}
 if(m.method==='open')return openMarketplace(a.url,true);
 if(m.method==='photo'){if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(a.data)||a.data.length>810000)throw Error('Invalid photo.');photo=a.data;return {ready:true}}
 if(m.method==='observe'||m.method==='observeInbox'){
 observation=null;
 for(let attempt=0;attempt<3;attempt++){
  const session=port,t=await target();await settled(t.id);
  const injected=await chrome.scripting.executeScript({target:{tabId:t.id},files:['observer.js']});
  if(!ready||port!==session)throw Error('Marketplace AI disconnected during observation.');
  const documentId=injected[0]?.documentId;
  let result;try{result=await chrome.scripting.executeScript({target:{tabId:t.id,...(documentId?{documentIds:[documentId]}:{})},func:()=>{try{return typeof globalThis.vectorObserve==='function'?globalThis.vectorObserve():null}catch(e){return {vectorObservationError:String(e.message||'Marketplace could not be read.')}}}})}catch(e){if(attempt===2)throw e;continue}
  const data=result[0]?.result,current=await chrome.tabs.get(t.id);
  if(!ready||port!==session)throw Error('Marketplace AI disconnected during observation.');
  if(data?.vectorObservationError)throw Error(data.vectorObservationError);
  if(data&&typeof data.url==='string'&&typeof data.text==='string'&&Array.isArray(data.nodes)&&Array.isArray(data.listings)&&data.url===current.url&&!current.pendingUrl){epoch++;data.epoch=epoch;observation={url:data.url,nodes:data.nodes,epoch};return m.method==='observeInbox'?{url:data.url,inboxRows:Array.isArray(data.inboxRows)?data.inboxRows:[],loading:Array.isArray(data.inboxLoading)?data.inboxLoading:(Array.isArray(data.loading)?data.loading:[]),inboxLoading:data.inboxLoading,visibility:data.visibility||'unknown'}:data;}
 }
 throw Error('Marketplace changed while being read. Observe again; no action was taken.');
 }
 if(m.method!=='action')throw Error('Unknown browser request.');
 if(a.action==='navigate')return openMarketplace(a.url);
 const t=await target();if(!observation||a.epoch!==epoch||t.url!==observation.url)throw Error('Marketplace changed. Observe again.');
 if(!['click','fill','select','scroll'].includes(a.action))throw Error('Unsupported action.');
 const node=observation.nodes.find(n=>n.id===a.id);if(a.action!=='scroll'&&!node)throw Error('Control no longer available.');
 if(node&&!(a.action==='click'&&node.kind==='inbox-conversation'&&new URL(observation.url).pathname.startsWith('/marketplace/inbox'))){if(a.action==='click'&&node.href&&!allowed(node.href))throw Error('This link is outside Marketplace.');if(/delete|remove permanently|checkout|pay now|buy now|password|log in|sign in|security code|verification|two.factor/i.test(node.label))throw Error('Complete this step yourself in Chrome.');if(a.action==='click'&&/\b(publish|post|send|confirm|place order)\b/i.test(node.label)&&!a.allowCommit)throw Error('Read-only action blocked: '+node.label+' ('+(node.role||node.tag||'control')+'). No action was taken.');}
 const upload=a.action==='click'&&photo&&/photo|image|picture/i.test(node?.label||'')?photo:null;
 const opensThread=a.action==='click'&&/^open in messenger$/i.test(node?.label||''),knownTabIds=opensThread?new Set((await chrome.tabs.query({})).map(x=>x.id)):null,previousTabId=t.id;
 const result=await run(async(args,label,expectedURL,upload)=>{
  if(location.href!==expectedURL)throw Error('Page changed.');if(args.action==='scroll'){
   let scroller=globalThis.vectorElements?.[args.id];if(label&&(!scroller||!scroller.isConnected))throw Error('Scroll target disappeared. Observe again.');
   while(scroller&&!(scroller.scrollHeight>scroller.clientHeight+1&&/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)))scroller=scroller.parentElement;
   scroller=scroller||document.scrollingElement;if(!scroller)throw Error('No scrollable document.');
   const before=scroller.scrollTop,direction=args.value==='up'?-1:1;scroller.scrollBy({top:direction*Math.max(1,scroller.clientHeight*.75),behavior:'instant'});
   return {scrolled:scroller.scrollTop!==before,before,after:scroller.scrollTop,atEnd:scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-1};
  }
  const el=globalThis.vectorElements?.[args.id];if(!el||!el.isConnected)throw Error('Control disappeared.');
  const current=(el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.innerText||el.getAttribute('alt')||el.getAttribute('title')||el.name||el.tagName).trim().slice(0,220);if(current!==label)throw Error('Control changed. Observe again.');
  if(el.type==='password'||el.autocomplete?.includes('cc-')||el.autocomplete==='one-time-code')throw Error('Complete this field yourself.');
  if(upload){const input=el.type==='file'?el:document.querySelector('input[type="file"][accept*="image"]');if(!input)throw Error('Photo picker not found. Add your photo in Chrome.');const bytes=Uint8Array.from(atob(upload.split(',')[1]),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([bytes],'vector-item.jpg',{type:'image/jpeg'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));return {photoAttached:true}}
  if(el.type==='file')throw Error('Attach a product photo in Marketplace AI first.');
  if(args.action==='click'){el.click();return {acted:true}}
  if(args.action==='select'){if(el.tagName!=='SELECT')throw Error('Open the dropdown first.');el.value=args.value;el.dispatchEvent(new Event('change',{bubbles:true}));return {acted:true}}
  el.focus();if(el.isContentEditable){const value=String(args.value),selection=getSelection(),range=document.createRange();range.selectNodeContents(el);selection.removeAllRanges();selection.addRange(range);let inserted=false;try{inserted=document.execCommand('insertText',false,value)}catch{}if(!inserted)throw Error('Message composer did not accept text insertion. No message was sent.');await new Promise(resolve=>setTimeout(resolve,120));const currentEl=el.isConnected?el:document.activeElement,actual=(currentEl?.innerText||currentEl?.textContent||'').replace(/\u00a0/g,' ').trim();if(actual!==value.replace(/\u00a0/g,' ').trim())throw Error('Message composer did not accept the approved text. No message was sent.')}else{const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(!setter)throw Error('Field is not editable.');setter.call(el,args.value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}return {acted:true}
 },[a,node?.label||'',observation.url,upload]);
 observation=null;if(result?.photoAttached)photo=null;if(opensThread)await adoptOpenedThread(previousTabId,knownTabIds);return result;
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('popup.html'))return;
 if(m.action==='status'){target().then(()=>reply({connected:ready,tabConnected:true})).catch(()=>reply({connected:ready,tabConnected:false}));return true}
 if(m.action==='connect'){reconnectEnabled=true;chrome.storage.local.set({reconnectEnabled:true});connect();openMarketplace('https://www.facebook.com/marketplace/',true).then(()=>reply({ok:true})).catch(e=>reply({error:e.message}));return true}
 if(m.action==='disconnect'){reconnectEnabled=false;clearTimeout(reconnectTimer);chrome.alarms?.clear('vector-reconnect');chrome.storage.local.set({reconnectEnabled:false});const p=port;port=null;ready=false;photo=null;observation=null;p?.disconnect();updateStatus('Disconnected');reply({ok:true})}
});
chrome.tabs.onRemoved.addListener(id=>{if(id===tabId){tabId=null;observation=null;photo=null;chrome.storage.local.set({marketplaceTabId:null})}});
chrome.runtime.onStartup.addListener(restoreConnection);
chrome.runtime.onInstalled.addListener(restoreConnection);
