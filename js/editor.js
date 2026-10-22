// ===== Initialization =====
// ===== js/runtime/interaction-guards.js =====
// Initialization stage: interaction-guards. Load order is owned by bolxiv.js.
(()=>{
 const menu=document.createElement('div');menu.id='canvasContextMenu';menu.className='object-context-menu canvas-context-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','キャンバスの操作');document.body.append(menu);
 document.addEventListener('selectstart',event=>{if(event.target instanceof Element&&event.target.closest('.object-context-menu'))event.preventDefault()},true);
 let gesture=null,consumeClick=false,openedBoard=null,openedPhase=null;const touches=new Set();
 const blank=target=>target instanceof Element&&!!target.closest('.object-layout-rect')&&target.matches('.object-layout-rect,#boardZoomSpace,#stage,#objects,#objectClip,.axis,.centerpoint,.phase-comparison-grid,.phase-comparison-cell,.stage')&&!target.closest('.obj,.controlbox');
 function cancel(){if(gesture)clearTimeout(gesture.timer);gesture=null}
 function close(){menu.hidden=true;openedBoard=null;openedPhase=null}
 function open(x,y){
  closeObjectContextMenu();closeColorPopovers();closeJsonExportMenu();closeJsonImportMenu();closeHelpMenu();
  for(const id of ['phaseItemMenu','phaseContentCopyMenu']){const other=document.getElementById(id);if(other)other.hidden=true}document.getElementById('copyPageToContent')?.setAttribute('aria-expanded','false');
  openedBoard=data;openedPhase=current();menu.replaceChildren();const editing=!boardReadOnly&&!phaseComparisonActive();
  for(const [action,label] of [['paste','貼り付け'],['select-all','全選択'],['center','表示を中央に戻す'],['fit','全体が収まる倍率にする']]){
   if(action==='center'){const separator=document.createElement('div');separator.className='context-separator';separator.setAttribute('role','separator');menu.append(separator)}
   const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.action=action;button.setAttribute('role','menuitem');
   button.disabled=action==='paste'? !editing||!clipboardObjects.length:action==='select-all'? !editing||!current().length:false;
   button.onclick=()=>{if(button.disabled)return;const valid=openedBoard===data&&openedPhase===current();close();if(!valid)return;
    if(action==='paste')pasteClipboardObjects();
    else if(action==='select-all'){if(boardReadOnly||phaseComparisonActive())return;selectedIds=current().map(item=>item.id);selected=selectedIds[selectedIds.length-1]||null;renderSelectionOnly()}
    else if(action==='center')setBoardDisplayZoom(boardDisplayZoom,false);
    else fitBoardDisplayZoom();
   };menu.append(button);
  }
  menu.style.maxHeight=Math.max(80,innerHeight-16)+'px';addPhoneMenuClose(menu,close);menu.hidden=false;
  menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
 }
 window.addEventListener('contextmenu',event=>{if(!blank(event.target))return;event.preventDefault();event.stopImmediatePropagation();cancel();open(event.clientX,event.clientY)},true);
 window.addEventListener('pointerdown',event=>{
  consumeClick=false;if(!menu.hidden){if(menu.contains(event.target)){event.stopImmediatePropagation();return}close()}
  if(event.pointerType!=='touch')return;touches.add(event.pointerId);cancel();
  if(touches.size!==1||!blank(event.target)||tapPlacementArmed)return;
  const next={id:event.pointerId,x:event.clientX,y:event.clientY,board:data,phase:current()};gesture=next;
  next.timer=setTimeout(()=>{if(gesture!==next||data!==next.board||current()!==next.phase)return;
   if(drag?.mode==='marquee')drag.box?.remove();drag=null;readOnlyPan=null;hideTouchPlacementPreview();
   const viewport=document.getElementById('boardZoomSpace').parentElement;for(const node of [stage,viewport])if(node.hasPointerCapture(next.id))node.releasePointerCapture(next.id);
   consumeClick=true;open(next.x,next.y);
  },500);
 },true);
 window.addEventListener('pointermove',event=>{if(gesture&&gesture.id===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)cancel()},true);
 for(const name of ['pointerup','pointercancel'])window.addEventListener(name,event=>{touches.delete(event.pointerId);cancel()},true);
 window.addEventListener('click',event=>{if(!consumeClick)return;consumeClick=false;event.preventDefault();event.stopImmediatePropagation()},true);
 menu.addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const items=[...menu.querySelectorAll('button:not(:disabled)')];if(!items.length)return;const at=items.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?items.length-1:(at+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next].focus()});
 window.addEventListener('keydown',event=>{if(menu.hidden||event.key!=='Escape')return;event.preventDefault();event.stopImmediatePropagation();consumeClick=false;close()},true);
 window.addEventListener('scroll',event=>{if(!menu.contains(event.target)){cancel();close()}},true);
 for(const name of ['resize','blur'])window.addEventListener(name,()=>{cancel();close();touches.clear()});
 let lastMode='';new MutationObserver(()=>{const mode=String(boardReadOnly)+':'+phaseComparisonActive();if(lastMode&&mode!==lastMode){cancel();close()}lastMode=mode}).observe(document.body,{attributes:true,attributeFilter:['class']});
})();

let boardReadOnly=false;

try{boardReadOnly=localStorage.getItem('bolxiv-read-only')==='true'}catch{}

const readOnlyEditTargets='#importBtn,#jsonImportMenu,#fileInput,#fieldImageInput,#clearUserDataBtn,#addContent,.content-option-add,.content-list-history-button,.content-row-action,.content-option-input,#addPage,#copyPage,#copyPageToContent,#addPhaseGroup,.page-tab-edit,.page-tab-x,.page-tab-input,#undo,#redo,#clearBtn,.left .tool,.left .icon-choice,#layoutPropertiesPanel input,#layoutPropertiesPanel select,#layoutPropertiesPanel textarea,#layoutPropertiesPanel button,#layoutPropertiesPanel .color-picker,#objectList,#inspector,#objectContextMenu,.confirm-dialog';

let readOnlyPan=null;

for(const type of ['pointerdown','click','dblclick','contextmenu','input','change','dragstart','dragover','drop'])window.addEventListener(type,event=>{
 if(!boardReadOnly||!(event.target instanceof Element))return;
 if(readOnlyTarget(event.target)){blockReadOnlyEvent(event);return}
 if(['dragstart','dragover','drop'].includes(type)&&event.target.closest('#pages,#contentOptions,.object-layout-rect')){blockReadOnlyEvent(event);return}
 if(event.target.closest('.object-layout-rect')){
  if(type==='pointerdown'&&event.button===0){const viewport=document.getElementById('boardZoomSpace').parentElement;readOnlyPan={id:event.pointerId,viewport,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId)}
  if(['pointerdown','click','dblclick','contextmenu'].includes(type))blockReadOnlyEvent(event);
 }
},true);

window.addEventListener('pointermove',event=>{if(!readOnlyPan||readOnlyPan.id!==event.pointerId)return;blockReadOnlyEvent(event);readOnlyPan.viewport.scrollLeft=readOnlyPan.left-(event.clientX-readOnlyPan.x);readOnlyPan.viewport.scrollTop=readOnlyPan.top-(event.clientY-readOnlyPan.y)},true);

for(const type of ['pointerup','pointercancel'])window.addEventListener(type,event=>{if(!readOnlyPan||readOnlyPan.id!==event.pointerId)return;const viewport=readOnlyPan.viewport;readOnlyPan=null;if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);blockReadOnlyEvent(event)},true);

window.addEventListener('blur',()=>readOnlyPan=null);

window.addEventListener('keydown',event=>{
 if(!boardReadOnly)return;
 const key=event.key.toLowerCase(),shortcut=(event.ctrlKey||event.metaKey)&&['v','x','z','y'].includes(key),objectKey=['delete','backspace'].includes(key)||key.startsWith('arrow')&&!event.target.closest('#pages,.board-display-toolbar,dialog');
 if(readOnlyTarget(event.target)||shortcut||objectKey)blockReadOnlyEvent(event);
},true);

;
// ===== js/state.js =====
// Initialization stage: state. Load order is owned by bolxiv.js.
const $=s=>document.querySelector(s), stage=$('#stage'), layer=$('#objects'), controls=$('#objectControls'), objectClip=$('#objectClip');

let tool='select',color='#c6f36b',selected=null,selectedIds=[],drag=null,toastTimer,clipboardObjects=[],clipboardSourcePage=null;

const boardImageLibrary=(()=>{
 const records=new Map(),bySource=new Map();
 function register(source,metadata={}){
  if(typeof source!=='string'||!source.startsWith('data:image/'))throw new Error('画像データの形式が不正です');
  if(bySource.has(source))return bySource.get(source);
  let a=2166136261,b=5381;
  for(let i=0;i<source.length;i++){const code=source.charCodeAt(i);a=Math.imul(a^code,16777619);b=Math.imul(b,33)^code}
  const base='img-'+(a>>>0).toString(16)+'-'+(b>>>0).toString(16)+'-'+source.length.toString(16);let id=base,n=0;
  while(records.has(id)&&records.get(id).source!==source)id=base+'-'+(++n);
  const record=Object.freeze({source,mime:source.slice(5,source.indexOf(';')>0?source.indexOf(';'):source.indexOf(',')),width:Number(metadata.width)||0,height:Number(metadata.height)||0});
  records.set(id,record);bySource.set(source,id);return id;
 }
 function get(id){return records.get(id)?.source||''}
 function requireImage(id){const source=get(id);if(!source)throw new Error('画像ライブラリの参照先が見つかりません：'+id);return source}
 function entries(boards){
  const ids=new Set();for(const board of boards){for(const id of board.pageFieldImageIds||[])if(id)ids.add(id);for(const page of board.pages||[])for(const object of page)if(object.imageId)ids.add(object.imageId)}
  return Array.from(ids,id=>{requireImage(id);return [id,records.get(id)]});
 }
 for(const [id,record] of window.boardInitialImages||[]){
  if(!record||typeof record.source!=='string'||!record.source.startsWith('data:image/'))throw new Error('保存済み画像の形式が不正です');
  records.set(id,Object.freeze(record));bySource.set(record.source,id);
 }
 window.boardInitialImages=null;
 return {register,get,requireImage,entries};
})();

let gridVisible=true,fieldVisible=true,fieldClipEnabled=false;

let data={title:'新規コンテンツ1',layout:'square',boardShape:'square',pageBoardShapes:['square'],layoutColor:'#ffffff',fieldBackgroundColor:'#17212c',pageFieldBackgroundColors:['#17212c'],pageFieldImageIds:[''],pageFieldImageTints:[{color:"#000000",strength:0}],pageFieldSizes:[{width:538,height:538}],pageColors:['#ffffff'],pages:[[]],pageNames:['新規フェーズ'],pageNotes:[''],page:0};

let history=[],future=[],deletePageIndex=null,deleteContentIndex=null;

const iconFiles={role:[['タンク1','00_ROLE','TankRole','1'],['タンク2','00_ROLE','TankRole','2'],['ヒーラー1','00_ROLE','HealerRole','1'],['ヒーラー2','00_ROLE','HealerRole','2'],...['DPS1','DPS2','DPS3','DPS4'].map((n,i)=>[n,'00_ROLE','DPSRole',String(i+1)]),['タンク','00_ROLE','TankRole',''],['ヒーラー','00_ROLE','HealerRole',''],['近接DPS','00_ROLE','MeleeDPS',''],['遠隔DPS','00_ROLE','RangedDPS','']],tank:[['Gladiator','01_TANK/Class','Gladiator'],['Marauder','01_TANK/Class','Marauder'],...['DarkKnight','Gunbreaker','Paladin','Warrior'].map(n=>[n,'01_TANK/Job',n])],healer:[['Conjurer','02_HEALER/Class','Conjurer'],...['Astrologian','Sage','Scholar','WhiteMage'].map(n=>[n,'02_HEALER/Job',n])],dps:[...['Arcanist','Archer','Lancer','Pugilist','Rogue','Thaumaturge'].map(n=>[n,'03_DPS/Class',n]),...['Bard','BlackMage','Dancer','Dragoon','Machinist','Monk','Ninja','Pictomancer','Reaper','RedMage','Samurai','Summoner','Viper'].map(n=>[n,'03_DPS/Job',n])],crafter:['Alchemist','Armorer','Blacksmith','Carpenter','Culinarian','Goldsmith','Leatherworker','Weaver'].map(n=>[n,'04_CRAFTER',n]),gatherer:['Botanist','Fisher','Miner'].map(n=>[n,'05_GATHERER',n]),limited:[['BlueMage','06_LIMITED','BlueMage']]};

let activeIcon=null;

iconFiles.targetMarker=Object.entries({attack1:'攻撃1',attack2:'攻撃2',attack3:'攻撃3',attack4:'攻撃4',attack5:'攻撃5',attack6:'攻撃6',attack7:'攻撃7',attack8:'攻撃8',bind1:'バインド1',bind2:'バインド2',bind3:'バインド3',circle:'円',cross:'×',ignore1:'無視1',ignore2:'無視2',square:'四角',triangle:'三角'}).map(([file,name])=>[name,'target-marker',file]);

iconFiles.fieldMarker=[['フィールド1','field-marker-transparent','1'],['フィールド2','field-marker-transparent','2'],['フィールド3','field-marker-transparent','3'],['フィールド4','field-marker-transparent','4'],...['A','B','C','D'].map(n=>[`フィールド${n}`,'field-marker-transparent',n.toLowerCase()])];

let boardDisplayZoom=100;

let selectedPhaseIndexes=[],phaseSelectionOwner=null,phaseComparisonRendering=false;

document.getElementById('exitPhaseComparison').onclick=()=>selectPhase(data.page);

;
// ===== js/runtime/help-setup.js =====
// Initialization stage: help-setup. Load order is owned by bolxiv.js.
const operationGuide=document.getElementById('operationGuideDialog'),aboutTool=document.getElementById('aboutToolDialog');

const changeLog=document.createElement('dialog');

changeLog.id='changeLogDialog';

changeLog.className='operation-guide';

changeLog.setAttribute('aria-labelledby','changeLogTitle');

changeLog.innerHTML='<div class="operation-guide-heading"><h2 id="changeLogTitle">更新履歴</h2><button type="button" class="btn" autofocus>閉じる</button></div><div class="operation-guide-body"><p><span class="change-log-version">2026/10/22　Ver.0.5.1</span><span class="change-log-description">UI調整</span></p><p><span class="change-log-version">2026/10/19　Ver.0.5.0</span><span class="change-log-description">コンテンツを履歴操作に追加、PNG生成モード追加、レイアウト少し見直し、その他修正</span></p><p><span class="change-log-version">2026/10/18　Ver.0.4.1</span><span class="change-log-description">ツールの内部構成変更、その他修正</span></p><p><span class="change-log-version">2026/10/18　Ver.0.4.0</span><span class="change-log-description">チュートリアル追加、フェーズグループ化機能追加、メモリ使用量削減、JSONファイルサイズ削減</span></p><p><span class="change-log-version">2026/10/17　Ver.0.3.0</span><span class="change-log-description">コンテンツ間フェーズコピー機能追加、右クリック・長押し操作メニュー各種追加、文字サイズ変更、処理負荷改善</span></p><p><span class="change-log-version">2026/10/15　Ver.0.2.0</span><span class="change-log-description">フェーズノート追加、構成見直し、その他修正&amp;見直し</span></p><p><span class="change-log-version">2026/10/14　Ver.0.1.1</span><span class="change-log-description">見た目見直し</span></p><p><span class="change-log-version">2026/10/12　Ver.0.1.0</span><span class="change-log-description">初版</span></p></div>';

document.body.append(changeLog);

changeLog.querySelector('button').onclick=()=>changeLog.close();

changeLog.addEventListener('close',()=>document.getElementById('operationGuideBtn').focus());

const helpMenu=document.createElement('div');

helpMenu.id='helpMenu';

helpMenu.className='png-export-menu';

helpMenu.setAttribute('role','menu');

helpMenu.hidden=true;

helpMenu.innerHTML='<button type="button" role="menuitem" data-help-action="guide">操作ガイド</button><button type="button" role="menuitem" data-help-action="history">更新履歴</button><button type="button" role="menuitem" data-help-action="about">ツールについて</button>';

document.body.appendChild(helpMenu);

document.getElementById('operationGuideBtn').onclick=()=>{if(!helpMenu.hidden){closeHelpMenu();return}closeJsonImportMenu();closeJsonExportMenu();const button=document.getElementById('operationGuideBtn'),rect=button.getBoundingClientRect();addPhoneMenuClose(helpMenu,()=>closeHelpMenu(true));helpMenu.hidden=false;helpMenu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-helpMenu.offsetWidth-8))+'px';helpMenu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-helpMenu.offsetHeight-8))+'px';button.setAttribute('aria-expanded','true');helpMenu.querySelector('button').focus()};

document.addEventListener('click',e=>{if(!helpMenu.contains(e.target)&&!e.target.closest('#operationGuideBtn'))closeHelpMenu()});

window.addEventListener('resize',()=>closeHelpMenu());

helpMenu.addEventListener('keydown',e=>{const items=Array.from(helpMenu.querySelectorAll('button')),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeHelpMenu(true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(e.key==='Tab')closeHelpMenu()});

helpMenu.addEventListener('click',e=>{const item=e.target.closest('[data-help-action]');if(!item)return;closeHelpMenu(true);const dialog=item.dataset.helpAction==='guide'?operationGuide:item.dataset.helpAction==='history'?changeLog:aboutTool;dialog.querySelector('.operation-guide-body').scrollTop=0;dialog.showModal()});

document.getElementById('closeOperationGuide').onclick=()=>operationGuide.close();

document.getElementById('closeAboutTool').onclick=()=>aboutTool.close();

for(const dialog of [operationGuide,aboutTool])dialog.addEventListener('close',()=>document.getElementById('operationGuideBtn').focus());

document.addEventListener('keydown',e=>{const dialog=operationGuide.open?operationGuide:aboutTool.open?aboutTool:changeLog.open?changeLog:null;if(!dialog)return;if(e.key==='Escape'){e.preventDefault();dialog.close()}e.stopImmediatePropagation()},true);

;
// ===== js/runtime/canvas-pan.js =====
// Initialization stage: canvas-pan. Load order is owned by bolxiv.js.
(function initBoardPan(){
 const space=document.getElementById('boardZoomSpace'),viewport=space.parentElement;let gesture=null,spaceHeld=false,suppressClick=false;
 const inputTarget=target=>target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
 function finish(){const previous=gesture;gesture=null;viewport.classList.remove('comparison-panning');if(previous&&previous.moved){suppressClick=true;setTimeout(()=>suppressClick=false,0)}if(previous&&viewport.hasPointerCapture(previous.id))viewport.releasePointerCapture(previous.id)}
 function update(){const enabled=(spaceHeld||!!data.activePhaseGroup)&&(viewport.scrollWidth>viewport.clientWidth+1||viewport.scrollHeight>viewport.clientHeight+1);viewport.classList.toggle('comparison-pan-enabled',enabled);if(!enabled&&!gesture?.touch)finish();return enabled}
 document.addEventListener('keydown',e=>{if(e.code!=='Space'||inputTarget(e.target)||inputTarget(document.activeElement)||drag&&!gesture)return;e.preventDefault();e.stopImmediatePropagation();spaceHeld=true;update()},true);
 document.addEventListener('keyup',e=>{if(e.code!=='Space'||!spaceHeld)return;e.preventDefault();e.stopImmediatePropagation();spaceHeld=false;update()},true);
 document.addEventListener('focusin',e=>{if(inputTarget(e.target)){spaceHeld=false;update()}});
 document.addEventListener('pointerdown',e=>{if(e.button!==0||!(e.target instanceof Element)||inputTarget(e.target)||!viewport.contains(e.target))return;const touchPan=e.pointerType==='touch'&&matchMedia('(max-width:850px)').matches&&!tapPlacementArmed&&!document.querySelector('.layout').classList.contains('phone-content-open')&&!document.querySelector('.layout').classList.contains('phone-materials-open')&&(phaseComparisonActive()||!e.target.closest('.obj,.controlbox,button'))&&(viewport.scrollWidth>viewport.clientWidth+1||viewport.scrollHeight>viewport.clientHeight+1);if(!update()&&!touchPan)return;const rect=viewport.getBoundingClientRect(),left=rect.left+viewport.clientLeft,top=rect.top+viewport.clientTop;if(e.clientX<left||e.clientX>=left+viewport.clientWidth||e.clientY<top||e.clientY>=top+viewport.clientHeight)return;e.preventDefault();e.stopImmediatePropagation();gesture={id:e.pointerId,touch:touchPan,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false};viewport.setPointerCapture(e.pointerId);viewport.classList.add('comparison-panning')},true);
 document.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();gesture.moved=gesture.moved||Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>3;viewport.scrollLeft=gesture.left-(e.clientX-gesture.x);viewport.scrollTop=gesture.top-(e.clientY-gesture.y)},true);
 for(const name of ['pointerup','pointercancel'])document.addEventListener(name,e=>{if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();finish()},true);
 document.addEventListener('click',e=>{if(suppressClick&&viewport.contains(e.target)){suppressClick=false;e.preventDefault();e.stopImmediatePropagation()}},true);
 viewport.addEventListener('lostpointercapture',finish);window.addEventListener('blur',()=>{spaceHeld=false;update()});
 const resize=new ResizeObserver(update);resize.observe(viewport);resize.observe(space);
 new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['class']});update();
})();

for(const eventName of ['pointerdown','click','dblclick','input','change','dragstart','dragover','drop','contextmenu'])document.addEventListener(eventName,e=>{if(phaseComparisonActive()&&e.target instanceof Element&&phaseComparisonBlocksTarget(e.target)){if(eventName==='pointerdown'&&matchMedia('(max-width:850px)').matches&&document.querySelector('.layout').classList.contains('phone-content-open')&&!e.target.closest('.battle'))document.querySelector('.phone-content-close')?.click();e.preventDefault();e.stopImmediatePropagation()}},true);

document.addEventListener('keydown',e=>{if(!phaseComparisonActive())return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();selectPhase(data.page);return}if(e.target instanceof Element&&phaseComparisonBlocksTarget(e.target)||['Delete','Backspace'].includes(e.key)&&!e.target.matches('input,textarea')||(e.ctrlKey||e.metaKey)&&['v','z','y'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation()}},true);

;
// ===== js/runtime/contents-setup.js =====
// Initialization stage: contents-setup. Load order is owned by bolxiv.js.
const donutMinRingWidth=4;

let contentBoards=[data],activeContent=0;

const contentHistoryStore=new WeakMap();
const contentListHistory=[],contentListFuture=[];

let editingContentIndex=-1,contentEditDraft='',pendingContentAddition=null;

let contentSelectorCache=null;

document.addEventListener('contextmenu',event=>{if(!(event.target instanceof Element)||allowNativeContextMenu(event.target))return;if(event.target.closest('.object-layout-rect,.phone-content-preview,.left .tool[data-tool],.left .icon-choice,#objectList .object-row,#pages .page-tab,#objectContextMenu,#layerContextMenu'))event.preventDefault()},true);

;
// ===== js/runtime/storage-setup.js =====
// Initialization stage: storage-setup. Load order is owned by bolxiv.js.
let boardSaveCheckpoint=null;
let boardSaveSuspended=false;

const boardSaveDelay=500,boardSaveMaxWait=3000,phaseSaveDelay=2000,phaseSaveMaxWait=10000;

const noteSaveDelay=2000,noteSaveMaxWait=3000;

let boardSaveNoteOnly=false,boardSaveCheckpointDirty=false,boardSavePropertyOnly=false;

let objectPropertyInputActive=false;

for(const type of ['input','change','keydown'])document.addEventListener(type,event=>{if(event.target instanceof Element&&event.target.closest('#inspector .coordinate-control,#layoutPropertiesPanel .coordinate-control,#inspector .color-picker,#layoutPropertiesPanel .color-picker')){objectPropertyInputActive=true;queueMicrotask(()=>{objectPropertyInputActive=false})}},true);

let boardSavePending=false,boardSaveNavigationOnly=false,boardSaveDelayTimer=null,boardSaveMaxTimer=null;

for(const type of ['pointerup','pointercancel','change','focusout'])document.addEventListener(type,event=>{
 if(boardSavePropertyOnly&&event.target instanceof Element&&(event.target.closest('#undo,#redo')||type!=='focusout'&&event.target.closest('#inspector .coordinate-control,#layoutPropertiesPanel .coordinate-control,#inspector .color-picker,#layoutPropertiesPanel .color-picker')))return;
 if(boardSaveNoteOnly&&(type==='pointerup'||type==='pointercancel')&&event.target instanceof Element&&event.target.closest('#phaseMemo textarea'))return;
 queueMicrotask(()=>{if(!boardSaveNavigationOnly)flushScheduledBoardSave()});
},true);

window.addEventListener('pagehide',flushScheduledBoardSave);

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushScheduledBoardSave()});

;
// ===== js/runtime/history-setup.js =====
// Initialization stage: history-setup. Load order is owned by bolxiv.js.
let pendingHistoryState=null,pendingHistoryOwner=null;

const historySnapshotCache=new Map();

let numericHistoryGesture=null;

document.addEventListener('pointerdown',event=>{
 const spin=event.target.closest?.('.coordinate-control input[type="number"]');
 if(spin)startNumericHistoryGesture(spin,'pointer',event.pointerId);else finishNumericHistoryGesture();
},true);

for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{if(numericHistoryGesture?.kind==='pointer'&&numericHistoryGesture.id===event.pointerId)queueMicrotask(finishNumericHistoryGesture)},true);

document.addEventListener('keydown',event=>{
 const spin=event.target.closest?.('.coordinate-control input[type="number"]');
 if(!spin||!['ArrowUp','ArrowDown'].includes(event.key))return;
 if(!event.repeat)finishNumericHistoryGesture();startNumericHistoryGesture(spin,'key',event.key);
},true);

document.addEventListener('keyup',event=>{if(numericHistoryGesture?.kind==='key'&&event.key===numericHistoryGesture.id)finishNumericHistoryGesture()},true);

window.addEventListener('blur',finishNumericHistoryGesture);

const historyLabelCache=[];

;
// ===== js/runtime/objects-setup.js =====
// Initialization stage: objects-setup. Load order is owned by bolxiv.js.
for(let id of ['contextVisibility','contextEditable'])$('#'+id).onclick=()=>{let button=$('#'+id),ids=JSON.parse($('#objectContextMenu').dataset.ids||'[]');closeObjectContextMenu();setObjectState(ids,button.dataset.key,button.dataset.value==='true')};

$('#contextSwapPosition').onclick=()=>{let menu=$('#objectContextMenu'),ids=JSON.parse(menu.dataset.ids||'[]');closeObjectContextMenu();if(ids.length!==2)return;let items=ids.map(id=>current().find(o=>o.id===id));if(items.some(item=>!item))return;recordHistory();let x=items[0].x,y=items[0].y;items[0].x=items[1].x;items[0].y=items[1].y;items[1].x=x;items[1].y=y;renderAndSave()};

$('#contextDuplicate').onclick=()=>{let menu=$('#objectContextMenu'),ids=JSON.parse(menu.dataset.ids||'[]'),sources=current().filter(o=>ids.includes(o.id));closeObjectContextMenu();if(!sources.length)return;recordHistory();let copies=sources.map(source=>{let copy=JSON.parse(JSON.stringify(source));copy.id=createObjectId();return copy});current().push(...copies);selectedIds=copies.map(copy=>copy.id);selected=selectedIds[selectedIds.length-1]||null;renderAndSave();revealMovedLayers(selectedIds)};

$('#contextDelete').onclick=()=>{let menu=$('#objectContextMenu'),ids=JSON.parse(menu.dataset.ids||'[]');closeObjectContextMenu();let deletable=ids.filter(id=>!current().find(o=>o.id===id)?.locked);if(!deletable.length)return;recordHistory();data.pages[data.page]=current().filter(o=>!deletable.includes(o.id));selectedIds=selectedIds.filter(id=>!deletable.includes(id));selected=selectedIds[selectedIds.length-1]||null;renderAndSave()};

document.querySelectorAll('#objectContextMenu [data-layer-action],#layerContextMenu [data-layer-action]').forEach(button=>button.onclick=()=>{let menu=button.closest('.object-context-menu'),ids=JSON.parse(menu.dataset.ids||'[]'),selectedSet=new Set(ids),front=current().slice().reverse(),group=front.filter(o=>selectedSet.has(o.id)),action=button.dataset.layerAction;closeObjectContextMenu();if(!group.length)return;let next=front.slice();if(action==='top')next=[...group,...front.filter(o=>!selectedSet.has(o.id))];else if(action==='bottom')next=[...front.filter(o=>!selectedSet.has(o.id)),...group];else if(action==='up'){let first=next.findIndex(o=>selectedSet.has(o.id));if(first<=0)return;let before=next[first-1];next.splice(first-1,1);next.splice(next.findIndex(o=>selectedSet.has(o.id))+group.length,0,before)}else if(action==='down'){let last=-1;for(let i=0;i<next.length;i++)if(selectedSet.has(next[i].id))last=i;if(last<0||last>=next.length-1)return;let after=next[last+1];next.splice(last+1,1);next.splice(next.findIndex(o=>selectedSet.has(o.id)),0,after)}if(next.every((o,i)=>o.id===front[i]?.id))return;recordHistory();data.pages[data.page]=next.reverse();renderAndSave();revealMovedLayers(group.map(o=>o.id))});

document.addEventListener('pointerdown',e=>{if(!e.target.closest('#objectContextMenu,#layerContextMenu'))closeObjectContextMenu()},true);

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeObjectContextMenu()});

let pendingLayerRevealId=null;

const themeColors=['#FFFFFF','#000000','#E7E6E6','#44546A','#4472C4','#ED7D31','#A5A5A5','#FFC000','#5B9BD5','#70AD47'],standardColors=['#C00000','#FF0000','#FFC000','#FFFF00','#92D050','#00B050','#00B0F0','#0070C0','#002060','#7030A0'];

document.addEventListener('click',e=>{let button=e.target.closest('.color-custom-trigger');if(!button)return;let pop=button.closest('.color-popover'),picker=pop?._colorPicker||button.closest('.color-picker'),input=picker?.querySelector('.native-color-picker');if(!input)return;input._colorPickerRef=picker;input._colorInputHome={parent:input.parentNode,next:input.nextSibling};input._colorRestore=()=>{let home=input._colorInputHome;if(home?.parent?.isConnected)home.parent.insertBefore(input,home.next?.parentNode===home.parent?home.next:null);input._colorInputHome=null;input._colorRestore=null};pop.appendChild(input);window.addEventListener('focus',()=>input._colorRestore?.(),{once:true});let r=button.getBoundingClientRect();input.style.position='fixed';input.style.left=Math.max(0,r.left)+'px';input.style.top=Math.max(0,r.bottom-1)+'px';input.style.width='1px';input.style.height='1px';input.style.opacity='0.01';input.style.pointerEvents='auto';try{if(input.showPicker)input.showPicker();else input.click()}catch{input.click()}});

document.addEventListener('change',e=>{let input=e.target.closest('.native-color-picker');if(!input)return;let picker=input._colorPickerRef||input.closest('.color-picker');if(!picker)return;input._colorRestore?.();let pop=[...document.querySelectorAll('.color-popover')].find(item=>item._colorPicker===picker)||picker.querySelector('.color-popover');let swatch=document.createElement('button');swatch.dataset.colorValue=input.value;(pop||picker).appendChild(swatch);swatch.click();swatch.remove();input._colorPickerRef=null});

document.addEventListener('click',e=>{let target=e.target instanceof Element?e.target:null;if(!target)return;let swatch=target.closest('[data-color-value]');if(swatch){let pop=swatch.closest('.color-popover'),picker=pop?._colorPicker||swatch.closest('.color-picker');if(!picker)return;let value=swatch.dataset.colorValue,kind=picker.dataset.colorKind;if(kind==='fieldBackground'&&activeBoardShape()==='image')return;pop?.remove();if(kind==='layout'){data.pageColors[data.page]=value;renderAndSave();$('#layoutColorControl').innerHTML=colorPickerMarkup('layout',value);save()}else if(kind==='fieldBackground'){recordHistory();data.pageFieldBackgroundColors[data.page]=value;renderAndSave();$('#fieldBackgroundControl').innerHTML=colorPickerMarkup('fieldBackground',value);save()}else if(kind==='fieldImageTint'){if(!boardReadOnly&&!phaseComparisonActive()){recordHistory();data.pageFieldImageTints[data.page]={...fieldImageTint(data,data.page),color:value};renderAndSave()}}else if(kind==='bulkColor'||kind==='bulkStrokeColor'){let targets=current().filter(item=>selectedIds.includes(item.id)&&!item.locked);if(targets.length){recordHistory();for(let item of targets){if(kind==='bulkStrokeColor')item.strokeColor=value;else item.color=value}renderAndSave()}}else{let o=current().find(item=>item.id===picker.dataset.objectId);if(o){recordHistory();if(kind==='aoeStroke')o.strokeColor=value;else o.color=value;renderAndSave()}}closeColorPopovers();return}if(target.closest('.color-popover,.native-color-picker,.color-custom-trigger'))return;let trigger=target.closest('[data-color-trigger]');if(trigger){let picker=trigger.closest('.color-picker'),pop=picker?.querySelector('.color-popover');if(!picker||!pop)return;let opening=pop.hidden;closeColorPopovers();if(opening){pop._colorPicker=picker;document.body.appendChild(pop);pop.hidden=false;pop.style.position='fixed';let r=trigger.getBoundingClientRect(),box=pop.getBoundingClientRect(),w=box.width,h=box.height,left=Math.max(8,Math.min(r.left,window.innerWidth-w-8)),top=r.bottom+5;if(top+h>window.innerHeight-8)top=r.top-h-5;pop.style.left=Math.max(8,Math.min(left,window.innerWidth-w-8))+'px';pop.style.top=Math.max(8,Math.min(top,window.innerHeight-h-8))+'px'}return}closeColorPopovers()});

;
// ===== js/runtime/editor-setup.js =====
// Initialization stage: editor-setup. Load order is owned by bolxiv.js.
document.getElementById("leftRailToggle").onclick=e=>{let pinned=document.querySelector(".left").classList.toggle("pinned");localStorage.setItem('tactica-left-pinned-v1',String(pinned));e.currentTarget.setAttribute("aria-pressed",String(pinned));e.currentTarget.title=pinned?"固定を解除":"展開を固定";e.currentTarget.setAttribute("aria-label",e.currentTarget.title);e.currentTarget.querySelector(".rail-label").textContent=pinned?"固定中":"固定"};

document.querySelector(".left").addEventListener("mouseleave",()=>{let pane=document.querySelector(".left");if(!pane.classList.contains("pinned")&&pane.contains(document.activeElement))document.activeElement.blur()});

document.querySelectorAll('.left .accordion-toggle').forEach(button=>button.onclick=()=>{let open=button.getAttribute('aria-expanded')!=='true';if(open&&(!viewSettings.objectCategoriesMultiple||matchMedia('(max-width:850px)').matches)){document.querySelectorAll('.left .accordion-toggle').forEach(other=>{if(other===button)return;other.setAttribute('aria-expanded','false');document.getElementById(other.getAttribute('aria-controls')).hidden=true})}button.setAttribute('aria-expanded',String(open));document.getElementById(button.getAttribute('aria-controls')).hidden=!open});

$('#toggleBattlePages').onclick=e=>{let open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));let panel=$('#pageListPanel'),controls=e.currentTarget.closest('.page-controls');panel.hidden=!open;panel.style.display=open?'flex':'none';panel.classList.toggle('hidden',!open);controls.style.flex=open?'1 1 0':'0 0 36px';controls.style.minHeight=open?'0':'36px';controls.style.height=open?'auto':'36px'};

$('#toggleLayoutProperties').onclick=e=>{let open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));let panel=$('#layoutPropertiesPanel');panel.hidden=!open;panel.style.display=open?'block':'none';panel.classList.toggle('hidden',!open)};

$('#toggleLayers').onclick=e=>{let open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));let panel=$('#layerListPanel');panel.hidden=!open;panel.style.display=open?'flex':'none';panel.classList.toggle('hidden',!open)};

$('#toggleInspector').onclick=e=>{let open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));let panel=$('#propertyPanel');panel.hidden=!open;panel.style.display=open?'flex':'none';panel.classList.toggle('hidden',!open)};

document.querySelectorAll('#tools,#aoeTools,#enemyTools').forEach(container=>{container.onclick=e=>{let b=e.target.closest('[data-tool]');if(!b)return;selectPlacementTool(b.dataset.tool)};container.addEventListener('dragstart',e=>{let b=e.target.closest('[data-tool]');if(!b)return;selectPlacementTool(b.dataset.tool);e.dataTransfer.setData('application/x-tactica',JSON.stringify({type:b.dataset.tool}));e.dataTransfer.effectAllowed='copy'})});

$('#iconGroup').onchange=()=>{if($('#iconGroup').value==='none'&&tool==='icon')selectPlacementTool('select');renderAllIconGrids()};

let placementDragPayload=null,placementShiftDisabled=false;

let touchPlacementPreview=null;

let tapPlacementArmed=false,tapPlacementGesture=null;

document.querySelector('.left').addEventListener('click',e=>{if(e.target.closest('.tool[data-tool],.icon-choice'))tapPlacementArmed=true});

document.addEventListener('dragstart',e=>{if(e.target.closest('.left'))tapPlacementArmed=false});

document.addEventListener('pointerdown',e=>{
 if(!tapPlacementArmed||phaseComparisonActive()||e.button!==0||!stage.contains(e.target)||e.target.closest('.obj,.controlbox')||e.target.closest('input,button,textarea'))return;
 e.preventDefault();e.stopImmediatePropagation();tapPlacementGesture={id:e.pointerId,x:e.clientX,y:e.clientY,touch:e.pointerType==='touch'};if(tapPlacementGesture.touch)showTouchPlacementPreview(tool==='icon'&&activeIcon?{type:'icon',...activeIcon}:{type:tool},e.clientX,e.clientY,0);stage.setPointerCapture(e.pointerId);
},true);

document.addEventListener('pointermove',e=>{if(!tapPlacementGesture||tapPlacementGesture.id!==e.pointerId)return;moveTouchPlacementPreview(e.clientX,e.clientY,0);e.preventDefault();e.stopImmediatePropagation()},true);

document.addEventListener('pointerup',finishTapPlacement,true);

document.addEventListener('pointercancel',finishTapPlacement,true);

document.addEventListener('keydown',e=>{if(e.key==='Escape')tapPlacementArmed=false});

document.addEventListener('dragstart',e=>{if(!e.target.closest('.left'))return;try{placementDragPayload=JSON.parse(e.dataTransfer.getData('application/x-tactica'))}catch{placementDragPayload=null}});

document.addEventListener('dragend',endPlacementGuides);

stage.addEventListener('dragover',e=>{if(!placementDragPayload)return;e.preventDefault();stage.classList.add('drag-over');e.dataTransfer.dropEffect='copy';placementShiftDisabled=e.shiftKey;const placement=placementAlignment(placementDragPayload,e.clientX,e.clientY,e.shiftKey);clearAlignmentGuides();drawAlignmentGuides(placement.guides,stage.clientWidth,stage.clientHeight)});

stage.addEventListener('dragleave',e=>{if(!stage.contains(e.relatedTarget)){stage.classList.remove('drag-over');clearAlignmentGuides()}});

stage.addEventListener('drop',e=>{if(!Array.from(e.dataTransfer.types).includes('application/x-tactica'))return;e.preventDefault();placementShiftDisabled=e.shiftKey;try{let payload=JSON.parse(e.dataTransfer.getData('application/x-tactica'));placeObject(payload,e.clientX,e.clientY);closePaletteAfterPlacement()}catch{notify('配置アイテムを読み込めませんでした')}finally{endPlacementGuides()}});

document.querySelector('.object-layout-rect').addEventListener('pointerdown',e=>{if(data.activePhaseGroup||e.button!==0||![stage,objectClip,layer,document.getElementById('boardZoomSpace'),e.currentTarget].includes(e.target)&&e.target.className!=='axis'&&e.target.className!=='centerpoint')return;e.preventDefault();let additive=e.shiftKey;if(!additive){selected=null;selectedIds=[];renderSelectionOnly()}let box=document.createElement('div');box.className='selection-marquee';let surface=document.getElementById('boardZoomSpace');surface.appendChild(box);drag={mode:'marquee',surface,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,additive,initialIds:selectedIds.slice(),box,moved:false}});

document.addEventListener('pointerdown',e=>{if(matchMedia('(max-width:850px)').matches&&document.getElementById('objectLayerPanel')?.dataset.objectTab==='properties'&&e.target.closest('#undo,#redo'))return;if(e.target.closest('.right,.battle,.phone-view-content,dialog,[role="menu"],.obj,.controlbox,.color-popover,.color-picker,.native-color-picker,.phone-phase-navigation')||!selectedIds.length)return;if(stage.contains(e.target)){let r=stage.getBoundingClientRect(),shape=activeBoardShape(),fw=data.pageFieldSizes?.[data.page]?.width||538,fh=data.pageFieldSizes?.[data.page]?.height||(shape==='landscape'?320:538),dx=(e.clientX-r.left-r.width/2)/(r.width*fw/1280),dy=(e.clientY-r.top-r.height/2)/(r.height*fh/1280);if(shape==='none'||(shape==='circle'?dx*dx+dy*dy<=1:Math.abs(dx)<=1&&Math.abs(dy)<=1))return}selected=null;selectedIds=[];renderSelectionOnly()},true);

document.addEventListener('pointerdown',e=>{if(drag&&(drag.mode==='move'||drag.mode.startsWith('resize-'))){drag.shiftGuidesDisabled=e.shiftKey;clearAlignmentGuides();drag.alignmentPrevious=alignmentSnapshot()}});

document.addEventListener('keydown',e=>{if(e.key==='Shift')setShiftAlignmentOverride(true)});

document.addEventListener('keyup',e=>{if(e.key==='Shift')setShiftAlignmentOverride(false)});

window.addEventListener('blur',()=>{if(drag)drag.shiftGuidesDisabled=false;clearAlignmentGuides()});

document.addEventListener('pointerdown',e=>{let spin=e.target.closest('.coordinate-control input[type=number]');if(!spin||spin.dataset.historyPushed)return;recordHistory();spin.dataset.historyPushed='true'});

document.addEventListener('input',e=>{let control=e.target.closest('.coordinate-control');if(!control)return;let range=control.querySelector('input[type=range]'),spin=control.querySelector('input[type=number]');if(e.target===range&&spin){spin.value=range.value;return}if(e.target===spin&&range){if(spin.id==='fieldWidthSpin'||spin.id==='fieldHeightSpin')return;if(e.target.value==='')return;let value=Math.max(Number(spin.min)||-Infinity,Math.min(Number(spin.max)||Infinity,Math.round(Number(spin.value)||0)));spin.value=value;range.value=value;range.dispatchEvent(new Event('input',{bubbles:true}))}});

document.addEventListener('change',e=>{if(e.target.matches('.coordinate-control input[type=number]'))delete e.target.dataset.historyPushed});

document.addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==undefined&&drag.pointerId!==e.pointerId)return;if(drag.mode==='move'&&drag.pointerType==='touch'&&!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6)return;drag.shiftGuidesDisabled=e.shiftKey;drag.lastX=e.clientX;drag.lastY=e.clientY;let r=stage.getBoundingClientRect();if(drag.mode==='marquee'){let surface=drag.surface.getBoundingClientRect(),x1=drag.startX-surface.left,y1=drag.startY-surface.top,x2=e.clientX-surface.left,y2=e.clientY-surface.top;drag.moved=Math.abs(e.clientX-drag.startX)>3||Math.abs(e.clientY-drag.startY)>3;drag.box.style.left=Math.min(x1,x2)+'px';drag.box.style.top=Math.min(y1,y2)+'px';drag.box.style.width=Math.abs(x2-x1)+'px';drag.box.style.height=Math.abs(y2-y1)+'px';return}if(drag.mode==='move'&&!drag.beforeData&&(e.clientX!==drag.startX||e.clientY!==drag.startY))drag.beforeData=JSON.stringify(data);drag.moved=drag.mode==='move'?(drag.moved||e.clientX!==drag.startX||e.clientY!==drag.startY):true;if(drag.mode==='move'){setMoveCopyMode(e.ctrlKey);stage.classList.toggle('ctrl-copy',drag.ctrlAtStart&&e.ctrlKey);let boardWidth=layer.clientWidth||stage.clientWidth,boardHeight=layer.clientHeight||stage.clientHeight,scaleX=r.width/stage.offsetWidth,scaleY=r.height/stage.offsetHeight,dx=(e.clientX-drag.startX)/scaleX,dy=(e.clientY-drag.startY)/scaleY,loX=-Infinity,hiX=Infinity,loY=-Infinity,hiY=Infinity;for(let p of drag.starts){let o=current().find(x=>x.id===p.id),ex=extents(o,r),mx=Math.min(12,ex.w),my=Math.min(12,ex.h),px=p.x/100*boardWidth,py=p.y/100*boardHeight;loX=Math.max(loX,mx-ex.w-px);hiX=Math.min(hiX,boardWidth-mx+ex.w-px);loY=Math.max(loY,my-ex.h-py);hiY=Math.min(hiY,boardHeight-my+ex.h-py)}dx=steppedObjectMove(dx,loX,hiX);dy=steppedObjectMove(dy,loY,hiY);if(!e.shiftKey){let snapped=snappedObjectMove(alignmentSnapshot(),drag.starts,dx,dy,boardWidth,boardHeight,loX,hiX,loY,hiY);dx=snapped.dx;dy=snapped.dy;}for(let p of drag.starts){let o=current().find(x=>x.id===p.id);o.x=p.x+dx/boardWidth*100;o.y=p.y+dy/boardHeight*100;let el=layer.querySelector(`[data-id="${o.id}"]`);if(el){el.style.left=o.x+'%';el.style.top=o.y+'%';if(o.type==='targetcircle')refreshTargetCircleTriangle(o,el)}}let box=controls.querySelector('.controlbox'),o=current().find(x=>x.id===selected);if(box&&o){box.style.left=o.x+'%';box.style.top=o.y+'%'}updateAlignmentGuides(drag.ids);scheduleBoardSave()}else{let o=current().find(x=>x.id===drag.id);if(!o)return;let ox=r.left+drag.ox/100*r.width,oy=r.top+drag.oy/100*r.height,dx=e.clientX-ox,dy=e.clientY-oy;let mdx=e.clientX-drag.startX,mdy=e.clientY-drag.startY;if(drag.mode==='resize-aoe-box'){const scaleX=r.width/stage.offsetWidth,scaleY=r.height/stage.offsetHeight,next=resizedAoeBox(drag,mdx/scaleX,mdy/scaleY);o.width=next.width;o.height=next.height;o.x=drag.ox+next.dx/(layer.clientWidth||stage.clientWidth)*100;o.y=drag.oy+next.dy/(layer.clientHeight||stage.clientHeight)*100;}if(drag.mode==='resize-donut-inner'){
 const scaleX=r.width/stage.offsetWidth,scaleY=r.height/stage.offsetHeight,cx=r.left+o.x/100*r.width,cy=r.top+o.y/100*r.height;
 const radius=Math.hypot((e.clientX-cx)/scaleX,(e.clientY-cy)/scaleY);
 setDonutInnerDiameter(o,radius*2);syncDonutInnerInputs(o);
}
if(drag.mode==='resize-angle'){let rot=(o.rotation||0)*Math.PI/180,cx=r.left+o.x/100*r.width,cy=r.top+o.y/100*r.height,dx=e.clientX-cx,dy=e.clientY-cy,lx=dx*Math.cos(rot)+dy*Math.sin(rot),ly=-dx*Math.sin(rot)+dy*Math.cos(rot),apexY=-(o.height||100)/2+(o.height||100)*.05;o.angle=Math.max(5,Math.min(179.5,Math.round(Math.atan2(Math.abs(lx),ly-apexY)*180/Math.PI)));updateShapeFromData(o)}if(drag.mode==='resize-icon'){let size=Math.max(24,Math.min(640,Math.round(drag.width+(mdx+mdy)/2)));o.width=o.height=size;let el=Array.from(layer.children).find(x=>x.dataset.id===o.id);if(el){el.style.width=size+'px';el.style.height=size+'px';let badge=el.querySelector('.role-badge');if(badge){badge.style.setProperty('font-size',Math.max(8,size*.36)+'px','important');badge.style.right=(size*.06)+'px';badge.style.bottom=(size*.06)+'px';badge.style.webkitTextStroke=(size*.03)+'px #111'}}let box=controls.querySelector('.controlbox');if(box){box.style.width=size+'px';box.style.height=size+'px'}}if(drag.mode==='resize-x'||drag.mode==='resize-y'){let a=(o.rotation||0)*Math.PI/180;if(o.type==='aoe'||o.type==='circle'||o.type==='donut'||(['knockback','lineknockback'].includes(o.type))||o.type==='gaze'||['stack','linestack'].includes(o.type)||o.type==='targetcircle'||(o.type==='icon'&&['フレア','ダイブボム','ターゲット赤','ターゲット紫'].includes(o.iconName))){let resizeSign=drag.resizeSign||1,desired=drag.mode==='resize-x'?drag.width+2*resizeSign*(mdx*Math.cos(a)+mdy*Math.sin(a)):drag.height+2*resizeSign*(-mdx*Math.sin(a)+mdy*Math.cos(a)),base=drag.mode==='resize-x'?drag.width:drag.height,factor=desired/base,minSize=o.type==='icon'?24:20,maxSize=o.type==='icon'?640:960,minFactor=Math.max(minSize/drag.width,minSize/drag.height),maxFactor=Math.min(maxSize/drag.width,maxSize/drag.height);factor=Math.max(minFactor,Math.min(maxFactor,factor));o.width=Math.round(drag.width*factor);o.height=Math.round(drag.height*factor)}else if(o.type==='segment'&&drag.mode==='resize-x'){let baseAngle=drag.rotation*Math.PI/180,anchorX=r.left+drag.ox/100*r.width-drag.width/2*Math.cos(baseAngle),anchorY=r.top+drag.oy/100*r.height-drag.width/2*Math.sin(baseAngle),dx=e.clientX-anchorX,dy=e.clientY-anchorY,newWidth=Math.max(20,Math.min(960,Math.round(Math.hypot(dx,dy)))),newAngle=Math.atan2(dy,dx);o.width=newWidth;o.rotation=Math.round(newAngle*180/Math.PI);o.x=(anchorX-r.left+newWidth/2*Math.cos(newAngle))/r.width*100;o.y=(anchorY-r.top+newWidth/2*Math.sin(newAngle))/r.height*100;let el=Array.from(layer.children).find(node=>node.dataset.id===o.id),box=controls.querySelector('.controlbox');if(el){el.style.left=o.x+'%';el.style.top=o.y+'%'}if(box){box.style.left=o.x+'%';box.style.top=o.y+'%'}}else if(o.type==='line'){let boardWidth=layer.clientWidth||stage.clientWidth,boardHeight=layer.clientHeight||stage.clientHeight,localDx=mdx/(r.width/stage.offsetWidth),localDy=mdy/(r.height/stage.offsetHeight),sign=drag.resizeSign||1,delta=drag.mode==='resize-x'?localDx*Math.cos(a)+localDy*Math.sin(a):-localDx*Math.sin(a)+localDy*Math.cos(a),base=drag.mode==='resize-x'?drag.width:drag.height,next=Math.max(20,Math.min(960,Math.round(base+sign*delta))),shift=sign*(next-base)/2;if(drag.mode==='resize-x'){o.width=next;o.x=(drag.ox+shift*Math.cos(a)/boardWidth*100);o.y=(drag.oy+shift*Math.sin(a)/boardHeight*100)}else{o.height=next;o.x=(drag.ox-shift*Math.sin(a)/boardWidth*100);o.y=(drag.oy+shift*Math.cos(a)/boardHeight*100)}}else if(o.type==='text'&&drag.mode==='resize-x'){const scaleX=r.width/stage.offsetWidth;o.width=Math.max(20,Math.min(960,Math.round(drag.width+mdx/scaleX)))}else if(drag.mode==='resize-x')o.width=Math.max(20,Math.min(960,Math.round(drag.width+2*(mdx*Math.cos(a)+mdy*Math.sin(a)))));else o.height=Math.max(20,Math.min(960,Math.round(drag.height+2*(-mdx*Math.sin(a)+mdy*Math.cos(a))))) }if(drag.mode==='rotate')o.rotation=Math.round(Math.atan2(dy,dx)*180/Math.PI+90);updateShapeFromData(o);if(['resize-x','resize-y','resize-icon','resize-angle','resize-aoe-box'].includes(drag.mode))updateAlignmentGuides([o.id])}});

document.addEventListener('keydown',e=>{if(e.key==='Control')setMoveCopyMode(true)});

document.addEventListener('keyup',e=>{if(e.key==='Control')setMoveCopyMode(false)});

document.addEventListener('pointerup',e=>{if(drag?.pointerId!==undefined&&drag.pointerId!==e.pointerId)return;const clearTouchMoveSelection=e.pointerType==='touch'&&drag?.mode==='move'&&drag.moved;setMoveCopyMode(e.ctrlKey);clearAlignmentGuides();if(drag?.mode==='marquee'){let activeDrag=drag,box=activeDrag.box;box?.remove();if(activeDrag.moved){let left=Math.min(activeDrag.startX,e.clientX),top=Math.min(activeDrag.startY,e.clientY),right=Math.max(activeDrag.startX,e.clientX),bottom=Math.max(activeDrag.startY,e.clientY),boardBounds=stage.getBoundingClientRect(),viewport=document.querySelector('.object-layout-rect'),viewportRect=viewport.getBoundingClientRect(),viewportBounds={left:viewportRect.left+viewport.clientLeft,top:viewportRect.top+viewport.clientTop,right:viewportRect.left+viewport.clientLeft+viewport.clientWidth,bottom:viewportRect.top+viewport.clientTop+viewport.clientHeight},hits=current().filter(o=>{if(o.visible===false)return false;let node=Array.from(layer.children).find(el=>el.dataset.id===o.id);if(!node)return false;let b=node.getBoundingClientRect();return marqueeContainsVisibleObject(b,{left,top,right,bottom},boardBounds,viewportBounds)}).map(o=>o.id);selectedIds=activeDrag.additive?[...new Set([...activeDrag.initialIds,...hits])]:hits;selected=selectedIds[selectedIds.length-1]||null}if(e.pointerType==='mouse'&&selectedIds.length===1)pendingLayerRevealId=selectedIds[0];drag=null;renderSelectionOnly();return}let shouldRender=false,copiedLayerIds=[],structuralChange=!!(drag?.mode==='move'&&drag.ctrlAtStart);if(drag?.mode==='move'&&drag.ctrlAtStart){let validClone=drag.moved&&e.ctrlKey&&!drag.ctrlBroken;if(!validClone){current().splice(0,current().length,...current().filter(item=>!drag.ids.includes(item.id)));selectedIds=drag.originalIds;selected=selectedIds[selectedIds.length-1]||null}else{recordHistory(drag.beforeData);save();renderInspector();copiedLayerIds=drag.ids.slice()}shouldRender=true}else if(drag?.moved){recordHistory(drag.beforeData);save();renderInspector()}drag=null;stage.classList.remove('ctrl-copy');if(clearTouchMoveSelection){selected=null;selectedIds=[];shouldRender=true}if(shouldRender){if(structuralChange)renderAndSave();else renderSelectionOnly()}if(copiedLayerIds.length)revealMovedLayers(copiedLayerIds)});

document.addEventListener('pointercancel',e=>{if(!drag||drag.pointerId!==undefined&&drag.pointerId!==e.pointerId)return;const cancelled=drag;drag=null;cancelled.box?.remove();clearAlignmentGuides();stage.classList.remove('ctrl-copy');if(cancelled.beforeData)data=JSON.parse(cancelled.beforeData);else if(cancelled.moved){recordHistory();save()}selected=null;selectedIds=[];renderAndSave()});

let keyboardNudgeSession=null,keyboardNudgeFrame=null;

document.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))finishKeyboardNudge()});

document.addEventListener('pointerdown',finishKeyboardNudge,true);

window.addEventListener('blur',finishKeyboardNudge);

document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target.isContentEditable||e.target.closest('input,select,textarea,button,dialog,[role="separator"],[role="menu"],#pages')||document.querySelector('.comparison-pan-enabled'))return;if(nudgeSelectedObjects(e.key,e.repeat)){e.preventDefault();e.stopImmediatePropagation()}});

document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||e.target.isContentEditable)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){if(selectedIds.length){e.preventDefault();clipboardObjects=current().filter(o=>selectedIds.includes(o.id)).map(o=>JSON.parse(JSON.stringify(o)));clipboardSourcePage=current()}}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){if(clipboardObjects.length){e.preventDefault();pasteClipboardObjects()}}if((e.key==='ArrowUp'||e.key==='ArrowDown')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.target.closest('#pages')){let next=data.page+(e.key==='ArrowUp'?-1:1);if(next>=0&&next<data.pages.length){e.preventDefault();selectPhase(next);document.querySelector('#pages .page-tab.active')?.focus()}}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}else if(e.key==='Delete'||e.key==='Backspace')deleteSelected();else if(e.key==='Escape'){if(drag?.mode==='move'){data=JSON.parse(drag.beforeData);selectedIds=drag.originalIds||selectedIds;selected=selectedIds[selectedIds.length-1]||null;drag=null;stage.classList.remove('ctrl-copy');renderAndSave()}tool='select';document.querySelectorAll('.tool').forEach(x=>x.classList.remove('active'));stage.style.cursor='default'}});

$('#undo').onclick=undo;

$('#redo').onclick=redo;

$('#clipToggle').onclick=()=>{fieldClipEnabled=!fieldClipEnabled;updateObjectClip();updateClipToggle()};

$('#fieldToggle').onclick=()=>{fieldVisible=!fieldVisible;stage.classList.toggle('field-hidden',!fieldVisible);updateFieldToggle()};

updateFieldToggle();

$('#gridToggle').onclick=()=>{gridVisible=!gridVisible;stage.classList.toggle('grid-hidden',!gridVisible);updateGridToggle()};

updateGridToggle();

updateClipToggle();

$('#addPage').onclick=()=>{commitPendingHistory();const owner=data,before=JSON.parse(JSON.stringify(data)),beforeHistory=history.slice(),beforeFuture=future.slice(),beforeSelected=selected,beforeSelectedIds=selectedIds.slice(),beforePhases=selectedPhaseIndexes.slice();snapshot();selectedPhaseIndexes=[];data.pages.push([]);data.pageNames.push('新規フェーズ');data.pageGroupIds.push(data.activePhaseGroup||null);data.pageNotes.push('');data.pageColors.push('#ffffff');data.pageBoardShapes.push('square');data.pageFieldBackgroundColors.push(activeFieldBackground());data.pageFieldImageIds.push('');data.pageFieldImageTints.push({color:"#000000",strength:0});data.pageFieldSizes.push({width:538,height:538});data.page=data.pages.length-1;data.activePhaseGroup=null;selected=null;selectedIds=[];renderAndSave();const tab=$('#pages').querySelectorAll('.page-tab')[data.page];if(tab){beginPageRename(tab,()=>{if(data!==owner)return;Object.assign(data,before);history=beforeHistory;future=beforeFuture;pendingHistoryState=null;pendingHistoryOwner=null;selected=beforeSelected;selectedIds=beforeSelectedIds;selectedPhaseIndexes=beforePhases;phaseSelectionOwner=data;renderAndSave()});const input=tab.querySelector('.page-tab-input');if(input)revealMovedListItems($('#pages'),[input])}};

$('#confirmNo').onclick=()=>{$('#deletePageDialog').close();deletePageIndex=null};

$('#confirmYes').onclick=()=>{$('#deletePageDialog').close();if(deletePageIndex!==null)deleteCurrentPage(deletePageIndex);deletePageIndex=null};

$('#deleteContentNo').onclick=()=>{$('#deleteContentDialog').close();deleteContentIndex=null};

$('#deleteContentYes').onclick=()=>{$('#deleteContentDialog').close();if(deleteContentIndex!==null)deleteContentBoard(deleteContentIndex);deleteContentIndex=null};

$('#clearUserDataBtn').onclick=()=>$('#clearUserDataDialog').showModal();

$('#clearUserDataNo').onclick=()=>$('#clearUserDataDialog').close();

$('#clearUserDataYes').onclick=async()=>{try{cancelScheduledBoardSave();await window.boardStorage.clear();localStorage.removeItem('tactica-board-v1');localStorage.removeItem('tactica-left-pinned-v1');localStorage.removeItem('tactica-view-settings-v1');location.reload()}catch(error){notify('保存データを削除できません：'+(error?.message||String(error)))}};

$('#clearBtn').onclick=()=>showDeletionDialog('clearDialog','コンテンツ「'+(data.title||'新規コンテンツ')+'」のフェーズ「'+(data.pageNames[data.page]||'フェーズ'+(data.page+1))+'」内のオブジェクトをすべて削除しますか？');

$('#clearNo').onclick=()=>$('#clearDialog').close();

$('#clearYes').onclick=()=>{$('#clearDialog').close();if(!current().length)return;snapshot();data.pages[data.page]=[];selected=null;selectedIds=[];renderAndSave()};

;
// ===== js/runtime/file-io-setup.js =====
// Initialization stage: file-io-setup. Load order is owned by bolxiv.js.
const jsonBackupRecordKey='bolxiv-json-backup-records-v1';

const jsonExportMenu=document.createElement('div');

jsonExportMenu.id='jsonExportMenu';

jsonExportMenu.className='png-export-menu';

jsonExportMenu.setAttribute('role','menu');

jsonExportMenu.hidden=true;

jsonExportMenu.innerHTML='<div class="export-menu-label" role="presentation">再編集・バックアップ用</div><button type="button" role="menuitem" data-json-scope="all">編集データを保存（全コンテンツ・JSON）</button><div class="json-backup-status" data-backup-status="all" role="note"></div><button type="button" role="menuitem" data-json-scope="selected">編集データを保存（選択中コンテンツ・JSON）</button><div class="json-backup-status" data-backup-status="selected" role="note"></div><div class="export-menu-separator" role="separator"></div><div class="export-menu-label" role="presentation">閲覧・画像共有用</div><button type="button" role="menuitem" data-png-scale="1">PNG生成</button>';

document.body.appendChild(jsonExportMenu);

$('#exportBtn').onclick=async()=>{
 if(!jsonExportMenu.hidden){closeJsonExportMenu();return}
 closeJsonImportMenu();closeHelpMenu();
 await updateJsonBackupStatus();
 const rect=$('#exportBtn').getBoundingClientRect();addPhoneMenuClose(jsonExportMenu,()=>closeJsonExportMenu(true));jsonExportMenu.hidden=false;
 jsonExportMenu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-jsonExportMenu.offsetWidth-8))+'px';
 jsonExportMenu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-jsonExportMenu.offsetHeight-8))+'px';
 $('#exportBtn').setAttribute('aria-expanded','true');jsonExportMenu.querySelector('button').focus();
};

document.addEventListener('click',e=>{if(!jsonExportMenu.contains(e.target)&&!e.target.closest('#exportBtn'))closeJsonExportMenu()});

window.addEventListener('resize',()=>closeJsonExportMenu());

jsonExportMenu.addEventListener('keydown',e=>{const items=Array.from(jsonExportMenu.querySelectorAll('button')),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeJsonExportMenu(true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(e.key==='Tab')closeJsonExportMenu()});

jsonExportMenu.addEventListener('click',async e=>{const item=e.target.closest('[data-json-scope],[data-png-scale]');if(!item)return;closeJsonExportMenu(true);const isPng=!!item.dataset.pngScale;try{if(isPng){await window.Bolxiv.pngPreview.open(Number(item.dataset.pngScale))}else await exportJson(item.dataset.jsonScope)}catch(error){if(error?.name==='AbortError')return;console.error(isPng?'PNG export failed':'JSON export failed',error);notify((isPng?'PNG':'JSON')+'を書き出せませんでした：'+(error?.message||String(error)))}});

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
 const rect=$('#importBtn').getBoundingClientRect();addPhoneMenuClose(jsonImportMenu,()=>closeJsonImportMenu(true));jsonImportMenu.hidden=false;
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
  const previous={data,contentBoards,activeContent,listHistory:contentListHistory.slice(),listFuture:contentListFuture.slice(),history:history.slice(),future:future.slice(),selected,selectedIds:selectedIds.slice(),selectedPhaseIndexes:selectedPhaseIndexes.slice(),phaseSelectionOwner};
  try{applyImportedBoards(imported,mode);notify(mode==='append'?imported.length+' 件のコンテンツを末尾に追加しました':'全コンテンツを読み込みデータに置き換えました')}
  catch(error){
   contentListHistory.splice(0,contentListHistory.length,...previous.listHistory);contentListFuture.splice(0,contentListFuture.length,...previous.listFuture);contentSelectorCache=null;data=previous.data;contentBoards=previous.contentBoards;activeContent=previous.activeContent;history=previous.history;future=previous.future;selected=previous.selected;selectedIds=previous.selectedIds;selectedPhaseIndexes=previous.selectedPhaseIndexes;phaseSelectionOwner=previous.phaseSelectionOwner;
   try{renderAndSave()}catch(recoveryError){console.error('Import recovery failed',recoveryError)}
   console.error('Board import failed',error);notify('JSON読み込みに失敗：'+(error?.message||String(error)));clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),15000);
  }
  e.target.value='';
 };
 reader.onerror=()=>{notify('JSONファイルを読み取れません：'+(reader.error?.message||'ファイルへのアクセスに失敗しました'));e.target.value=''};
 reader.readAsText(file);
};

;
// ===== js/runtime/app-setup.js =====
// Initialization stage: app-setup. Load order is owned by bolxiv.js.
let firstRun=true;

try{let saved=window.boardInitialState??localStorage.getItem('tactica-board-v1');if(saved){let v=JSON.parse(saved);if(Array.isArray(v.contents)&&v.contents.length){contentBoards=v.contents.filter(board=>board&&Array.isArray(board.pages)&&board.pages.length).map(board=>({...board,pages:board.pages.map(page=>Array.isArray(page)?page:[]),
  pageNotes:Array.from({length:board.pages.length},(_,i)=>typeof board.pageNotes?.[i]==='string'?board.pageNotes[i]:''),page:Math.max(0,Math.min(Number(board.page)||0,board.pages.length-1))}));if(!contentBoards.length)contentBoards=[data];activeContent=Math.max(0,Math.min(Number(v.activeContent)||0,contentBoards.length-1));data=contentBoards[activeContent];firstRun=false}else if(v.pages?.length){data={...data,...v};contentBoards=[data];activeContent=0;firstRun=false}}}catch{}

window.boardInitialState=null;

for(const board of contentBoards)migrateBoardImages(board);

normalizePageNames();

updateContentSelector();

renderAllIconGrids();

$('#boardShapeInput').onchange=e=>{let shape=e.target.value;if(shape==='load-image'||shape==='load-image4'){document.getElementById('fieldImageInput').dataset.mode=shape==='load-image4'?'image4':'image';document.getElementById('fieldImageInput').value='';document.getElementById('fieldImageInput').click();return}if(!['none','square','landscape','portrait','circle','image','image4'].includes(shape))return;snapshot();data.pageBoardShapes[data.page]=shape;let size=data.pageFieldSizes[data.page];if(shape==='landscape'&&size.width<=size.height){size.width=538;size.height=320}else if(shape==='portrait'&&size.height<=size.width){size.width=320;size.height=538}else if(['square','circle'].includes(shape)&&size.width!==size.height){size.width=538;size.height=538}renderAndSave()};

$('#contentSelect').onclick=()=>{if(editingContentIndex>=0)return;let open=$('#contentOptions').hidden;$('#contentOptions').hidden=!open;$('#contentSelect').setAttribute('aria-expanded',String(open));if(open)updateContentSelector()};

document.addEventListener('click',e=>{if(e.target.closest('.content-select-row')||editingContentIndex>=0)return;$('#contentOptions').hidden=true;$('#contentSelect').setAttribute('aria-expanded','false')});

for(let axis of ['width','height']){let cap=axis==='width'?'Width':'Height',range=document.getElementById('field'+cap+'Range'),spin=document.getElementById('field'+cap+'Spin');range.addEventListener('pointerdown',()=>{recordHistory()});range.addEventListener('input',e=>setFieldDimension(axis,e.target.value));bindFieldDimensionSpin(spin,axis)}

document.getElementById('copyPage').onclick=()=>copyPhaseAt();

let fieldImageInput=document.getElementById('fieldImageInput');

fieldImageInput.addEventListener('cancel',()=>renderAndSave());

fieldImageInput.onchange=()=>{let file=fieldImageInput.files?.[0];if(!file){renderAndSave();return}if(!file.type.startsWith('image/')){notify('画像ファイルを選択してください');renderAndSave();return}let reader=new FileReader();reader.onerror=()=>{notify('画像を読み込めませんでした');renderAndSave()};reader.onload=()=>{let img=new Image();img.onerror=()=>{notify('画像を読み込めませんでした');renderAndSave()};img.onload=()=>{if(boardReadOnly)return;let scale=Math.min(1,640/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));let ctx=canvas.getContext('2d');if(!ctx){notify('画像を読み込めませんでした');renderAndSave();return}ctx.drawImage(img,0,0,canvas.width,canvas.height);let imageData;try{imageData=canvas.toDataURL('image/webp',.9);if(!imageData.startsWith('data:image/webp'))imageData=canvas.toDataURL('image/png')}catch{notify('画像を保存できませんでした');renderAndSave();return}snapshot();data.pageFieldImageIds[data.page]=boardImageLibrary.register(imageData,{width:canvas.width,height:canvas.height});data.pageBoardShapes[data.page]=fieldImageInput.dataset.mode==='image4'?'image4':'image';let size=data.pageFieldSizes[data.page],ratio=img.naturalWidth/img.naturalHeight;if(ratio>=1){size.width=538;size.height=Math.max(64,Math.round(538/ratio))}else{size.height=538;size.width=Math.max(64,Math.round(538*ratio))}renderAndSave();notify('画像をフィールドとして読み込みました')};img.src=reader.result};reader.readAsDataURL(file)};

let savedPinned=localStorage.getItem('tactica-left-pinned-v1'),initialPinned=savedPinned===null?false:savedPinned==='true',pane=document.querySelector('.left'),toggle=document.getElementById('leftRailToggle');

localStorage.setItem('tactica-left-pinned-v1',String(initialPinned));

pane.classList.toggle('pinned',initialPinned);

toggle.setAttribute('aria-pressed',String(initialPinned));

toggle.title=initialPinned?'固定を解除':'展開を固定';

toggle.setAttribute('aria-label',toggle.title);

toggle.querySelector('.rail-label').textContent=initialPinned?'固定中':'固定';

renderAndSave();

const viewSettingsKey='tactica-view-settings-v1';

let viewSettings={};

try{let savedViewSettings=JSON.parse(localStorage.getItem(viewSettingsKey)||'{}');if(savedViewSettings&&typeof savedViewSettings==='object'&&!Array.isArray(savedViewSettings))viewSettings=savedViewSettings}catch{}

(function restorePanelExpansion(){
 for(const [id,key] of [['toggleBattlePages','contentPhasesExpanded'],['toggleLayoutProperties','contentPropertiesExpanded'],['toggleLayers','phaseLayersExpanded'],['toggleInspector','phasePropertiesExpanded']]){
  const button=document.getElementById(id),saved=viewSettings[key];
  if(typeof saved==='boolean'&&(button.getAttribute('aria-expanded')==='true')!==saved)button.click();
  button.addEventListener('click',()=>rememberViewSetting(id==='toggleBattlePages'&&boardReadOnly?'viewPhasesExpanded':key,button.getAttribute('aria-expanded')==='true'));
 }
})();

(function setupContentPaneResize(){let layout=document.querySelector('.layout'),pane=document.querySelector('.battle'),handle=document.getElementById('contentPaneResize'),minWidth=298,dragState=null;let maximum=()=>Math.max(minWidth,Math.min(parseFloat(layout.style.getPropertyValue('--content-list-max-width'))||411,layout.clientWidth-(document.querySelector('.left').classList.contains('pinned')?270:56)-320));function setWidth(value,remember=true){let width=Math.max(minWidth,Math.min(maximum(),Math.round(value)));layout.style.setProperty('--content-pane-width',width+'px');handle.setAttribute('aria-valuenow',String(width));handle.setAttribute('aria-valuemax',String(maximum()));if(remember)rememberViewSetting('contentPaneWidth',width);return width}handle.addEventListener('pointerdown',e=>{if(e.button!==0||!document.getElementById('contentOptions').hidden)return;e.preventDefault();dragState={id:e.pointerId,x:e.clientX,width:pane.getBoundingClientRect().width};handle.setPointerCapture(e.pointerId);handle.classList.add('resizing');document.body.classList.add('resizing-content-pane')});handle.addEventListener('pointermove',e=>{if(dragState&&dragState.id===e.pointerId)setWidth(dragState.width+e.clientX-dragState.x)});let finish=e=>{if(!dragState||e.pointerId!==dragState.id)return;dragState=null;handle.classList.remove('resizing');document.body.classList.remove('resizing-content-pane');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId)};for(let event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,finish);handle.addEventListener('keydown',e=>{if(!document.getElementById('contentOptions').hidden)return;let width=pane.getBoundingClientRect().width;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setWidth(width+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?40:10))}else if(e.key==='Home'){e.preventDefault();setWidth(minWidth)}});window.addEventListener('resize',()=>setWidth(Number.isFinite(viewSettings.contentPaneWidth)?viewSettings.contentPaneWidth:pane.getBoundingClientRect().width,false));setWidth(minWidth,false);let dropdown=document.querySelector('.content-dropdown'),baseWidth=dropdown.getBoundingClientRect().width;if(baseWidth>0)layout.style.setProperty('--content-list-max-width',(baseWidth*1.5+60)+'px');setWidth(Number.isFinite(viewSettings.contentPaneWidth)?viewSettings.contentPaneWidth:minWidth,false)})();

document.getElementById('fitBoardZoom').onclick=fitBoardDisplayZoom;

document.getElementById('zoomOut').onclick=()=>setBoardDisplayZoom(boardDisplayZoom-5);

document.getElementById('zoomIn').onclick=()=>setBoardDisplayZoom(boardDisplayZoom+5);

document.getElementById('resetBoardZoom').onclick=()=>setBoardDisplayZoom(100);

setBoardDisplayZoom(Number.isFinite(viewSettings.boardDisplayZoom)?viewSettings.boardDisplayZoom:100,false);

(function initPhasePanelResize(){
 const panel=document.getElementById('objectLayerPanel'),handle=document.getElementById('layerPropertyResize'),layers=document.getElementById('layerListPanel').parentElement,properties=document.getElementById('propertyPanel').parentElement;
 let share=Number.isFinite(viewSettings.phaseLayerHeightShare)?Math.max(0,Math.min(1,viewSettings.phaseLayerHeightShare)):.5,gesture=null;
 const expanded=()=>!document.querySelector('.layout').classList.contains('desktop-phase-tools')&&document.getElementById('toggleLayers').getAttribute('aria-expanded')==='true'&&document.getElementById('toggleInspector').getAttribute('aria-expanded')==='true';
 function minimum(group,body,item){const style=getComputedStyle(body);return Math.ceil(group.querySelector('button').getBoundingClientRect().height+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+2+(item?item.getBoundingClientRect().height:32))}
 function measurements(){const layerBody=document.getElementById('layerListPanel'),propertyBody=document.getElementById('propertyPanel');const layerMin=minimum(layers,layerBody,document.querySelector('#objectList .object-row')||document.querySelector('#objectList .object-empty')),propertyMin=minimum(properties,propertyBody,document.querySelector('#inspector>.field')||document.querySelector('#inspector>*'));const style=getComputedStyle(panel);let total=panel.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-2*parseFloat(style.rowGap)-handle.getBoundingClientRect().height;return {layerMin,propertyMin,total:Math.max(total,layerMin+propertyMin)}}
 function update(){if(!expanded())return;const m=measurements(),height=Math.max(m.layerMin,Math.min(m.total-m.propertyMin,m.total*share));panel.style.setProperty('--layer-panel-min',m.layerMin+'px');panel.style.setProperty('--property-panel-min',m.propertyMin+'px');panel.style.setProperty('--layer-panel-height',height+'px');handle.setAttribute('aria-valuemin',Math.round(m.layerMin/m.total*100));handle.setAttribute('aria-valuemax',Math.round((m.total-m.propertyMin)/m.total*100));handle.setAttribute('aria-valuenow',Math.round(height/m.total*100))}
 function setHeight(height){const m=measurements();share=Math.max(m.layerMin,Math.min(m.total-m.propertyMin,height))/m.total;rememberViewSetting('phaseLayerHeightShare',share);update()}
 handle.addEventListener('pointerdown',e=>{if(e.button!==0||!expanded())return;e.preventDefault();gesture={id:e.pointerId,y:e.clientY,height:layers.getBoundingClientRect().height};handle.setPointerCapture(e.pointerId);handle.classList.add('resizing');document.body.classList.add('resizing-phase-panels')});
 handle.addEventListener('pointermove',e=>{if(gesture&&gesture.id===e.pointerId)setHeight(gesture.height+e.clientY-gesture.y)});
 function finish(e){if(!gesture||gesture.id!==e.pointerId)return;gesture=null;handle.classList.remove('resizing');document.body.classList.remove('resizing-phase-panels');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId)}
 for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,finish);
 handle.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();setHeight(layers.getBoundingClientRect().height+(e.key==='ArrowDown'?1:-1)*(e.shiftKey?30:10))}});
 new ResizeObserver(update).observe(panel);
 new MutationObserver(update).observe(document.getElementById('inspector'),{childList:true});
 new MutationObserver(update).observe(document.getElementById('objectList'),{childList:true});
 for(const id of ['toggleLayers','toggleInspector'])new MutationObserver(update).observe(document.getElementById(id),{attributes:true,attributeFilter:['aria-expanded']});
 update();
})();

{const layout=document.querySelector('.layout'),button=document.getElementById('contentObjectPin'),phoneHistory=matchMedia('(max-width:850px)'),historyHost=document.createElement('div');historyHost.className='header-history-actions';historyHost.setAttribute('role','group');historyHost.setAttribute('aria-label','操作履歴');historyHost.append(document.getElementById('undo'),document.getElementById('redo'));document.querySelector('.header-mode-status').prepend(historyHost);const sync=()=>{const closed=layout.classList.contains('content-collapsed');button.setAttribute('aria-expanded',String(!closed));button.setAttribute('aria-controls','battlePanel');button.title=closed?'コンテンツペインを開く':'コンテンツペインを閉じる';button.setAttribute('aria-label',button.title)};button.onclick=()=>{if(phoneHistory.matches&&layout.classList.contains('phone-content-open')){document.querySelector('.phone-content-close')?.click();return}const closed=layout.classList.toggle('content-collapsed');rememberViewSetting('contentPaneCollapsed',closed);sync()};if(typeof viewSettings.contentPaneCollapsed==='boolean')layout.classList.toggle('content-collapsed',viewSettings.contentPaneCollapsed);new MutationObserver(sync).observe(layout,{attributes:true,attributeFilter:['class']});sync()}

(function setupCategoryMode(){const toggle=document.getElementById('categoryModeToggle');function update(){const multiple=!!viewSettings.objectCategoriesMultiple;toggle.setAttribute('aria-pressed',String(multiple));toggle.title=multiple?'複数展開：クリックで単独展開に切り替え':'単独展開：クリックで複数展開に切り替え';toggle.setAttribute('aria-label',toggle.title)}toggle.onclick=()=>{const multiple=!viewSettings.objectCategoriesMultiple;rememberViewSetting('objectCategoriesMultiple',multiple);if(!multiple){let kept=false;document.querySelectorAll('.left .accordion-toggle').forEach(button=>{if(button.getAttribute('aria-expanded')!=='true')return;if(!kept){kept=true;return}button.setAttribute('aria-expanded','false');document.getElementById(button.getAttribute('aria-controls')).hidden=true})}update()};update()})();

(function restoreObjectCategories(){const buttons=Array.from(document.querySelectorAll('.left .accordion-toggle')),saved=viewSettings.objectCategoryExpansion;if(saved&&typeof saved==='object'&&!Array.isArray(saved)){for(const button of buttons){const id=button.getAttribute('aria-controls');if(typeof saved[id]!=='boolean')continue;button.setAttribute('aria-expanded',String(saved[id]));document.getElementById(id).hidden=!saved[id]}}function saveExpansion(){const states={};for(const button of buttons)states[button.getAttribute('aria-controls')]=button.getAttribute('aria-expanded')==='true';rememberViewSetting('objectCategoryExpansion',states)}for(const button of buttons)button.addEventListener('click',saveExpansion);document.getElementById('categoryModeToggle').addEventListener('click',saveExpansion)})();

for(const id of ['gridToggle','fieldToggle','clipToggle'])document.getElementById(id).addEventListener('click',()=>{if(phaseComparisonActive())render()});

revealRestoredApp();

;
