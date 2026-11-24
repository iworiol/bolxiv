// Personal workspace appearance: independent of boards, history and exported artwork.
(()=>{
 const app=document.querySelector('.app'),layer=document.createElement('div');
 layer.id='workspaceBackground';layer.setAttribute('aria-hidden','true');app.prepend(layer);
 const button=document.createElement('button');button.id='workspaceBackgroundButton';button.className='btn';button.type='button';button.textContent='カスタマイズ';button.setAttribute('role','menuitem');
 document.getElementById('headerActions').insertBefore(button,document.getElementById('clearUserDataBtn'));
 const dialog=document.createElement('dialog');dialog.id='workspaceBackgroundDialog';dialog.className='operation-guide workspace-background-dialog';dialog.setAttribute('aria-labelledby','workspaceBackgroundTitle');
 dialog.innerHTML='<div class="operation-guide-heading"><h2 id="workspaceBackgroundTitle">カスタマイズ</h2><button type="button" class="btn" autofocus data-background-close>閉じる</button></div><div class="operation-guide-body"><nav class="help-contents" aria-label="カスタマイズ項目"><ul><li><a href="#workspaceCustomizeBackground" data-customize-target="background" aria-current="true">背景画像</a></li></ul></nav><section id="workspaceCustomizeBackground" data-customize-section="background" aria-label="背景画像"><p>画面の背景に、お好きな画像を表示できます。</p><div class="workspace-background-actions"><button type="button" class="btn" id="chooseWorkspaceBackground">画像を選択</button><button type="button" class="btn" id="removeWorkspaceBackground">画像を解除</button></div><input type="file" id="workspaceBackgroundFile" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" hidden><p id="workspaceBackgroundName"></p><div class="field"><label for="workspaceBackgroundOpacity">背景画像の濃さ：<output id="workspaceBackgroundOpacityValue" for="workspaceBackgroundOpacity"></output></label><input type="range" id="workspaceBackgroundOpacity" min="0" max="100" step="1"></div><div class="field"><label for="workspacePaneOpacity">ペイン背景の濃さ：<output id="workspacePaneOpacityValue" for="workspacePaneOpacity"></output></label><input type="range" id="workspacePaneOpacity" min="0" max="100" step="1"></div><p class="hint">ペイン背景の濃さは、マテリアル・コンテンツ・フェーズの各ペインの下地に共通で適用します。</p><div class="field"><label for="workspaceInnerOpacity">内部領域の濃さ：<output id="workspaceInnerOpacityValue" for="workspaceInnerOpacity"></output></label><input type="range" id="workspaceInnerOpacity" min="0" max="100" step="1"></div><p class="hint">フェーズリスト・プロパティ・素材カテゴリーなど、ペイン内の領域の黒い下地をまとめて調整します。</p><p class="hint">入力欄とキャンバスの背景は変更しません。背景画像はこのブラウザーだけに保存し、コンテンツJSON・画像出力・印刷には含めません。画像は表示用に縮小し、アニメーションは静止画にします。</p><p id="workspaceBackgroundStatus" role="status" aria-live="polite"></p></section></div>';
 document.body.append(dialog);
 for(const link of dialog.querySelectorAll('[data-customize-target]'))link.onclick=event=>{event.preventDefault();for(const section of dialog.querySelectorAll('[data-customize-section]'))section.hidden=section.dataset.customizeSection!==link.dataset.customizeTarget;for(const item of dialog.querySelectorAll('[data-customize-target]'))item.setAttribute('aria-current',String(item===link))};
 const fileInput=dialog.querySelector('#workspaceBackgroundFile'),choose=dialog.querySelector('#chooseWorkspaceBackground'),remove=dialog.querySelector('#removeWorkspaceBackground'),range=dialog.querySelector('#workspaceBackgroundOpacity'),value=dialog.querySelector('#workspaceBackgroundOpacityValue'),paneRange=dialog.querySelector('#workspacePaneOpacity'),paneValue=dialog.querySelector('#workspacePaneOpacityValue'),innerRange=dialog.querySelector('#workspaceInnerOpacity'),innerValue=dialog.querySelector('#workspaceInnerOpacityValue'),name=dialog.querySelector('#workspaceBackgroundName'),status=dialog.querySelector('#workspaceBackgroundStatus');
 // Region owners carry stable theme scopes; no pointer/resize-time DOM discovery.
 const themeScopes=[{"name":"workspace-theme-ui","selector":"#contentPanel,#objectLayerPanel,.phone-view-content,.png-reader-controls,.png-preview-settings,#fieldGuideEditor .guide-editor-properties"},{"name":"workspace-theme-scroll","selector":"#contentPanel,#objectLayerPanel,.phone-view-content,.png-preview-settings,.png-reader-controls,.left,#fieldGuideEditor .guide-editor-properties"},{"name":"workspace-theme-properties","selector":"#objectLayerPanel,.png-preview-settings,.phone-view-content,.png-reader-controls"},{"name":"workspace-theme-panels","selector":"#objectLayerPanel,.phone-view-content,.png-reader-controls"},{"name":"workspace-theme-reading","selector":"#objectLayerPanel,.png-reader-controls"},{"name":"workspace-theme-lists","selector":"#contentPanel,#objectLayerPanel,.phone-view-content,.png-reader-controls"}];
 function refreshScopes(root=document){for(const {name,selector} of themeScopes){if(root instanceof Element&&root.matches(selector))root.classList.add(name);root.querySelectorAll(selector).forEach(node=>node.classList.add(name))}}
 refreshScopes();
 const appearanceDefaults=Object.freeze({opacity:100,paneOpacity:40,innerOpacity:20});
 let settings={blob:null,name:'',...appearanceDefaults},url='',shownBlob=null,busy=false,revision=0,dbPromise=null,queue=Promise.resolve();
 function database(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
   const request=indexedDB.open('bolxiv-workspace-appearance',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('settings');
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();dbPromise=null};resolve(db)};
   request.onerror=()=>{dbPromise=null;reject(request.error)};request.onblocked=()=>{dbPromise=null;reject(new Error('別のタブを閉じて再試行してください'))};
  });return dbPromise;
 }
 async function transaction(mode,action){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('settings',mode),request=action(tx.objectStore('settings'));tx.oncomplete=()=>resolve(request?.result);tx.onabort=()=>reject(tx.error||new Error('背景設定を保存できませんでした'));tx.onerror=()=>{}})}
 function persist(record){const task=queue.then(()=>transaction('readwrite',store=>record.blob?store.put(record,'background'):store.delete('background')));queue=task.catch(()=>{});return task}
 function paint(){
  if(shownBlob!==settings.blob){if(url)URL.revokeObjectURL(url);url=settings.blob?URL.createObjectURL(settings.blob):'';shownBlob=settings.blob;layer.style.backgroundImage=url?'url("'+url+'")':'none';app.style.setProperty('--workspace-background-image',layer.style.backgroundImage)}
  app.style.setProperty('--workspace-background-veil','rgba(231,231,231,'+(1-settings.opacity/100)+')');
  app.style.setProperty('--workspace-pane-overlay','rgba(0,0,0,'+settings.paneOpacity/100+')');
  app.style.setProperty('--workspace-inner-overlay','rgba(0,0,0,'+settings.innerOpacity/100+')');
  app.classList.toggle('workspace-background-active',!!settings.blob);document.body.classList.toggle('workspace-background-active',!!settings.blob);document.body.classList.toggle('workspace-theme-root',!!settings.blob);layer.style.opacity=String(settings.opacity/100);
  range.value=String(settings.opacity);value.value=settings.opacity+'%';paneRange.value=String(settings.paneOpacity);paneValue.value=settings.paneOpacity+'%';innerRange.value=String(settings.innerOpacity);innerValue.value=settings.innerOpacity+'%';innerRange.disabled=busy||!settings.blob;paneRange.disabled=busy||!settings.blob;name.textContent=settings.blob?settings.name:'画像は設定されていません';remove.disabled=busy||!settings.blob;range.disabled=busy||!settings.blob;choose.disabled=busy;
 }
 function fail(message,error){status.textContent=message+'。画像を選び直すか、ブラウザーの空き容量を確認して再試行してください。';console.warn(message,error)}
 const ready=transaction('readonly',store=>store.get('background')).then(record=>{
  if(revision||!record)return;
  if(!(record.blob instanceof Blob)||!/^image\/(webp|png)$/.test(record.blob.type))return;
  settings={blob:record.blob,name:typeof record.name==='string'?record.name:'背景画像',opacity:Number.isFinite(record.opacity)?Math.max(0,Math.min(100,record.opacity)):appearanceDefaults.opacity,paneOpacity:Number.isFinite(record.paneOpacity)?Math.max(0,Math.min(100,record.paneOpacity)):appearanceDefaults.paneOpacity,innerOpacity:Number.isFinite(record.innerOpacity)?Math.max(0,Math.min(100,record.innerOpacity)):appearanceDefaults.innerOpacity};paint();
 }).catch(error=>{status.textContent='背景設定を読み込めませんでした。画像を選び直して再試行してください。';console.warn('Workspace background restore failed',error)});
 paint();
 async function importImage(file){
  if(!file||busy)return;
  const request=++revision;busy=true;status.textContent='画像を読み込み中…';paint();let source='';
  try{
   if(!/^image\/(png|jpeg|webp|gif|avif|bmp)$/.test(file.type))throw new Error('PNG・JPEG・WebP・GIF・AVIF・BMPの画像を選んでください');
   if(file.size>25*1024*1024)throw new Error('25MB以下の画像を選んでください');
   await ready;source=URL.createObjectURL(file);const image=new Image();image.src=source;await image.decode();
   if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>64000000)throw new Error('画像が大きすぎるか、読み込めない形式です');
   const scale=Math.min(1,1920/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));if(!blob)throw new Error('画像を変換できませんでした');
   if(request!==revision)return;const next={blob,name:file.name,opacity:settings.opacity,paneOpacity:settings.paneOpacity,innerOpacity:settings.innerOpacity};await persist(next);if(request!==revision)return;settings=next;paint();status.textContent='背景画像を保存しました';
  }catch(error){fail('背景画像を変更できませんでした（'+(error?.message||'読み込み失敗')+'）',error)}finally{if(source)URL.revokeObjectURL(source);busy=false;paint()}
 }
 async function clear(){
  ++revision;await ready;await queue;await persist({blob:null});settings={blob:null,name:'',...appearanceDefaults};paint();
 }
 button.onclick=()=>{paint();dialog.showModal()};dialog.querySelector('[data-background-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>document.querySelector('.phone-menu-toggle')?.focus({preventScroll:true}));
 choose.onclick=()=>{fileInput.value='';fileInput.click()};fileInput.onchange=()=>importImage(fileInput.files?.[0]);
 remove.onclick=async()=>{if(busy)return;busy=true;paint();try{await clear();status.textContent='背景画像を解除しました'}catch(error){fail('背景画像を解除できませんでした',error)}finally{busy=false;paint()}};
 function bindOpacity(control,key,label){control.oninput=()=>{settings[key]=Number(control.value);paint()};control.onchange=async()=>{try{await persist({...settings});status.textContent=label+'を保存しました'}catch(error){fail(label+'を保存できませんでした',error)}}}
 bindOpacity(range,'opacity','背景画像の濃さ');bindOpacity(paneRange,'paneOpacity','ペイン背景の濃さ');bindOpacity(innerRange,'innerOpacity','内部領域の濃さ');
 window.Bolxiv.workspaceBackground={clear,refreshScopes};
})();
