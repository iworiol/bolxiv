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

{const layout=document.querySelector('.layout'),button=document.getElementById('contentObjectPin');const contentHeading=document.querySelector('.content-heading-row'),historyHost=document.getElementById('boardHistoryActions'),undoButton=document.getElementById('undo'),redoButton=document.getElementById('redo'),separator=contentHeading.querySelector('.content-history-separator');const phoneHistory=matchMedia('(max-width:850px)');const sync=()=>{const closed=layout.classList.contains('content-collapsed'),onCanvas=phoneHistory.matches&&layout.dataset.phonePane!=='content'&&!layout.classList.contains('phone-content-open'),showHistory=phoneHistory.matches?onCanvas:closed;historyHost.hidden=!showHistory;if(showHistory){historyHost.append(undoButton,redoButton,separator)}else{for(const node of [undoButton,redoButton,separator])contentHeading.insertBefore(node,button)}button.setAttribute('aria-expanded',String(!closed));button.setAttribute('aria-controls','battlePanel');button.title=closed?'コンテンツペインを開く':'コンテンツペインを閉じる';button.setAttribute('aria-label',button.title)};button.onclick=()=>{if(phoneHistory.matches&&layout.classList.contains('phone-content-open')){document.querySelector('.phone-content-close')?.click();return}const closed=layout.classList.toggle('content-collapsed');rememberViewSetting('contentPaneCollapsed',closed);sync()};if(typeof viewSettings.contentPaneCollapsed==='boolean')layout.classList.toggle('content-collapsed',viewSettings.contentPaneCollapsed);phoneHistory.addEventListener('change',sync);new MutationObserver(sync).observe(layout,{attributes:true,attributeFilter:['data-phone-pane','class']});sync()}

(function setupCategoryMode(){const toggle=document.getElementById('categoryModeToggle');function update(){const multiple=!!viewSettings.objectCategoriesMultiple;toggle.setAttribute('aria-pressed',String(multiple));toggle.title=multiple?'複数展開：クリックで単独展開に切り替え':'単独展開：クリックで複数展開に切り替え';toggle.setAttribute('aria-label',toggle.title)}toggle.onclick=()=>{const multiple=!viewSettings.objectCategoriesMultiple;rememberViewSetting('objectCategoriesMultiple',multiple);if(!multiple){let kept=false;document.querySelectorAll('.left .accordion-toggle').forEach(button=>{if(button.getAttribute('aria-expanded')!=='true')return;if(!kept){kept=true;return}button.setAttribute('aria-expanded','false');document.getElementById(button.getAttribute('aria-controls')).hidden=true})}update()};update()})();

(function restoreObjectCategories(){const buttons=Array.from(document.querySelectorAll('.left .accordion-toggle')),saved=viewSettings.objectCategoryExpansion;if(saved&&typeof saved==='object'&&!Array.isArray(saved)){for(const button of buttons){const id=button.getAttribute('aria-controls');if(typeof saved[id]!=='boolean')continue;button.setAttribute('aria-expanded',String(saved[id]));document.getElementById(id).hidden=!saved[id]}}function saveExpansion(){const states={};for(const button of buttons)states[button.getAttribute('aria-controls')]=button.getAttribute('aria-expanded')==='true';rememberViewSetting('objectCategoryExpansion',states)}for(const button of buttons)button.addEventListener('click',saveExpansion);document.getElementById('categoryModeToggle').addEventListener('click',saveExpansion)})();

for(const id of ['gridToggle','fieldToggle','clipToggle'])document.getElementById(id).addEventListener('click',()=>{if(phaseComparisonActive())render()});

revealRestoredApp();
