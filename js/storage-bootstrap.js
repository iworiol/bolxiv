
(async function initializeBoardStorage(){
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
})();
