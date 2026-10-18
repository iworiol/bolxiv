(()=>{
 const desktop=matchMedia('(min-width:851px)'),layout=document.querySelector('.layout'),panel=document.getElementById('objectLayerPanel');
 const listButton=document.getElementById('toggleLayers'),objectButton=document.getElementById('toggleInspector'),phaseButton=document.getElementById('toggleLayoutProperties');
 const list=listButton.closest('.property-group'),object=objectButton.closest('.property-group'),phase=phaseButton.closest('.content-properties'),memo=document.getElementById('phaseMemo');
 const objectBody=document.getElementById('propertyPanel'),phaseBody=document.getElementById('layoutPropertiesPanel');
 const rail=document.createElement('div');rail.className='desktop-phase-sidebar';rail.hidden=true;rail.setAttribute('aria-label','選択中フェーズの一覧・設定');panel.append(rail);
 const resizeHandle=document.getElementById('layerPropertyResize');
 const phaseListButton=document.getElementById('toggleBattlePages'),phaseListBody=document.getElementById('pageListPanel');
 function setPhaseList(open){
  setDisclosure(phaseListButton,phaseListBody,open);
  const controls=phaseListButton.closest('.page-controls');
  controls.style.flex=open?'1 1 0':'0 0 36px';controls.style.minHeight=open?'0':'36px';controls.style.height=open?'auto':'36px';
 }
 const homes=[list,resizeHandle,object,phase,memo].map(node=>{const anchor=document.createComment('desktop phase tool home');node.before(anchor);return {node,anchor}});
 let resizeGesture=null;
 if(Number.isFinite(viewSettings.desktopObjectListHeight)&&viewSettings.desktopObjectListHeight>=80)rail.style.setProperty('--desktop-list-height',viewSettings.desktopObjectListHeight+'px');
 function resizeList(height){
  const openTool=[object,phase,memo].find(node=>node.classList.contains('is-open'));if(!openTool||readingMode)return;
  if(twoColumns)return;
  const next=Math.max(80,Math.min(rail.clientHeight-240,height));
  rail.style.setProperty('--desktop-list-height',next+'px');rememberViewSetting('desktopObjectListHeight',next);
 }
 resizeHandle.addEventListener('pointerdown',event=>{
  if(!active||event.button!==0)return;
  event.preventDefault();resizeGesture={id:event.pointerId,y:event.clientY,height:list.getBoundingClientRect().height};
  resizeHandle.setPointerCapture(event.pointerId);resizeHandle.classList.add('resizing');
 });
 resizeHandle.addEventListener('pointermove',event=>{if(resizeGesture&&event.pointerId===resizeGesture.id)resizeList(resizeGesture.height+event.clientY-resizeGesture.y)});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])resizeHandle.addEventListener(name,()=>{resizeGesture=null;resizeHandle.classList.remove('resizing')});
 resizeHandle.addEventListener('keydown',event=>{if(active&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();resizeList(list.getBoundingClientRect().height+(event.key==='ArrowDown'?10:-10))}});
 memo.dataset.sidebarManaged='true';
 let active=false,mobileState=null,selectionKey='';
 let groupWasSelected=false,toolBeforeGroup='',listBeforeGroup=null;
 let currentTool=['object','phase','memo',''].includes(viewSettings.desktopPhaseTool)?viewSettings.desktopPhaseTool:'object';
 let readingMode=false,editingTool=currentTool,editingListOpen=true;
 let twoColumns=viewSettings.desktopToolsTwoColumns===true;
 const columnsButton=document.createElement('button');columnsButton.type='button';columnsButton.className='desktop-columns-toggle';columnsButton.setAttribute('aria-controls',rail.id='desktopPhaseSidebar');list.append(columnsButton);
 columnsButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
 function syncColumns(){
  layout.classList.toggle('desktop-tools-two-columns',active&&twoColumns&&!readingMode);
  columnsButton.disabled=readingMode||!!data.activePhaseGroup;
  list.hidden=active&&readingMode&&twoColumns;
  const countsTitle=listButton.title.replace(/^オブジェクトリストを開閉\n/,'');
  listButton.title=(!listButton.disabled&&!(active&&twoColumns)?'オブジェクトリストを開閉\n':'')+countsTitle;
  columnsButton.title=twoColumns?'オブジェクトリストを元の配置に戻す':'オブジェクトリストを独立表示する';
  columnsButton.setAttribute('aria-label',columnsButton.title);columnsButton.setAttribute('aria-pressed',String(twoColumns));
  if(active&&twoColumns&&!readingMode)setDisclosure(listButton,document.getElementById('layerListPanel'),true);
  syncResizeHandle();
 }
 function syncResizeHandle(){
  rail.classList.toggle('desktop-resize-enabled',active&&!twoColumns&&!readingMode&&listButton.getAttribute('aria-expanded')==='true'&&!!currentTool);
 }
 columnsButton.addEventListener('click',()=>{
  if(!active||readingMode||data.activePhaseGroup)return;
  twoColumns=!twoColumns;rememberViewSetting('desktopToolsTwoColumns',twoColumns);
  if(!twoColumns){
   setDisclosure(listButton,document.getElementById('layerListPanel'),!readingMode);
   if(!readingMode){rememberViewSetting('desktopObjectListExpanded',true);if(!currentTool)showTool('object')}
  }
  syncColumns();
  requestAnimationFrame(()=>{if(active)setBoardDisplayZoom(boardDisplayZoom,false)});
 });
 listButton.addEventListener('click',event=>{if(active&&twoColumns){event.preventDefault();event.stopImmediatePropagation()}},true);
 function syncReadingMode(){
  if(active&&phaseListButton.getAttribute('aria-expanded')!=='true')setPhaseList(true);
  const next=active&&(boardReadOnly||phaseComparisonActive());
  if(next===readingMode)return;
  readingMode=next;layout.classList.toggle('desktop-reading-tools',next);
  listButton.disabled=next;objectButton.disabled=next;phaseButton.disabled=next;
  memo.querySelector('summary').setAttribute('tabindex',next?'-1':'0');
  if(next){editingTool=currentTool;editingListOpen=listButton.getAttribute('aria-expanded')==='true';setDisclosure(listButton,document.getElementById('layerListPanel'),false);showTool('memo',false)}
  else{
   setDisclosure(listButton,document.getElementById('layerListPanel'),editingListOpen);
   if(active){showTool(editingTool,false);selectionKey=JSON.stringify([activeContent,data.page,[...selectedIds].sort()])}
   else currentTool=editingTool;
  }
 }
 function syncPropertyHeadings(){
  if(!active){
   objectButton.textContent=objectButton.textContent.replace(/^オブジェクト(?!プロパティ)/,'オブジェクトプロパティ');
   objectButton.title=objectButton.textContent+'\nオブジェクトプロパティを開閉';
   phaseButton.firstChild.textContent=data.activePhaseGroup?'グループプロパティ':'フェーズプロパティ：';phaseButton.title='選択中フェーズのプロパティを開閉';
   return;
  }
  objectButton.textContent='オブジェクトプロパティ';objectButton.title='オブジェクトプロパティを開閉';
  phaseButton.firstChild.textContent=data.activePhaseGroup?'グループプロパティ':'フェーズプロパティ';phaseButton.title=(data.activePhaseGroup?'グループ':'フェーズ')+'プロパティを開閉';
 }
 function setDisclosure(button,body,open){
  button.setAttribute('aria-expanded',String(open));body.hidden=!open;
  body.classList.toggle('hidden',!open);body.style.display=open?'flex':'none';
  syncResizeHandle();
 }
 function showTool(key,remember=true){
  currentTool=key;
  if(active&&twoColumns&&key&&!readingMode)setDisclosure(listButton,document.getElementById('layerListPanel'),true);
  object.classList.toggle('is-open',key==='object');phase.classList.toggle('is-open',key==='phase');memo.classList.toggle('is-open',key==='memo');
  setDisclosure(objectButton,objectBody,key==='object');setDisclosure(phaseButton,phaseBody,key==='phase');memo.open=key==='memo';
  if(remember)rememberViewSetting('desktopPhaseTool',key);
 }
 function selectionChanged(){
  const groupSelected=!!data.activePhaseGroup;
  if(active&&groupSelected&&!groupWasSelected){toolBeforeGroup=readingMode?editingTool:currentTool;listBeforeGroup={twoColumns,open:listButton.getAttribute('aria-expanded')==='true'};twoColumns=false}
  if(active&&!groupSelected&&groupWasSelected){if(listBeforeGroup){twoColumns=listBeforeGroup.twoColumns;setDisclosure(listButton,document.getElementById('layerListPanel'),listBeforeGroup.open);listBeforeGroup=null}if(!boardReadOnly&&!phaseComparisonActive())showTool(toolBeforeGroup)}
  if(active&&groupSelected){twoColumns=false;setDisclosure(listButton,document.getElementById('layerListPanel'),false);showTool('phase',false);memo.open=true;memo.classList.add('is-open')}
  listButton.disabled=readingMode||groupSelected;objectButton.disabled=readingMode||groupSelected;phaseButton.disabled=readingMode||groupSelected;
  groupWasSelected=groupSelected;
  const next=JSON.stringify([activeContent,data.page,[...selectedIds].sort()]);
  if(active&&!boardReadOnly&&!phaseComparisonActive()&&next!==selectionKey&&selectedIds.length)showTool('object');
  selectionKey=next;
 }
 function place(){
  const next=desktop.matches;if(next===active)return;
  if(next){
   mobileState={object:objectButton.getAttribute('aria-expanded')==='true',phase:phaseButton.getAttribute('aria-expanded')==='true',memo:memo.open,phaseList:phaseListButton.getAttribute('aria-expanded')==='true'};
   active=true;layout.classList.add('desktop-phase-tools');rail.hidden=false;
   setPhaseList(true);phaseListButton.disabled=true;phaseListButton.title='フェーズリスト';phaseListButton.setAttribute('role','heading');phaseListButton.setAttribute('aria-level','2');
   rail.append(list,resizeHandle,object,phase,memo);
   if(typeof viewSettings.desktopObjectListExpanded==='boolean')setDisclosure(listButton,document.getElementById('layerListPanel'),viewSettings.desktopObjectListExpanded);
   showTool(currentTool,false);syncReadingMode();selectionChanged();syncPropertyHeadings();syncColumns();
  }else{
   active=false;
   syncReadingMode();
   objectButton.textContent='オブジェクト';objectButton.title='オブジェクト設定を開閉';
   phaseButton.firstChild.textContent='フェーズ：';phaseButton.title='選択中フェーズの設定を開閉';
   for(const {node,anchor} of homes)anchor.after(node);
   rail.hidden=true;layout.classList.remove('desktop-phase-tools');syncColumns();
   phaseListButton.disabled=false;phaseListButton.title='フェーズリストを開閉';phaseListButton.removeAttribute('role');phaseListButton.removeAttribute('aria-level');setPhaseList(mobileState.phaseList);
   for(const node of [object,phase,memo])node.classList.remove('is-open');
   setDisclosure(objectButton,objectBody,mobileState.object);setDisclosure(phaseButton,phaseBody,mobileState.phase);memo.open=mobileState.memo;
   selectionKey='';
  }
 }
 for(const [button,key] of [[objectButton,'object'],[phaseButton,'phase'],[memo.querySelector('summary'),'memo']]){
  button.addEventListener('click',event=>{
   if(!active)return;
   event.preventDefault();event.stopImmediatePropagation();if(boardReadOnly||phaseComparisonActive()||data.activePhaseGroup)return;showTool(currentTool===key?'':key);
  },true);
 }
 listButton.addEventListener('click',()=>{if(active&&!readingMode)rememberViewSetting('desktopObjectListExpanded',listButton.getAttribute('aria-expanded')==='true');syncResizeHandle()});
 const renderBeforeTools=render;render=function(){renderBeforeTools();syncReadingMode();selectionChanged();syncPropertyHeadings();syncColumns()};
 const selectionBeforeTools=renderSelectionOnly;renderSelectionOnly=function(){selectionBeforeTools();selectionChanged();syncPropertyHeadings();syncColumns()};
 new MutationObserver(()=>{syncReadingMode();syncColumns()}).observe(document.body,{attributes:true,attributeFilter:['class']});
 desktop.addEventListener('change',()=>{place();syncPropertyHeadings()});place();syncPropertyHeadings();
})();
