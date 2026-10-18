// BOARD OF LIGHT XIV: ordered startup. Each tool owns its data, UI and storage.
(()=>{
 const host=location.hostname.toLowerCase().replace(/^\[|\]$/g,''),parts=host.split('.').map(Number);
 const ipv4=parts.length===4&&parts.every(part=>Number.isInteger(part)&&part>=0&&part<=255);
 const local=host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host==='::1'||
  ipv4&&(parts[0]===127||parts[0]===10||parts[0]===192&&parts[1]===168||parts[0]===172&&parts[1]>=16&&parts[1]<=31||parts[0]===169&&parts[1]===254)||
  host.includes(':')&&/^(?:f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)/.test(host);
 document.title+=location.protocol==='file:'?'-オフライン':local?'-localhost':'';
})();
document.documentElement.classList.add('app-restoring');window.boardStorageStarting=true;
let appRevealScheduled=false;
function revealRestoredApp(){if(window.boardStorageStarting||appRevealScheduled)return;appRevealScheduled=true;requestAnimationFrame(()=>{requestAnimationFrame(()=>{document.querySelector('.app')?.removeAttribute('inert');document.querySelector('.app')?.removeAttribute('aria-busy');document.documentElement.classList.remove('app-restoring')})})}
window.addEventListener('load',revealRestoredApp,{once:true});
(() => {
 const base = new URL('.', document.currentScript.src);
 function expectedIntegrity(file){
  const hash=window.BolxivIntegrity?.files[file];
  if(!hash)throw new Error('照合表にないファイルです: '+file);
  return hash;
 }
 function startupStatus(message){const node=document.querySelector('.startup-status');if(node)node.textContent=message}
 function preloadScripts(files){
  function preload(file,attempt=0){return new Promise((resolve,reject)=>{
   const link=document.createElement('link');link.rel='preload';link.as='script';
   const hash=expectedIntegrity(file);if(window.BolxivIntegrityChecked){link.integrity=hash;link.crossOrigin='anonymous'}
   const url=new URL(file,base);if(attempt)url.searchParams.set('retry',String(attempt));
   link.href=url.href;link.onload=resolve;
   link.onerror=()=>{link.remove();if(attempt<2)setTimeout(()=>preload(file,attempt+1).then(resolve,reject),300*(attempt+1));else reject(new Error('読み込みまたは整合性検査に失敗しました: '+file))};
   document.head.append(link);
   if(!window.BolxivIntegrityChecked)resolve();
  })}
  return Promise.all(files.map(file=>preload(file)));
 }
 function load(file, attempt=0) {
  return new Promise((resolve,reject) => {
   const script=document.createElement('script'),url=new URL(file,base);
   const hash=expectedIntegrity(file);if(window.BolxivIntegrityChecked){script.integrity=hash;script.crossOrigin='anonymous'}
   if(attempt)url.searchParams.set('retry',String(attempt));
   script.src=url.href;script.async=false;
   const runtimeError=event=>{if(event.filename===script.src){cleanup();reject(event.error||new Error(event.message))}};
   const cleanup=()=>window.removeEventListener('error',runtimeError);
   window.addEventListener('error',runtimeError);
   script.onload=()=>{cleanup();resolve()};
   script.onerror=()=>{cleanup();script.remove();if(attempt<2)setTimeout(()=>load(file,attempt+1).then(resolve,reject),300*(attempt+1));else reject(new Error('読み込みまたは整合性検査に失敗しました: '+file))};
   document.head.append(script);
  });
 }
 function showStartupError(error) {
  if(window.Bolxiv.startupError)return;
  window.Bolxiv.ready=false;window.Bolxiv.startupError=String(error?.message||error);
  window.boardStorageStarting=false;console.error(error);
  document.documentElement.classList.remove('app-restoring');
  document.body.style.removeProperty('display');
  const panel=document.createElement('main');panel.id='startupError';panel.setAttribute('role','alert');
  const title=document.createElement('h1');title.textContent='ツールを起動できませんでした';
  const message=document.createElement('p');message.textContent='再読み込みしてください。解消しない場合は、同じ配布物のファイル一式で更新してください。保存データは削除されません。';
  const detail=document.createElement('p');detail.textContent=window.Bolxiv.startupError;
  const retry=document.createElement('button');retry.type='button';retry.textContent='再読み込み';retry.onclick=()=>location.reload();
  panel.append(title,message,detail,retry);document.body.replaceChildren(panel);
 }
 function showSessionBlocked(){
  window.Bolxiv.ready=false;window.boardStorageStarting=false;
  if(document.getElementById('sessionBlocked'))return;
  document.querySelector('.app')?.setAttribute('inert','');
  document.body.classList.add('session-blocked');
  document.documentElement.classList.remove('app-restoring');
  document.body.style.removeProperty('display');
  const panel=document.createElement('main');panel.id='sessionBlocked';panel.setAttribute('role','alert');
  const title=document.createElement('h1');title.textContent='別のタブですでに開いています';
  const message=document.createElement('p');message.textContent='このタブで使う場合は、先に開いたタブを閉じてから再試行してください。';
  const retry=document.createElement('button');retry.type='button';retry.textContent='再試行';retry.onclick=()=>location.reload();
  // Preserve initialized DOM references for pending observers and save callbacks.
  panel.append(title,message,retry);document.body.append(panel);
 }
 window.Bolxiv = { async startApplication() {
  // Layout-sensitive setup waits for styles; downloads and storage restoration
  // have already started while those styles were loading.
  startupStatus('ファイルを確認しています…');
  await Promise.all([stylesReady,window.BolxivApplicationScripts]);
  const files=Object.values(window.BolxivFiles).flat();let completed=0;
  startupStatus('画面を準備しています…');
  for(const file of files){await load(file);completed++;if(completed%10===0)startupStatus('画面を準備しています… '+completed+' / '+files.length)}
  Object.defineProperty(window.Bolxiv,'state',{get:()=>({data,selected,selectedIds,boardReadOnly})});
  window.Bolxiv.actions={selectPhase:(index)=>selectPhase(index),render:()=>renderAndSave(),flush:()=>flushScheduledBoardSave()};
  // Initial mobile fit and layout observers must settle before accepting interaction.
  startupStatus('表示を整えています…');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  window.Bolxiv.ready=true;
 },showStartupError,showSessionBlocked};
 const styles=Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
 const stylesReady=window.BolxivIntegrityStyles.then(()=>{
  for(const link of styles)if(link.media==='print')link.media='all';
  document.documentElement.classList.add('app-shell-ready');
  document.body.style.removeProperty('display');
 });
 // Fetch scripts and restore IndexedDB without waiting for slow CSS transfers.
 stylesReady.catch(showStartupError);
 load('js/session-guard.js').then(()=>window.BolxivSession.acquire()).then(acquired=>{
  if(!acquired){showSessionBlocked();return}
  return load('js/load-order.js').then(()=>{
  window.BolxivApplicationScripts=preloadScripts(Object.values(window.BolxivFiles).flat());
  window.BolxivApplicationScripts.catch(()=>{});
  startupStatus('保存データを読み込んでいます…');
  return load('js/storage-bootstrap.js');
  });
 }).catch(showStartupError);
})();
