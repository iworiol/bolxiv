// One editor per browser storage origin. Web Locks survive background throttling;
// LAN HTTP uses an IndexedDB lease, checked atomically before every write.
window.BolxivSession=(()=>{
 const name='bolxiv-editor-tactica-board-v1',key='bolxiv-editor-lease-v1',releasedKey=name+'-released',ttl=30000;
 const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
 let owned=false,db=null,timer=null,unlock=null,webLock=false;
 function block(){owned=false;clearInterval(timer);window.Bolxiv.showSessionBlocked()}
 function lease(acquire=false){return new Promise((resolve,reject)=>{
  const tx=db.transaction('boards','readwrite'),store=tx.objectStore('boards');let accepted=false;
  const request=store.get(key);
  request.onsuccess=()=>{
   const record=request.result;let released=null;try{released=localStorage.getItem(releasedKey)}catch{}
   if(!record||record.token===token||acquire&&(record.expires<=Date.now()||record.token===released)){accepted=true;store.put({token,expires:Date.now()+ttl},key)}
  };
  tx.oncomplete=()=>resolve(accepted);tx.onabort=()=>reject(tx.error||new Error('タブの使用状況を確認できません'));tx.onerror=()=>{};
 })}
 async function acquire(){
  if(navigator.locks){
   webLock=true;
   return new Promise((resolve,reject)=>navigator.locks.request(name,{ifAvailable:true},lock=>{
    if(!lock){resolve(false);return}
    owned=true;resolve(true);return new Promise(release=>unlock=release);
   }).catch(reject));
  }
  db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('tactica-board-storage',2);
   request.onupgradeneeded=()=>{for(const store of ['boards','images'])if(!request.result.objectStoreNames.contains(store))request.result.createObjectStore(store)};
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('別のタブを閉じて再試行してください'));
  });
  db.onversionchange=()=>{db.close();block()};
  owned=await lease(true);
  if(owned)timer=setInterval(()=>lease().then(valid=>{if(!valid)block()}).catch(block),5000);
  return owned;
 }
 function guardWrite(store,tx,action){
  if(!owned){tx.abort();block();return}
  if(webLock){action();return}
  const request=store.get(key);
  request.onsuccess=()=>{
   if(request.result?.token!==token){tx.abort();block();return}
   store.put({token,expires:Date.now()+ttl},key);
   try{action()}catch(error){tx.abort();console.error(error)}
  };
 }
 window.addEventListener('pagehide',()=>{
  if(!owned)return;
  // Queue final saves before allowing another document to take over.
  if(typeof flushScheduledBoardSave==='function')flushScheduledBoardSave();
  if(webLock){owned=false;unlock?.();return}
  clearInterval(timer);owned=false;
  // An unload can cancel its asynchronous IDB delete. The next claim checks
  // this synchronous release marker inside its serialized IDB transaction.
  try{localStorage.setItem(releasedKey,token)}catch{}
  const tx=db.transaction('boards','readwrite'),store=tx.objectStore('boards'),request=store.get(key);
  request.onsuccess=()=>{if(request.result?.token===token)store.delete(key)};
 });
 window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&owned&&!webLock)lease().then(valid=>{if(!valid)block()}).catch(block)});
 return {acquire,guardWrite,get owned(){return owned}};
})();

;

async function initializeBoardStorage(){
 const key='tactica-board-v1';let db=null,storageError=null,pending=null,worker=null,lastSaved=null,revision=0,clearing=false,warned=false,editingSavePending=false,savedImageIds=new Set();
 function status(text){const node=document.getElementById('saved');if(node)node.textContent=text==='保存済み'&&typeof boardSavePending!=='undefined'&&boardSavePending&&!boardSaveNavigationOnly?'未保存の変更あり':text}
 function report(error){if(!window.BolxivSession.owned)return;status('未保存');console.warn('Board persistence failed',error);if(!warned){warned=true;if(typeof notify==='function')notify('自動保存できません：'+(error?.message||String(error))+'。エクスポートで保存してください。')}}
 function transaction(mode,action){return new Promise((resolve,reject)=>{let tx;try{tx=db.transaction(['boards','images'],mode);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('保存処理が中断されました'));tx.onerror=()=>{};const boards=tx.objectStore('boards'),images=tx.objectStore('images');if(mode==='readwrite')window.BolxivSession.guardWrite(boards,tx,()=>action(boards,images));else action(boards,images)}catch(error){if(tx)try{tx.abort()}catch{}reject(error)}})}
 async function drain(){while(pending&&!clearing){const item=pending;pending=null;try{
  if(storageError)throw storageError;
  const nextIds=new Set(item.imageAssets.map(([id])=>id));
  await transaction('readwrite',(store,images)=>{
   for(const [id,record] of item.imageAssets)if(!savedImageIds.has(id))images.put(record,id);
   for(const id of savedImageIds)if(!nextIds.has(id))images.delete(id);
   store.put(item.value,key);
  });
  savedImageIds=nextIds;lastSaved=item.value;
  try{localStorage.removeItem(key)}catch{}
  if(item.revision===revision){if(editingSavePending||warned)status('保存済み');editingSavePending=false;warned=false}
 }catch(error){if(item.revision===revision)report(error)}}}
 function startWorker(){if(worker||!pending||clearing)return;worker=drain().finally(()=>{worker=null;if(pending&&!clearing)startWorker()})}
 window.boardStorage={save(value,{navigationOnly=false,imageAssets=[]}={}){
  if(clearing||!window.BolxivSession.owned)return false;
  if(value===lastSaved&&!pending&&!worker){if(!navigationOnly||warned)status('保存済み');return true}
  if(!navigationOnly)editingSavePending=true;pending={value,imageAssets,revision:++revision};if(editingSavePending)status('保存中…');startWorker();return true;
 },async flush(){while(worker||pending){startWorker();if(worker)await worker;else break}},async clear(){clearing=true;pending=null;revision++;if(worker)await worker;try{if(storageError)throw storageError;await transaction('readwrite',(store,images)=>{store.delete(key);images.clear()});lastSaved=null;savedImageIds.clear()}catch(error){clearing=false;throw error}},get saving(){return !!(pending||worker)}};
 window.addEventListener('beforeunload',event=>{if(typeof flushScheduledBoardSave==='function')flushScheduledBoardSave();if(window.boardStorage.saving||(typeof boardSavePending!=='undefined'&&boardSavePending)){event.preventDefault();event.returnValue=''}});
 try{
  db=await new Promise((resolve,reject)=>{const request=indexedDB.open('tactica-board-storage',2);request.onupgradeneeded=()=>{for(const name of ['boards','images'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('別のタブを閉じてから開き直してください'))});
  db.onversionchange=()=>{db.close();storageError=new Error('保存先が更新されました。ページを開き直してください')};
  let stored;const initialImages=[];
  await transaction('readonly',(store,images)=>{
   const request=store.get(key);request.onsuccess=()=>{stored=request.result};
   const cursor=images.openCursor();cursor.onsuccess=()=>{const entry=cursor.result;if(entry){initialImages.push([entry.key,entry.value]);entry.continue()}};
  });
  window.boardInitialImages=initialImages;savedImageIds=new Set(initialImages.map(([id])=>id));
  if(stored!=null){const parsed=JSON.parse(stored);if(!Array.isArray(parsed.contents)&&!Array.isArray(parsed.pages))throw new Error('保存データの形式が不正です');window.boardInitialState=stored;lastSaved=stored}
 }catch(error){storageError=error;console.error('Board storage initialization failed',error)}
 try{await window.Bolxiv.startApplication()}catch(error){window.Bolxiv.showStartupError(error)}finally{window.boardStorageStarting=false;revealRestoredApp();if(storageError&&window.Bolxiv.ready)report(storageError)}
}
;
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
 function load(file, attempt=0) {
  return new Promise((resolve,reject) => {
   const script=document.createElement('script'),url=new URL(file,base);
   const hash=expectedIntegrity(file);if(window.BolxivIntegrityChecked){script.integrity=hash;script.crossOrigin='anonymous'}
   if(window.BolxivIntegrityChecked)url.searchParams.set('integrity',hash);
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
  await stylesReady;
  await load('js/application.js');
  const files=window.BolxivApplicationFiles;let completed=0;
  if(!Array.isArray(files)||!files.length)throw new Error('Application file list is missing');
  startupStatus('画面を準備しています…');
  for(const file of files){await load(file);completed++;if(completed%10===0)startupStatus('画面を準備しています… '+completed+' / '+files.length)}
  Object.defineProperty(window.Bolxiv,'state',{get:()=>({data,selected,selectedIds,boardReadOnly})});
  window.Bolxiv.actions={selectPhase:(index)=>selectPhase(index),render:()=>renderAndSave(),flush:()=>flushScheduledBoardSave()};
  // Initial mobile fit and layout observers must settle before accepting interaction.
  startupStatus('表示を整えています…');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  window.Bolxiv.ready=true;
 },showStartupError,showSessionBlocked};
 const stylesReady=window.BolxivIntegrityStyles.then(()=>{
  // Bounded loading adds links over time: collect them after all styles arrive.
  for(const link of document.querySelectorAll('link[rel="stylesheet"]'))if(link.media==='print')link.media='all';
  document.documentElement.classList.add('app-shell-ready');
  document.body.style.removeProperty('display');
 });
 // Fetch scripts and restore IndexedDB without waiting for slow CSS transfers.
 stylesReady.catch(showStartupError);
 window.BolxivSession.acquire().then(acquired=>{
  if(!acquired){showSessionBlocked();return}
  startupStatus('保存データを読み込んでいます…');
  return initializeBoardStorage();
 }).catch(showStartupError);
})();
