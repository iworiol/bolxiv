// PC popup navigation runs before mode-specific editing handlers.
(()=>{
 const visible=node=>node&&!node.hidden&&node.getClientRects().length>0;
 const entries=menu=>[...menu.querySelectorAll('button,[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"]')].filter(node=>node.closest('[role="menu"]')===menu&&!node.disabled&&node.getAttribute('aria-disabled')!=='true'&&visible(node));
 const trigger=menu=>[...document.querySelectorAll('[aria-controls]')].find(node=>node.getAttribute('aria-controls')===menu.id&&visible(node));
 const focus=node=>{if(visible(node))node.focus({preventScroll:true})};
 function close(menu){const opener=trigger(menu)||menu._openerResolver?.()||menu._opener||menu._keyboardOrigin;menu._keyboardClose();focus(opener)}
 window.addEventListener('keydown',event=>{
  if(!matchMedia('(min-width:851px)').matches||event.isComposing||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter','Escape'].includes(event.key))return;
  const modal=[...document.querySelectorAll('dialog[open]')].filter(node=>node.matches(':modal')).at(-1);
  const menus=[...document.querySelectorAll('[role="menu"]')].filter(menu=>visible(menu)&&menu._keyboardClose&&(!modal||modal.contains(menu)));
  if(!menus.length)return;
  const menu=menus.sort((a,b)=>(a._keyboardOrder||0)-(b._keyboardOrder||0)).at(-1),buttons=entries(menu),at=buttons.indexOf(document.activeElement),key=event.key;
  if(menu.contains(event.target)&&event.target.closest?.('input,select,textarea,[contenteditable="true"]'))return;
  for(let host=menu;host;host=host._keyboardParent||host.parentElement.closest('[role="menu"]'))host._cancelSubmenuHover?.();
  event.preventDefault();event.stopImmediatePropagation();
  if(key==='Escape'){close(menu);return}
  if(key==='ArrowLeft'){if(menu.parentElement.closest('[role="menu"]')||menu._keyboardParent)close(menu);return}
  if(key==='ArrowRight'){
   const button=buttons[at],child=button?.getAttribute('aria-haspopup')==='menu'&&document.getElementById(button.getAttribute('aria-controls'));
   if(child){if(child.hidden)button.click();if(visible(child))focus(entries(child)[0])}return;
  }
  if(!buttons.length)return;
  if(key==='Enter'){buttons[at<0?0:at].click();return}
  const next=key==='Home'?0:key==='End'?buttons.length-1:at<0?(key==='ArrowUp'?buttons.length-1:0):(at+(key==='ArrowDown'?1:buttons.length-1))%buttons.length;
  focus(buttons[next]);
 },true);
})();

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
   const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.action=action;if(action==='paste')button.dataset.shortcut='Ctrl+V';if(action==='select-all')button.dataset.shortcut='Ctrl+A';button.setAttribute('role','menuitem');
   button.disabled=action==='paste'? !editing||!clipboardObjects.length:action==='select-all'? !editing||!current().length:false;
   button.onclick=()=>{if(button.disabled)return;const valid=openedBoard===data&&openedPhase===current();close();if(!valid)return;
    if(action==='paste')pasteClipboardObjects();
    else if(action==='select-all')selectAllObjects()
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

const readOnlyEditTargets='#importBtn,#jsonImportMenu,#fileInput,#fieldImageInput,#clearUserDataBtn,#addContent,.content-option-add,.content-list-history-button,.content-row-action,.content-option-input,#addPage,#copyPage,#copyPageToContent,#addPhaseGroup,.page-tab-edit,.page-tab-x,.page-tab-input,#undo,#redo,#clearBtn,#builtinFieldMarkers,.left .tool,.left .icon-choice,#layoutPropertiesPanel input,#layoutPropertiesPanel select,#layoutPropertiesPanel textarea,#layoutPropertiesPanel button,#layoutPropertiesPanel .color-picker,#objectList,#inspector,#objectContextMenu,.confirm-dialog';

let readOnlyPan=null;

for(const type of ['pointerdown','click','dblclick','contextmenu','input','change','dragstart','dragover','drop'])window.addEventListener(type,event=>{
 if(!boardReadOnly||!(event.target instanceof Element))return;
 if(readOnlyTarget(event.target)&&!(window.Bolxiv?.pngPreview?.active&&!window.Bolxiv.pngPreview.saving&&event.target.closest('#undo,#redo'))){blockReadOnlyEvent(event);return}
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
 if(window.Bolxiv?.pngPreview?.active&&!window.Bolxiv.pngPreview.saving&&(event.target.closest?.('#phaseMemo textarea,#outputNotePhase,#undo,#redo')||(event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())))return;
 const key=event.key.toLowerCase(),shortcut=(event.ctrlKey||event.metaKey)&&['v','x','z','y'].includes(key),objectKey=['delete','backspace'].includes(key)||key.startsWith('arrow')&&!event.target.closest('#pages,.board-display-toolbar,dialog');
 if(readOnlyTarget(event.target)||shortcut||objectKey)blockReadOnlyEvent(event);
},true);

;
// ===== js/state.js =====
// Initialization stage: state. Load order is owned by bolxiv.js.
const $=s=>document.querySelector(s), stage=$('#stage'), layer=$('#objects'), controls=$('#objectControls'), objectClip=$('#objectClip');

let individualGroupSelection=null;
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
 function dimensions(id){const record=records.get(id);return {width:record?.width||0,height:record?.height||0}}
 return {register,get,requireImage,entries,dimensions};
})();

let gridVisible=true,fieldVisible=true,fieldClipEnabled=false;

let data={title:'新規コンテンツ1',layout:'square',boardShape:'square',pageBoardShapes:['square'],layoutColor:'#ffffff',fieldBackgroundColor:'#17212c',pageFieldBackgroundColors:['#17212c'],pageFieldImageIds:[''],pageFieldImageTints:[{color:"#000000",strength:0}],pageFieldSizes:[{width:538,height:538}],pageColors:['#ffffff'],pages:[[]],pageNames:['新規フェーズ'],pageNotes:[''],page:0};

let history=[],future=[],deleteContentIndex=null;

const iconFiles={role:[['タンク1','00_ROLE','TankRole','1'],['タンク2','00_ROLE','TankRole','2'],['ヒーラー1','00_ROLE','HealerRole','1'],['ヒーラー2','00_ROLE','HealerRole','2'],...['DPS1','DPS2','DPS3','DPS4'].map((n,i)=>[n,'00_ROLE','DPSRole',String(i+1)]),['タンク','00_ROLE','TankRole',''],['ヒーラー','00_ROLE','HealerRole',''],['近接DPS','00_ROLE','MeleeDPS',''],['遠隔DPS','00_ROLE','RangedDPS','']],tank:[['Gladiator','01_TANK/Class','Gladiator'],['Marauder','01_TANK/Class','Marauder'],...['DarkKnight','Gunbreaker','Paladin','Warrior'].map(n=>[n,'01_TANK/Job',n])],healer:[['Conjurer','02_HEALER/Class','Conjurer'],...['Astrologian','Sage','Scholar','WhiteMage'].map(n=>[n,'02_HEALER/Job',n])],dps:[...['Arcanist','Archer','Lancer','Pugilist','Rogue','Thaumaturge'].map(n=>[n,'03_DPS/Class',n]),...['Bard','BlackMage','Dancer','Dragoon','Machinist','Monk','Ninja','Pictomancer','Reaper','RedMage','Samurai','Summoner','Viper'].map(n=>[n,'03_DPS/Job',n])],crafter:['Alchemist','Armorer','Blacksmith','Carpenter','Culinarian','Goldsmith','Leatherworker','Weaver'].map(n=>[n,'04_CRAFTER',n]),gatherer:['Botanist','Fisher','Miner'].map(n=>[n,'05_GATHERER',n]),limited:[['BlueMage','06_LIMITED','BlueMage']]};

let activeIcon=null,pendingImage=null,objectImageReadRevision=0;
// File selection is transactional: only a successfully placed image enters the library.
async function chooseObjectImage(file){
 if(!file)return;
 if(!file.type.startsWith('image/')){notify('画像ファイルを選択してください');return}
 const board=data,page=data.page,revision=++objectImageReadRevision,previousTool=tool,previousIcon=activeIcon,previousImage=pendingImage;
 try{
  const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)});
  const decoded=await decodeImportedImage(source);
  if(revision!==objectImageReadRevision||tool!==previousTool||activeIcon!==previousIcon||pendingImage!==previousImage||data!==board||data.page!==page||boardReadOnly||phaseComparisonActive()||window.Bolxiv?.fieldGuideEditor?.active||window.Bolxiv?.pngPreview?.active||data.activePhaseGroup)return;
  selectPlacementTool('image');pendingImage={type:'image',originalSource:source,nativeSize:{width:decoded.width,height:decoded.height},previewSource:decoded.preview};setTapPlacementArmed(true);
  document.getElementById('importObjectImage').classList.add('active');
  document.dispatchEvent(new Event('close-material-pane'));notify('画像を読み込みました。盤面をクリック／タップして配置してください');
 }catch{if(revision===objectImageReadRevision)notify('画像を読み込めませんでした。別の画像を選択してください')}
}

iconFiles.targetMarker=Object.entries({attack1:'攻撃1',attack2:'攻撃2',attack3:'攻撃3',attack4:'攻撃4',attack5:'攻撃5',attack6:'攻撃6',attack7:'攻撃7',attack8:'攻撃8',bind1:'バインド1',bind2:'バインド2',bind3:'バインド3',circle:'円',cross:'×',ignore1:'無視1',ignore2:'無視2',square:'四角',triangle:'三角'}).map(([file,name])=>[name,'target-marker',file]);

iconFiles.fieldMarker=[['フィールド1','field-marker-transparent','1'],['フィールド2','field-marker-transparent','2'],['フィールド3','field-marker-transparent','3'],['フィールド4','field-marker-transparent','4'],...['A','B','C','D'].map(n=>[`フィールド${n}`,'field-marker-transparent',n.toLowerCase()])];

let boardDisplayZoom=100;

let selectedPhaseIndexes=[],phaseSelectionOwner=null,phaseComparisonRendering=false;

document.getElementById('exitPhaseComparison').onclick=()=>selectPhase(data.page);

;
// ===== js/runtime/help-setup.js =====
// Initialization stage: help-setup. Load order is owned by bolxiv.js.
const shortcutDialog=document.getElementById('shortcutDialog');
const operationGuide=document.getElementById('operationGuideDialog'),aboutTool=document.getElementById('aboutToolDialog');

const changeLog=document.createElement('dialog');

changeLog.id='changeLogDialog';

changeLog.className='operation-guide';

changeLog.setAttribute('aria-labelledby','changeLogTitle');

changeLog.innerHTML='<div class="operation-guide-heading"><h2 id="changeLogTitle">更新履歴</h2><button type="button" class="btn" autofocus>閉じる</button></div><div class="operation-guide-body"><p><span class="change-log-version">2026/11/05　Ver.0.9.3</span><span class="change-log-description">オフライン利用方法の準備、ダウンロードページの準備、UI調整、不具合修正</span></p><p><span class="change-log-version">2026/11/03　Ver.0.9.2</span><span class="change-log-description">UI調整、処理改善、他修正</span></p><p><span class="change-log-version">2026/11/03　Ver.0.9.1</span><span class="change-log-description">UI調整、不具合修正</span></p><p><span class="change-log-version">2026/11/02　Ver.0.9.0</span><span class="change-log-description">画像読み込み機能追加、フィールド機能追加(ガイド統合)、メニュー強化</span></p><p><span class="change-log-version">2026/10/31　Ver.0.8.2</span><span class="change-log-description">不具合修正</span></p><p><span class="change-log-version">2026/10/31　Ver.0.8.1</span><span class="change-log-description">UI等もろもろ調整</span></p><p><span class="change-log-version">2026/10/30　Ver.0.8.0</span><span class="change-log-description">キャンバスのガイド機能正式実装、印刷機能をスマホ版も拡充、フィールド設定コピー機能追加、UI調整</span></p><p><span class="change-log-version">2026/10/28　Ver.0.7.1</span><span class="change-log-description">印刷機能拡充(PC版のみ)、キャンバスのガイド機能仮実装、UI調整</span></p><p><span class="change-log-version">2026/10/26　Ver.0.7.0</span><span class="change-log-description">プリセット機能正式追加、UI調整</span></p><p><span class="change-log-version">2026/10/25　Ver.0.6.2</span><span class="change-log-description">オブジェクト追加、画像・印刷機能にノート表示追加</span></p><p><span class="change-log-version">2026/10/25　Ver.0.6.1</span><span class="change-log-description">UI調整</span></p><p><span class="change-log-version">2026/10/25　Ver.0.6.0</span><span class="change-log-description">オブジェクトのグループ化対応、印刷機能追加(PNG生成と統合)、プリセット機能仮実装</span></p><p><span class="change-log-version">2026/10/23　Ver.0.5.2</span><span class="change-log-description">UI調整</span></p><p><span class="change-log-version">2026/10/22　Ver.0.5.1</span><span class="change-log-description">UI調整</span></p><p><span class="change-log-version">2026/10/19　Ver.0.5.0</span><span class="change-log-description">コンテンツを履歴操作に追加、PNG生成モード追加、レイアウト少し見直し、その他修正</span></p><p><span class="change-log-version">2026/10/18　Ver.0.4.1</span><span class="change-log-description">ツールの内部構成変更、その他修正</span></p><p><span class="change-log-version">2026/10/18　Ver.0.4.0</span><span class="change-log-description">チュートリアル追加、フェーズグループ化機能追加、メモリ使用量削減、JSONファイルサイズ削減</span></p><p><span class="change-log-version">2026/10/17　Ver.0.3.0</span><span class="change-log-description">コンテンツ間フェーズコピー機能追加、右クリック・長押し操作メニュー各種追加、文字サイズ変更、処理負荷改善</span></p><p><span class="change-log-version">2026/10/15　Ver.0.2.0</span><span class="change-log-description">フェーズノート追加、構成見直し、その他修正&amp;見直し</span></p><p><span class="change-log-version">2026/10/14　Ver.0.1.1</span><span class="change-log-description">見た目見直し</span></p><p><span class="change-log-version">2026/10/12　Ver.0.1.0</span><span class="change-log-description">初版</span></p></div>';

document.body.append(changeLog);

changeLog.querySelector('button').onclick=()=>changeLog.close();



const usageGuide=document.createElement('dialog');
usageGuide.id='usageSceneDialog';usageGuide.className='operation-guide usage-scene-guide';usageGuide.setAttribute('aria-labelledby','usageSceneTitle');
const offlineUsageCases=[
 {
  "id": "usagePcCase",
  "tag": "PC・オフライン",
  "title": "PCでオフライン利用",
  "intro": "初回はオンラインで本体を入手します。準備ができたら、次回からはPC内のファイルを開くだけで使えます。ここではWindowsの操作を例に説明します。",
  "steps": [
   [
    "公開ページからZIPを保存する",
    "インターネットにつながっている間に、公開ページのダウンロード案内からツール本体のZIPファイルを保存します。",
    "ダウンロード先にZIPファイルが見つかれば次へ進めます。",
    "ブラウザーの「ページを保存」では、本体一式を入手できません。",
    0
   ],
   [
    "ZIPを展開する",
    "保存したZIPを右クリックし、「すべて展開」を選びます。保存先を確認して「展開」を押します。",
    "ZIPとは別に、展開されたフォルダーができれば完了です。",
    "ここではWindowsの操作例を案内しています。ほかの環境ではファイル管理アプリの展開操作を使います。",
    1
   ],
   [
    "index.htmlがあるフォルダーを開く",
    "展開したフォルダーを開き、index.htmlを探します。見つからない場合は、中のフォルダーを開いて確認します。",
    "index.htmlと、js・css・imagesフォルダーなどが同じ場所にあれば準備できています。",
    "ZIPの中のまま進めず、展開後のフォルダーを使います。ファイルの拡張子が非表示なら「index」と見える場合があります。",
    12
   ],
   [
    "index.htmlをダブルクリックする",
    "展開先のindex.htmlをダブルクリックします。開くアプリを尋ねられたら、普段使うブラウザーを選びます。",
    "BOARD OF LIGHT XIVの画面が開き、操作できる状態になれば起動できています。",
    "index.htmlだけを別の場所へ移さず、同じフォルダーのファイル一式を保ちます。",
    13
   ],
   [
    "次回も同じ場所から開く",
    "次回からは、保存してある同じindex.htmlをダブルクリックします。毎回ダウンロードや展開をやり直す必要はありません。",
    "インターネット接続なしでもツールを開けます。",
    "公開ページで作ったデータが出ない場合は、公開ページ側でコンテンツをJSONに保存し、この起動先で読み込みます。",
    2
   ]
  ],
  "note": "<h4>データと次回の起動について</h4><p>データはブラウザー内に自動保存されます。公開ページとこの起動先は、データの保存先が異なる場合があります。大切なデータは「エクスポート」でJSONにも保存してください。ユーザープリセットは専用JSONで別に保存します。</p><p>PC経由のケースのローカルサーバーは、PC自身でも使えます。起動バッチで開いたPCのブラウザーをそのまま利用してください。</p>"
 },
 {
  "id": "usageLanCase",
  "tag": "Windows PC・スマホ",
  "title": "スマホでオフライン利用（PC経由）",
  "intro": "PCを起動したまま、同じネットワークのスマホで使う方法です。初回はオンラインで本体を入手し、使う間はPCとスマホ間の通信を保ちます。",
  "steps": [
   [
    "PCに本体ZIPを保存する",
    "インターネットにつながっているPCで、公開ページからツール本体のZIPを保存します。直接起動用とPC経由用は同じZIPです。",
    "PCのダウンロード先にZIPファイルが見つかります。",
    "追加ツールのインストールは不要です。",
    0
   ],
   [
    "ZIPを展開して起動ファイルを探す",
    "ZIPを右クリックして「すべて展開」を選び、「展開」を押します。展開したフォルダーを開き、bolxiv_localserver_win.batを探します。",
    "index.htmlと同じ場所に起動ファイルが見つかれば準備できています。",
    "拡張子が非表示ならbolxiv_localserver_winと見える場合があります。種類が「Windows バッチ ファイル」のものを選びます。PS1は直接開きません。",
    1
   ],
   [
    "PCとスマホを同じネットワークにつなぐ",
    "スマホの設定で、PCと同じ家庭内ネットワークのWi-Fiに接続します。PCは同じルーターへの有線接続でもかまいません。",
    "PCとスマホが同じルーターにつながった状態で次へ進みます。",
    "ゲスト用Wi-Fiなど、端末同士の通信が禁止された接続では使えません。準備後はインターネット接続がなくても、端末間の接続は必要です。",
    4
   ],
   [
    "PCで起動ファイルを実行する",
    "bolxiv_localserver_win.batをダブルクリックします。起動したウィンドウは閉じずに残します。",
    "PCのブラウザーでツールが開き、起動ウィンドウに「Phone URLs」が表示されます。",
    "Windowsが通信の許可を尋ねた場合は、自分が管理するプライベートネットワークでの通信を許可します。ウイルス対策ソフトが起動ファイルを検知する場合があります。警告が出た場合は起動を中止し、検知名と対象ファイル名を確認してください。",
    3
   ],
   [
    "Phone URLsのURLを確認する",
    "起動ウィンドウの「Phone URLs」の下にある、http://で始まるアドレスを確認します。",
    "スマホに入力するURLを確認できたら次へ進めます。",
    "http://192.168.1.10:8000/は例です。数字もポートも、実際に表示されたものを使います。複数ある場合は接続中のネットワークのURLを使います。",
    14
   ],
   [
    "スマホのブラウザーにURLを入力する",
    "スマホでブラウザーを開き、画面上部のアドレス欄に確認したURLを入力して開きます。",
    "スマホにBOARD OF LIGHT XIVの画面が表示されれば接続できています。",
    "検索欄ではなくアドレス欄へ入力します。スマホでlocalhostを開いても、PCのサーバーにはつながりません。利用中はPCをスリープさせず、起動ウィンドウも開いたままにします。",
    5
   ]
  ],
  "note": "<h4>終了するとき・つながらないとき</h4><p>使い終えたらPCの起動ウィンドウを閉じるか、そこでCtrl+Cを押します。次回は同じ起動ファイルを実行してからスマホで開きます。</p><p>つながらなければ、PC・サーバーが起動中か、端末間の接続が可能か、URLが表示どおりか、Windowsで通信が許可されているかを確認します。PCとスマホの作成データは自動同期されません。移動にはコンテンツJSONとユーザープリセット専用JSONを使います。</p>"
 },
 {
  "id": "usagePhoneCase",
  "tag": "スマホ・タブレット",
  "title": "スマホでオフライン利用（スマホ単体）",
  "intro": "スマホ内のサーバーアプリで本体を開きます。本体とアプリの入手にはインターネット接続が必要です。準備後はPCなしで利用できます。",
  "steps": [
   [
    "スマホにサーバーアプリを用意する",
    "オンラインのうちに、スマホ内のフォルダーを公開できるローカルHTTPサーバーアプリを用意します。",
    "そのアプリで公開フォルダーを選べることを確認します。",
    "特定のアプリを前提にしていません。対応状況や設定名はOS・アプリによって異なります。PC用の起動ファイルはスマホでは使いません。",
    15
   ],
   [
    "スマホに本体ZIPを保存する",
    "同じスマホのブラウザーで公開ページを開き、ツール本体のZIPを保存します。",
    "ダウンロード先やファイル管理アプリでZIPが見つかれば次へ進めます。",
    "ファイルは端末内へ保存します。クラウド上にしかない場合は、オフラインにする前にダウンロードします。",
    16
   ],
   [
    "ZIPを展開する",
    "スマホのファイル管理アプリでZIPを展開し、展開されたフォルダーの中からindex.htmlを探します。",
    "index.htmlとjs・css・imagesなどがそろったフォルダーを確認します。",
    "ZIPをタップすると展開される環境もあります。操作名は端末によって異なります。ファイルを一つずつ別の場所へ移さないでください。",
    6
   ],
   [
    "アプリの公開先フォルダーを指定する",
    "サーバーアプリを開き、公開するフォルダーとしてindex.htmlがある場所を選びます。フォルダーへのアクセスを求められたら許可します。",
    "公開先が、展開した本体のフォルダーになっていれば準備できています。",
    "設定名は「公開フォルダー」「ドキュメントルート」など、アプリによって異なります。ZIPファイル自体は指定しません。",
    17
   ],
   [
    "スマホ内のサーバーを起動する",
    "アプリの開始・起動ボタンを押します。",
    "起動中の表示と、この端末から開くためのURLが表示されれば完了です。",
    "ボタン名はアプリによって異なります。表示されたURLを次の操作で使います。",
    18
   ],
   [
    "同じスマホのブラウザーで開く",
    "サーバーアプリが表示する端末内向けのURLを、同じスマホのブラウザーのアドレス欄に入力して開きます。",
    "BOARD OF LIGHT XIVの画面が表示されれば起動できています。",
    "http://localhost:8000/は例です。実際のURLを使います。このケースではサーバーもスマホ内にあるため、localhostを使えます。",
    19
   ],
   [
    "オフラインで開けることを確認する",
    "サーバーを起動したまま、インターネット接続を切った状態でも同じURLを開き直せるか確認します。",
    "ツールが開けば、PCやインターネット接続なしで使う準備ができています。",
    "画面ロックやアプリ切り替えでサーバーが停止する場合は、OS・アプリのバックグラウンド動作設定を確認します。外部リンクの閲覧には接続が必要です。",
    8
   ]
  ],
  "note": "<h4>次回もサーバーを起動してから使います</h4><p>サーバー停止後は、再びアプリで起動してから同じブラウザー・URLを開きます。ファイル管理アプリでHTMLを直接開く方法は端末による制約があるため、動作を保証しません。</p><p>データはブラウザー内に自動保存されます。公開ページや別端末のデータは自動では移りません。必要なコンテンツとユーザープリセットは、それぞれのJSONで移します。スマホ向けの手順はタブレットでも共通です。</p>"
 },
 {
  "id": "usageUpdateCase",
  "tag": "PC・スマホ・タブレット",
  "title": "オフラインで使うツールのバージョンアップ",
  "intro": "現在のデータをJSONに保存してから、新しいVersionの本体一式へ入れ替えます。保存したJSONは、更新の確認が終わるまで残します。",
  "steps": [
   [
    "コンテンツをJSONに保存する",
    "更新前のツールでメニューを開き、「エクスポート」→「すべてのコンテンツを保存」を選びます。",
    "ダウンロード先などにコンテンツのJSONファイルが保存されます。",
    "更新対象のフォルダー以外に保存し、ファイルを見つけられることを確認してください。",
    9
   ],
   [
    "ユーザープリセットも別に保存する",
    "同じ「エクスポート」メニューから「すべてのユーザープリセットを保存」を選びます。",
    "コンテンツとは別の、ユーザープリセットのJSONを保存できれば完了です。",
    "コンテンツのJSONにはユーザープリセット一覧は含まれません。使っていない場合はこの操作を省略できます。",
    20
   ],
   [
    "新しいVersionのZIPを入手する",
    "オンラインで公開ページを開き、更新履歴と対象のVersionを確認して、新しいVersionの本体ZIPを保存します。",
    "新しい本体のZIPがダウンロード先に見つかれば次へ進めます。",
    "更新前に保存したJSONは、この後のファイル入れ替えでも残しておきます。",
    0
   ],
   [
    "使用中のツールとサーバーを閉じる",
    "ツールを開いているタブを閉じます。サーバー利用中なら、PCの起動ウィンドウを閉じるかCtrl+Cを押します。スマホ単体はサーバーアプリの停止操作を使います。",
    "使用中のツールとサーバーが停止したら入れ替えの準備ができています。",
    "PC経由で使っているスマホのタブも閉じておきます。",
    10
   ],
   [
    "新しいZIPを別の場所へ展開する",
    "ZIPを展開し、新しい本体のindex.htmlがあるフォルダーを確認します。",
    "新しい本体一式を、古いファイルと混ざっていない状態で用意できれば完了です。",
    "WindowsではZIPを右クリックして「すべて展開」を使います。スマホはファイル管理アプリで展開します。",
    1
   ],
   [
    "本体のフォルダーを入れ替える",
    "古い本体フォルダーは控えとして別名などで残し、新しい本体一式を、できるだけ以前と同じ置き場所・フォルダー名へ置きます。",
    "以前の起動先が、新しい本体一式を指している状態にします。",
    "個別ファイルの上書きで新旧を混在させないでください。バックアップJSONと古い本体は、動作確認が終わるまで削除しません。",
    10
   ],
   [
    "普段の方法で起動し直す",
    "PCの直接起動は新しいindex.htmlを開きます。PC経由は同梱の起動バッチを実行します。スマホ単体はサーバーアプリの公開先を確認し、起動し直します。",
    "普段と同じブラウザー・URLでツールを開ければ次へ進めます。",
    "スマホ単体の公開先が古いフォルダーのままになっていないか確認します。",
    11
   ],
   [
    "Versionを確認する",
    "画面上部のVersion表示（「Ver」で始まる数字）を、入手したVersionと見比べます。",
    "目的のVersionが表示されれば、本体の更新を確認できています。",
    "古い数字のままなら、開いたファイルやURLが新しい本体を指しているか確認してから、ページを再読み込みします。",
    21
   ],
   [
    "コンテンツとプリセットを確認する",
    "以前のコンテンツ・フェーズ・ユーザープリセットを開き、必要なデータが表示されるか確認します。",
    "必要なデータがそろっていれば更新作業は完了です。",
    "データは本体ファイルではなくブラウザー内に保存されています。置き場所・ブラウザー・ホスト名・ポートが変わると、保存先が変わる場合があります。",
    22
   ],
   [
    "データが見つからないときはJSONを読み込む",
    "まず以前と同じ起動先か確認します。それでもデータがない場合は「インポート」から保存したJSONを読み込みます。コンテンツは「コンテンツを追加」、プリセットは「ユーザープリセットを追加」を選びます。",
    "読み込み後に必要なデータが表示されれば復元できています。",
    "「すべて置き換え」は現在のデータを置き換える操作です。追加で重複した場合も、内容を確認してから整理してください。更新前のJSONは残しておきます。",
    23
   ]
  ],
  "note": "<h4>更新を確認できないとき</h4><p>起動時にファイル不一致の案内が出たら、新旧のファイルが混在していないか確認します。古いVersionのツールで新しいVersionのJSONを読み込めるとは限らないため、更新前のJSONを保持してください。</p>"
 }
];
function offlineUsageArtwork(scene){const cell=scene%12,x=cell%3*724,y=Math.floor(cell/3)*724,sheet=scene>=12?'detail':'base';return `<svg class="usage-scene-art" viewBox="0 0 724 724" aria-hidden="true" focusable="false"><svg width="724" height="724" viewBox="${x} ${y} 724 724" overflow="hidden"><image data-guide-sheet="${sheet}" width="2172" height="2896"/></svg></svg>`}
function offlineUsageCaseHTML(item){return `<header class="usage-scene-intro"><span class="usage-scene-eyebrow">${item.tag}</span><h3>${item.title}</h3><p>${item.intro}</p></header><p class="usage-download-status">本体ZIPの配布入口は準備中です。公開後は、以下の手順で利用できます。</p><ol class="usage-scene-steps">${item.steps.map(([title,action,result,tip,scene],i)=>`<li><div class="usage-step-heading"><span class="usage-step-number" aria-hidden="true">${i+1}</span><h4>${title}</h4></div>${offlineUsageArtwork(scene)}<p>${action}</p><p class="usage-step-result"><strong>確認：</strong>${result}</p>${tip?`<p class="usage-scene-tip">${tip}</p>`:''}</li>`).join('')}</ol><section class="usage-data-note">${item.note}</section><p class="usage-art-caption">絵は操作のイメージです。画面や操作名は端末・環境で異なる場合があります。</p>`}
usageGuide.innerHTML=`<div class="operation-guide-heading"><h2 id="usageSceneTitle">オフライン利用方法</h2><button id="closeUsageSceneGuide" type="button" class="btn" autofocus>閉じる</button></div><div class="operation-guide-body">${offlineUsageCases.map((item,i)=>i===0?offlineUsageCaseHTML(item):`<section id="${item.id}">${offlineUsageCaseHTML(item)}</section>`).join('')}</div>`;

document.body.append(usageGuide);
// A single retained detail view per case; selection changes visibility, never copies data or DOM.
(()=>{
 const body=usageGuide.querySelector('.operation-guide-body'),first=document.createElement('section');first.id='usagePcCase';
 while(body.firstElementChild&&body.firstElementChild.id!=='usageLanCase')first.append(body.firstElementChild);
 body.prepend(first);
 const cases=[first];
 cases.splice(1,0,...body.querySelectorAll(':scope>#usageLanCase,:scope>#usagePhoneCase,:scope>#usageUpdateCase'));
 const index=document.createElement('nav');index.className='help-contents';index.setAttribute('aria-label','利用シーン一覧');
 const title=document.createElement('p');title.className='help-contents-title';title.textContent='オフラインでの利用・更新方法';index.append(title);
 const list=document.createElement('ul');index.append(list);body.prepend(index);
 const links=[];
 function selectCase(selected,scroll=false){for(const [i,item] of cases.entries()){item.hidden=i!==selected;if(i===selected)links[i].setAttribute('aria-current','true');else links[i].removeAttribute('aria-current')}body.scrollTop=0;if(scroll)body.scrollTop=Math.max(0,cases[selected].getBoundingClientRect().top-body.getBoundingClientRect().top-12)}
 cases.forEach((item,i)=>{
  const heading=item.querySelector('h3'),label=heading.textContent;heading.tabIndex=-1;heading.classList.add('help-section-heading');
  const text=document.createElement('span');text.textContent=label;heading.replaceChildren(text);
  const back=document.createElement('button');back.type='button';back.className='help-back-to-contents';back.textContent='← 一覧へ戻る';back.onclick=()=>{body.scrollTop=0;links[i].focus({preventScroll:true})};const footer=document.createElement('p');footer.className='usage-case-footer';footer.append(back);item.append(footer);
  const row=document.createElement('li'),link=document.createElement('a');link.href='#'+item.id;link.textContent=label;
  link.onclick=event=>{event.preventDefault();selectCase(i,true)};row.append(link);list.append(row);links.push(link);
 });
 usageGuide.showCaseIndex=()=>selectCase(0);selectCase(0);
})();

document.getElementById('closeUsageSceneGuide').onclick=()=>usageGuide.close();

// One dialog owns both release notes and the download entry.
const downloadDialog=changeLog;
downloadDialog.classList.add('download-guide');
downloadDialog.querySelector('#changeLogTitle').textContent='更新履歴・ダウンロード';
const releaseBody=downloadDialog.querySelector('.operation-guide-body');
const releaseHistorySection=document.createElement('section');releaseHistorySection.className='release-history';
const historyTitle=document.createElement('h3');historyTitle.textContent='更新履歴';releaseHistorySection.append(historyTitle);
while(releaseBody.firstChild)releaseHistorySection.append(releaseBody.firstChild);
releaseBody.innerHTML='<p class="download-status" role="note">ダウンロードはVersion 1.0.0から提供予定です。現在、ファイルは準備中です。</p><p>PCで直接開く場合も、PC経由でスマホから使う場合も、起動ファイルを含む同じZIPを使用します。</p><h3>ダウンロード</h3><div data-download-latest><article class="download-release"><div class="download-release-heading"><h4>Version 1.0.0（配布予定）</h4><button type="button" class="btn" disabled aria-label="Version 1.0.0のZIPをダウンロード（準備中）">ZIPをダウンロード</button></div><p>公開日・更新内容は公開時に案内します。</p></article></div><p>過去の配布Versionはまだありません。0.9.x以前は更新履歴のみ掲載します。</p><p>起動・更新の手順は、ヘルプの「オフライン利用方法」を確認してください。</p>';
releaseBody.append(releaseHistorySection);

const helpMenu=document.createElement('div');

helpMenu.id='helpMenu';

helpMenu.className='png-export-menu';

helpMenu.setAttribute('role','menu');

helpMenu.hidden=true;

helpMenu.innerHTML='<button type="button" role="menuitem" data-help-action="guide">操作ガイド</button><button type="button" role="menuitem" data-help-action="shortcuts">ショートカット一覧</button><div class="context-separator" role="separator"></div><button type="button" role="menuitem" data-help-action="usage">オフライン利用方法</button><button type="button" role="menuitem" data-help-action="download">更新履歴・ダウンロード</button><div class="context-separator" role="separator"></div><button type="button" role="menuitem" data-help-action="about">ツールについて</button>';

document.body.appendChild(helpMenu);

document.getElementById('operationGuideBtn').onclick=()=>{if(!helpMenu.hidden){closeHelpMenu();return}closeJsonImportMenu();closeJsonExportMenu();const button=document.getElementById('operationGuideBtn'),rect=button.getBoundingClientRect();addPhoneMenuClose(helpMenu,()=>closeHelpMenu(true));helpMenu.hidden=false;helpMenu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-helpMenu.offsetWidth-8))+'px';helpMenu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-helpMenu.offsetHeight-8))+'px';button.setAttribute('aria-expanded','true');helpMenu.querySelector('button').focus()};

document.addEventListener('click',e=>{if(!helpMenu.contains(e.target)&&!e.target.closest('#operationGuideBtn'))closeHelpMenu()});

window.addEventListener('resize',()=>closeHelpMenu());

helpMenu.addEventListener('keydown',e=>{const items=Array.from(helpMenu.querySelectorAll('button')),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeHelpMenu(true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(e.key==='Tab')closeHelpMenu()});

helpMenu.addEventListener('click',e=>{const item=e.target.closest('[data-help-action]');if(!item)return;closeHelpMenu(true);const dialog=item.dataset.helpAction==='shortcuts'?shortcutDialog:item.dataset.helpAction==='guide'?operationGuide:item.dataset.helpAction==='usage'?usageGuide:item.dataset.helpAction==='download'?downloadDialog:aboutTool;if(dialog===usageGuide)usageGuide.showCaseIndex();if(dialog===usageGuide)for(const image of usageGuide.querySelectorAll('svg image'))if(!image.hasAttribute('href'))image.setAttribute('href',image.dataset.guideSheet==='detail'?offlineGuideDetailArtworkData:offlineGuideArtworkData);dialog.querySelector('.operation-guide-body').scrollTop=0;dialog.showModal()});

document.getElementById('closeShortcuts').onclick=()=>shortcutDialog.close();
shortcutDialog.addEventListener('close',()=>{const help=document.getElementById('operationGuideBtn');(help.getClientRects().length?help:document.querySelector('.phone-menu-toggle'))?.focus({preventScroll:true})});
document.getElementById('closeOperationGuide').onclick=()=>operationGuide.close();

document.getElementById('closeAboutTool').onclick=()=>aboutTool.close();

for(const dialog of [operationGuide,aboutTool,shortcutDialog,usageGuide,downloadDialog])dialog.addEventListener('close',()=>{if(dialog.open)return;const help=document.getElementById('operationGuideBtn');(help.getClientRects().length?help:document.querySelector('.phone-menu-toggle'))?.focus({preventScroll:true})});

document.addEventListener('keydown',e=>{const dialog=operationGuide.open?operationGuide:aboutTool.open?aboutTool:changeLog.open?changeLog:shortcutDialog.open?shortcutDialog:usageGuide.open?usageGuide:null;if(!dialog)return;if(e.key==='Escape'){e.preventDefault();dialog.close()}e.stopImmediatePropagation()},true);

;
// ===== js/runtime/canvas-pan.js =====
// Initialization stage: canvas-pan. Load order is owned by bolxiv.js.
(function initBoardPan(){
 const space=document.getElementById('boardZoomSpace'),viewport=space.parentElement;let gesture=null,spaceHeld=false,suppressClick=false;
 const inputTarget=target=>target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),.panel-view-header');
 function finish(){const previous=gesture;gesture=null;viewport.classList.remove('comparison-panning');if(previous&&previous.moved){suppressClick=true;setTimeout(()=>suppressClick=false,0)}if(previous&&viewport.hasPointerCapture(previous.id))viewport.releasePointerCapture(previous.id)}
 function update(){const enabled=(spaceHeld||!!data.activePhaseGroup)&&(viewport.scrollWidth>viewport.clientWidth+1||viewport.scrollHeight>viewport.clientHeight+1);viewport.classList.toggle('comparison-pan-enabled',enabled);if(!enabled&&!gesture?.touch)finish();return enabled}
 document.addEventListener('keydown',e=>{if(e.code!=='Space'||inputTarget(e.target)||inputTarget(document.activeElement)||drag&&!gesture)return;e.preventDefault();e.stopImmediatePropagation();spaceHeld=true;update()},true);
 document.addEventListener('keyup',e=>{if(e.code!=='Space'||!spaceHeld)return;e.preventDefault();e.stopImmediatePropagation();spaceHeld=false;update()},true);
 document.addEventListener('focusin',e=>{if(inputTarget(e.target)){spaceHeld=false;update()}});
 document.addEventListener('pointerdown',e=>{if(e.button!==0||!(e.target instanceof Element)||inputTarget(e.target)||!viewport.contains(e.target))return;if(Array.from(document.querySelectorAll('[role="menu"]:not([hidden])')).some(menu=>menu.getClientRects().length))return;const touchPan=e.pointerType==='touch'&&matchMedia('(max-width:850px)').matches&&!tapPlacementArmed&&!document.querySelector('.layout').classList.contains('phone-content-open')&&!document.querySelector('.layout').classList.contains('phone-materials-open')&&(phaseComparisonActive()||!e.target.closest('.obj,.controlbox,button'))&&(viewport.scrollWidth>viewport.clientWidth+1||viewport.scrollHeight>viewport.clientHeight+1);if(!update()&&!touchPan)return;const rect=viewport.getBoundingClientRect(),left=rect.left+viewport.clientLeft,top=rect.top+viewport.clientTop;if(e.clientX<left||e.clientX>=left+viewport.clientWidth||e.clientY<top||e.clientY>=top+viewport.clientHeight)return;e.preventDefault();e.stopImmediatePropagation();gesture={id:e.pointerId,touch:touchPan,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false};viewport.setPointerCapture(e.pointerId);viewport.classList.add('comparison-panning')},true);
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
$('#contextCopy').onclick=()=>{const ids=JSON.parse($('#objectContextMenu').dataset.ids||'[]');closeObjectContextMenu();copyObjectsToClipboard(ids)};
$('#contextPaste').onclick=()=>{closeObjectContextMenu();pasteClipboardObjects()};

function swapObjectPositions(ids){if(ids.length!==2)return;let items=ids.map(id=>current().find(o=>o.id===id));if(boardReadOnly||phaseComparisonActive()||items.some(item=>!item||item.locked))return;recordHistory();let x=items[0].x,y=items[0].y;items[0].x=items[1].x;items[0].y=items[1].y;items[1].x=x;items[1].y=y;renderAndSave()}
$('#contextSwapPosition').onclick=()=>{const ids=JSON.parse($('#objectContextMenu').dataset.ids||'[]');closeObjectContextMenu();swapObjectPositions(ids)};

$('#contextDuplicate').onclick=()=>{const ids=JSON.parse($('#objectContextMenu').dataset.ids||'[]');closeObjectContextMenu();duplicateObjects(ids)};

$('#contextDelete').onclick=()=>{let menu=$('#objectContextMenu'),ids=JSON.parse(menu.dataset.ids||'[]');closeObjectContextMenu();let deletable=ids.filter(id=>!current().find(o=>o.id===id)?.locked);if(!deletable.length)return;recordHistory();data.pages[data.page]=current().filter(o=>!deletable.includes(o.id));selectedIds=selectedIds.filter(id=>!deletable.includes(id));selected=selectedIds[selectedIds.length-1]||null;renderAndSave()};

document.querySelectorAll('#objectContextMenu [data-layer-action],#layerContextMenu [data-layer-action]').forEach(button=>button.onclick=()=>{const menu=button.closest('.object-context-menu'),ids=JSON.parse(menu.dataset.ids||'[]');closeObjectContextMenu();changeObjectLayerPriority(ids,button.dataset.layerAction)});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#objectContextMenu,#layerContextMenu'))closeObjectContextMenu()},true);

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeObjectContextMenu()});

let pendingLayerRevealId=null;

const themeColors=['#FFFFFF','#000000','#E7E6E6','#44546A','#4472C4','#ED7D31','#A5A5A5','#FFC000','#5B9BD5','#70AD47'],standardColors=['#C00000','#FF0000','#FFC000','#FFFF00','#92D050','#00B050','#00B0F0','#0070C0','#002060','#7030A0'];

document.addEventListener('click',e=>{let button=e.target.closest('.color-custom-trigger');if(!button)return;let pop=button.closest('.color-popover'),picker=pop?._colorPicker||button.closest('.color-picker'),input=picker?.querySelector('.native-color-picker');if(!input)return;input._colorPickerRef=picker;input._colorInputHome={parent:input.parentNode,next:input.nextSibling};input._colorRestore=()=>{let home=input._colorInputHome;if(home?.parent?.isConnected)home.parent.insertBefore(input,home.next?.parentNode===home.parent?home.next:null);input._colorInputHome=null;input._colorRestore=null};pop.appendChild(input);window.addEventListener('focus',()=>input._colorRestore?.(),{once:true});let r=button.getBoundingClientRect();input.style.position='fixed';input.style.left=Math.max(0,r.left)+'px';input.style.top=Math.max(0,r.bottom-1)+'px';input.style.width='1px';input.style.height='1px';input.style.opacity='0.01';input.style.pointerEvents='auto';try{if(input.showPicker)input.showPicker();else input.click()}catch{input.click()}});

document.addEventListener('change',e=>{let input=e.target.closest('.native-color-picker');if(!input)return;let picker=input._colorPickerRef||input.closest('.color-picker');if(!picker)return;input._colorRestore?.();let pop=[...document.querySelectorAll('.color-popover')].find(item=>item._colorPicker===picker)||picker.querySelector('.color-popover');let swatch=document.createElement('button');swatch.dataset.colorValue=input.value;(pop||picker).appendChild(swatch);swatch.click();swatch.remove();input._colorPickerRef=null});

document.addEventListener('click',e=>{let target=e.target instanceof Element?e.target:null;if(!target)return;let swatch=target.closest('[data-color-value]');if(swatch){let pop=swatch.closest('.color-popover'),picker=pop?._colorPicker||swatch.closest('.color-picker');if(!picker)return;let value=swatch.dataset.colorValue,kind=picker.dataset.colorKind;if(kind==='fieldBackground'&&activeBoardShape()==='image')return;pop?.remove();if(kind==='layout'){data.pageColors[data.page]=value;renderAndSave();$('#layoutColorControl').innerHTML=colorPickerMarkup('layout',value);save()}else if(kind==='fieldBackground'){recordHistory();data.pageFieldBackgroundColors[data.page]=value;renderAndSave();$('#fieldBackgroundControl').innerHTML=colorPickerMarkup('fieldBackground',value);save()}else if(kind==='guideShapeAppearance'){window.Bolxiv.fieldGuideEditor?.setAppearanceColor(value,picker.dataset.objectId)}else if(kind==='fieldGuides'){if(!boardReadOnly&&!phaseComparisonActive()&&!data.activePhaseGroup){recordHistory();data.pageFieldGuides[data.page]={...fieldGuides(data,data.page),color:value};renderAndSave()}}else if(kind==='fieldImageTint'){if(!boardReadOnly&&!phaseComparisonActive()){recordHistory();data.pageFieldImageTints[data.page]={...fieldImageTint(data,data.page),color:value};renderAndSave()}}else if(kind==='bulkColor'||kind==='bulkStrokeColor'){let targets=current().filter(item=>selectedIds.includes(item.id)&&!item.locked);if(targets.length&&targets.every(item=>objectSupportsBulkProperty(item,kind==='bulkStrokeColor'?'strokeColor':'color'))){recordHistory();for(let item of targets){if(kind==='bulkStrokeColor')item.strokeColor=value;else item.color=value}renderAndSave()}}else{let o=current().find(item=>item.id===picker.dataset.objectId);if(o){recordHistory();if(kind==='aoeStroke')o.strokeColor=value;else o.color=value;renderAndSave()}}closeColorPopovers();return}if(target.closest('.color-popover,.native-color-picker,.color-custom-trigger'))return;let trigger=target.closest('[data-color-trigger]');if(trigger){let picker=trigger.closest('.color-picker'),pop=picker?.querySelector('.color-popover');if(!picker||!pop)return;let opening=pop.hidden;closeColorPopovers();if(opening){if(!pop.childElementCount)pop.innerHTML=colorPaletteContents();pop._colorPicker=picker;(picker.closest('dialog')||document.body).appendChild(pop);pop.hidden=false;pop.style.position='fixed';let r=trigger.getBoundingClientRect(),box=pop.getBoundingClientRect(),w=box.width,h=box.height,left=Math.max(8,Math.min(r.left,window.innerWidth-w-8)),top=r.bottom+5;if(top+h>window.innerHeight-8)top=r.top-h-5;pop.style.left=Math.max(8,Math.min(left,window.innerWidth-w-8))+'px';pop.style.top=Math.max(8,Math.min(top,window.innerHeight-h-8))+'px'}return}closeColorPopovers()});

;
// ===== js/runtime/editor-setup.js =====
// Initialization stage: editor-setup. Load order is owned by bolxiv.js.
document.getElementById("leftRailToggle").onclick=e=>{let pinned=document.querySelector(".left").classList.toggle("pinned");localStorage.setItem('tactica-left-pinned-v1',String(pinned));e.currentTarget.setAttribute("aria-pressed",String(pinned));e.currentTarget.title=pinned?"固定を解除":"展開を固定";e.currentTarget.setAttribute("aria-label",e.currentTarget.title);e.currentTarget.querySelector(".rail-label").textContent=pinned?"固定中":"固定"};

document.querySelector(".left").addEventListener("mouseleave",()=>{let pane=document.querySelector(".left");if(!pane.classList.contains("pinned")&&!pane.classList.contains("preset-registering")&&pane.contains(document.activeElement))document.activeElement.blur()});

document.querySelectorAll('.left .accordion-toggle').forEach(button=>button.onclick=()=>{let open=button.getAttribute('aria-expanded')!=='true';if(open&&(!viewSettings.objectCategoriesMultiple||matchMedia('(max-width:850px)').matches)){document.querySelectorAll('.left .accordion-toggle').forEach(other=>{if(other===button)return;other.setAttribute('aria-expanded','false');document.getElementById(other.getAttribute('aria-controls')).hidden=true})}button.setAttribute('aria-expanded',String(open));document.getElementById(button.getAttribute('aria-controls')).hidden=!open});

for(const [id,bodyId,display,scrollId] of [['toggleBattlePages','pageListPanel','flex','pages'],['toggleLayoutProperties','layoutPropertiesPanel','block','layoutPropertiesPanel'],['toggleLayers','layerListPanel','flex','objectList'],['toggleInspector','propertyPanel','flex','inspector']]){
 $('#'+id).onclick=()=>{const heading=$('#'+id),open=heading.getAttribute('aria-expanded')!=='true';setPanelExpanded(heading,$('#'+bodyId),open,{display,scroll:$('#'+scrollId)});if(id==='toggleBattlePages'){const controls=heading.closest('.page-controls');controls.style.flex=open?'1 1 0':'0 0 36px';controls.style.minHeight=open?'0':'36px';controls.style.height=open?'auto':'36px'}};
}

document.querySelectorAll('#tools,#aoeTools,#enemyTools').forEach(container=>{container.onclick=e=>{let b=e.target.closest('[data-tool]');if(!b)return;selectPlacementTool(b.dataset.tool)};container.addEventListener('dragstart',e=>{let b=e.target.closest('[data-tool]');if(!b)return;selectPlacementTool(b.dataset.tool);e.dataTransfer.setData('application/x-tactica',JSON.stringify({type:b.dataset.tool}));e.dataTransfer.effectAllowed='copy'})});

$('#iconGroup').onchange=()=>{if($('#iconGroup').value==='none'&&tool==='icon')selectPlacementTool('select');renderAllIconGrids()};

let placementDragPayload=null,placementShiftDisabled=false;

let touchPlacementPreview=null;

let tapPlacementArmed=false,tapPlacementGesture=null;
function setTapPlacementArmed(armed){tapPlacementArmed=armed;syncPlacementCursor()}
function syncPlacementCursor(){
 const waiting=tapPlacementArmed&&tool!=='select'&&!boardReadOnly&&!phaseComparisonActive()&&!data.activePhaseGroup&&!window.Bolxiv?.pngPreview?.active&&!window.Bolxiv?.fieldGuideEditor?.active;
 stage.classList.toggle('placement-waiting',!!waiting);
}
stage.addEventListener('pointerover',syncPlacementCursor);
document.addEventListener('board-view-mode-changed',syncPlacementCursor);


document.querySelector('.left').addEventListener('click',e=>{if(e.target.closest('.tool[data-tool],.icon-choice'))setTapPlacementArmed(true)});

document.addEventListener('dragstart',e=>{if(e.target.closest('.left'))setTapPlacementArmed(false)});

document.addEventListener('pointerdown',e=>{
 if(!tapPlacementArmed||phaseComparisonActive()||e.button!==0||!stage.contains(e.target)||e.target.closest('.obj,.controlbox')||e.target.closest('input,button,textarea'))return;
 e.preventDefault();e.stopImmediatePropagation();tapPlacementGesture={id:e.pointerId,x:e.clientX,y:e.clientY,touch:e.pointerType==='touch'};if(tapPlacementGesture.touch)showTouchPlacementPreview(placementToolPayload(),e.clientX,e.clientY,0);stage.setPointerCapture(e.pointerId);
},true);

document.addEventListener('pointermove',e=>{if(!tapPlacementGesture||tapPlacementGesture.id!==e.pointerId)return;moveTouchPlacementPreview(e.clientX,e.clientY,0);e.preventDefault();e.stopImmediatePropagation()},true);

document.addEventListener('pointerup',finishTapPlacement,true);

document.addEventListener('pointercancel',finishTapPlacement,true);

document.addEventListener('keydown',e=>{if(e.key==='Escape')setTapPlacementArmed(false)});

document.addEventListener('dragstart',e=>{if(!e.target.closest('.left'))return;endPlacementGuides();try{placementDragPayload=JSON.parse(e.dataTransfer.getData('application/x-tactica'))}catch{placementDragPayload=null}});

document.addEventListener('dragend',endPlacementGuides);

stage.addEventListener('dragover',e=>{if(!placementDragPayload)return;e.preventDefault();stage.classList.add('drag-over');e.dataTransfer.dropEffect='copy';placementShiftDisabled=e.shiftKey;queuePlacementGuides(placementDragPayload,e.clientX,e.clientY,e.shiftKey)});

stage.addEventListener('dragleave',e=>{if(!stage.contains(e.relatedTarget)){cancelPlacementGuideFrame();stage.classList.remove('drag-over');clearAlignmentGuides()}});

stage.addEventListener('drop',e=>{if(!Array.from(e.dataTransfer.types).includes('application/x-tactica'))return;e.preventDefault();cancelPlacementGuideFrame();placementShiftDisabled=e.shiftKey;try{let payload=JSON.parse(e.dataTransfer.getData('application/x-tactica'));placeObject(payload,e.clientX,e.clientY);closePaletteAfterPlacement()}catch{notify('配置アイテムを読み込めませんでした')}finally{endPlacementGuides()}});

document.querySelector('.object-layout-rect').addEventListener('pointerdown',e=>{if(data.activePhaseGroup||e.button!==0||![stage,objectClip,layer,document.getElementById('boardZoomSpace'),e.currentTarget].includes(e.target)&&e.target.className!=='axis'&&e.target.className!=='centerpoint')return;e.preventDefault();let additive=e.shiftKey;if(!additive){selected=null;selectedIds=[];renderSelectionOnly()}let box=document.createElement('div');box.className='selection-marquee';let surface=document.getElementById('boardZoomSpace');surface.appendChild(box);drag={mode:'marquee',surface,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,additive,initialIds:selectedIds.slice(),box,moved:false}});

document.addEventListener('pointerdown',e=>{if((window.Bolxiv?.pngPreview?.active||matchMedia('(max-width:850px)').matches&&document.getElementById('objectLayerPanel')?.dataset.objectTab==='properties')&&e.target.closest('#undo,#redo'))return;if(e.target.closest('#importObjectImage,#editModeToggle,#objectContextMenu,#layerContextMenu,#presetPanel,#userPresetManager,.left .object-pane-actions,.preset-manage,[aria-controls="presetPanel"],.phone-material-toggle,.right,.battle,.phone-view-content,dialog,[role="menu"],.obj,.controlbox,.color-popover,.color-picker,.native-color-picker,.phone-phase-navigation')||!selectedIds.length)return;if(stage.contains(e.target)){let r=stage.getBoundingClientRect(),shape=activeBoardShape(),fw=data.pageFieldSizes?.[data.page]?.width||538,fh=data.pageFieldSizes?.[data.page]?.height||(shape==='landscape'?320:538),dx=(e.clientX-r.left-r.width/2)/(r.width*fw/1280),dy=(e.clientY-r.top-r.height/2)/(r.height*fh/1280);if(shape==='none'||(shape==='circle'?dx*dx+dy*dy<=1:Math.abs(dx)<=1&&Math.abs(dy)<=1))return}selected=null;selectedIds=[];renderSelectionOnly()},true);

document.addEventListener('pointerdown',e=>{if(drag&&(drag.mode==='move'||drag.mode.startsWith('resize-'))){drag.shiftGuidesDisabled=e.shiftKey;clearAlignmentGuides();drag.alignmentPrevious=alignmentSnapshot()}});

document.addEventListener('keydown',e=>{if(e.key==='Shift')setShiftAlignmentOverride(true)});

document.addEventListener('keyup',e=>{if(e.key==='Shift')setShiftAlignmentOverride(false)});

window.addEventListener('blur',()=>{if(drag)drag.shiftGuidesDisabled=false;clearAlignmentGuides()});

document.addEventListener('pointerdown',e=>{let spin=e.target.closest('.coordinate-control input[type=number]');if(!spin||spin.dataset.historyPushed)return;recordHistory();spin.dataset.historyPushed='true'});

document.addEventListener('input',e=>{let control=e.target.closest('.coordinate-control');if(!control)return;let range=control.querySelector('input[type=range]'),spin=control.querySelector('input[type=number]');if(e.target===range&&spin){spin.value=range.value;return}if(e.target===spin&&range){if(spin.id==='fieldWidthSpin'||spin.id==='fieldHeightSpin')return;if(e.target.value==='')return;let value=Math.max(Number(spin.min)||-Infinity,Math.min(Number(spin.max)||Infinity,Math.round(Number(spin.value)||0)));spin.value=value;range.value=value;range.dispatchEvent(new Event('input',{bubbles:true}))}});

document.addEventListener('change',e=>{if(e.target.matches('.coordinate-control input[type=number]'))delete e.target.dataset.historyPushed});

// Object gesture cancellation state.
function rememberObjectDragCancellation(){
 if(!drag||drag.cancelState||drag.mode==='marquee'||drag.mode==='group-scale'||drag.mode==='group-rotate')return;
 drag.beforeData??=JSON.stringify(data);
 // Finish earlier edits against the pre-gesture state, then preserve the redo branch.
 commitPendingHistory(drag.beforeData);pendingHistoryState=null;pendingHistoryOwner=null;
 drag.cancelState={board:data,history:history.slice(),future:future.slice()};
}
function cancelObjectDrag(){
 if(!drag||drag.mode==='marquee'||drag.mode==='group-scale'||drag.mode==='group-rotate')return false;
 rememberObjectDragCancellation();const cancelled=drag,state=cancelled.cancelState;drag=null;
 if(state.board===data){
  Object.assign(data,JSON.parse(cancelled.beforeData));history=state.history;future=state.future;
  pendingHistoryState=null;pendingHistoryOwner=null;
  const ids=cancelled.originalIds||cancelled.ids||(cancelled.id?[cancelled.id]:selectedIds);
  selectedIds=ids.filter(id=>current().some(item=>item.id===id));
  selected=selectedIds.includes(selected)?selected:selectedIds[selectedIds.length-1]||null;
 }
 clearAlignmentGuides();stage.classList.remove('ctrl-copy');
 if(cancelled.pointerId!==undefined&&stage.hasPointerCapture?.(cancelled.pointerId))stage.releasePointerCapture(cancelled.pointerId);
 renderAndSave();return true;
}
// End object gesture cancellation state.
document.addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==undefined&&drag.pointerId!==e.pointerId)return;rememberObjectDragCancellation();if(drag.mode==='move'&&drag.pointerType==='touch'&&!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6)return;drag.shiftGuidesDisabled=e.shiftKey;drag.lastX=e.clientX;drag.lastY=e.clientY;let r=stage.getBoundingClientRect();if(drag.mode==='marquee'){let surface=drag.surface.getBoundingClientRect(),x1=drag.startX-surface.left,y1=drag.startY-surface.top,x2=e.clientX-surface.left,y2=e.clientY-surface.top;drag.moved=Math.abs(e.clientX-drag.startX)>3||Math.abs(e.clientY-drag.startY)>3;drag.box.style.left=Math.min(x1,x2)+'px';drag.box.style.top=Math.min(y1,y2)+'px';drag.box.style.width=Math.abs(x2-x1)+'px';drag.box.style.height=Math.abs(y2-y1)+'px';return}if(drag.mode==='move'&&!drag.beforeData&&(e.clientX!==drag.startX||e.clientY!==drag.startY))drag.beforeData=JSON.stringify(data);drag.moved=drag.mode==='move'?(drag.moved||e.clientX!==drag.startX||e.clientY!==drag.startY):true;if(drag.mode==='move'){setMoveCopyMode(e.ctrlKey);stage.classList.toggle('ctrl-copy',drag.ctrlAtStart&&e.ctrlKey);let boardWidth=layer.clientWidth||stage.clientWidth,boardHeight=layer.clientHeight||stage.clientHeight,scaleX=r.width/stage.offsetWidth,scaleY=r.height/stage.offsetHeight,dx=(e.clientX-drag.startX)/scaleX,dy=(e.clientY-drag.startY)/scaleY,loX=-Infinity,hiX=Infinity,loY=-Infinity,hiY=Infinity;for(let p of drag.starts){let o=current().find(x=>x.id===p.id),ex=extents(o,r),mx=Math.min(12,ex.w),my=Math.min(12,ex.h),px=p.x/100*boardWidth,py=p.y/100*boardHeight;loX=Math.max(loX,mx-ex.w-px);hiX=Math.min(hiX,boardWidth-mx+ex.w-px);loY=Math.max(loY,my-ex.h-py);hiY=Math.min(hiY,boardHeight-my+ex.h-py)}dx=steppedObjectMove(dx,loX,hiX);dy=steppedObjectMove(dy,loY,hiY);if(!e.shiftKey){let snapped=snappedObjectMove(alignmentSnapshot(),drag.starts,dx,dy,boardWidth,boardHeight,loX,hiX,loY,hiY);dx=snapped.dx;dy=snapped.dy;}for(let p of drag.starts){let o=current().find(x=>x.id===p.id);o.x=p.x+dx/boardWidth*100;o.y=p.y+dy/boardHeight*100;let el=layer.querySelector(`[data-id="${o.id}"]`);if(el){el.style.left=o.x+'%';el.style.top=o.y+'%';updateObjectTileClip(o,el);if(o.type==='targetcircle')refreshTargetCircleTriangle(o,el)}}let box=controls.querySelector('.controlbox'),o=current().find(x=>x.id===selected);if(box&&o){box.style.left=o.x+'%';box.style.top=o.y+'%'}renderObjectGroupControls();updateAlignmentGuides(drag.ids);scheduleBoardSave()}else{let o=current().find(x=>x.id===drag.id);if(!o)return;let ox=r.left+drag.ox/100*r.width,oy=r.top+drag.oy/100*r.height,dx=e.clientX-ox,dy=e.clientY-oy;let mdx=e.clientX-drag.startX,mdy=e.clientY-drag.startY;if(drag.mode==='resize-aoe-box'){const scaleX=r.width/stage.offsetWidth,scaleY=r.height/stage.offsetHeight,next=resizedAoeBox(drag,mdx/scaleX,mdy/scaleY);o.width=next.width;o.height=next.height;o.x=drag.ox+next.dx/(layer.clientWidth||stage.clientWidth)*100;o.y=drag.oy+next.dy/(layer.clientHeight||stage.clientHeight)*100;}if(drag.mode==='resize-donut-inner'){
 const scaleX=r.width/stage.offsetWidth,scaleY=r.height/stage.offsetHeight,cx=r.left+o.x/100*r.width,cy=r.top+o.y/100*r.height;
 const radius=Math.hypot((e.clientX-cx)/scaleX,(e.clientY-cy)/scaleY);
 setDonutInnerDiameter(o,radius*2);syncDonutInnerInputs(o);
}
if(drag.mode==='resize-angle'){let rot=(o.rotation||0)*Math.PI/180,cx=r.left+o.x/100*r.width,cy=r.top+o.y/100*r.height,dx=e.clientX-cx,dy=e.clientY-cy,lx=dx*Math.cos(rot)+dy*Math.sin(rot),ly=-dx*Math.sin(rot)+dy*Math.cos(rot),apexY=-(o.height||100)/2+(o.height||100)*.05;o.angle=Math.max(5,Math.min(179.5,Math.round(Math.atan2(Math.abs(lx),ly-apexY)*180/Math.PI)));updateShapeFromData(o)}if(drag.mode==='resize-icon'){let size=Math.max(24,Math.min(640,Math.round(drag.width+(mdx+mdy)/2)));o.width=o.height=size;let el=Array.from(layer.children).find(x=>x.dataset.id===o.id);if(el){el.style.width=size+'px';el.style.height=size+'px';let badge=el.querySelector('.role-badge');if(badge){badge.style.setProperty('font-size',Math.max(8,size*.36)+'px','important');badge.style.right=(size*.06)+'px';badge.style.bottom=(size*.06)+'px';badge.style.webkitTextStroke=(size*.03)+'px #111'}}let box=controls.querySelector('.controlbox');if(box){box.style.width=size+'px';box.style.height=size+'px'}}if(drag.mode==='resize-x'||drag.mode==='resize-y'){let a=(o.rotation||0)*Math.PI/180;if(o.type==='aoe'||o.type==='circle'||o.type==='donut'||(['knockback','lineknockback'].includes(o.type))||o.type==='gaze'||['stack','linestack'].includes(o.type)||o.type==='targetcircle'||(o.type==='icon'&&['距離減衰','フレア','ロックオン青','ターゲット青','ロックオン赤','ロックオン緑','ロックオン紫','ダイブボム','ターゲット赤','ターゲット紫'].includes(o.iconName))){let resizeSign=drag.resizeSign||1,desired=drag.mode==='resize-x'?drag.width+2*resizeSign*(mdx*Math.cos(a)+mdy*Math.sin(a)):drag.height+2*resizeSign*(-mdx*Math.sin(a)+mdy*Math.cos(a)),base=drag.mode==='resize-x'?drag.width:drag.height,factor=desired/base,minSize=o.type==='icon'?24:20,maxSize=o.type==='icon'?640:960,minFactor=Math.max(minSize/drag.width,minSize/drag.height),maxFactor=Math.min(maxSize/drag.width,maxSize/drag.height);factor=Math.max(minFactor,Math.min(maxFactor,factor));o.width=Math.round(drag.width*factor);o.height=Math.round(drag.height*factor)}else if(o.type==='segment'&&drag.mode==='resize-x'){let baseAngle=drag.rotation*Math.PI/180,anchorX=r.left+drag.ox/100*r.width-drag.width/2*Math.cos(baseAngle),anchorY=r.top+drag.oy/100*r.height-drag.width/2*Math.sin(baseAngle),dx=e.clientX-anchorX,dy=e.clientY-anchorY,newWidth=Math.max(20,Math.min(960,Math.round(Math.hypot(dx,dy)))),newAngle=Math.atan2(dy,dx);o.width=newWidth;o.rotation=Math.round(newAngle*180/Math.PI);o.x=(anchorX-r.left+newWidth/2*Math.cos(newAngle))/r.width*100;o.y=(anchorY-r.top+newWidth/2*Math.sin(newAngle))/r.height*100;let el=Array.from(layer.children).find(node=>node.dataset.id===o.id),box=controls.querySelector('.controlbox');if(el){el.style.left=o.x+'%';el.style.top=o.y+'%'}if(box){box.style.left=o.x+'%';box.style.top=o.y+'%'}}else if(o.type==='line'){let boardWidth=layer.clientWidth||stage.clientWidth,boardHeight=layer.clientHeight||stage.clientHeight,localDx=mdx/(r.width/stage.offsetWidth),localDy=mdy/(r.height/stage.offsetHeight),sign=drag.resizeSign||1,delta=drag.mode==='resize-x'?localDx*Math.cos(a)+localDy*Math.sin(a):-localDx*Math.sin(a)+localDy*Math.cos(a),base=drag.mode==='resize-x'?drag.width:drag.height,next=Math.max(minimumShapeDimension(o,drag.mode==='resize-x'?'width':'height'),Math.min(960,Math.round(base+sign*delta))),shift=sign*(next-base)/2;if(drag.mode==='resize-x'){o.width=next;o.x=(drag.ox+shift*Math.cos(a)/boardWidth*100);o.y=(drag.oy+shift*Math.sin(a)/boardHeight*100)}else{o.height=next;o.x=(drag.ox-shift*Math.sin(a)/boardWidth*100);o.y=(drag.oy+shift*Math.cos(a)/boardHeight*100)}}else if(o.type==='text'&&drag.mode==='resize-x'){const scaleX=r.width/stage.offsetWidth;o.width=Math.max(20,Math.min(960,Math.round(drag.width+mdx/scaleX)))}else if(drag.mode==='resize-x')o.width=Math.max(20,Math.min(960,Math.round(drag.width+2*(mdx*Math.cos(a)+mdy*Math.sin(a)))));else o.height=Math.max(20,Math.min(960,Math.round(drag.height+2*(-mdx*Math.sin(a)+mdy*Math.cos(a))))) }if(drag.mode==='rotate')o.rotation=Math.round(Math.atan2(dy,dx)*180/Math.PI+90);updateShapeFromData(o);if(['resize-x','resize-y','resize-icon','resize-angle','resize-aoe-box'].includes(drag.mode))updateAlignmentGuides([o.id])}});

document.addEventListener('keydown',e=>{if(e.key==='Control')setMoveCopyMode(true)});

document.addEventListener('keyup',e=>{if(e.key==='Control')setMoveCopyMode(false)});

document.addEventListener('pointerup',e=>{if(drag?.pointerId!==undefined&&drag.pointerId!==e.pointerId)return;const refreshTouchSelection=e.pointerType==='touch'&&drag?.mode==='move'&&drag.moved;setMoveCopyMode(e.ctrlKey);clearAlignmentGuides();if(drag?.mode==='marquee'){let activeDrag=drag,box=activeDrag.box;box?.remove();if(activeDrag.moved){let left=Math.min(activeDrag.startX,e.clientX),top=Math.min(activeDrag.startY,e.clientY),right=Math.max(activeDrag.startX,e.clientX),bottom=Math.max(activeDrag.startY,e.clientY),boardBounds=stage.getBoundingClientRect(),viewport=document.querySelector('.object-layout-rect'),viewportRect=viewport.getBoundingClientRect(),viewportBounds={left:viewportRect.left+viewport.clientLeft,top:viewportRect.top+viewport.clientTop,right:viewportRect.left+viewport.clientLeft+viewport.clientWidth,bottom:viewportRect.top+viewport.clientTop+viewport.clientHeight},hits=current().filter(o=>{if(o.visible===false)return false;let node=Array.from(layer.children).find(el=>el.dataset.id===o.id);if(!node)return false;let b=node.getBoundingClientRect();return marqueeContainsVisibleObject(b,{left,top,right,bottom},boardBounds,viewportBounds)}).map(o=>o.id);selectedIds=activeDrag.additive?[...new Set([...activeDrag.initialIds,...hits])]:hits;selected=selectedIds[selectedIds.length-1]||null}if(e.pointerType==='mouse'&&selectedIds.length===1)pendingLayerRevealId=selectedIds[0];drag=null;renderSelectionOnly();return}let shouldRender=false,copiedLayerIds=[],structuralChange=!!(drag?.mode==='move'&&drag.ctrlAtStart);if(drag?.mode==='move'&&drag.ctrlAtStart){let validClone=drag.moved&&e.ctrlKey&&!drag.ctrlBroken;if(!validClone){current().splice(0,current().length,...current().filter(item=>!drag.ids.includes(item.id)));selectedIds=drag.originalIds;selected=selectedIds[selectedIds.length-1]||null}else{recordHistory(drag.beforeData);save();renderInspector();copiedLayerIds=drag.ids.slice()}shouldRender=true}else if(drag?.moved){recordHistory(drag.beforeData);save();renderInspector()}drag=null;stage.classList.remove('ctrl-copy');if(refreshTouchSelection)shouldRender=true;if(shouldRender){if(structuralChange)renderAndSave();else renderSelectionOnly()}if(copiedLayerIds.length)revealMovedLayers(copiedLayerIds)});

document.addEventListener('pointercancel',e=>{if(!drag||drag.pointerId!==undefined&&drag.pointerId!==e.pointerId)return;if(cancelObjectDrag())return;const cancelled=drag;drag=null;cancelled.box?.remove();clearAlignmentGuides();stage.classList.remove('ctrl-copy');if(cancelled.beforeData)data=JSON.parse(cancelled.beforeData);else if(cancelled.moved){recordHistory();save()}selected=null;selectedIds=[];renderAndSave()});

let keyboardNudgeSession=null,keyboardNudgeFrame=null;

document.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))finishKeyboardNudge()});

document.addEventListener('pointerdown',finishKeyboardNudge,true);

window.addEventListener('blur',finishKeyboardNudge);

// Object-only shortcuts yield to inputs, other panes, dialogs and dedicated editors.
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.isComposing||event.altKey||!(event.ctrlKey||event.metaKey)||event.target.isContentEditable||event.target.closest('input,select,textarea,dialog,#pages,#contentOptions,.left,#userPresetManager,[role="separator"]'))return;
 const key=event.key.toLowerCase();if(!['a','d','g'].includes(key)||key!=='g'&&event.shiftKey)return;
 if(boardReadOnly||phaseComparisonActive()||drag||window.Bolxiv?.pngPreview?.active||window.Bolxiv?.fieldGuideEditor?.active)return;
 if(event.target.closest('[role="menu"]')&&!event.target.closest('#objectContextMenu,#canvasContextMenu'))return;
 event.preventDefault();event.stopImmediatePropagation();finishKeyboardNudge();closeObjectContextMenu();
 if(key==='a')selectAllObjects();else if(key==='d')duplicateObjects(selectedIds);else changeObjectGrouping(selectedIds,event.shiftKey);
});

document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target.isContentEditable||e.target.closest('input,select,textarea,button,dialog,[role="separator"],[role="menu"],#pages')||document.querySelector('.comparison-pan-enabled'))return;if(nudgeSelectedObjects(e.key,e.repeat,e.shiftKey?10:1)){e.preventDefault();e.stopImmediatePropagation()}});

document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||e.target.isContentEditable)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){if(selectedIds.length){e.preventDefault();copyObjectsToClipboard(selectedIds)}}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){if(clipboardObjects.length){e.preventDefault();pasteClipboardObjects()}}if((e.key==='ArrowUp'||e.key==='ArrowDown')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.target.closest('#pages')){let next=data.page+(e.key==='ArrowUp'?-1:1);if(next>=0&&next<data.pages.length){e.preventDefault();selectPhase(next);document.querySelector('#pages .page-tab.active')?.focus()}}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}else if(e.key==='Delete'||e.key==='Backspace')deleteSelected();else if(e.key==='Escape'){cancelObjectDrag();pendingImage=null;tool='select';document.querySelectorAll('.tool').forEach(x=>x.classList.remove('active'));stage.style.removeProperty('cursor')}});

$('#undo').onclick=undo;

$('#redo').onclick=redo;

$('#clipToggle').onclick=()=>{fieldClipEnabled=!fieldClipEnabled;updateObjectClip();updateClipToggle()};

$('#fieldToggle').onclick=()=>{fieldVisible=!fieldVisible;stage.classList.toggle('field-hidden',!fieldVisible);updateFieldToggle()};

updateFieldToggle();

$('#gridToggle').onclick=()=>{gridVisible=!gridVisible;stage.classList.toggle('grid-hidden',!gridVisible);updateGridToggle()};

updateGridToggle();

updateClipToggle();

$('#addPage').onclick=()=>{commitPendingHistory();const owner=data,before=JSON.parse(JSON.stringify(data)),beforeHistory=history.slice(),beforeFuture=future.slice(),beforeSelected=selected,beforeSelectedIds=selectedIds.slice(),beforePhases=selectedPhaseIndexes.slice();snapshot();selectedPhaseIndexes=[];data.pages.push([]);data.pageMasterIds??=[];data.pageMasterIds.push('initial');data.pageNames.push('新規フェーズ');data.pageGroupIds.push(data.activePhaseGroup||null);data.pageNotes.push('');data.pageColors.push('#ffffff');data.pageBoardShapes.push('square');data.pageFieldBackgroundColors.push(activeFieldBackground());data.pageFieldImageIds.push('');data.pageFieldImageTints.push({color:"#000000",strength:0});data.pageFieldGuides.push(fieldGuides({},0));data.pageFieldSizes.push({width:538,height:538});data.page=data.pages.length-1;openPhaseListForCreation(data.page);data.activePhaseGroup=null;selected=null;selectedIds=[];renderAndSave();revealCreatedPhase(data.page);const tab=$('#pages').querySelectorAll('.page-tab')[data.page];if(tab){beginPageRename(tab,()=>{if(data!==owner)return;Object.assign(data,before);history=beforeHistory;future=beforeFuture;pendingHistoryState=null;pendingHistoryOwner=null;selected=beforeSelected;selectedIds=beforeSelectedIds;selectedPhaseIndexes=beforePhases;phaseSelectionOwner=data;renderAndSave()});const input=tab.querySelector('.page-tab-input');if(input)revealMovedListItems($('#pages'),[input])}};





bindConfirmationActions({dialog:$('#deleteContentDialog'),cancel:$('#deleteContentNo'),confirm:$('#deleteContentYes'),takeValue:()=>deleteContentIndex,onCancel:()=>deleteContentIndex=null,onConfirm(index){if(index!==null)deleteContentBoard(index);deleteContentIndex=null}});

$('#clearUserDataBtn').onclick=()=>$('#clearUserDataDialog').showModal();

$('#clearUserDataNo').onclick=()=>$('#clearUserDataDialog').close();

$('#clearUserDataYes').onclick=async()=>{try{cancelScheduledBoardSave();await window.boardStorage.clear();localStorage.removeItem('tactica-board-v1');localStorage.removeItem('tactica-left-pinned-v1');localStorage.removeItem('tactica-view-settings-v1');localStorage.removeItem('bolxiv-user-presets-v1');location.reload()}catch(error){notify('保存データを削除できません：'+(error?.message||String(error)))}};

$('#clearBtn').onclick=()=>showDeletionDialog('clearDialog','コンテンツ「'+(data.title||'新規コンテンツ')+'」のフェーズ「'+(data.pageNames[data.page]||'フェーズ'+(data.page+1))+'」内のオブジェクトをすべて削除しますか？');

bindConfirmationActions({dialog:$('#clearDialog'),cancel:$('#clearNo'),confirm:$('#clearYes'),onConfirm(){if(!current().length)return;snapshot();data.pages[data.page]=[];selected=null;selectedIds=[];renderAndSave()}});

;
// ===== js/runtime/file-io-setup.js =====
// Initialization stage: file-io-setup. Load order is owned by bolxiv.js.
const jsonBackupRecordKey='bolxiv-json-backup-records-v1';

const jsonExportMenu=document.createElement('div');

jsonExportMenu.id='jsonExportMenu';

jsonExportMenu.className='png-export-menu';

jsonExportMenu.setAttribute('role','menu');

jsonExportMenu.hidden=true;

jsonExportMenu.innerHTML='<div class="json-menu-note" role="note">再編集・バックアップ用のJSONファイル</div><button type="button" role="menuitem" data-json-scope="selected">選択中コンテンツを保存</button><div class="json-backup-status" data-backup-status="selected" role="note"></div><button type="button" role="menuitem" data-json-scope="all">すべてのコンテンツを保存</button><div class="json-backup-status" data-backup-status="all" role="note"></div><div class="context-separator" role="separator"></div><button type="button" role="menuitem" data-json-scope="presets">すべてのユーザープリセットを保存</button>';

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

jsonExportMenu.addEventListener('keydown',e=>{const items=Array.from(jsonExportMenu.querySelectorAll('button:not(:disabled)')),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeJsonExportMenu(true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(e.key==='Tab')closeJsonExportMenu()});

jsonExportMenu.addEventListener('click',async e=>{const item=e.target.closest('[data-json-scope],[data-png-scale]');if(!item)return;closeJsonExportMenu(true);const isPng=!!item.dataset.pngScale;try{if(isPng){await window.Bolxiv.pngPreview.open(Number(item.dataset.pngScale))}else if(item.dataset.jsonScope==='presets')await userPresetLibrary.exportAll();else await exportJson(item.dataset.jsonScope)}catch(error){if(error?.name==='AbortError')return;console.error(isPng?'PNG export failed':'JSON export failed',error);notify((isPng?'PNG':'JSON')+'を書き出せませんでした：'+(error?.message||String(error)))}});

let jsonImportMode='replace';

const jsonImportMenu=document.createElement('div');

jsonImportMenu.id='jsonImportMenu';

jsonImportMenu.className='png-export-menu';

jsonImportMenu.setAttribute('role','menu');

jsonImportMenu.hidden=true;

jsonImportMenu.innerHTML='<div class="json-menu-note" role="note">再編集・バックアップ用のJSONファイル</div><button type="button" role="menuitem" data-import-mode="append" title="現在のコンテンツを残して末尾に追加する">コンテンツを追加</button><button type="button" role="menuitem" data-import-mode="replace" title="現在の全コンテンツを読み込みデータに置き換える">コンテンツをすべて置き換え</button><div class="context-separator" role="separator"></div><button type="button" role="menuitem" data-preset-import-mode="append">ユーザープリセットを追加</button><button type="button" role="menuitem" data-preset-import-mode="replace">ユーザープリセットをすべて置き換え</button>';

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

jsonImportMenu.addEventListener('keydown',e=>{const items=Array.from(jsonImportMenu.querySelectorAll('button:not(:disabled)')),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeJsonImportMenu(true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(e.key==='Tab')closeJsonImportMenu()});

jsonImportMenu.addEventListener('click',e=>{const item=e.target.closest('[data-import-mode],[data-preset-import-mode]');if(!item)return;if(item.dataset.presetImportMode){closeJsonImportMenu(true);userPresetLibrary.chooseImport(item.dataset.presetImportMode);return}jsonImportMode=item.dataset.importMode;closeJsonImportMenu(true);$('#fileInput').value='';$('#fileInput').click()});

const replaceImportDialog=document.createElement('dialog');

replaceImportDialog.id='replaceImportDialog';

replaceImportDialog.className='confirm-dialog';

replaceImportDialog.setAttribute('aria-labelledby','replaceImportTitle');

replaceImportDialog.innerHTML='<h2 id="replaceImportTitle">編集データを置換</h2><p id="replaceImportSummary"></p><p>必要な編集データは、事前にエクスポートで保存してください。</p><div class="confirm-actions"><button class="btn" type="button" id="replaceImportCancel" autofocus>キャンセル</button><button class="btn primary" type="button" id="replaceImportConfirm">置換する</button></div>';

document.body.appendChild(replaceImportDialog);

$('#fileInput').onchange=e=>{
 const file=e.target.files[0],mode=jsonImportMode;if(!file)return;
 const finishReading=beginDesktopDisplayBusy(),reader=new FileReader();
 reader.onload=async()=>{
  let imported;
  try{await yieldDesktopBusyPaint();imported=parseImportedBoards(reader.result)}catch(error){notify('JSONを読み込めませんでした：'+(error?.message||String(error)));e.target.value='';return}finally{finishReading()}
  if(mode==='replace'&&!await confirmReplaceImport(imported)){e.target.value='';return}
  const previous={phaseMasters:window.Bolxiv.phaseMasters?.records(),phaseMasterGroups:window.Bolxiv.phaseMasters?.groupRecords(),data,contentBoards,activeContent,listHistory:contentListHistory.slice(),listFuture:contentListFuture.slice(),history:history.slice(),future:future.slice(),selected,selectedIds:selectedIds.slice(),selectedPhaseIndexes:selectedPhaseIndexes.slice(),phaseSelectionOwner};
  try{await withDesktopDisplayBusy(()=>applyImportedBoards(imported,mode));notify(mode==='append'?imported.length+' 件のコンテンツを追加しました':'全コンテンツを読み込みデータに置き換えました')}
  catch(error){
   if(previous.phaseMasters)window.Bolxiv.phaseMasters.restoreRecords(previous.phaseMasters,previous.phaseMasterGroups);contentListHistory.splice(0,contentListHistory.length,...previous.listHistory);contentListFuture.splice(0,contentListFuture.length,...previous.listFuture);contentSelectorCache=null;data=previous.data;contentBoards=previous.contentBoards;activeContent=previous.activeContent;history=previous.history;future=previous.future;selected=previous.selected;selectedIds=previous.selectedIds;selectedPhaseIndexes=previous.selectedPhaseIndexes;phaseSelectionOwner=previous.phaseSelectionOwner;
   try{renderAndSave()}catch(recoveryError){console.error('Import recovery failed',recoveryError)}
   console.error('Board import failed',error);notify('JSONを読み込めませんでした：'+(error?.message||String(error)));clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),15000);
  }
  e.target.value='';
 };
 reader.onabort=finishReading;
 reader.onerror=()=>{finishReading();notify('JSONファイルを読み取れません：'+(reader.error?.message||'ファイルへのアクセスに失敗しました'));e.target.value=''};
 try{reader.readAsText(file)}catch(error){finishReading();notify('JSONファイルを読み取れません：'+error.message);e.target.value=''}
};

;
// ===== js/runtime/app-setup.js =====
// Initialization stage: app-setup. Load order is owned by bolxiv.js.
let firstRun=true;

try{let saved=window.boardInitialState??localStorage.getItem('tactica-board-v1');if(saved){let v=JSON.parse(saved);if(Array.isArray(v.contents)&&v.contents.length){contentBoards=v.contents.filter(board=>board&&Array.isArray(board.pages)&&board.pages.length).map(board=>({...board,pages:board.pages.map(page=>Array.isArray(page)?page:[]),
  pageNotes:Array.from({length:board.pages.length},(_,i)=>typeof board.pageNotes?.[i]==='string'?board.pageNotes[i]:''),page:Math.max(0,Math.min(Number(board.page)||0,board.pages.length-1))}));if(!contentBoards.length)contentBoards=[data];activeContent=Math.max(0,Math.min(Number(v.activeContent)||0,contentBoards.length-1));data=contentBoards[activeContent];firstRun=false}else if(v.pages?.length){data={...data,...v};contentBoards=[data];activeContent=0;firstRun=false}}}catch{}

window.boardPhaseMastersInitial=(()=>{try{return JSON.parse(window.boardInitialState??localStorage.getItem('tactica-board-v1')??'{}').phaseMasters||[]}catch{return []}})();
window.boardPhaseMasterGroupsInitial=(()=>{try{return JSON.parse(window.boardInitialState??localStorage.getItem('tactica-board-v1')??'{}').phaseMasterGroups||[]}catch{return []}})();
window.boardInitialState=null;

for(const board of contentBoards)migrateBoardImages(board);

normalizePageNames();

updateContentSelector();

renderAllIconGrids();

$('#boardShapeInput').onchange=e=>{let shape=e.target.value;if(shape==='load-image'||shape==='load-image4'){document.getElementById('fieldImageInput').dataset.mode=shape==='load-image4'?'image4':'image';document.getElementById('fieldImageInput').value='';document.getElementById('fieldImageInput').click();return}if(!['none','square','landscape','portrait','circle','image','image4'].includes(shape))return;snapshot();data.pageBoardShapes[data.page]=shape;let size=data.pageFieldSizes[data.page];if(shape==='landscape'&&size.width<=size.height){size.width=538;size.height=320}else if(shape==='portrait'&&size.height<=size.width){size.width=320;size.height=538}else if(['square','circle'].includes(shape)&&size.width!==size.height){size.width=538;size.height=538}renderAndSave()};

$('#contentSelect').onclick=()=>{if(editingContentIndex>=0)return;let open=$('#contentOptions').hidden;$('#contentOptions').hidden=!open;$('#contentSelect').setAttribute('aria-expanded',String(open));if(open){updateContentSelector();revealContentRow()}};

function dismissContentListOutside(event){if($('#contentOptions').hidden||event.target.closest('.content-select-row')||editingContentIndex>=0)return;if(event.type==='pointerdown'&&event.target.closest('#contentItemMenu'))return;$('#contentOptions').hidden=true;$('#contentSelect').setAttribute('aria-expanded','false')}
// Run before canvas gestures or panels can consume the outside press.
window.addEventListener('pointerdown',dismissContentListOutside,true);
// Retain click dismissal after an outside press commits a content rename.
document.addEventListener('click',dismissContentListOutside);

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

(()=>{
 const button=document.getElementById('importObjectImage'),input=document.getElementById('objectImageInput');
 input.accept=document.getElementById('fieldImageInput').accept;
 button.onclick=()=>{if(button.disabled||boardReadOnly)return;input.value='';input.click()};
 input.onchange=()=>chooseObjectImage(input.files?.[0]);
})();
