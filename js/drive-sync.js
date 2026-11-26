// Optional Google Drive connection. Only an unexpired, encrypted local session is restored.
// Ordinary/offline startup without that session makes no Google request.
(()=>{
 const CLIENT_ID='430642576168-9is64m233aggb80rd7lk2t9o34u80kvn.apps.googleusercontent.com';
 const SCOPE='https://www.googleapis.com/auth/drive.appdata',FORMAT='bolxiv-drive-workspace',MARKER='workspace-v1';
 const allowed=location.origin==='https://iworiol.github.io';
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 async function fingerprint(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('')}
 // Save immutable generations rather than race-prone replacement of one file. Concurrent
 // writers produce separate tips, so neither copy is silently overwritten. Retain 10 versions.
 async function packWorkspace(payload,assetHashes=new Map()){
  const parts=new Map();
  async function part(kind,value){let hash=kind==='asset'?assetHashes.get(value):null;if(!hash){hash=await fingerprint({kind,value});if(kind==='asset')assetHashes.set(value,hash)}if(!parts.has(hash))parts.set(hash,{kind,value,hash});return {hash,kind}}
  const {contents,phaseMasters,phaseMasterGroups,imageLibrary,...header}=payload.content;
  const {presets,...presetHeader}=payload.presets;
  const manifest={format:'bolxiv-drive-manifest',version:1,header:await part('header',header),
   contents:await Promise.all(contents.map(async({pages,...metadata})=>({metadata:await part('content',metadata),pages:await Promise.all(pages.map(page=>part('phase',page)))}))),
   fields:await Promise.all(phaseMasters.map(value=>part('field',value))),groups:await part('groups',phaseMasterGroups||[]),
   images:await Promise.all(Object.entries(imageLibrary||{}).map(async([id,{source,...metadata}])=>({id,metadata,source:await part('asset',source)}))),
   presetHeader:await part('header',presetHeader),presets:await Promise.all(presets.map(async preset=>{
    const value=JSON.parse(JSON.stringify(preset)),sources=[];
    for(const [index,item]of value.items.entries())if(typeof item.src==='string'&&item.src.startsWith('data:image/')){sources.push({index,source:await part('asset',item.src)});delete item.src}
    return {data:await part('preset',value),sources};
   }))};
  return {manifest,parts};
 }
 async function limitedMap(items,fn){let next=0;const result=new Array(items.length);await Promise.all(Array.from({length:Math.min(3,items.length)},async()=>{while(next<items.length){const index=next++;result[index]=await fn(items[index],index)}}));return result}
 class DriveStore{
  constructor(token,onProgress=()=>{}){this.onProgress=onProgress;this.token=token;this.controller=new AbortController();this.partCache=new Map();this.localParts=new Map();this.assetHashes=new Map();this.plans=new WeakMap();this.knownParts=null}
  stop(){this.controller.abort();this.token='';this.partCache.clear();this.localParts.clear();this.assetHashes.clear();this.knownParts=null}
  async request(url,options={}){
   const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),30000),abort=()=>timeout.abort();this.controller.signal.addEventListener('abort',abort,{once:true});
   try{
    if(this.controller.signal.aborted)throw new DOMException('接続を終了しました','AbortError');
    const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+this.token,...options.headers},signal:timeout.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if(!r.ok){const error=new Error(r.status===401?'Googleへの再ログインが必要です':r.status===403?'Driveへの許可・空き容量・利用制限を確認してください':r.status===429?'Googleの利用制限です。少し待って再試行します':'Driveとの通信に失敗しました（'+r.status+'）');error.status=r.status;throw error}
    // Keep the timeout active until the response body has arrived as well.
    const bytes=await r.arrayBuffer();return new Response(bytes.byteLength?bytes:null,{status:r.status,statusText:r.statusText,headers:r.headers});
   }finally{clearTimeout(timer);this.controller.signal.removeEventListener('abort',abort)}
  }
  async account(){const r=await this.request('https://www.googleapis.com/drive/v3/about?fields=user(permissionId,photoLink)');const value=await r.json();if(!value.user?.permissionId)throw Error('接続先アカウントを確認できません');this.photoLink=typeof value.user.photoLink==='string'&&value.user.photoLink.startsWith('https://')?value.user.photoLink:'';return value.user.permissionId}
  async list(marker=MARKER){
   const result=[];let next='';do{
    const q=new URLSearchParams({spaces:'appDataFolder',q:"trashed=false and appProperties has { key='bolxiv' and value='"+marker+"' }",fields:'nextPageToken,files(id,createdTime,appProperties)',pageSize:'100',orderBy:'createdTime desc'});if(next)q.set('pageToken',next);
    const r=await this.request('https://www.googleapis.com/drive/v3/files?'+q),v=await r.json();if(!Array.isArray(v.files))throw Error('Driveの保存一覧が不正です');result.push(...v.files);next=v.nextPageToken||'';
   }while(next);return result;
  }
  tips(files){const parents=new Set(files.flatMap(file=>Object.entries(file.appProperties||{}).filter(([key])=>/^parent\d+$/.test(key)).map(([,value])=>value)));return files.filter(file=>!parents.has(file.id))}
  async readFile(id){return (await this.request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media')).json()}
  async plan(payload){let plan=this.plans.get(payload);if(!plan){plan=await packWorkspace(payload,this.assetHashes);this.plans.set(payload,plan)}return plan}
  async readPart(ref){
   if(!ref||typeof ref.id!=='string'||!ref.id||!/^([a-f0-9]{64})$/.test(ref.hash)||!['header','content','phase','field','groups','asset','preset'].includes(ref.kind))throw Error('保存データの参照が不正です');
   const key=ref.id+'/'+ref.hash;let promise=this.partCache.get(key);
   if(!promise&&this.localParts.get(ref.hash)?.kind===ref.kind){promise=Promise.resolve(this.localParts.get(ref.hash).value);this.partCache.set(key,promise)}
   if(this.knownParts)this.knownParts.set(ref.hash,{id:ref.id,appProperties:{hash:ref.hash,kind:ref.kind}});
   if(!promise){promise=this.readFile(ref.id).then(async value=>{if(value?.format!=='bolxiv-drive-part'||value.version!==1||value.kind!==ref.kind||value.hash!==ref.hash||await fingerprint({kind:value.kind,value:value.value})!==ref.hash)throw Error('保存データの一部が破損しています');return value.value});this.partCache.set(key,promise);promise.catch(()=>this.partCache.delete(key))}
   const value=await promise;return value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value;
  }
  async read(id,localPayload=null){
   const value=await this.readFile(id);if(value?.format!==FORMAT)throw Error('対応するDrive保存データではありません');
   if(value.version===1&&value.payload)return value.payload;
   const m=value.manifest;if(value.version!==2||m?.format!=='bolxiv-drive-manifest'||m.version!==1||!['contents','fields','images','presets'].every(k=>Array.isArray(m[k])))throw Error('対応するDrive保存形式ではありません');
   if(localPayload)this.localParts=(await this.plan(localPayload)).parts;
   const refs=[m.header,m.groups,m.presetHeader,...m.contents.flatMap(c=>[c.metadata,...c.pages]),...m.fields,...m.images.map(i=>i.source),...m.presets.flatMap(p=>[p.data,...p.sources.map(s=>s.source)])];
   await limitedMap(refs,ref=>this.readPart(ref));
   const content=await this.readPart(m.header);content.contents=await Promise.all(m.contents.map(async c=>({...await this.readPart(c.metadata),pages:await Promise.all(c.pages.map(ref=>this.readPart(ref)))})));
   content.phaseMasters=await Promise.all(m.fields.map(ref=>this.readPart(ref)));content.phaseMasterGroups=await this.readPart(m.groups);
   content.imageLibrary=Object.fromEntries(await Promise.all(m.images.map(async image=>[image.id,{...image.metadata,source:await this.readPart(image.source)}])));
   const presets=await this.readPart(m.presetHeader);presets.presets=await Promise.all(m.presets.map(async entry=>{const p=await this.readPart(entry.data);for(const {index,source}of entry.sources){if(!p.items?.[index])throw Error('プリセットの画像参照が不正です');p.items[index].src=await this.readPart(source)}return p}));return {content,presets};
  }
  async allocateIds(count){
   const result=[];while(result.length<count){const n=Math.min(100,count-result.length),value=await(await this.request('https://www.googleapis.com/drive/v3/files/generateIds?count='+n+'&space=appDataFolder&type=files')).json();if(!Array.isArray(value.ids)||value.ids.length!==n)throw Error('Driveの保存先を作れません');result.push(...value.ids)}return result;
  }
  async upload(value,appProperties,name,id){
   if(!id)throw Error('Driveの保存先がありません');
   const metadata={id,name,mimeType:'application/json',parents:['appDataFolder'],appProperties},content=new Blob([JSON.stringify(value)],{type:'application/json'});
   try{
    if(content.size<=4*1024*1024){
     const boundary='bolxiv-'+crypto.randomUUID(),body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(metadata),'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n',content,'\r\n--'+boundary+'--\r\n']);
     await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
    }else{
     const start=await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',{method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':'application/json'},body:JSON.stringify(metadata)});
     const url=start.headers.get('Location');if(!url||new URL(url).origin!=='https://www.googleapis.com')throw Error('Driveのアップロード先を確認できません');await this.request(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:content});
    }
   }catch(error){
    if(error.status===401||this.controller.signal.aborted)throw error;
    try{if(canonical(await this.readFile(id))!==canonical(value))throw error}catch{throw error}
   }return id;
  }
  async write(payload,parents){
   if(parents.length>16)throw Error('同時編集の分岐が多すぎます。JSONを保存して接続を解除してください');
   this.onProgress({stage:'prepare'});const {manifest,parts}=await this.plan(payload);if(!this.knownParts||!parents.length)this.knownParts=new Map((await this.list('part-v1')).map(f=>[f.appProperties?.hash,f]));const known=this.knownParts,refs=new Map(),missing=[...parts.values()].filter(p=>known.get(p.hash)?.appProperties?.kind!==p.kind),ids=await this.allocateIds(missing.length+1),assigned=new Map(missing.map((p,i)=>[p.hash,ids[i]]));let completed=0;this.onProgress({stage:'parts',done:0,total:missing.length});
   await limitedMap([...parts.values()],async part=>{
    const found=known.get(part.hash),ref={hash:part.hash,kind:part.kind,id:found?.appProperties?.kind===part.kind?found.id:await this.upload({format:'bolxiv-drive-part',version:1,...part},{bolxiv:'part-v1',hash:part.hash,kind:part.kind},'BOARD_OF_LIGHT_XIV_part_'+part.hash+'.json',assigned.get(part.hash))};refs.set(part.hash,ref);known.set(part.hash,{id:ref.id,appProperties:{hash:part.hash,kind:part.kind}});
    // Parts generated here are already verified and immutable.
    this.partCache.set(ref.id+'/'+ref.hash,Promise.resolve(part.value));if(assigned.has(part.hash))this.onProgress({stage:'parts',done:++completed,total:missing.length});
   });
   const link=value=>Array.isArray(value)?value.map(link):value&&typeof value==='object'?(Object.keys(value).length===2&&value.hash&&value.kind?refs.get(value.hash):Object.fromEntries(Object.entries(value).map(([key,v])=>[key,link(v)]))):value;
   this.onProgress({stage:'commit'});return this.upload({format:FORMAT,version:2,manifest:link(manifest)},{bolxiv:MARKER,summary:Array.from(String(payload.content.contents[0]?.title||'コンテンツ')).slice(0,24).join(''),...Object.fromEntries(parents.map((id,i)=>['parent'+i,id]))},'BOARD_OF_LIGHT_XIV_'+new Date().toISOString()+'.json',ids.at(-1));
  }
  // Parts are shared by retained generations and in-flight writers. Never delete them
  // during concurrent saves; only old root manifests use the existing ten-generation rule.
  async prune(files){if(this.tips(files).length!==1)return;await limitedMap(files.slice(10,13),item=>this.request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(item.id),{method:'DELETE'}))}
 }

 const trigger=document.createElement('button');trigger.type='button';trigger.id='googleLoginButton';trigger.className='btn';trigger.textContent='ログイン';trigger.setAttribute('role','menuitem');
 document.getElementById('headerActions').insertBefore(trigger,document.getElementById('workspaceBackgroundButton'));
 const dialog=document.createElement('dialog');dialog.id='googleLoginDialog';dialog.className='operation-guide drive-sync-dialog';dialog.setAttribute('aria-labelledby','googleLoginTitle');
 dialog.innerHTML='<div class="operation-guide-heading"><h2 id="googleLoginTitle">ログイン</h2><button type="button" class="btn" data-drive-close autofocus>閉じる</button></div><div class="operation-guide-body"><p>Google Driveへ編集内容を自動保存します。Driveのデータを読み込むのは起動・リロード時と初回ログイン時です。</p><p class="hint">ご自身のDrive内のアプリ専用領域を使用します。データと認証情報を開発者のサーバーへ送信・保管しません。背景画像・画面配置・Undo履歴は同期しません。</p><p id="googleDriveStatus" role="status" aria-live="polite"></p><div class="drive-sync-actions"><button type="button" class="btn" id="googleDriveConnect">Googleアカウントでログイン</button><button type="button" class="btn" id="googleDriveRetry" hidden>再試行</button><button type="button" class="btn" id="googleDriveDisconnect" hidden>ログアウト</button></div><section id="googleDriveChoice" hidden><h3>引き継ぐデータを選んでください</h3><p id="googleDriveChoiceText"></p><label for="googleDriveVersion">Driveの保存データ</label><select id="googleDriveVersion"></select><div class="drive-sync-actions"><button type="button" class="btn" id="googleDriveUseRemote">Driveのデータを使う</button><button type="button" class="btn" id="googleDriveUseLocal">この端末のデータを使う</button></div><p class="hint">選択前の端末内データは、このブラウザーに1世代退避します。Driveには直近10世代を保持します。選ばなかった内容は自動で合成しません。</p></section><section id="googleDriveRecovery" hidden><h3>読み込み前の端末データ</h3><p>直前に退避したデータをJSONへ書き出せます。新しい読み込み時には退避データも更新されます。</p><div class="drive-sync-actions"><button type="button" class="btn" id="googleDriveBackupContents">コンテンツを保存</button><button type="button" class="btn" id="googleDriveBackupPresets">プリセットを保存</button></div></section><p class="hint">編集中は変更をまとめて自動保存します。「保存済み」を確認してから別端末へ移ってください。別の端末で保存した続きはリロードして読み込みます。同時編集は推奨しません。接続は有効期限内ならリロード後も自動で復元します。期限が切れたら再ログインが必要です。オフラインでも端末内の保存とJSONは使えます。</p></div>';
 document.body.append(dialog);
 const node=id=>document.getElementById(id),connect=node('googleDriveConnect'),retry=node('googleDriveRetry'),logout=node('googleDriveDisconnect'),choice=node('googleDriveChoice'),versions=node('googleDriveVersion'),status=node('googleDriveStatus');
 let store=null,account='',base=null,baseline='',busy=false,applying=false,dirty=false,epoch=0,timer=null,expires=null,lastUpload=0,retries=0,sdk=null,client=null,meta=null,backedUp=null,changeRevision=0,readLock=null,resumePending=false,restoreTask=null,reloadRequired=false;
 let dbPromise=null,connectionExpiresAt=0;
 function database(){return dbPromise??=new Promise((resolve,reject)=>{const request=indexedDB.open('bolxiv-drive-sync',1);request.onupgradeneeded=()=>request.result.createObjectStore('settings');request.onsuccess=()=>resolve(request.result);request.onerror=()=>{dbPromise=null;reject(request.error)}})}
 async function localRecord(key,value,write=false){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('settings',write?'readwrite':'readonly'),r=write?tx.objectStore('settings').put(value,key):tx.objectStore('settings').get(key);tx.oncomplete=()=>resolve(r.result);tx.onabort=()=>reject(tx.error||Error('同期状態を保存できません'));tx.onerror=()=>{}})}
 const authDisabledKey='bolxiv-drive-auth-disabled';
 function authDisabled(){try{return localStorage.getItem(authDisabledKey)==='1'}catch{return true}}
 function forgetAuth(reason='signed-out'){try{if(reason==='reauth'&&authHistory()!=='reauth')localStorage.removeItem('bolxiv-drive-notice-dismissed');localStorage.setItem('bolxiv-drive-auth-state',reason);localStorage.setItem(authDisabledKey,'1')}catch{}return localRecord('auth',null,true).catch(()=>{})}
 async function persistAuth(token,expiresAt,owner){
  let key=await localRecord('auth-key');if(!(key instanceof CryptoKey)){key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);await localRecord('auth-key',key,true)}
  const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify({token,expiresAt,owner})));
  await localRecord('auth',{expiresAt,iv,cipher},true);try{localStorage.removeItem(authDisabledKey);localStorage.setItem('bolxiv-drive-auth-state','connected');localStorage.removeItem('bolxiv-drive-notice-dismissed')}catch{}
 }
 function restoreConnection({readAtConnect=false}={}){if(!restoreTask)restoreTask=restoreSavedConnection(readAtConnect).finally(()=>restoreTask=null);return restoreTask}
 async function restoreSavedConnection(readAtConnect){
  if(!allowed||busy||store)return;if(authDisabled()){if(authHistory()==='reauth')say('再ログインが必要。Googleアカウントでログインしてください');return;}const saved=await localRecord('auth').catch(()=>null);if(!saved)return;
  if(!Number.isFinite(saved.expiresAt)||saved.expiresAt<=Date.now()+30000){await forgetAuth('reauth');say('接続期限切れ。再ログインしてください');return}
  if(busy||store)return;busy=true;paint();
  try{
   const key=await localRecord('auth-key');if(!(key instanceof CryptoKey))throw Error('接続情報を復元できません');
   const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:saved.iv},key,saved.cipher),record=JSON.parse(new TextDecoder().decode(bytes));
   if(typeof record.token!=='string'||!record.token||record.expiresAt!==saved.expiresAt||typeof record.owner!=='string')throw Error('接続情報が不正です');
   await activate(record.token,record.expiresAt,{restoring:true,owner:record.owner,readAtConnect});
  }catch{await forgetAuth('reauth');say('再ログインが必要。接続情報を復元できませんでした')}finally{busy=false;paint()}
 }
 function authHistory(){try{return localStorage.getItem('bolxiv-drive-auth-state')||''}catch{return ''}}
 function paintConnection(){
  let dismissed=false;try{dismissed=localStorage.getItem('bolxiv-drive-notice-dismissed')==='1'}catch{}
  persistentNotice(allowed&&authHistory()==='reauth'&&!dismissed?'Google Driveへの再ログインが必要です。再ログインすると自動保存を再開します。編集内容は端末内に保存されます。':null,()=>{try{localStorage.setItem('bolxiv-drive-notice-dismissed','1')}catch{}});
  const button=document.querySelector('.phone-menu-toggle');if(!button)return;
  const state=!allowed?'disconnected':authHistory()==='reauth'&&!store?'reauth':!store&&(busy||authHistory()==='connected'&&!authDisabled()&&!resumePending)?'checking':resumePending||store&&!navigator.onLine?'offline':store?'connected':'disconnected';
  const labels={disconnected:'未接続',connected:'接続中',reauth:'再ログインが必要',checking:'接続確認中',offline:'通信できません'};
  if(button.dataset.driveState!==state){button.dataset.driveState=state;const svg=button.querySelector('svg');if(svg)svg.innerHTML=state==='disconnected'?'<path d="M4 6h16M4 12h16M4 18h16"/>':'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>';let badge=button.querySelector('.drive-connection-mark');if(!badge){badge=document.createElement('span');badge.className='drive-connection-mark';badge.setAttribute('aria-hidden','true');button.append(badge)}badge.textContent=state==='reauth'?'!':state==='checking'?'…':state==='offline'?'!':'';}
  let photo=button.querySelector('.drive-profile-photo');const url=store?.photoLink||'';if(url){if(!photo){photo=document.createElement('img');photo.className='drive-profile-photo';photo.alt='';photo.referrerPolicy='no-referrer';photo.onerror=()=>{photo.hidden=true;button.querySelector('svg').style.display=''};button.prepend(photo)}if(photo.getAttribute('src')!==url){photo.hidden=false;photo.src=url}button.querySelector('svg').style.display=photo.hidden?'':'none'}else{photo?.remove();button.querySelector('svg').style.display=''}
  button.title='操作メニュー：'+labels[state];button.setAttribute('aria-label',button.title);
 }
 function say(text,{saving=false}={}){
  if(status.textContent!==text)status.textContent=text;
  const saved=text.startsWith('保存済み'),needsLogin=text.startsWith('接続期限切れ')||text.startsWith('再ログインが必要');
  const state=needsLogin?'再ログインが必要':resumePending?'同期を確認':!store||saved?'保存済み':text==='保存待ち'?'未保存の変更あり':(saving||text==='保存中…')?'保存中…':text==='読み込み中…'?'読み込み中…':'同期を確認';
  if(window.BolxivSaveStatus.get('drive')!==state)window.BolxivSaveStatus.set('drive',state);
  const label=store?'ログイン・同期状態':'ログイン';if(trigger.textContent!==label)trigger.textContent=label;paintConnection();
 }
 function lockForRead(){if(readLock)return;const app=document.querySelector('.app');readLock={app,inert:app.inert,busy:app.getAttribute('aria-busy')};app.inert=true;app.setAttribute('aria-busy','true')}
 function unlockRead(){if(!readLock)return;const {app,inert,busy}=readLock;readLock=null;app.inert=inert;if(busy===null)app.removeAttribute('aria-busy');else app.setAttribute('aria-busy',busy)}

 function paint(){paintConnection();connect.hidden=!!store;logout.hidden=!store;retry.hidden=(!store&&!resumePending)||busy||!choice.hidden;retry.textContent=reloadRequired?'再読み込み':'再試行';node('googleDriveRecovery').hidden=!backedUp;dialog.querySelector('[data-drive-close]').disabled=busy;connect.disabled=busy||!allowed||!window.google?.accounts?.oauth2;logout.disabled=busy;node('googleDriveUseRemote').disabled=node('googleDriveUseLocal').disabled=busy}
 function payload(){if(window.Bolxiv.phaseMasters.active)window.Bolxiv.phaseMasters.commit();if(!window.Bolxiv.phaseMasters.active)contentBoards[activeContent]=data;return {content:jsonExportPayload(contentBoards,true),presets:userPresetLibrary.syncPayload()}}
 function empty(value){const c=value.content;return !c.phaseMasters.length&&!c.phaseMasterGroups.length&&!value.presets.presets.length&&c.contents.length===1&&c.contents[0].title==='新規コンテンツ1'&&c.contents[0].pages.length===1&&!c.contents[0].pages[0].length&&(c.contents[0].pageNames||[]).every(n=>n==='新規フェーズ')&&!(c.contents[0].phaseGroups||[]).length&&!(c.contents[0].pageNotes||[]).some(Boolean)}
 function editing(){return !!document.querySelector('input:focus,textarea:focus,[contenteditable="true"]:focus,.selection-marquee')||!!window.Bolxiv.pngPreview?.active||!!document.querySelector('dialog[open]:not(#googleLoginDialog)')}
 async function remember(hash){meta={account,base,hash};await localRecord('state',meta,true);baseline=hash}
 async function backup(value){await localRecord('backup',value,true);backedUp=value;paint()}
 function validate(value){
  if(!value?.content||value.content.version!==5||!Array.isArray(value.content.contents)||!value.content.contents.length||value.content.contents.some(c=>!c||!Array.isArray(c.pages)||!c.pages.length||c.pages.some(p=>!Array.isArray(p))))throw Error('Driveのコンテンツデータが不正です');
  const boards=parseImportedBoards(JSON.stringify(value.content)),presets=userPresetLibrary.prepareSync(value.presets);return {boards,presets};
 }
 async function install(value){
  if(!dialog.open)lockForRead();
  const prepared=validate(value),previous=payload(),previousPrepared=validate(previous);await backup(previous);applying=true;
  try{
   await window.Bolxiv.setMode('edit');if(readLock)readLock.app.inert=true;if(window.Bolxiv.phaseMasters.active)window.Bolxiv.phaseMasters.leave();
   userPresetLibrary.replaceForSync(prepared.presets);applyImportedBoards(prepared.boards,'replace',{preserveFieldIds:true});await window.boardStorage.flush();
   if(window.BolxivSaveStatus.get('content')==='未保存')throw Error('読み込んだデータを端末に保存できません');
  }catch(error){
   try{userPresetLibrary.replaceForSync(previousPrepared.presets);applyImportedBoards(previousPrepared.boards,'replace',{preserveFieldIds:true});await window.boardStorage.flush()}catch{say('端末への保存に失敗。退避JSONを保存してください')}
   throw error;
  }finally{applying=false}
 }
 function offer(files,message){choice.hidden=false;versions.replaceChildren();for(const file of files){const option=document.createElement('option');option.value=file.id;option.textContent=new Date(file.createdTime).toLocaleString()+' '+(file.appProperties?.summary||'保存データ');versions.append(option)}versions.hidden=!files.length;dialog.querySelector('label[for=googleDriveVersion]').hidden=!files.length;node('googleDriveUseRemote').hidden=!files.length;node('googleDriveChoiceText').textContent=message;clearTimeout(timer);say('データの選択が必要');paint();if(!dialog.open)dialog.showModal()}
 function pauseForReload(message){reloadRequired=true;clearTimeout(timer);say(message+' この端末の変更は保持しています。読み込むにはリロードしてください。');paint()}
 function fail(error,action='auto'){
  clearTimeout(timer);if(error.name==='AbortError'&&!store)return;
  if(error.status===401){disconnect(false,{reason:'reauth'});dirty=true;say('再ログインが必要。端末内の内容は保持しています');paint();return}
  say((navigator.onLine?'同期できません：'+error.message:'オフライン。端末内に保存しています')+'。JSONへの保存も利用できます');
  if(action==='startup'){reloadRequired=true;paint();return}
  if(store&&!reloadRequired&&choice.hidden&&retries<5){timer=setTimeout(()=>run(action),Math.min(60000,5000*2**retries++))}paint();
 }
 async function pull(file,session,current){const value=await store.read(file.id,current);if(session!==epoch)return;validate(value);if(changeRevision!==pull.revision||editing()&&!dialog.open){offer([file],'Drive側が更新されました。編集中の内容を確認して選んでください。');return}await install(value);if(session!==epoch)return;base=file.id;dirty=false;await remember(await fingerprint(payload()));say('保存済み');}
 async function run(action='auto'){
  if(!store||busy)return;if((reloadRequired||!choice.hidden)&&action==='auto')return;if(drag){schedule();return;}if(!userPresetLibrary.syncReady()){schedule();return;}const session=epoch;let revision=changeRevision;busy=true;paint();
  try{
   flushScheduledBoardSave();await window.boardStorage.flush();if(window.BolxivSaveStatus.get('content')==='未保存'||window.BolxivSaveStatus.get('presets')==='未保存')throw Error('端末内の保存を確認してください');
   const current=payload();revision=changeRevision;const hash=await fingerprint(current);if(action==='auto'&&hash===baseline){dirty=false;say('保存済み');return}const files=await store.list();if(session!==epoch)return;const tips=store.tips(files);
   if(action==='remote'){
    const id=versions.value,file=tips.find(f=>f.id===id);if(!file)throw Error('Driveが更新されました。再試行してください');
    const remote=await store.read(id,current);if(session!==epoch)return;validate(remote);
    // Publish the explicit choice before changing local data; preserve every competing version.
    const resolved=tips.length>1?await store.write(remote,tips.map(f=>f.id)):id;if(session!==epoch)return;
    await install(remote);base=resolved;await remember(await fingerprint(payload()));dirty=false;choice.hidden=true;say('保存済み');return;
   }
   if(action==='auto'){const expected=base||(meta?.account===account?meta.base:null);if(tips.length>1||(tips[0]?.id||null)!==expected){pauseForReload('別の端末でDriveのデータが更新されているため、上書きを止めました。');return}if(!base&&expected)base=expected}
   if(action!=='local'&&tips.length>1){offer(tips,'別の端末で同時に編集されたデータがあります。残す内容を選んでください。');return}
   const tip=tips[0]||null,known=meta?.account===account;
   if(action!=='local'&&!base){
    if(!tip){if(!known&&!empty(current)){offer([],'Driveに保存データがありません。この端末の全コンテンツ・フィールド・プリセットを、このアカウントへ保存しますか？');return}}
    else if(known&&meta.base===tip.id){base=tip.id;baseline=meta.hash;if(hash===meta.hash){dirty=false;say('保存済み');return}}
    else if(action==='startup'&&((known&&hash===meta.hash)||empty(current))){pull.revision=revision;await pull(tip,session,current);return}
    else{offer(tips,'この端末とDriveの両方にデータがあります。引き継ぐ内容を選んでください。');return}
   }
   if(action!=='local'&&(tip?.id||null)!==base){
    if(action==='startup'&&hash===baseline&&tip){pull.revision=revision;await pull(tip,session,current);return}
    offer(tips,'この端末とDriveの両方で変更されています。自動上書きせず停止しました。');return;
   }
   if(action!=='local'&&hash===baseline){dirty=false;say('保存済み');return}
   say('保存中…');const id=await store.write(current,tips.map(f=>f.id));if(session!==epoch)return;base=id;lastUpload=Date.now();await remember(hash);dirty=changeRevision!==revision;choice.hidden=true;retries=0;
   const after=await store.list();if(session!==epoch)return;if(store.tips(after).length>1){if(action==='auto')pauseForReload('同時編集を検出しました。両方の保存データを保持して停止しました。');else offer(store.tips(after),'同時編集を検出しました。両方の保存データを保持しています。');return}
   say(dirty?'保存待ち':'保存済み');if(dirty)schedule();
   // Cleanup failure must never turn a successful upload into an automatic duplicate write.
   try{await store.prune(after)}catch{say('保存済み（過去データの整理は次回行います）')}
  }catch(error){if(session===epoch)fail(error,action)}finally{busy=false;paint();unlockRead()}
 }
 function schedule(){clearTimeout(timer);if(!store||reloadRequired||!choice.hidden)return;say('保存待ち');timer=setTimeout(()=>run(),Math.max(1500,5000-(Date.now()-lastUpload)))}
 function changed(event){
  if(applying||window.boardStorageStarting)return;
  // Only semantic edits. Navigation-only persistence and status repaints don't upload.
  const source=event.detail?.source,state=window.BolxivSaveStatus.get(source);if(!['content','presets'].includes(source)||!['未保存の変更あり','保存中…'].includes(state))return;
  changeRevision++;dirty=true;if(store)schedule();
 }
 document.addEventListener('bolxiv-save-status',changed);
 function disconnect(update=true,{forget=true,reason='signed-out'}={}){if(forget){resumePending=false;forgetAuth(reason)}epoch++;clearTimeout(timer);clearTimeout(expires);store?.stop();store=null;connectionExpiresAt=0;client=null;base=null;account='';choice.hidden=true;reloadRequired=false;if(update)say(dirty?'ログアウト。Drive未反映の変更があります':'未接続');paint()}
 async function loadSdk(){
  if(window.google?.accounts?.oauth2)return;
  if(!sdk)sdk=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.referrerPolicy='no-referrer';let timer=setTimeout(()=>{script.remove();sdk=null;reject(Error('Googleへの接続がタイムアウトしました'))},20000);script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=()=>{clearTimeout(timer);script.remove();sdk=null;reject(Error('Googleのログイン機能を読み込めません。接続を確認して開き直してください'))};document.head.append(script)});return sdk;
 }
 async function activate(token,expiresAt,{restoring=false,owner=null,readAtConnect=true}={}){
  busy=true;paint();const session=++epoch;
  // Register the new token deadline before exposing a connection to lifecycle events.
  connectionExpiresAt=expiresAt;clearTimeout(expires);
  try{
   store=new DriveStore(token,progress=>{if(session!==epoch)return;const text=progress.stage==='prepare'?'保存する変更を確認中…':progress.stage==='commit'?'Driveの保存を確定中…':'Driveへ保存中（'+progress.done+' / '+progress.total+'）';say(text,{saving:true})});account=await store.account();if(session!==epoch)return;
   if(owner&&owner!==account)throw Error('接続先のアカウントが一致しません。再ログインしてください');
   meta=await localRecord('state');baseline=meta?.account===account?meta.hash:'';base=null;
   if(!restoring)await persistAuth(token,expiresAt,account);if(session!==epoch)return;resumePending=false;
   connectionExpiresAt=expiresAt;clearTimeout(expires);expires=setTimeout(()=>{disconnect(false,{reason:'reauth'});say('接続期限切れ。再ログインしてください')},Math.max(0,expiresAt-Date.now()-30000));
   say(readAtConnect?'読み込み中…':'接続を復元しました');
  }catch(error){
   if(session!==epoch)return;
   const retry=restoring&&error.status!==401&&(error instanceof TypeError||error.name==='AbortError'||!navigator.onLine||error.status===403||error.status===429||error.status>=500);
   disconnect(false,{forget:!retry,reason:'reauth'});resumePending=retry;say(retry?'接続を再開できません。オンライン復帰後に再試行します':error.message);
  }finally{busy=false;paint()}
  if(store)await run(readAtConnect?'startup':'auto');
 }
 async function connected(response){
  if(response.error||!response.access_token||!window.google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE)){
   busy=false;say(response.error==='access_denied'?'Google Driveへの許可がキャンセルされました':'Googleの認証に失敗しました。保存許可を確認してください');paint();return;
  }
  await activate(response.access_token,Date.now()+(Number(response.expires_in)||3600)*1000);
 }

 trigger.onclick=async()=>{
  if(!dialog.open)dialog.showModal();backedUp=await localRecord('backup').catch(()=>null);paint();
  if(!allowed){say('ログインはオンライン公開版で利用できます。オフライン版は従来どおり使えます');return}
  if(store)return;say('Googleへの接続を準備しています…');try{await loadSdk();say(authHistory()==='reauth'?'再ログインが必要。Googleアカウントでログインしてください':'未接続。Googleアカウントでログインしてください')}catch(error){say(error.message)}paint();
 };
 connect.onclick=()=>{
  if(!allowed||busy||!window.google?.accounts?.oauth2)return;busy=true;paint();say('Googleで認証中…');
  client=window.google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,include_granted_scopes:false,callback:connected,error_callback:()=>{busy=false;say('ログインを完了できませんでした。ポップアップを許可して再試行してください');paint()}});
  try{client.requestAccessToken({prompt:'select_account'})}catch(error){busy=false;say(error.message);paint()}
 };
 retry.onclick=()=>{if(reloadRequired){location.reload();return}retries=0;if(resumePending&&!store)restoreConnection();else run()};logout.onclick=()=>disconnect();node('googleDriveUseRemote').onclick=()=>run('remote');node('googleDriveUseLocal').onclick=()=>run('local');
 dialog.querySelector('[data-drive-close]').onclick=()=>{if(!busy)dialog.close()};dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
 dialog.addEventListener('close',()=>document.querySelector('.phone-menu-toggle')?.focus({preventScroll:true}));dialog.addEventListener('keydown',e=>e.stopPropagation());
 for(const [id,key,name]of [['googleDriveBackupContents','content','コンテンツ'],['googleDriveBackupPresets','presets','ユーザープリセット']])node(id).onclick=async()=>{try{if(!backedUp)return;await saveExportBlob(new Blob([JSON.stringify(backedUp[key])],{type:'application/json'}),'BOARD_OF_LIGHT_XIV_退避_'+name+'.json','application/json','退避'+name)}catch(error){say('退避データを書き出せません：'+error.message)}};
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(store&&connectionExpiresAt>0&&connectionExpiresAt<=Date.now()+30000){disconnect(false,{reason:'reauth'});say('接続期限切れ。再ログインしてください')}else paintConnection()}});
 window.addEventListener('offline',paintConnection);
 window.addEventListener('online',()=>{paintConnection();if(store&&dirty&&!reloadRequired){retries=0;schedule()}else if(resumePending)restoreConnection()});
 window.addEventListener('beforeunload',event=>{if(store&&(dirty||busy)){event.preventDefault();event.returnValue=''}});
 window.addEventListener('pagehide',()=>{store?.stop();clearTimeout(timer);clearTimeout(expires)});
 // Local clear must not propagate an empty workspace to Drive or silently relink it on reload.
 const clearButton=document.getElementById('clearUserDataYes');clearButton?.addEventListener('click',()=>{disconnect();localRecord('state',null,true).catch(()=>{});localRecord('backup',null,true).catch(()=>{})},true);
 say(allowed&&authHistory()==='reauth'?'再ログインが必要。Googleアカウントでログインしてください':'未接続');paint();
 if(allowed){const wait=()=>{if(window.Bolxiv?.ready&&!window.boardStorageStarting)restoreConnection({readAtConnect:true});else if(!document.getElementById('startupError'))setTimeout(wait,50)};setTimeout(wait,0)}
 window.Bolxiv.driveSync={open:()=>trigger.click(),get connected(){return !!store},get pending(){return dirty&&!!store},get busy(){return busy}};
})();
