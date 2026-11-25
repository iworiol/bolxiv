// Optional Google Drive connection. Tokens stay in memory; ordinary/offline startup makes no Google request.
(()=>{
 const CLIENT_ID='430642576168-9is64m233aggb80rd7lk2t9o34u80kvn.apps.googleusercontent.com';
 const SCOPE='https://www.googleapis.com/auth/drive.appdata',FORMAT='bolxiv-drive-workspace',MARKER='workspace-v1';
 const allowed=location.origin==='https://iworiol.github.io';
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 async function fingerprint(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('')}
 // Save immutable generations rather than race-prone replacement of one file. Concurrent
 // writers produce separate tips, so neither copy is silently overwritten. Retain 10 versions.
 class DriveStore{
  constructor(token){this.token=token;this.controller=new AbortController()}
  stop(){this.controller.abort();this.token=''}
  async request(url,options={}){
   const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),30000),abort=()=>timeout.abort();this.controller.signal.addEventListener('abort',abort,{once:true});
   try{
    if(this.controller.signal.aborted)throw new DOMException('接続を終了しました','AbortError');
    const r=await fetch(url,{...options,headers:{Authorization:'Bearer '+this.token,...options.headers},signal:timeout.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if(!r.ok){const error=new Error(r.status===401?'Googleへの再ログインが必要です':r.status===403?'Driveへの許可・空き容量・利用制限を確認してください':r.status===429?'Googleの利用制限です。少し待って再試行します':'Driveとの通信に失敗しました（'+r.status+'）');error.status=r.status;throw error}return r;
   }finally{clearTimeout(timer);this.controller.signal.removeEventListener('abort',abort)}
  }
  async account(){const r=await this.request('https://www.googleapis.com/drive/v3/about?fields=user(permissionId)');const value=await r.json();if(!value.user?.permissionId)throw Error('接続先アカウントを確認できません');return value.user.permissionId}
  async list(){
   const result=[];let next='';do{
    const q=new URLSearchParams({spaces:'appDataFolder',q:"trashed=false and appProperties has { key='bolxiv' and value='"+MARKER+"' }",fields:'nextPageToken,files(id,createdTime,appProperties)',pageSize:'100',orderBy:'createdTime desc'});if(next)q.set('pageToken',next);
    const r=await this.request('https://www.googleapis.com/drive/v3/files?'+q),v=await r.json();if(!Array.isArray(v.files))throw Error('Driveの保存一覧が不正です');result.push(...v.files);next=v.nextPageToken||'';
   }while(next);return result;
  }
  tips(files){const parents=new Set(files.flatMap(file=>Object.entries(file.appProperties||{}).filter(([key])=>/^parent\d+$/.test(key)).map(([,value])=>value)));return files.filter(file=>!parents.has(file.id))}
  async read(id){const r=await this.request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media');const value=await r.json();if(value?.format!==FORMAT||value.version!==1||!value.payload)throw Error('対応するDrive保存データではありません');return value.payload}
  async write(payload,parents){
   if(parents.length>16)throw Error('同時編集の分岐が多すぎます。JSONを保存して接続を解除してください');
   // Pre-generate an ID to check an uncertain upload by identity instead of blindly duplicating it.
   const ids=await(await this.request('https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=appDataFolder&type=files')).json();
   const id=ids.ids?.[0];if(!id)throw Error('Driveの保存先を作れません');
   const metadata={id,name:'BOARD_OF_LIGHT_XIV_'+new Date().toISOString()+'.json',mimeType:'application/json',parents:['appDataFolder'],appProperties:{bolxiv:MARKER,summary:Array.from(String(payload.content.contents[0]?.title||'コンテンツ')).slice(0,24).join(''),...Object.fromEntries(parents.map((parent,i)=>['parent'+i,parent]))}};
   const content=new Blob([JSON.stringify({format:FORMAT,version:1,payload})],{type:'application/json'});
   const start=await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',{method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':'application/json'},body:JSON.stringify(metadata)});
   const upload=start.headers.get('Location');if(!upload||new URL(upload).origin!=='https://www.googleapis.com')throw Error('Driveのアップロード先を確認できません');
   try{await this.request(upload,{method:'PUT',headers:{'Content-Type':'application/json'},body:content})}catch(error){
    // A timed-out response may already have committed. Read that exact generated ID.
    if(error.status===401||this.controller.signal.aborted)throw error;
    try{const stored=await this.read(id);if(canonical(stored)!==canonical(payload))throw error}catch{throw error}
   }
   return id;
  }
  async prune(files){if(this.tips(files).length!==1)return;for(const item of files.slice(10))await this.request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(item.id),{method:'DELETE'})}
 }
 const trigger=document.createElement('button');trigger.type='button';trigger.id='googleLoginButton';trigger.className='btn';trigger.textContent='ログイン';trigger.setAttribute('role','menuitem');
 document.getElementById('headerActions').insertBefore(trigger,document.getElementById('workspaceBackgroundButton'));
 const dialog=document.createElement('dialog');dialog.id='googleLoginDialog';dialog.className='operation-guide drive-sync-dialog';dialog.setAttribute('aria-labelledby','googleLoginTitle');
 dialog.innerHTML='<div class="operation-guide-heading"><h2 id="googleLoginTitle">ログイン</h2><button type="button" class="btn" data-drive-close autofocus>閉じる</button></div><div class="operation-guide-body"><p>Google Driveに接続すると、全コンテンツ・フィールド・ユーザープリセットを自動で保存・読み込みします。</p><p class="hint">ご自身のDrive内のアプリ専用領域を使用します。データと認証情報を開発者のサーバーへ送信・保管しません。背景画像・画面配置・Undo履歴は同期しません。</p><p id="googleDriveStatus" role="status" aria-live="polite"></p><div class="drive-sync-actions"><button type="button" class="btn" id="googleDriveConnect">Googleアカウントでログイン</button><button type="button" class="btn" id="googleDriveRetry" hidden>再試行</button><button type="button" class="btn" id="googleDriveDisconnect" hidden>ログアウト</button></div><section id="googleDriveChoice" hidden><h3>引き継ぐデータを選んでください</h3><p id="googleDriveChoiceText"></p><label for="googleDriveVersion">Driveの保存データ</label><select id="googleDriveVersion"></select><div class="drive-sync-actions"><button type="button" class="btn" id="googleDriveUseRemote">Driveのデータを使う</button><button type="button" class="btn" id="googleDriveUseLocal">この端末のデータを使う</button></div><p class="hint">選択前の端末内データは、このブラウザーに1世代退避します。Driveには直近10世代を保持します。選ばなかった内容は自動で合成しません。</p></section><section id="googleDriveRecovery" hidden><h3>読み込み前の端末データ</h3><p>直前に退避したデータをJSONへ書き出せます。新しい読み込み時には退避データも更新されます。</p><div class="drive-sync-actions"><button type="button" class="btn" id="googleDriveBackupContents">コンテンツを保存</button><button type="button" class="btn" id="googleDriveBackupPresets">プリセットを保存</button></div></section><p class="hint">編集中は変更をまとめて自動保存します。「Drive：保存済み」を確認してから別端末へ移ってください。同時編集は推奨しません。接続期限が切れたら再ログインが必要です。オフラインでも端末内の保存とJSONは使えます。</p></div>';
 document.body.append(dialog);
 const node=id=>document.getElementById(id),connect=node('googleDriveConnect'),retry=node('googleDriveRetry'),logout=node('googleDriveDisconnect'),choice=node('googleDriveChoice'),versions=node('googleDriveVersion'),status=node('googleDriveStatus');
 const badge=document.createElement('span');badge.id='googleDriveBadge';badge.className='drive-sync-badge';badge.hidden=true;badge.setAttribute('role','status');document.getElementById('saved').after(badge);
 let store=null,account='',base=null,baseline='',busy=false,applying=false,dirty=false,epoch=0,timer=null,poll=null,expires=null,lastUpload=0,retries=0,sdk=null,client=null,meta=null,backedUp=null,changeRevision=0,automaticModal=false;
 let dbPromise=null;
 function database(){return dbPromise??=new Promise((resolve,reject)=>{const request=indexedDB.open('bolxiv-drive-sync',1);request.onupgradeneeded=()=>request.result.createObjectStore('settings');request.onsuccess=()=>resolve(request.result);request.onerror=()=>{dbPromise=null;reject(request.error)}})}
 async function localRecord(key,value,write=false){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('settings',write?'readwrite':'readonly'),r=write?tx.objectStore('settings').put(value,key):tx.objectStore('settings').get(key);tx.oncomplete=()=>resolve(r.result);tx.onabort=()=>reject(tx.error||Error('同期状態を保存できません'));tx.onerror=()=>{}})}
 function say(text){if(status.textContent!==text)status.textContent=text;const short='Drive：'+(text.length>18?'要確認':text);if(badge.textContent!==short)badge.textContent=short;if(badge.title!==text)badge.title=text;badge.hidden=!store&&!dirty;const label=store?'ログイン・同期状態':'ログイン';if(trigger.textContent!==label)trigger.textContent=label}
 function paint(){connect.hidden=!!store;logout.hidden=!store;retry.hidden=!store||busy||!choice.hidden;node('googleDriveRecovery').hidden=!backedUp;dialog.querySelector('[data-drive-close]').disabled=busy;connect.disabled=busy||!allowed||!window.google?.accounts?.oauth2;logout.disabled=busy;node('googleDriveUseRemote').disabled=node('googleDriveUseLocal').disabled=busy}
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
  const opened=!dialog.open;if(opened){automaticModal=true;dialog.showModal()}
  const prepared=validate(value),previous=payload(),previousPrepared=validate(previous);await backup(previous);applying=true;
  try{
   await window.Bolxiv.setMode('edit');if(window.Bolxiv.phaseMasters.active)window.Bolxiv.phaseMasters.leave();
   userPresetLibrary.replaceForSync(prepared.presets);applyImportedBoards(prepared.boards,'replace',{preserveFieldIds:true});await window.boardStorage.flush();
   if(window.BolxivSaveStatus.get('content')==='未保存')throw Error('読み込んだデータを端末に保存できません');
  }catch(error){
   try{userPresetLibrary.replaceForSync(previousPrepared.presets);applyImportedBoards(previousPrepared.boards,'replace',{preserveFieldIds:true});await window.boardStorage.flush()}catch{say('端末への保存に失敗。退避JSONを保存してください')}
   throw error;
  }finally{applying=false}
 }
 function offer(files,message){choice.hidden=false;versions.replaceChildren();for(const file of files){const option=document.createElement('option');option.value=file.id;option.textContent=new Date(file.createdTime).toLocaleString()+' '+(file.appProperties?.summary||'保存データ');versions.append(option)}versions.hidden=!files.length;dialog.querySelector('label[for=googleDriveVersion]').hidden=!files.length;node('googleDriveUseRemote').hidden=!files.length;node('googleDriveChoiceText').textContent=message;clearTimeout(timer);say('データの選択が必要');paint();if(!dialog.open)dialog.showModal()}
 function fail(error){
  clearTimeout(timer);if(error.name==='AbortError'&&!store)return;
  if(error.status===401){disconnect(false);dirty=true;say('再ログインが必要。端末内の内容は保持しています');paint();return}
  say((navigator.onLine?'同期できません：'+error.message:'オフライン。端末内に保存しています')+'。JSONへの保存も利用できます');
  if(store&&choice.hidden&&retries<5){timer=setTimeout(()=>run(),Math.min(60000,5000*2**retries++))}paint();
 }
 async function pull(file,session){const value=await store.read(file.id);if(session!==epoch)return;validate(value);if(changeRevision!==pull.revision||editing()&&!dialog.open){offer([file],'Drive側が更新されました。編集中の内容を確認して選んでください。');return}await install(value);if(session!==epoch)return;base=file.id;dirty=false;await remember(await fingerprint(payload()));say('保存済み');}
 async function run(action='auto'){
  if(!store||busy)return;if(!choice.hidden&&action==='auto')return;if(drag){schedule();return;}if(!userPresetLibrary.syncReady()){schedule();return;}const session=epoch,revision=changeRevision;busy=true;paint();
  try{
   flushScheduledBoardSave();await window.boardStorage.flush();if(window.BolxivSaveStatus.get('content')==='未保存'||window.BolxivSaveStatus.get('presets')==='未保存')throw Error('端末内の保存を確認してください');
   const current=payload(),hash=await fingerprint(current),files=await store.list();if(session!==epoch)return;const tips=store.tips(files);
   if(action==='remote'){
    const id=versions.value,file=tips.find(f=>f.id===id);if(!file)throw Error('Driveが更新されました。再試行してください');
    const remote=await store.read(id);if(session!==epoch)return;validate(remote);
    // Publish the explicit choice before changing local data; preserve every competing version.
    const resolved=tips.length>1?await store.write(remote,tips.map(f=>f.id)):id;if(session!==epoch)return;
    await install(remote);base=resolved;await remember(await fingerprint(payload()));dirty=false;choice.hidden=true;say('保存済み');return;
   }
   if(action!=='local'&&tips.length>1){offer(tips,'別の端末で同時に編集されたデータがあります。残す内容を選んでください。');return}
   const tip=tips[0]||null,known=meta?.account===account;
   if(action!=='local'&&!base){
    if(!tip){if(!known&&!empty(current)){offer([],'Driveに保存データがありません。この端末の全コンテンツ・フィールド・プリセットを、このアカウントへ保存しますか？');return}}
    else if(known&&meta.base===tip.id){base=tip.id;baseline=meta.hash;if(hash===meta.hash){dirty=false;say('保存済み');return}}
    else if((known&&hash===meta.hash)||empty(current)){pull.revision=revision;await pull(tip,session);return}
    else{offer(tips,'この端末とDriveの両方にデータがあります。引き継ぐ内容を選んでください。');return}
   }
   if(action!=='local'&&(tip?.id||null)!==base){
    if(hash===baseline&&tip){pull.revision=revision;await pull(tip,session);return}
    offer(tips,'この端末とDriveの両方で変更されています。自動上書きせず停止しました。');return;
   }
   if(action!=='local'&&hash===baseline){dirty=false;say('保存済み');return}
   say('保存中…');const id=await store.write(current,tips.map(f=>f.id));if(session!==epoch)return;base=id;lastUpload=Date.now();await remember(hash);dirty=changeRevision!==revision;choice.hidden=true;retries=0;
   const after=await store.list();if(session!==epoch)return;if(store.tips(after).length>1){offer(store.tips(after),'同時編集を検出しました。両方の保存データを保持しています。');return}
   say(dirty?'保存待ち':'保存済み');if(dirty)schedule();
   // Cleanup failure must never turn a successful upload into an automatic duplicate write.
   try{await store.prune(after)}catch{say('保存済み（過去データの整理は次回行います）')}
  }catch(error){if(session===epoch)fail(error)}finally{busy=false;paint();if(automaticModal&&choice.hidden&&status.textContent==='保存済み')dialog.close();automaticModal=false}
 }
 function schedule(){clearTimeout(timer);if(!store||!choice.hidden)return;say('保存待ち');timer=setTimeout(()=>run(),Math.max(5000,15000-(Date.now()-lastUpload)))}
 function changed(event){
  if(applying||window.boardStorageStarting)return;
  // Only semantic edits. Navigation-only persistence and status repaints don't upload.
  const source=event.detail?.source,state=window.BolxivSaveStatus.get(source);if(!['content','presets'].includes(source)||!['未保存の変更あり','保存中…'].includes(state))return;
  changeRevision++;dirty=true;if(store)schedule();
 }
 document.addEventListener('bolxiv-save-status',changed);
 function disconnect(update=true){epoch++;clearTimeout(timer);clearInterval(poll);clearTimeout(expires);store?.stop();store=null;client=null;base=null;account='';choice.hidden=true;if(update)say(dirty?'ログアウト。Drive未反映の変更があります':'未接続');paint()}
 async function loadSdk(){
  if(window.google?.accounts?.oauth2)return;
  if(!sdk)sdk=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.referrerPolicy='no-referrer';let timer=setTimeout(()=>{script.remove();sdk=null;reject(Error('Googleへの接続がタイムアウトしました'))},20000);script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=()=>{clearTimeout(timer);script.remove();sdk=null;reject(Error('Googleのログイン機能を読み込めません。接続を確認して開き直してください'))};document.head.append(script)});return sdk;
 }
 async function connected(response){
  busy=true;paint();const session=++epoch;
  try{
   if(response.error)throw Error(response.error==='access_denied'?'Google Driveへの許可がキャンセルされました':'Googleの認証に失敗しました');
   if(!response.access_token||!window.google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE))throw Error('アプリ専用領域への許可がありません');
   store=new DriveStore(response.access_token);account=await store.account();if(session!==epoch)return;meta=await localRecord('state');baseline=meta?.account===account?meta.hash:'';base=null;
   clearTimeout(expires);expires=setTimeout(()=>{disconnect(false);say('接続期限切れ。再ログインしてください')},Math.max(0,(Number(response.expires_in)||3600)*1000-30000));
   poll=setInterval(()=>{if(!document.hidden&&choice.hidden)run()},60000);say('読み込み中…');
  }catch(error){disconnect(false);say(error.message)}finally{busy=false;paint()}
  if(store)await run();
 }
 trigger.onclick=async()=>{
  if(!dialog.open)dialog.showModal();backedUp=await localRecord('backup').catch(()=>null);paint();
  if(!allowed){say('ログインはオンライン公開版で利用できます。オフライン版は従来どおり使えます');return}
  if(store)return;say('Googleへの接続を準備しています…');try{await loadSdk();say('未接続。Googleアカウントでログインしてください')}catch(error){say(error.message)}paint();
 };
 connect.onclick=()=>{
  if(!allowed||busy||!window.google?.accounts?.oauth2)return;busy=true;paint();say('Googleで認証中…');
  client=window.google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,include_granted_scopes:false,callback:connected,error_callback:()=>{busy=false;say('ログインを完了できませんでした。ポップアップを許可して再試行してください');paint()}});
  try{client.requestAccessToken({prompt:'select_account'})}catch(error){busy=false;say(error.message);paint()}
 };
 retry.onclick=()=>{retries=0;run()};logout.onclick=()=>disconnect();node('googleDriveUseRemote').onclick=()=>run('remote');node('googleDriveUseLocal').onclick=()=>run('local');
 dialog.querySelector('[data-drive-close]').onclick=()=>{if(!busy)dialog.close()};dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
 dialog.addEventListener('close',()=>document.querySelector('.phone-menu-toggle')?.focus({preventScroll:true}));dialog.addEventListener('keydown',e=>e.stopPropagation());
 for(const [id,key,name]of [['googleDriveBackupContents','content','コンテンツ'],['googleDriveBackupPresets','presets','ユーザープリセット']])node(id).onclick=async()=>{try{if(!backedUp)return;await saveExportBlob(new Blob([JSON.stringify(backedUp[key])],{type:'application/json'}),'BOARD_OF_LIGHT_XIV_退避_'+name+'.json','application/json','退避'+name)}catch(error){say('退避データを書き出せません：'+error.message)}};
 window.addEventListener('online',()=>{if(store){retries=0;schedule()}});document.addEventListener('visibilitychange',()=>{if(!document.hidden&&store&&!busy&&choice.hidden)run()});
 window.addEventListener('beforeunload',event=>{if(store&&(dirty||busy)){event.preventDefault();event.returnValue=''}});
 window.addEventListener('pagehide',()=>{store?.stop();clearTimeout(timer);clearInterval(poll);clearTimeout(expires)});
 // Local clear must not propagate an empty workspace to Drive or silently relink it on reload.
 const clearButton=document.getElementById('clearUserDataYes');clearButton?.addEventListener('click',()=>{disconnect();localRecord('state',null,true).catch(()=>{});localRecord('backup',null,true).catch(()=>{})},true);
 say('未接続');paint();
 window.Bolxiv.driveSync={open:()=>trigger.click(),get connected(){return !!store},get pending(){return dirty&&!!store},get busy(){return busy}};
})();
