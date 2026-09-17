function conversationCount(r){const w=workFor(r);return w.syncComplete?w.leads.length+' buyer chats':w.leads.length?w.leads.length+'+ chats · Partial':'Chats not checked'}
function coreActivity(){
 const lanes={},counts={Buying:0,Selling:0};
 for(const lane of ['Buying','Selling']){
  const jobs=nativeState.jobs.filter(j=>(j.kind==='scan'||rows.find(r=>r.id===j.itemId)?.view==='Buying'?'Buying':'Selling')===lane),active=jobs.find(j=>j.state==='running'),queued=jobs.some(j=>j.state==='queued'&&jobAllowed(j));
  counts[lane]=active?1:0;
  const monitored=rows.filter(r=>r.view===lane&&monitoringWanted(r)),blocked=monitored.filter(r=>['needs_you','failed'].includes(jobs.filter(j=>j.kind==='sync'&&j.itemId===r.id).at(-1)?.state));
  const pollFailed=lane==='Selling'&&jobs.filter(j=>j.kind==='poll').at(-1)?.state==='failed';
  lanes[lane]=active?(jobAllowed(active)?taskNames[active.kind]||'Working':'Stopping'):!laneEnabled[lane]?'Paused':lane==='Selling'&&monitored.length?(pollFailed?'Needs attention':queued&&!nativeState.connected?'Monitoring · AI queued':'Monitoring'):queued?(nativeState.connected?'Queued':'Waiting for AI'):monitored.length?(blocked.length===monitored.length?'Needs attention':nativeState.connected?'Monitoring':'Waiting for AI'):lane==='Buying'&&nativeState.scanning?'Sourcing on':'Idle';
 }
 const active=nativeState.jobs.find(j=>j.state==='running'),total=counts.Buying+counts.Selling;
 return {lanes,counts,total,label:active?(jobAllowed(active)?taskNames[active.kind]||'Working':'Stopping'):Object.values(lanes).includes('Queued')?'Work queued':Object.values(lanes).some(x=>x.startsWith('Monitoring'))?'Monitoring messages':Object.values(lanes).includes('Waiting for AI')?'Waiting for AI':Object.values(lanes).includes('Needs attention')?'Needs attention':!laneEnabled.Buying&&!laneEnabled.Selling?'AI paused':'AI idle'};
}
const openSourcingSettings=openHunt;
let openingAutomationResolution=false;
function sourcingFunnel(){const current=rows.filter(r=>sourceMatchesCurrentTargets(r)&&r.assessment?.checkedAt),f={reviewed:current.length,ready:0,contacted:0,queued:0,offerGap:0,budgetHeld:0,riskHeld:0,review:0,replied:0};for(const r of current){const w=workFor(r),jobs=nativeState.jobs.filter(j=>j.kind==='offer'&&j.itemId===r.id);if(w.leads?.some(l=>(l.sent||0)>0)||jobs.some(j=>j.state==='done')){f.contacted++;if(w.leads?.some(l=>l.last?.trim()))f.replied++;continue}if(jobs.some(j=>['queued','running'].includes(j.state))){f.queued++;continue}if(r.view!=='Discover')continue;if(sourceAutoRisk(r)){f.riskHeld++;continue}if(!r.assessment.eligible){f.review++;continue}const value=sourceDealValue(r);if(sourceOpeningOffer(r,value.ceiling)<=0){f.offerGap++;continue}f.ready++}return f}
function sourcingTiming(now=Date.now()){if(!nativeState.scanning)return 'Sourcing stopped';const next=Number(nativeState.nextScan)||now,remaining=Math.max(0,next-now),wait=remaining<30000?'soon':Math.ceil(remaining/60000)+' min',usage=sourceAIUsage(new Date(now)),f=sourcingFunnel(),timing=usage.remaining<2?'Research waiting · needs 2 AI requests':'Next check '+wait;return timing+' · '+f.reviewed+' reviewed · '+f.ready+' ready · '+f.contacted+' contacted · '+f.replied+' replied'+(f.queued?' · '+f.queued+' queued':'')+(f.offerGap?' · '+f.offerGap+' asking too high':'')+(f.budgetHeld?' · '+f.budgetHeld+' budget held':'')+' · '+dailyContacts()+'/'+auto.contacts+' outreach today · '+usage.used+' / '+usage.limit+' AI today'}
openHunt=function(){
 if(!openingAutomationResolution)distanceSettingsBannerSuppressed=false;
 openSourcingSettings();const form=$('#source-form');if(!form)return;const submit=form.onsubmit,footer=form.querySelector('.mp-settings-footer'),advanced=form.querySelector('#source-advanced-fields'),usage=sourceAIUsage(),funnel=sourcingFunnel(),live=document.createElement('section'),limit=document.createElement('label'),saveState=document.createElement('span');
 limit.innerHTML='AI research per day<input name="aiDailyLimit" type="number" min="10" max="500" value="'+sourcingPolicy().aiDailyLimit+'" required><span class="mp-field-help">Maximum requests Vector may use for new Marketplace research.</span>';advanced?.append(limit);
 const remaining=Math.max(0,(Number(nativeState.nextScan)||Date.now())-Date.now()),next=!nativeState.scanning?'Sourcing is off':remaining<30000?'Next check soon':'Next check in '+Math.ceil(remaining/60000)+' min',holds=[funnel.queued?funnel.queued+' queued':'',funnel.offerGap?funnel.offerGap+' asking too high':'',funnel.budgetHeld?funnel.budgetHeld+' waiting for budget':''].filter(Boolean).join(' · ');
 live.id='vx-source-live';live.className='vx-source-activity';live.innerHTML='<header><div><span>Current activity</span><strong>'+(nativeState.scanning?'Sourcing is running':'Sourcing is stopped')+'</strong></div><small>'+esc(next)+'</small></header><div class="vx-source-metrics"><span><strong>'+funnel.reviewed+'</strong>Reviewed</span><span><strong>'+funnel.ready+'</strong>Ready</span><span><strong>'+funnel.contacted+'</strong>Contacted</span><span><strong>'+funnel.replied+'</strong>Replies</span></div><p>Today: '+dailyContacts()+' of '+auto.contacts+' seller contacts · '+usage.used+' of '+usage.limit+' AI requests'+(holds?' · '+esc(holds):'')+'</p>';
 form.querySelector('.mp-source-advanced')?.after(live);saveState.id='vx-source-save-state';saveState.role='status';saveState.textContent='All changes saved';footer?.append(saveState);const markDirty=()=>{saveState.textContent='Unsaved changes';saveState.dataset.dirty='true';delete saveState.dataset.saved};form.addEventListener('input',markDirty);form.addEventListener('change',markDirty);
 form.onsubmit=async e=>{const aiDailyLimit=Number(form.elements.aiDailyLimit.value);if(!Number.isInteger(aiDailyLimit)||aiDailyLimit<10||aiDailyLimit>500){e.preventDefault();feedback('Choose 10 to 500 daily sourcing AI requests.');return}auto.sourcing={...sourcingPolicy(),aiDailyLimit};submit(e);if(!settings){const distanceResult=await reconcileBuyingDistanceHolds();openHunt();const saved=$('#vx-source-save-state');saved.textContent='Saved just now';saved.dataset.saved='true';requestAnimationFrame(()=>{if(typeof saved.scrollIntoView==='function')saved.scrollIntoView({block:'center',behavior:'auto'})});feedback('Buying settings saved. Daily AI requests: '+aiDailyLimit+'. Distance: '+radius+' km.'+(distanceResult.cleared?' '+distanceResult.cleared+' distance warning'+(distanceResult.cleared===1?'':'s')+' cleared.':'')+(distanceResult.resumed?' Checking '+distanceResult.resumed+' conversation'+(distanceResult.resumed===1?'':'s')+' before resuming.':'')+(distanceResult.unverified?' Some pickup locations still need verification.':''))}}
};
function latestLaneBlocker(side){
 const latest=new Map();
 for(const job of nativeState.jobs||[]){
  const row=rows.find(r=>r.id===job.itemId),lane=job.kind==='scan'?'Buying':row?.view;
  if(lane===side)latest.set((job.itemId??'workspace')+':'+job.kind,job)
 }
 return [...latest.values()].reverse().find(job=>['needs_you','failed'].includes(job.state)&&!/^Stopped\.|^Work paused\./i.test(job.note||''))
}
function automationIssue(side){
 const enabled=side==='Buying'?nativeState.scanning&&laneEnabled.Buying:laneEnabled.Selling;
 if(!enabled)return null;
 const blocker=latestLaneBlocker(side),note=blocker?.note||'';
 if(blocker&&/companion|Chrome|connect.*extension|socket|sign.?in|log.?in|CAPTCHA|verif/i.test(note))return {side,title:'Browser connection needs attention',detail:'Open Connections, restore Chrome access, then Vector will retry the waiting work.',page:'connections',target:'[data-provider-card="Chrome"]'};
 if(blocker&&/^Pickup is [\d.]+ km\. Review this deal before replying\.$/i.test(note))return {side,title:'Pickup distance needs review',detail:'This seller is outside your automatic distance limit. Review the deal and choose whether to continue.',page:'attention',target:'.va-issue'};
 if(blocker)return {side,title:side+' task needs attention',detail:'Open Needs attention to review the error and retry the waiting task.',page:'attention',target:'.va-issue'};
 if(!nativeState.connected&&(side==='Buying'||rows.some(r=>r.view==='Selling'&&workFor(r).enabled)))return {side,title:side+' needs an AI connection',detail:'Connect '+nativeState.provider+' so AI work can continue.',page:'connections',target:'[data-provider-card="'+nativeState.provider+'"]'};
 if(side==='Buying'){
  if(auto.mode==='Auto-negotiate'&&dailyContacts()>=auto.contacts)return {side,title:'Daily outreach limit reached',detail:'Raise New sellers / day to contact more eligible listings, or wait for tomorrow. Research and existing conversations continue.',page:'buying',target:'[name="contacts"]'};
  const usage=sourceAIUsage();
  if(usage.remaining<2){const required=usage.used+2,detail=required<=500?'Set Daily AI requests to at least '+required+' to continue today, or wait for tomorrow\'s reset.':'Research resumes after tomorrow\'s reset because the daily limit cannot be raised further.';return {side,title:'New research is waiting',detail,page:'buying',target:'[name="aiDailyLimit"]'}}
 }
 return null
}
function openAutomationResolution(issue){
 const distanceSetting=issue.page==='buying'&&issue.target==='[name="radius"]';
 openingAutomationResolution=true;distanceSettingsBannerSuppressed=distanceSetting;
 try{if(issue.page==='buying')openHunt();else if(issue.page==='selling')openSellingSettings();else if(issue.page==='connections')openConnections();else openAttention()}finally{openingAutomationResolution=false}
 const panel=$('#mp-settings');if(!panel)return;
 panel.querySelector('#vx-automation-guidance')?.remove();
 panel.insertAdjacentHTML('afterbegin','<section id="vx-automation-guidance" role="status"><strong>⚠ '+esc(issue.title)+'</strong><p>'+esc(issue.detail)+'</p></section>');
 const target=panel.querySelector(issue.target);if(!target)return;
 const details=target.closest('details');if(details)details.open=true;
 const highlight=target.closest('label,.vx-connection,.va-issue')||target;highlight.classList.add('vx-guidance-target');
 const local=document.createElement('small');local.className='vx-field-guidance';local.textContent=issue.detail;highlight.append(local);
 const focus=target.matches('input,select,textarea,button')?target:target.querySelector('input,select,textarea,button');
 if(focus){focus.focus({preventScroll:true});requestAnimationFrame(()=>{focus.focus({preventScroll:true});if(typeof highlight.scrollIntoView==='function')highlight.scrollIntoView({block:'center',behavior:'auto'})})}
}
function decorateAutomationIssues(){
 let count=0;
 for(const side of ['Buying','Selling']){
  const card=$('#mp-core-'+side.toLowerCase()+'-card');if(!card)continue;
  card.querySelector('.mp-lane-alert')?.remove();
  const issue=automationIssue(side);if(!issue)continue;
  count++;
  const button=document.createElement('button');button.type='button';button.className='mp-lane-alert';button.innerHTML='<strong>⚠ '+esc(issue.title)+'</strong><small>'+esc(issue.detail)+' <span>Fix →</span></small>';button.onclick=()=>openAutomationResolution(issue);card.append(button)
 }
 const core=$('#mp-core');if(core)core.dataset.issues=String(count)
}
function decorateOperations(){
 if((nativeState.sellingScopeVersion||0)<1){nativeState.sellingScopeVersion=1;if(laneEnabled.Selling)rows.forEach(enableSellingListing);saveSoon()}
 decorateAutomationIssues();
 if(settings)return;
 if(['Discover','Buying'].includes(view)){
  const scan=nativeState.jobs.find(j=>j.kind==='scan'&&j.state==='running');
  const status=$('.mp-toolbar-state');if(status)status.textContent=!nativeState.scanning?'Sourcing stopped':scan?'Finding deals':!nativeState.connected?'Waiting for AI connection':'Sourcing on · '+(auto.mode==='Auto-negotiate'?'Auto-negotiate':'Find only')+' · '+sourcingTiming();
 }
 if(view==='Selling'){
  const enabled=rows.filter(r=>r.view==='Selling'&&workFor(r).enabled).length,monitored=rows.filter(r=>r.view==='Selling'&&monitoringWanted(r)).length,status=$('.mp-toolbar-state');if(status)status.textContent=laneEnabled.Selling?(monitored?'Monitoring '+monitored+' listings · Automatic replies '+enabled:rows.some(r=>r.view==='Selling')?'No eligible live listings':'No selling listings'):'Selling automation paused';
  $$('details.mp-work-card').forEach(card=>{const r=rows.find(r=>r.id===+card.dataset.id);if(!r)return;const glance=card.querySelector('.mp-work-glance>span:not(.mp-hot)');if(glance)glance.textContent=conversationCount(r)});
  const r=rows.find(r=>r.id===selected);if(r?.importedLive&&$('#mp-detail')){const w=workFor(r),button=document.createElement('button');button.id='vx-monitor';button.className='mp-small-button';button.textContent=w.monitorPaused?'Start monitoring':'Pause monitoring';button.disabled=!!w.enabled;button.title=w.enabled?'Pause AI replies before pausing monitoring':'Checks messages while Vector is open';button.onclick=()=>{w.monitorPaused=!w.monitorPaused;if(!w.monitorPaused)queueJob('sync',r);else nativeState.jobs.filter(j=>j.itemId===r.id&&j.kind==='sync'&&j.recurring&&j.state==='queued').forEach(j=>j.state='cancelled');render();saveSoon()};detailActionBar().append(button)}if(r&&!workFor(r).syncComplete&&!workFor(r).leads.length){const empty=$('#mp-detail .mp-spec');if(empty)empty.textContent='Existing chats have not been imported.'}
 }
}
