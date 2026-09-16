async function refresh(){
 const saved=await chrome.storage.local.get(['status']);
 let live={connected:false,tabConnected:false};try{live=await chrome.runtime.sendMessage({action:'status'})||live}catch{}
 const connect=document.getElementById('connect'),disconnect=document.getElementById('disconnect');
 if(live.connected&&live.tabConnected){document.getElementById('status').textContent='Connected to Vector. Marketplace is ready.';connect.textContent='Connected';connect.disabled=true;disconnect.hidden=false}
 else if(live.connected){document.getElementById('status').textContent='Vector is connected. Open Marketplace to continue.';connect.textContent='Open Marketplace';connect.disabled=false;disconnect.hidden=false}
 else{document.getElementById('status').textContent=saved.status||'Open Vector to connect.';connect.textContent='Connect Marketplace';connect.disabled=false;disconnect.hidden=true}
}
refresh();chrome.storage.onChanged.addListener(refresh);
document.querySelector('h1').title='Version '+chrome.runtime.getManifest().version;
const version=document.createElement('small');version.textContent='Companion '+chrome.runtime.getManifest().version;document.body.append(version);
for(const action of ['connect','disconnect'])document.getElementById(action).onclick=async()=>{const button=document.getElementById(action);button.disabled=true;try{const result=await chrome.runtime.sendMessage({action});if(result?.error)document.getElementById('status').textContent=result.error;else await refresh()}catch(e){document.getElementById('status').textContent=e.message}finally{button.disabled=false}};
