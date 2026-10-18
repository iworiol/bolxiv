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
