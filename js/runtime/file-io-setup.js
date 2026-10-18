// Initialization stage: file-io-setup. Load order is owned by bolxiv.js.
const jsonBackupRecordKey='bolxiv-json-backup-records-v1';

const jsonExportMenu=document.createElement('div');

jsonExportMenu.id='jsonExportMenu';

jsonExportMenu.className='png-export-menu';

jsonExportMenu.setAttribute('role','menu');

jsonExportMenu.hidden=true;

jsonExportMenu.innerHTML='<div class="export-menu-label" role="presentation">再編集・バックアップ用</div><button type="button" role="menuitem" data-json-scope="all">編集データを保存（全コンテンツ・JSON）</button><div class="json-backup-status" data-backup-status="all" role="note"></div><button type="button" role="menuitem" data-json-scope="selected">編集データを保存（選択中コンテンツ・JSON）</button><div class="json-backup-status" data-backup-status="selected" role="note"></div><div class="export-menu-separator" role="separator"></div><div class="export-menu-label" role="presentation">閲覧・画像共有用</div><button type="button" role="menuitem" data-png-scale="1">PNG生成（1倍・640 × 640 px）</button><button type="button" role="menuitem" data-png-scale="2">PNG生成（2倍・1280 × 1280 px）</button>';

document.body.appendChild(jsonExportMenu);

$('#exportBtn').onclick=async()=>{
 if(!jsonExportMenu.hidden){closeJsonExportMenu();return}
 closeJsonImportMenu();closeHelpMenu();
 await updateJsonBackupStatus();
 const size=phaseComparisonActive()?phaseComparisonLayout():{width:640,height:640};
 for(const item of jsonExportMenu.querySelectorAll('[data-png-scale]')){const scale=Number(item.dataset.pngScale);item.textContent='PNG生成（'+scale+'倍・'+(size.width*scale)+' × '+(size.height*scale)+' px）'}
 const rect=$('#exportBtn').getBoundingClientRect();jsonExportMenu.hidden=false;
 jsonExportMenu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-jsonExportMenu.offsetWidth-8))+'px';
 jsonExportMenu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-jsonExportMenu.offsetHeight-8))+'px';
 $('#exportBtn').setAttribute('aria-expanded','true');jsonExportMenu.querySelector('button').focus();
};

document.addEventListener('click',e=>{if(!jsonExportMenu.contains(e.target)&&!e.target.closest('#exportBtn'))closeJsonExportMenu()});

window.addEventListener('resize',()=>closeJsonExportMenu());

jsonExportMenu.addEventListener('keydown',e=>{const items=Array.from(jsonExportMenu.querySelectorAll('button')),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeJsonExportMenu(true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(e.key==='Tab')closeJsonExportMenu()});

jsonExportMenu.addEventListener('click',async e=>{const item=e.target.closest('[data-json-scope],[data-png-scale]');if(!item)return;closeJsonExportMenu(true);const isPng=!!item.dataset.pngScale;try{if(isPng){let target=window.showSaveFilePicker?window.showSaveFilePicker(exportPickerOptions(safeExportName('.png'),'image/png','PNG画像')):null;if(target)target=await target;await exportPng(target,Number(item.dataset.pngScale))}else await exportJson(item.dataset.jsonScope)}catch(error){if(error?.name==='AbortError')return;console.error(isPng?'PNG export failed':'JSON export failed',error);notify((isPng?'PNG':'JSON')+'を書き出せませんでした：'+(error?.message||String(error)))}});

let jsonImportMode='replace';

const jsonImportMenu=document.createElement('div');

jsonImportMenu.id='jsonImportMenu';

jsonImportMenu.className='png-export-menu';

jsonImportMenu.setAttribute('role','menu');

jsonImportMenu.hidden=true;

jsonImportMenu.innerHTML='<button type="button" role="menuitem" data-import-mode="replace" title="現在の全コンテンツを読み込みデータに置き換える">編集データを置換</button><button type="button" role="menuitem" data-import-mode="append" title="現在のコンテンツを残して末尾に追加する">編集データに追加</button>';

document.body.appendChild(jsonImportMenu);

$('#importBtn').onclick=()=>{
 if(!jsonImportMenu.hidden){closeJsonImportMenu();return}
 closeJsonExportMenu();closeHelpMenu();
 const rect=$('#importBtn').getBoundingClientRect();jsonImportMenu.hidden=false;
 jsonImportMenu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-jsonImportMenu.offsetWidth-8))+'px';
 jsonImportMenu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-jsonImportMenu.offsetHeight-8))+'px';
 $('#importBtn').setAttribute('aria-expanded','true');jsonImportMenu.querySelector('button').focus();
};

document.addEventListener('click',e=>{if(!jsonImportMenu.contains(e.target)&&!e.target.closest('#importBtn'))closeJsonImportMenu()});

window.addEventListener('resize',()=>closeJsonImportMenu());

jsonImportMenu.addEventListener('keydown',e=>{const items=Array.from(jsonImportMenu.querySelectorAll('button')),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeJsonImportMenu(true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(e.key==='Tab')closeJsonImportMenu()});

jsonImportMenu.addEventListener('click',e=>{const item=e.target.closest('[data-import-mode]');if(!item)return;jsonImportMode=item.dataset.importMode;closeJsonImportMenu(true);$('#fileInput').value='';$('#fileInput').click()});

const replaceImportDialog=document.createElement('dialog');

replaceImportDialog.id='replaceImportDialog';

replaceImportDialog.className='confirm-dialog';

replaceImportDialog.setAttribute('aria-labelledby','replaceImportTitle');

replaceImportDialog.innerHTML='<h2 id="replaceImportTitle">編集データを置換</h2><p id="replaceImportSummary"></p><p>必要な編集データは、事前にエクスポートで保存してください。</p><div class="confirm-actions"><button class="btn" type="button" id="replaceImportCancel" autofocus>キャンセル</button><button class="btn primary" type="button" id="replaceImportConfirm">置換する</button></div>';

document.body.appendChild(replaceImportDialog);

$('#fileInput').onchange=e=>{
 const file=e.target.files[0],mode=jsonImportMode;if(!file)return;
 const reader=new FileReader();
 reader.onload=async()=>{
  let imported;
  try{imported=parseImportedBoards(reader.result)}catch(error){notify('JSON読み込みに失敗：'+(error?.message||String(error)));e.target.value='';return}
  if(mode==='replace'&&!await confirmReplaceImport(imported)){e.target.value='';return}
  const previous={data,contentBoards,activeContent,history:history.slice(),future:future.slice(),selected,selectedIds:selectedIds.slice(),selectedPhaseIndexes:selectedPhaseIndexes.slice(),phaseSelectionOwner};
  try{applyImportedBoards(imported,mode);notify(mode==='append'?imported.length+' 件のコンテンツを末尾に追加しました':'全コンテンツを読み込みデータに置き換えました')}
  catch(error){
   data=previous.data;contentBoards=previous.contentBoards;activeContent=previous.activeContent;history=previous.history;future=previous.future;selected=previous.selected;selectedIds=previous.selectedIds;selectedPhaseIndexes=previous.selectedPhaseIndexes;phaseSelectionOwner=previous.phaseSelectionOwner;
   try{renderAndSave()}catch(recoveryError){console.error('Import recovery failed',recoveryError)}
   console.error('Board import failed',error);notify('JSON読み込みに失敗：'+(error?.message||String(error)));clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),15000);
  }
  e.target.value='';
 };
 reader.onerror=()=>{notify('JSONファイルを読み取れません：'+(reader.error?.message||'ファイルへのアクセスに失敗しました'));e.target.value=''};
 reader.readAsText(file);
};
