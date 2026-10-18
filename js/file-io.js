// file-io: shared function declarations; initialized by bolxiv.js in the documented order.
function safeExportName(ext){const group=data.phaseGroups?.find(group=>group.id===data.activePhaseGroup);let name=ext==='.png'?(group?[(data.title||'strategy-board'),'グループ',group.name].join('_'):phaseComparisonActive()?[(data.title||'strategy-board'),'フェーズを並べて表示',selectedPhaseIndexes.map(i=>i+1).join('-')].join('_'):[(data.title||'strategy-board'),data.page+1,(data.pageNames?.[data.page]||'フェーズ'+(data.page+1))].join('_')):(data.title||'strategy-board');return name.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')+ext}

function exportPickerOptions(filename,mime,description){return {suggestedName:filename,types:[{description,accept:{[mime]:[filename.slice(filename.lastIndexOf('.'))]}}]}}

async function saveExportBlob(blob,filename,mime,description,handlePromise){let handle=null;if(handlePromise){try{handle=await handlePromise}catch(error){if(error?.name==='AbortError')return false;throw error}}else if(window.showSaveFilePicker){try{handle=await window.showSaveFilePicker(exportPickerOptions(filename,mime,description))}catch(error){if(error?.name==='AbortError')return false;throw error}}if(handle){let writable=await handle.createWritable();try{await writable.write(new Uint8Array(await blob.arrayBuffer()));await writable.close()}catch(error){try{await writable.abort()}catch{}throw error}}else{let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}notify(handle?'ファイルを保存しました':'ダウンロードを開始しました');return handle?'saved':'download'}

function jsonExportPayload(boards){
 const contents=boards.map(board=>{const {page,...content}=board;return content});
 return {version:4,imageLibrary:Object.fromEntries(boardImageLibrary.entries(boards)),contents};
}

function importedFieldImage(image,assets){
 if(image&&typeof image==='object'){
  const index=image.imageRef;
  if(!Number.isInteger(index)||index<0||!Array.isArray(assets)||typeof assets[index]!=='string'||!assets[index])throw new Error('フィールド画像の参照先が見つかりません');
  return assets[index];
 }
 return typeof image==='string'?image:'';
}

async function exportJson(scope){
 save();flushScheduledBoardSave();
 const contents=(scope==='selected'?[data]:contentBoards).map(board=>{
  const {page,...content}=board;return content;
 });
 const snapshot=JSON.stringify(jsonExportPayload(contents)),contentName=data.title||'名称未設定';
 const blob=new Blob([JSON.stringify(JSON.parse(snapshot),null,2)],{type:'application/json'});
 const delivery=await saveExportBlob(blob,safeExportName('.json'),'application/json','JSONファイル');
 if(delivery)await rememberJsonBackup(scope,snapshot,contentName,delivery);
}

function loadJsonBackupRecords(){try{return JSON.parse(localStorage.getItem(jsonBackupRecordKey)||'{}')||{}}catch{return {}}}

function jsonBackupSnapshot(scope){
 const boards=scope==='selected'?[data]:contentBoards.map((board,i)=>i===activeContent?data:board);
 return JSON.stringify(jsonExportPayload(boards));
}

async function jsonBackupFingerprint(snapshot){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot));
 return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function rememberJsonBackup(scope,snapshot,contentName,delivery){
 try{
  const records=loadJsonBackupRecords();records[scope]={at:Date.now(),fingerprint:await jsonBackupFingerprint(snapshot),contentName,delivery};
  localStorage.setItem(jsonBackupRecordKey,JSON.stringify(records));
 }catch(error){console.warn('JSON backup record could not be saved',error)}
}

function jsonBackupStatusText(scope,record,fingerprint){
 if(!record?.at||!record.fingerprint)return 'JSON書き出し記録：まだありません';
 const date=new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(record.at));
 const label=record.delivery==='download'?'最終ダウンロード開始':'最終JSON保存';
 const target=scope==='selected'?'\n保存対象：'+record.contentName:'';
 const state=record.fingerprint===fingerprint?'書き出し時から変更はありません':scope==='selected'?'選択中の内容は、このJSONと異なります':'書き出し後に変更があります';
 return label+'：'+date+target+'\n'+state;
}

async function updateJsonBackupStatus(){
 const records=loadJsonBackupRecords();
 await Promise.all(['all','selected'].map(async scope=>{
  const node=jsonExportMenu.querySelector('[data-backup-status="'+scope+'"]');
  try{node.textContent=jsonBackupStatusText(scope,records[scope],records[scope]?await jsonBackupFingerprint(jsonBackupSnapshot(scope)):null)}
  catch{node.textContent='JSON書き出し記録を確認できません'}
 }));
}

function closeJsonExportMenu(restoreFocus=false){jsonExportMenu.hidden=true;$('#exportBtn').setAttribute('aria-expanded','false');if(restoreFocus)$('#exportBtn').focus()}

function closeJsonImportMenu(restoreFocus=false){jsonImportMenu.hidden=true;$('#importBtn').setAttribute('aria-expanded','false');if(restoreFocus)$('#importBtn').focus()}

function parseImportedBoards(text){
 const value=JSON.parse(String(text).replace(/^\uFEFF/,''));
 if(!value||typeof value!=='object')throw new Error('コンテンツまたはフェーズのデータがありません');
 const source=Array.isArray(value.contents)?value.contents:[value];
 const boards=source.filter(board=>board&&Array.isArray(board.pages)&&board.pages.length);
 if(!boards.length)throw new Error('コンテンツまたはフェーズのデータがありません');
 return boards.map(board=>migrateBoardImages({
  ...board,title:String(board.title||'Imported Strategy'),page:0,
  pages:board.pages.map(page=>Array.isArray(page)?page:[]),
  pageNotes:Array.from({length:board.pages.length},(_,i)=>typeof board.pageNotes?.[i]==='string'?board.pageNotes[i]:''),
  pageFieldImageIds:Array.from({length:board.pages.length},(_,i)=>board.pageFieldImageIds?.[i]??importedFieldImage(board.pageFieldImages?.[i],value.imageAssets)),
  pageFieldImageTints:Array.from({length:board.pages.length},(_,i)=>fieldImageTint(board,i)),
  pageFieldSizes:Array.from({length:board.pages.length},(_,i)=>board.pageFieldSizes?.[i]||{width:538,height:538}),
  pageBoardShapes:Array.from({length:board.pages.length},(_,i)=>board.pageBoardShapes?.[i]||board.boardShape||'square'),
  pageFieldBackgroundColors:Array.from({length:board.pages.length},(_,i)=>board.pageFieldBackgroundColors?.[i]||board.fieldBackgroundColor||'#17212c'),
  pageColors:Array.from({length:board.pages.length},(_,i)=>board.pageColors?.[i]||board.layoutColor||'#808080')
 },value.version>=4?(value.imageLibrary||{}):null));
}

function applyImportedBoards(imported,mode){if(boardReadOnly)throw new Error("閲覧中はインポートできません");
 flushScheduledBoardSave();storeContentHistory();contentBoards[activeContent]=data;
 if(mode==='append'){contentBoards=[...contentBoards,...imported]}
 else{contentBoards=imported;activeContent=0;data=contentBoards[0];restoreContentHistory()}
 selected=null;selectedIds=[];selectedPhaseIndexes=[];phaseSelectionOwner=data;
 renderAllIconGrids();renderAndSave();flushScheduledBoardSave();
}

function confirmReplaceImport(imported){
 return new Promise(resolve=>{
  document.getElementById('replaceImportSummary').textContent='現在の全コンテンツ（'+contentBoards.length+'件）が、読み込んだ編集データ（'+imported.length+'件）に置き換わります。';
  const finish=accepted=>{replaceImportDialog.oncancel=null;replaceImportDialog.onclose=null;replaceImportDialog.close();resolve(accepted)};
  document.getElementById('replaceImportCancel').onclick=()=>finish(false);
  document.getElementById('replaceImportConfirm').onclick=()=>finish(true);
  replaceImportDialog.oncancel=e=>{e.preventDefault();finish(false)};
  replaceImportDialog.onclose=()=>finish(false);
  replaceImportDialog.showModal();document.getElementById('replaceImportCancel').focus();
 });
}

function pngStyleValue(value){return value.replace(/url\((['"]?)(.*?)\1\)/g,(match,quote,url)=>{let hash=url.lastIndexOf('#');if(hash<0)return match;let id=url.slice(hash+1),definition=document.getElementById(id);return definition&&(stage.contains(definition)||definition.closest('.phase-comparison-grid,.phase-group-artwork'))?'url("#'+id+'")':match})}

function copyPngStyle(source,target,pseudo){let style=getComputedStyle(source,pseudo);for(let key of style){try{target.style.setProperty(key,pngStyleValue(style.getPropertyValue(key)),style.getPropertyPriority(key))}catch{}}target.style.setProperty('animation','none','important');target.style.setProperty('transition','none','important');return style}

function clonePngNode(source){if(source.nodeType===Node.TEXT_NODE)return source.cloneNode();if(source.nodeType!==Node.ELEMENT_NODE)return null;if(source.id==='objectControls'||source.classList.contains('selection-marquee'))return null;let target=source.cloneNode(false);copyPngStyle(source,target);if(source.namespaceURI!=='http://www.w3.org/2000/svg')target.removeAttribute('id');if(source.classList.contains('selected')){target.classList.remove('selected');target.style.filter='none';target.style.outline='none'}if(source instanceof HTMLImageElement){let src=source.getAttribute('src');target.src=embeddedPngs[src]||source.currentSrc||source.src;if(!target.src.startsWith('data:'))throw new Error('画像を埋め込めません：'+(source.alt||src));target.removeAttribute('srcset');target.loading='eager'}let appendPseudo=pseudo=>{let style=getComputedStyle(source,pseudo);if(style.content==='none'||style.content==='normal'||style.display==='none')return;let node=document.createElement('span');copyPngStyle(source,node,pseudo);node.style.setProperty('content','normal');if(style.content!=='""'&&style.content!=="''")node.textContent=style.content.replace(/^['"]|['"]$/g,'');target.appendChild(node)};if(source.namespaceURI==='http://www.w3.org/1999/xhtml')appendPseudo('::before');for(let child of source.childNodes){let cloned=clonePngNode(child);if(cloned)target.appendChild(cloned)}if(source.namespaceURI==='http://www.w3.org/1999/xhtml')appendPseudo('::after');return target}

function clonePngStage(){let originalClass=stage.className,originalClip=objectClip.style.getPropertyValue('clip-path'),originalPriority=objectClip.style.getPropertyPriority('clip-path');try{stage.classList.add('grid-hidden');stage.classList.remove('field-hidden');objectClip.style.setProperty('clip-path','none','important');return clonePngNode(stage)}finally{stage.className=originalClass;if(originalClip)objectClip.style.setProperty('clip-path',originalClip,originalPriority);else objectClip.style.removeProperty('clip-path')}}

async function drawPngCanvas(scale=1){if(document.fonts)await document.fonts.ready;const groupArtwork=document.querySelector('.phase-group-overview:not([hidden]) .phase-group-artwork'),comparison=phaseComparisonActive()?document.querySelector('.phase-comparison-grid'):null,source=groupArtwork||comparison||stage;for(let image of source.querySelectorAll('img')){if(!image.complete)await image.decode();if(!image.naturalWidth)throw new Error('画像を読み込めません：'+(image.alt||'アイコン'))}let width=source.offsetWidth,height=source.offsetHeight,clone=groupArtwork?clonePngNode(groupArtwork):comparison?clonePngNode(comparison):clonePngStage();for(let [key,value] of Object.entries({margin:'0',position:'relative',left:'auto',top:'auto',right:'auto',bottom:'auto',transform:'none',zoom:'1',boxShadow:'none',display:comparison?'grid':'block',width:width+'px',height:height+'px'}))clone.style.setProperty(key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value,'important');clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');let outputWidth=width*scale,outputHeight=height*scale;let html=new XMLSerializer().serializeToString(clone),svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+outputWidth+'" height="'+outputHeight+'" viewBox="0 0 '+width+' '+height+'"><foreignObject x="0" y="0" width="100%" height="100%">'+html+'</foreignObject></svg>',image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();let canvas=document.createElement('canvas');canvas.width=outputWidth;canvas.height=outputHeight;let ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas context unavailable');ctx.drawImage(image,0,0);return canvas}

async function exportPng(handlePromise,scale=1){let filename=safeExportName('.png'),c=await drawPngCanvas(scale),blob=await new Promise((resolve,reject)=>{c.toBlob(result=>result?resolve(result):reject(new Error('PNG encoding failed')),'image/png')});let bytes=new Uint8Array(await blob.arrayBuffer()),signature=[137,80,78,71,13,10,26,10];if(bytes.length<33||!signature.every((value,index)=>bytes[index]===value))throw new Error('Invalid PNG data');await saveExportBlob(new Blob([bytes],{type:'image/png'}),filename,'image/png','PNG画像',handlePromise)}
