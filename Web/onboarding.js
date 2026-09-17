const VECTOR_ONBOARDING_VERSION=2;
const VECTOR_COMPANION_STORE_URL='https://chromewebstore.google.com/detail/marketplace-ai/cfkdpkejcgfgokangnmkoofnmigkkokg';
let vectorOnboarding=null;

function vectorSetupDefaults(){
 const policy=typeof sourcingPolicy==='function'?sourcingPolicy():{};
 const fresh=!nativeState.onboardingVersion;
 return {
  step:0,
  review:false,
  targets:fresh?'':Array.isArray(policy.targets)?policy.targets.join('\n'):'',
  city:String(policy.city||intakePolicy.location||'Toronto, ON'),
  originAddress:String(policy.originAddress||''),
  radius:fresh?35:Number(radius)||35,
  maxPrice:fresh?300:Number(maxPrice)||300,
  budget:fresh?2000:Number(auto.budget)||2000,
  minProfit:fresh?35:Number(minProfit)||35,
  minROI:fresh?30:Number(policy.minROI)||30,
  mode:fresh?'Find only':auto.mode==='Auto-negotiate'?'Auto-negotiate':'Find only',
  outsideRange:policy.outsideRange==='reject'?'reject':'review',
  provider:nativeState.provider||'Codex',
  aiReady:false,
  chromeReady:false,
  checking:false,
  message:''
 };
}

function vectorSetupSteps(){return [
 {eyebrow:'WELCOME',title:'Meet Marketplace AI',copy:'Set your buying rules once. Marketplace AI will search, review, and keep your Marketplace work organized on this Mac.'},
 {eyebrow:'1 OF 5',title:'What should Marketplace AI find?',copy:'Use exact models for precise results, or broader terms when you want more variety.'},
 {eyebrow:'2 OF 5',title:'How far will you travel?',copy:'Your starting point lets Marketplace AI calculate real pickup distance when a seller shares a location.'},
 {eyebrow:'3 OF 5',title:'What makes a deal worthwhile?',copy:'These limits keep purchases inside your budget and profit target.'},
 {eyebrow:'4 OF 5',title:'How much can Marketplace AI do?',copy:'Start with review only, or let Marketplace AI contact sellers when every rule passes.'},
 {eyebrow:'5 OF 5',title:'Connect the two services',copy:'Marketplace AI needs your AI runtime and the Chrome companion before it can search Marketplace.'},
 {eyebrow:'READY',title:'Your workspace is ready',copy:'Review the plan, then start your first Marketplace search.'}
]}

function vectorSetupError(message){vectorOnboarding.message=message;renderVectorOnboarding()}
function vectorSetupInput(name){return document.querySelector('#vx-onboarding [name="'+name+'"]')}
function vectorSetupChoiceValue(name,value){return name==='radius'?Number(value):value}
function vectorSetupCapture(){
 const el=document.getElementById('vx-onboarding');if(!el)return;
 for(const name of ['targets','city','originAddress','maxPrice','budget','minProfit','minROI']){const input=vectorSetupInput(name);if(input)vectorOnboarding[name]=input.type==='number'?Number(input.value):input.value}
 const selected=el.querySelector('[data-vx-choice][aria-pressed="true"]');
 if(selected)vectorOnboarding[selected.dataset.vxChoice]=vectorSetupChoiceValue(selected.dataset.vxChoice,selected.dataset.value);
}
function vectorSetupValidate(step){
 vectorSetupCapture();const d=vectorOnboarding;
 if(step===1&&!normalizeSourcingTargets(d.targets).length)return 'Add at least one item or model to find.';
 if(step===2){if(!d.city.trim())return 'Add the city or region shown on Marketplace.';if(!d.originAddress.trim())return 'Add a starting address or postal code for distance checks.';if(!Number.isFinite(d.radius)||d.radius<1||d.radius>500)return 'Choose a distance from 1 to 500 km.'}
 if(step===3){if(!Number.isFinite(d.maxPrice)||d.maxPrice<1)return 'Choose the most you would pay for one item.';if(!Number.isFinite(d.budget)||d.budget<50||d.budget<d.maxPrice)return 'Your commitment limit must be at least your per item limit.';if(!Number.isFinite(d.minProfit)||d.minProfit<0)return 'Choose a valid minimum profit.';if(!Number.isFinite(d.minROI)||d.minROI<0||d.minROI>500)return 'Choose a return target from 0 to 500 percent.'}
 return '';
}
function vectorSetupChoice(name,value,label,detail,recommended=false){const active=String(vectorOnboarding[name])===String(value);return '<button type="button" class="vx-onboarding-choice" data-vx-choice="'+name+'" data-value="'+esc(value)+'" aria-pressed="'+active+'"><span><strong>'+esc(label)+'</strong>'+(recommended?'<em>Recommended</em>':'')+'</span><small>'+esc(detail)+'</small></button>'}
function vectorSetupBody(step){const d=vectorOnboarding;
 if(step===0)return '<div class="vx-onboarding-hero" aria-hidden="true"><span></span><span></span><span></span><i></i></div><ul class="vx-onboarding-benefits"><li><strong>Local by default</strong><span>Your workspace stays on this Mac.</span></li><li><strong>Rules before outreach</strong><span>Marketplace AI contacts sellers only inside your limits.</span></li><li><strong>About 2 minutes</strong><span>Five short decisions, then a connection check.</span></li></ul>';
 if(step===1)return '<label class="vx-onboarding-field">Items or models<textarea name="targets" rows="5" maxlength="1200" placeholder="iPhone 11\nHerman Miller Aeron" autofocus>'+esc(d.targets)+'</textarea><span>One per line, up to 20. Marketplace AI also rotates singular and plural searches.</span></label><div class="vx-onboarding-tip"><strong>Be specific when it matters</strong><span>“iPhone 11” avoids unrelated iPhones. “Vintage furniture” explores a broader category.</span></div>';
 if(step===2)return '<div class="vx-onboarding-grid"><label class="vx-onboarding-field">Search area<input name="city" value="'+esc(d.city)+'" placeholder="Toronto, ON"><span>Use the city or region shown by Marketplace.</span></label><label class="vx-onboarding-field">Pickup starting point<input name="originAddress" value="'+esc(d.originAddress)+'" placeholder="Street address or postal code"><span>Used only for pickup distance calculations.</span></label></div><div class="vx-onboarding-distance" role="group" aria-label="Search distance">'+vectorSetupChoice('radius',5,'5 km','Very local, fewer listings')+vectorSetupChoice('radius',15,'15 km','Nearby, moderate selection')+vectorSetupChoice('radius',35,'35 km','More results without a long drive',true)+'</div><label class="vx-onboarding-field vx-onboarding-custom">Custom distance, km<input name="radius" type="number" min="1" max="500" value="'+d.radius+'"></label><div class="vx-onboarding-row">'+vectorSetupChoice('outsideRange','review','Let me review','Keep distant deals for my decision',true)+vectorSetupChoice('outsideRange','reject','Pass automatically','Close deals outside my limit')+'</div>';
 if(step===3)return '<div class="vx-onboarding-money"><label class="vx-onboarding-field">Most to pay for one item<span class="vx-onboarding-currency">$<input name="maxPrice" type="number" min="1" value="'+d.maxPrice+'"></span><small>CAD per purchase</small></label><label class="vx-onboarding-field">Accepted deal limit<span class="vx-onboarding-currency">$<input name="budget" type="number" min="50" value="'+d.budget+'"></span><small>Only accepted deals awaiting pickup count</small></label><label class="vx-onboarding-field">Minimum profit<span class="vx-onboarding-currency">$<input name="minProfit" type="number" min="0" value="'+d.minProfit+'"></span><small>After expected costs</small></label><label class="vx-onboarding-field">Minimum return<span class="vx-onboarding-currency"><input name="minROI" type="number" min="0" max="500" value="'+d.minROI+'">%</span><small>Compared with purchase price</small></label></div><div class="vx-onboarding-tip"><strong>Negotiations do not reserve your budget</strong><span>Marketplace AI counts money only after a deal is accepted and waiting for pickup.</span></div>';
 if(step===4)return '<div class="vx-onboarding-stack">'+vectorSetupChoice('mode','Find only','Find and review','Marketplace AI researches deals and waits for you before contacting anyone.',true)+vectorSetupChoice('mode','Auto-negotiate','Find and contact sellers','Marketplace AI may send messages only when price, distance, and profit rules pass.')+'</div><div class="vx-onboarding-tip"><strong>You can change this anytime</strong><span>Buying and selling have separate switches that stay visible at the top of the app.</span></div>';
 if(step===5)return '<div class="vx-onboarding-provider" role="group" aria-label="AI provider">'+vectorSetupChoice('provider','Codex','Codex','Use your signed in Codex CLI')+vectorSetupChoice('provider','Claude Code','Claude Code','Use your signed in Claude Code CLI')+'</div><div class="vx-onboarding-connections"><article data-ready="'+d.aiReady+'"><span class="vx-onboarding-status"></span><div><strong>'+esc(d.provider)+'</strong><small>'+(d.aiReady?'AI connection verified':'Sign in to the official CLI on this Mac')+'</small></div></article><article data-ready="'+d.chromeReady+'"><span class="vx-onboarding-status"></span><div><strong>Chrome companion</strong><small>'+(d.chromeReady?'Marketplace connection verified':'Install it, open Marketplace, then connect')+'</small></div></article></div><ol class="vx-onboarding-install"><li data-done="'+d.chromeReady+'"><span>1</span><div><strong>Install the companion</strong><small>Chrome handles installation and automatic updates.</small></div><button type="button" class="mp-small-button" id="vx-onboarding-store">'+(d.chromeReady?'Installed':'Add to Chrome')+'</button></li><li data-done="'+d.chromeReady+'"><span>2</span><div><strong>Open Marketplace and connect</strong><small>Open the Marketplace AI icon in Chrome, review its disclosure, then choose Connect Marketplace.</small></div><button type="button" class="mp-small-button" id="vx-onboarding-marketplace">Open Marketplace</button></li><li data-done="'+(d.aiReady&&d.chromeReady)+'"><span>3</span><div><strong>Verify everything</strong><small>Marketplace AI checks the AI runtime, native helper, companion, and Marketplace tab.</small></div><button type="button" class="mp-action" id="vx-onboarding-check"'+(d.checking?' disabled':'')+'>'+(d.checking?'Checking…':'Check connections')+'</button></li></ol><details class="vx-onboarding-manual"><summary>Developer installation</summary><p>Use the bundled unpacked extension only when testing source code before a Web Store release.</p><button type="button" class="mp-small-button" id="vx-onboarding-extension">Show unpacked extension folder</button></details>';
 return '<div class="vx-onboarding-summary"><span><small>Find</small><strong>'+esc(normalizeSourcingTargets(d.targets).slice(0,3).join(', '))+'</strong></span><span><small>Area</small><strong>'+esc(d.city)+' · '+d.radius+' km</strong></span><span><small>Limits</small><strong>'+money(d.maxPrice)+' per item · '+money(d.minProfit)+' profit</strong></span><span><small>Permission</small><strong>'+(d.mode==='Auto-negotiate'?'Find and contact sellers':'Find and review only')+'</strong></span><span><small>Connections</small><strong>'+esc(d.provider)+' and Chrome ready</strong></span></div><div class="vx-onboarding-tip"><strong>Marketplace AI starts with one safe search</strong><span>You can watch every result in Discover and change these rules from Buying settings.</span></div>';
}

function renderVectorOnboarding(){
 if(!vectorOnboarding)return;let el=document.getElementById('vx-onboarding');if(!el){el=document.createElement('section');el.id='vx-onboarding';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','vx-onboarding-title');root.append(el)}
 const steps=vectorSetupSteps(),step=vectorOnboarding.step,meta=steps[step],ready=vectorOnboarding.aiReady&&vectorOnboarding.chromeReady;
 el.innerHTML='<div class="vx-onboarding-shell"><aside class="vx-onboarding-side"><span class="mp-orbit" aria-hidden="true"></span><strong>MARKETPLACE AI</strong><ol>'+steps.slice(1,6).map((_,i)=>'<li data-state="'+(i+1<step?'done':i+1===step?'active':'upcoming')+'"><span>'+(i+1<step?'✓':i+1)+'</span><i></i></li>').join('')+'</ol><small>Private workspace<br>on this Mac</small></aside><main class="vx-onboarding-main"><div class="vx-onboarding-copy"><span class="vx-onboarding-eyebrow">'+meta.eyebrow+'</span><h1 id="vx-onboarding-title">'+meta.title+'</h1><p>'+meta.copy+'</p></div><div class="vx-onboarding-content">'+vectorSetupBody(step)+'</div><p class="vx-onboarding-error" role="alert">'+esc(vectorOnboarding.message||'')+'</p><footer><button type="button" class="mp-small-button" id="vx-onboarding-back"'+(step===0?' hidden':'')+'>Back</button><span>'+(step>0&&step<6?step+' / 5':'')+'</span><button type="button" class="mp-action" id="vx-onboarding-next"'+(step===5&&!ready?' disabled':'')+'>'+(step===0?'Set up Marketplace AI':step===5?'Continue':step===6?'Start searching':'Continue')+'</button></footer></main></div>';
 el.querySelectorAll('[data-vx-choice]').forEach(button=>button.onclick=()=>{vectorSetupCapture();vectorOnboarding[button.dataset.vxChoice]=button.dataset.value;if(button.dataset.vxChoice==='radius')vectorOnboarding.radius=Number(button.dataset.value);if(button.dataset.vxChoice==='provider'){vectorOnboarding.aiReady=false;nativeState.connected=false}vectorOnboarding.message='';renderVectorOnboarding()});
 const back=document.getElementById('vx-onboarding-back');back.onclick=()=>{vectorSetupCapture();vectorOnboarding.message='';vectorOnboarding.step--;renderVectorOnboarding()};
 const next=document.getElementById('vx-onboarding-next');next.onclick=()=>{const error=vectorSetupValidate(step);if(error){vectorSetupError(error);return}if(step===6){finishVectorOnboarding();return}vectorOnboarding.message='';vectorOnboarding.step++;renderVectorOnboarding()};
 document.getElementById('vx-onboarding-extension')?.addEventListener('click',()=>nativeCall('showExtension').catch(e=>vectorSetupError(e.message)));
 document.getElementById('vx-onboarding-store')?.addEventListener('click',()=>nativeCall('openCompanionStore',{url:VECTOR_COMPANION_STORE_URL}).catch(e=>vectorSetupError(e.message)));
 document.getElementById('vx-onboarding-marketplace')?.addEventListener('click',()=>nativeCall('openMarketplace').catch(e=>vectorSetupError(e.message)));
 document.getElementById('vx-onboarding-check')?.addEventListener('click',checkVectorOnboardingConnections);
 el.querySelector('textarea,input')?.focus({preventScroll:true});
}

async function checkVectorOnboardingConnections(){
 vectorSetupCapture();const d=vectorOnboarding;d.checking=true;d.message='';nativeState.provider=d.provider;renderVectorOnboarding();
 try{const available=await nativeCall('runtimeStatus');if(!available[d.provider])throw Error(d.provider+' CLI is not installed on this Mac.');const result=await infer('Return status ready. No tools.',objectSchema({status:{type:'string'}}));if(result.status!=='ready')throw Error('The AI runtime returned an unexpected response.');d.aiReady=true;nativeState.connected=true;const chrome=await nativeCall('chromeStatus'),issue=companionIssue(chrome);if(issue)throw Error(issue);d.chromeReady=true;d.message='Both connections are ready.'}catch(error){d.message=error.message}finally{d.checking=false;renderVectorOnboarding();saveSoon()}
}

function applyVectorOnboarding(d){
 const previous=sourcingPolicy();auto.sourcing={...previous,preset:'custom',targets:normalizeSourcingTargets(d.targets),city:d.city.trim(),originAddress:d.originAddress.trim(),outsideRange:d.outsideRange,minROI:d.minROI,space:previous.space||'Car boot',aiDailyLimit:previous.aiDailyLimit||100,maxDiscount:previous.maxDiscount??20};
 auto.mode=d.mode;auto.budget=d.budget;auto.maxOffer=Math.min(d.maxPrice,d.budget);auto.categories=['All'];auto.keywords='';auto.condition='Good or better';radius=d.radius;maxPrice=d.maxPrice;minProfit=d.minProfit;intakePolicy.location=d.city.trim();nativeState.provider=d.provider;nativeState.connected=d.aiReady;nativeState.onboardingVersion=VECTOR_ONBOARDING_VERSION;nativeState.queryIndex=0;laneEnabled.Buying=true;laneEnabled.Selling=true;
}
function finishVectorOnboarding(){
 const d=vectorOnboarding;applyVectorOnboarding(d);document.getElementById('vx-onboarding')?.remove();vectorOnboarding=null;view='Discover';category='All';selected=null;settings=false;render();if(!nativeState.scanning)startAutopilot();addActivity('First run setup completed','setup');saveSoon();feedback('Setup saved. Your first Marketplace search is queued.');
}
function openVectorOnboarding(options={}){if(vectorOnboarding)return;vectorOnboarding=vectorSetupDefaults();vectorOnboarding.review=!!options.review;if(options.review){vectorOnboarding.step=1;vectorOnboarding.aiReady=!!nativeState.connected;nativeCall('chromeStatus').then(status=>{if(vectorOnboarding){vectorOnboarding.chromeReady=!companionIssue(status);renderVectorOnboarding()}}).catch(()=>{})}renderVectorOnboarding()}

globalThis.openVectorOnboarding=openVectorOnboarding;
globalThis.vectorOnboardingQA={defaults:vectorSetupDefaults,choiceValue:vectorSetupChoiceValue,validate:(draft,step)=>{const prior=vectorOnboarding;vectorOnboarding={...vectorSetupDefaults(),...draft};const result=vectorSetupValidate(step);vectorOnboarding=prior;return result},apply:d=>applyVectorOnboarding({...vectorSetupDefaults(),...d})};
