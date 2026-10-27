// ===== js/canvas/number-input-commit.js =====
(()=>{
 const states=new WeakMap();let applying=false;
 const isSpin=node=>node?.matches?.('.coordinate-control input[type="number"]');
 function state(spin){if(!states.has(spin))states.set(spin,{saved:spin.value,dirty:false,stepping:false});return states.get(spin)}
 function restore(spin){const current=state(spin);spin.value=current.saved;current.dirty=false}
 function commit(spin){
  const current=state(spin);if(!current.dirty)return;
  if(!spin.value.trim()||!Number.isFinite(Number(spin.value))){restore(spin);return}
  let value=Number(spin.value);
  if(spin.min!=='')value=Math.max(Number(spin.min),value);
  if(spin.max!=='')value=Math.min(Number(spin.max),value);
  spin.value=String(value);current.dirty=false;
  if(!['groupScaleNumber','groupSpacingNumber'].includes(spin.id)&&spin.closest('#inspector')&&spin.value!==current.saved&&!spin.dataset.historyPushed){recordHistory();spin.dataset.historyPushed='true'}
  applying=true;
  try{spin.dispatchEvent(new Event('input',{bubbles:true}));spin.dispatchEvent(new Event('change',{bubbles:true}))}
  finally{applying=false;current.saved=spin.value}
 }
 document.addEventListener('focusin',event=>{if(isSpin(event.target)){const current=state(event.target);current.saved=event.target.value;current.dirty=false}},true);
 document.addEventListener('pointerdown',event=>{
  if(!isSpin(event.target))return;
  const spin=event.target,current=state(spin),rect=spin.getBoundingClientRect();
  current.stepping=event.clientX>=rect.right-20;
 },true);
 document.addEventListener('pointerup',()=>{document.querySelectorAll('.coordinate-control input[type="number"]').forEach(spin=>state(spin).stepping=false)},true);
 document.addEventListener('input',event=>{
  if(applying||!isSpin(event.target))return;
  const current=state(event.target);current.dirty=true;
  event.stopImmediatePropagation();
  if(current.stepping)commit(event.target);
 },true);
 document.addEventListener('change',event=>{
  if(applying||!isSpin(event.target))return;
  event.stopImmediatePropagation();commit(event.target);
 },true);
 document.addEventListener('blur',event=>{if(isSpin(event.target)&&!applying)commit(event.target)},true);
 document.addEventListener('keydown',event=>{
  if(!isSpin(event.target)||!['Enter','Escape','ArrowUp','ArrowDown'].includes(event.key))return;
  const spin=event.target,current=state(spin);
  event.preventDefault();event.stopImmediatePropagation();
  if(event.key==='Escape'){restore(spin);return}
  if(event.key==='Enter'){commit(spin);return}
  if(!spin.value.trim()||!Number.isFinite(Number(spin.value)))restore(spin);
  if(event.key==='ArrowUp')spin.stepUp();else spin.stepDown();
  current.dirty=true;commit(spin);
 },true);
})();

;
// ===== js/desktop/desktop-header-phase-alignment.js =====
(()=>{
 const desktop=matchMedia('(min-width:851px)'),header=document.querySelector('.app>.top'),layout=document.querySelector('.layout'),phasePane=layout.querySelector(':scope>.right>.layer-group');
 let frame=0;
 function update(){frame=0;if(!desktop.matches)return;const left=Math.max(0,phasePane.getBoundingClientRect().left-header.getBoundingClientRect().left+header.scrollLeft)+'px';if(header.style.getPropertyValue('--phase-pane-header-left')!==left)header.style.setProperty('--phase-pane-header-left',left);const right=Math.max(0,header.getBoundingClientRect().right-phasePane.getBoundingClientRect().right)+'px';if(header.style.getPropertyValue('--phase-pane-header-right')!==right)header.style.setProperty('--phase-pane-header-right',right);const menu=header.querySelector('.phone-menu-toggle');if(menu){const menuRight=header.getBoundingClientRect().right-menu.getBoundingClientRect().right+'px';if(header.style.getPropertyValue('--header-menu-right')!==menuRight)header.style.setProperty('--header-menu-right',menuRight)}}
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 const resize=new ResizeObserver(schedule);for(const node of [layout,phasePane,layout.querySelector(':scope>.battle'),layout.querySelector(':scope>.left')])if(node)resize.observe(node);
 new MutationObserver(schedule).observe(layout,{attributes:true,attributeFilter:['class','style']});
 window.addEventListener('resize',schedule);desktop.addEventListener('change',schedule);schedule();
})();

;
// ===== js/desktop/desktop-scroll-clearance.js =====
(()=>{
 const desktop=matchMedia('(min-width:851px)');
 function update(){
  if(!desktop.matches)return;
  for(const panel of document.querySelectorAll('.battle #pages,.right #objectList,.battle #layoutPropertiesPanel,.right #inspector')){
   const probe=document.createElement('div');
   probe.style.cssText='position:fixed;left:-10000px;width:100px;height:100px;overflow:scroll;visibility:hidden;border:0;padding:0;box-sizing:border-box';
   probe.style.scrollbarWidth=getComputedStyle(panel).scrollbarWidth;
   document.body.append(probe);const width=probe.offsetWidth-probe.clientWidth;probe.remove();
   panel.style.setProperty('--desktop-scroll-clearance',width>0?'8px':'16px');
  }
  const properties=document.getElementById('layoutPropertiesPanel'),layout=document.querySelector('.layout');
  // The memo body is created later; inherit the same clearance from its layout.
  if(properties&&layout)layout.style.setProperty('--desktop-scroll-clearance',getComputedStyle(properties).getPropertyValue('--desktop-scroll-clearance'));
 }
 desktop.addEventListener('change',update);window.addEventListener('resize',update);update();
})();

;
// ===== js/mobile/phone-number-step.js =====
(()=>{
 const selector='.coordinate-control input[type="number"],.output-phase-gap';
 function sync(){
  document.querySelectorAll(selector).forEach(spin=>{
   let group=spin.parentElement.querySelector('.phone-number-step-buttons');
   if(!group){
    group=document.createElement('span');group.className='phone-number-step-buttons';
    const label=spin.getAttribute('aria-label')||'数値';
    for(const [symbol,key,description] of [['−','ArrowDown','減らす'],['＋','ArrowUp','増やす']]){
     const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=symbol;
     button.setAttribute('aria-label',label+'を'+description);button.title=label+'を'+description;
     button.onpointerdown=event=>event.preventDefault();
     button.onclick=()=>{if(spin.disabled)return;if(spin.matches('.output-phase-gap')){if(key==='ArrowUp')spin.stepUp();else spin.stepDown();spin.dispatchEvent(new Event('input',{bubbles:true}));spin.dispatchEvent(new Event('change',{bubbles:true}));sync()}else spin.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}))};
     group.appendChild(button);
    }
    if(spin.matches('.output-phase-gap'))spin.parentElement.append(group);else spin.after(group);
   }
   if(spin.matches('.output-phase-gap')){let value=spin.parentElement.querySelector('.output-phase-gap-value');if(!value){value=document.createElement('output');value.className='output-phase-gap-value';value.htmlFor=spin.id;spin.before(value)}if(value.textContent!==spin.value)value.textContent=spin.value}
   group.querySelectorAll('button').forEach(button=>{if(button.disabled!==spin.disabled)button.disabled=spin.disabled});
  });
 }
 sync();
 const originalRenderInspector=renderInspector;
 const selectionKey=()=>JSON.stringify([activeContent,data.page,selectedIds]);
 let previousSelection=selectionKey();
 renderInspector=function(){
  const key=selectionKey(),preserve=key===previousSelection,positions=[];
  if(preserve){for(let node=document.getElementById('inspector');node;node=node.parentElement)positions.push({node,top:node.scrollTop,left:node.scrollLeft})}
  const result=originalRenderInspector.apply(this,arguments);
  sync();
  for(const position of positions){position.node.scrollTop=position.top;position.node.scrollLeft=position.left}
  previousSelection=key;
  return result;
 };
 new MutationObserver(records=>{
  if(records.some(record=>record.type==='childList'||record.target.matches?.(selector)))sync();
 }).observe(document.querySelector('.layout'),{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
})();

;
// ===== js/mobile/phone-canvas-height.js =====
function phoneCanvasDisplayHeight(panel,zoom=boardDisplayZoom,reserved=230){
 const style=getComputedStyle(panel),pixels=value=>parseFloat(value)||0;
 const remaining=Math.max(0,panel.clientHeight-pixels(style.paddingTop)-pixels(style.paddingBottom)-pixels(style.rowGap)-reserved);
 const surface=document.querySelector('.phase-comparison-grid')||document.getElementById('stage');
 const desired=(surface.offsetHeight||640)*zoom/100+60;
 return Math.min(remaining,desired);
}
(()=>{
 const panel=document.getElementById('objectLayerPanel'),mobile=matchMedia('(max-width:850px)');
 function update(){
  if(!mobile.matches)return;
  const height=phoneCanvasDisplayHeight(panel)+'px';
  if(panel.style.getPropertyValue('--phone-canvas-height')!==height)panel.style.setProperty('--phone-canvas-height',height);
 }
 new ResizeObserver(update).observe(panel);
 new MutationObserver(update).observe(document.getElementById('boardZoomSpace'),{childList:true,attributes:true,attributeFilter:['style']});
 mobile.addEventListener('change',update);
 update();
})();

function phoneReaderLayoutMetrics(panel,footerHeight,rowHeight,zoom=boardDisplayZoom){const controlsMinHeight=230+footerHeight;return {canvasHeight:phoneCanvasDisplayHeight(panel,zoom,controlsMinHeight),controlsMinHeight,closedControlsHeight:rowHeight+8+38+footerHeight}}

;
// ===== js/desktop/desktop-phase-memo.js =====
(()=>{
 const desktop=matchMedia('(min-width:851px)'),host=document.getElementById('contentPanel'),properties=document.getElementById('toggleLayoutProperties');
 const memo=document.createElement('details');memo.className='phase-memo';memo.id='phaseMemo';
 memo.innerHTML='<summary><span class="phase-memo-caption">フェーズノート</span><span class="phase-memo-preview"></span></summary><div class="phase-memo-body"><div class="phase-memo-phase"></div><textarea aria-label="フェーズノート" placeholder="対象者・移動先・注意点などを自由に記入"></textarea></div>';
 host.append(memo);
 const input=memo.querySelector('textarea'),preview=memo.querySelector('.phase-memo-preview'),phase=memo.querySelector('.phase-memo-phase');
 const reading=document.createElement('div');reading.className='phase-memo-reading';reading.hidden=true;input.after(reading);
 let session=null,restorePropertiesAfterMemo=false,phoneReading=false,phoneNoteOpen=false;
 let lastNoteContent=activeContent,lastNotePage=data.page,lastNoteGroup=data.activePhaseGroup,groupMemoState=null;
 function sync(){
  const phaseChanged=lastNoteContent!==activeContent||lastNotePage!==data.page||lastNoteGroup!==data.activePhaseGroup;
  lastNoteContent=activeContent;lastNotePage=data.page;lastNoteGroup=data.activePhaseGroup;
  const groupSelected=!!data.activePhaseGroup,enteringGroup=groupSelected&&groupMemoState===null;
  memo.classList.toggle('group-note-static',groupSelected&&desktop.matches);
  const noteHeading=memo.querySelector('summary');if(groupSelected&&desktop.matches){noteHeading.setAttribute('role','heading');noteHeading.setAttribute('aria-level','3');noteHeading.tabIndex=-1}else{noteHeading.removeAttribute('role');noteHeading.removeAttribute('aria-level');noteHeading.removeAttribute('tabindex')}
  memo.querySelector('.phase-memo-caption').textContent=groupSelected?'グループノート':'フェーズノート';
  if(enteringGroup)groupMemoState={open:memo.open,phoneNoteOpen};
  const value=groupSelected?'そう、証明よ。':data.pageNotes?.[data.page]||'';
  const phone=!desktop.matches;
  const nextPhoneReading=phone&&boardReadOnly;
  if(nextPhoneReading!==phoneReading){
   if(phoneReading)phoneNoteOpen=memo.open;
   phoneReading=nextPhoneReading;
   if(phoneReading)memo.open=phoneNoteOpen;
  }

  memo.hidden=false;
  const readingOnly=groupSelected||boardReadOnly||(desktop.matches&&phaseComparisonActive());
  input.hidden=readingOnly;reading.hidden=!readingOnly;
  const compareMemos=desktop.matches&&phaseComparisonActive();
  const memoKey=JSON.stringify(compareMemos?selectedPhaseIndexes.map(index=>[index,data.pageNames[index],data.pageNotes?.[index]||'']):[value]);
  if(reading.dataset.memoKey!==memoKey){
   const scroll=reading.scrollTop;reading.replaceChildren();reading.classList.toggle('memo-empty',!compareMemos&&!value.trim());
   if(compareMemos){
    for(const index of selectedPhaseIndexes){
     const section=document.createElement('section'),heading=document.createElement('div'),text=document.createElement('div');
     section.className='phase-memo-entry';heading.className='phase-memo-entry-title';text.className='phase-memo-entry-text';
     heading.textContent=String(index+1).padStart(2,'0')+' '+(data.pageNames[index]||'');
     const note=data.pageNotes?.[index]||'';text.textContent=note.trim()?note:'ノートはありません';text.classList.toggle('memo-empty',!note.trim());
     section.append(heading,text);reading.append(section);
    }
   }else reading.textContent=value.trim()?value:'ノートはありません';
   reading.dataset.memoKey=memoKey;reading.scrollTop=scroll;
  }
  if(input.value!==value)input.value=value;
  if(phaseChanged){reading.scrollTop=0;input.scrollTop=0}
  input.readOnly=groupSelected||boardReadOnly||phaseComparisonActive();
  input.setAttribute('aria-label','フェーズ'+String(data.page+1).padStart(2,'0')+'のノート');
  phase.textContent=groupSelected?'グループ：'+(data.phaseGroups?.find(group=>group.id===data.activePhaseGroup)?.name||''):String(data.page+1).padStart(2,'0')+' '+(data.pageNames[data.page]||'');phase.title=phase.textContent;
  preview.textContent=value.trim().replace(/\s+/g,' ')||'未記入';const summary=memo.querySelector('summary');summary.title=phase.textContent+(groupSelected&&desktop.matches?'\nグループノート':'\nフェーズノートを開閉')+(value?'\n'+value:'\nノートは未記入です');preview.title=summary.title;
  if(enteringGroup)memo.open=true;
  else if(!groupSelected&&groupMemoState!==null){memo.open=groupMemoState.open;phoneNoteOpen=groupMemoState.phoneNoteOpen;groupMemoState=null}
  if(session&&(session.board!==data||session.page!==data.page))session=null;
 }
 function closeProperties(){if(memo.dataset.sidebarManaged==='true')return;if(desktop.matches&&memo.open&&properties.getAttribute('aria-expanded')==='true'){restorePropertiesAfterMemo=true;properties.onclick({currentTarget:properties})}}
 memo.querySelector('summary').addEventListener('click',event=>{if(!data.activePhaseGroup||!desktop.matches)return;event.preventDefault();event.stopImmediatePropagation();memo.open=true},true);
 memo.open=desktop.matches&&viewSettings.phaseMemoExpanded===true;
 memo.addEventListener('toggle',()=>{
  if(phoneReading){phoneNoteOpen=memo.open;return}
  if(!desktop.matches)return;
  if(memo.dataset.sidebarManaged==='true')return;
  if(memo.open)closeProperties();
  else{
   if(restorePropertiesAfterMemo&&properties.getAttribute('aria-expanded')!=='true')properties.onclick({currentTarget:properties});
   restorePropertiesAfterMemo=false;
  }
  rememberViewSetting('phaseMemoExpanded',memo.open);
 });
 properties.addEventListener('click',()=>{if(desktop.matches&&properties.getAttribute('aria-expanded')==='true')memo.open=false});
 input.addEventListener('focus',()=>{session={board:data,page:data.page,before:JSON.stringify(data),started:false}});
 input.addEventListener('blur',()=>{session=null;sync()});
 input.addEventListener('input',()=>{
  if(data.activePhaseGroup||boardReadOnly||phaseComparisonActive()){sync();return}
  if(input.value===(data.pageNotes?.[data.page]||''))return;
  if(!session||session.board!==data||session.page!==data.page)session={board:data,page:data.page,before:JSON.stringify(data),started:false};
  const startsHistory=!session.started;
  if(startsHistory){recordHistory(session.before);session.started=true}
  data.pageNotes??=data.pages.map(()=>'');data.pageNotes[data.page]=input.value;
  if(startsHistory)updateHistoryButtons();
  scheduleNoteSave();
 });
 const renderBeforeMemo=render;render=function(){renderBeforeMemo();sync()};
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 desktop.addEventListener('change',()=>{
  if(memo.dataset.sidebarManaged==='true'){sync();return}
  if(desktop.matches)closeProperties();
  else if(memo.open&&properties.getAttribute('aria-expanded')!=='true')properties.onclick({currentTarget:properties});
  sync();
 });
 closeProperties();sync();
})();

;
// ===== js/desktop/desktop-phase-tools.js =====
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
 let active=false,mobileState=null;
 let groupWasSelected=false,toolBeforeGroup='',listBeforeGroup=null;
 let currentTool=['object','phase','memo',''].includes(viewSettings.desktopPhaseTool)?viewSettings.desktopPhaseTool:'object';
 let readingMode=false,editingTool=currentTool,editingListOpen=true;
 let selectedPhaseTool=['phase','memo'].includes(currentTool)?currentTool:viewSettings.desktopPhasePanelTab==='memo'?'memo':'phase';
 const phaseHeading=document.createElement('div');phaseHeading.className='desktop-phase-shared-heading';phaseHeading.hidden=true;
 const contentPhasePanel=document.createElement('section');contentPhasePanel.className='desktop-content-phase-panel';contentPhasePanel.hidden=true;document.getElementById('contentPanel').append(contentPhasePanel);
 let phasePanelOpen=viewSettings.desktopContentPhaseExpanded!==false;
 if(currentTool==='phase'||currentTool==='memo')currentTool='object';
 const contentResize=document.getElementById('phasePropertyResize'),contentList=phaseListButton.closest('.page-controls');
 let contentShare=Number.isFinite(viewSettings.desktopContentPhaseShare)?Math.max(.1,Math.min(.9,viewSettings.desktopContentPhaseShare)):.5,contentGesture=null;
 function updateContentSplit(){if(!active)return;contentResize.setAttribute('aria-disabled',String(!phasePanelOpen));if(!phasePanelOpen){contentList.style.removeProperty('flex');return}const available=contentList.getBoundingClientRect().height+contentPhasePanel.getBoundingClientRect().height;if(available<=0)return;const height=Math.max(100,Math.min(available-180,available*contentShare));contentList.style.setProperty('flex','0 0 '+height+'px','important');contentResize.setAttribute('aria-valuemin','10');contentResize.setAttribute('aria-valuemax','90');contentResize.setAttribute('aria-valuenow',String(Math.round(contentShare*100)))}
 contentResize.addEventListener('pointerdown',event=>{if(!active||!phasePanelOpen||event.button!==0)return;event.preventDefault();contentGesture={id:event.pointerId,y:event.clientY,height:contentList.getBoundingClientRect().height,total:contentList.getBoundingClientRect().height+contentPhasePanel.getBoundingClientRect().height};contentResize.setPointerCapture(event.pointerId);contentResize.classList.add('resizing')});
 contentResize.addEventListener('pointermove',event=>{if(!contentGesture||event.pointerId!==contentGesture.id)return;contentShare=Math.max(.1,Math.min(.9,(contentGesture.height+event.clientY-contentGesture.y)/contentGesture.total));rememberViewSetting('desktopContentPhaseShare',contentShare);updateContentSplit()});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])contentResize.addEventListener(name,()=>{contentGesture=null;contentResize.classList.remove('resizing')});
 contentResize.addEventListener('keydown',event=>{if(!active||!phasePanelOpen||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();contentShare=Math.max(.1,Math.min(.9,contentShare+(event.key==='ArrowDown'?.02:-.02)));rememberViewSetting('desktopContentPhaseShare',contentShare);updateContentSplit()});
 new ResizeObserver(()=>updateContentSplit()).observe(document.getElementById('contentPanel'));
 const phaseTitle=document.createElement('button');phaseTitle.type='button';phaseTitle.id='desktopPhasePanelTitle';phaseTitle.className='desktop-phase-panel-title';
 const phaseSwitch=document.createElement('button');phaseSwitch.type='button';phaseSwitch.id='desktopPhaseSwitch';phaseSwitch.className='desktop-phase-switch';phaseSwitch.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-4-4M20 16H4l4 4"/></svg>';
 const phaseCollapse=document.createElement('button');phaseCollapse.type='button';phaseCollapse.id='desktopPhaseSectionToggle';phaseCollapse.className='desktop-phase-collapse';
 for(const button of [phaseTitle,phaseSwitch,phaseCollapse])button.setAttribute('aria-controls',phaseBody.id+' '+memo.id);
 phaseHeading.append(phaseTitle,phaseSwitch,phaseCollapse);
 function syncPhaseHeading(){
  const group=!!data.activePhaseGroup;rail.classList.toggle('desktop-group-tools',group);phaseHeading.hidden=!active||group;contentPhasePanel.classList.toggle('desktop-group-tools',group);
  const open=phasePanelOpen;phaseHeading.dataset.expanded=String(open);
  const phaseLabel='<strong>フェーズ プロパティ</strong> / ノート',memoLabel='<strong>フェーズ</strong> プロパティ / <strong>ノート</strong>';
  const markup='<span class="desktop-phase-label">'+(selectedPhaseTool==='phase'?phaseLabel:memoLabel)+'</span><span class="desktop-phase-label-measure" aria-hidden="true">'+phaseLabel+'</span><span class="desktop-phase-label-measure" aria-hidden="true">'+memoLabel+'</span>';
  if(phaseTitle.innerHTML!==markup)phaseTitle.innerHTML=markup;
  phaseTitle.setAttribute('aria-expanded',String(open));phaseTitle.setAttribute('aria-label',(selectedPhaseTool==='phase'?'フェーズプロパティ':'フェーズノート')+'を選択中。設定・ノート欄を'+(open?'閉じる':'開く'));
  phaseSwitch.title=selectedPhaseTool==='phase'?'フェーズノートを表示':'フェーズプロパティを表示';phaseSwitch.setAttribute('aria-label',phaseSwitch.title);
  phaseCollapse.textContent=open?'−':'＋';phaseCollapse.title=open?'設定・ノートを閉じる':'設定・ノートを開く';phaseCollapse.setAttribute('aria-label',phaseCollapse.title);phaseCollapse.setAttribute('aria-expanded',String(open));
  for(const button of [phaseTitle,phaseSwitch,phaseCollapse])button.disabled=false;
  if(active){contentPhasePanel.hidden=false;phase.hidden=!open||!group&&(selectedPhaseTool!=='phase'||readingMode);memo.hidden=!open||!group&&(selectedPhaseTool!=='memo'&&!readingMode);phase.classList.toggle('is-open',!phase.hidden);memo.classList.toggle('is-open',!memo.hidden);phaseBody.hidden=phase.hidden;phaseBody.classList.toggle('hidden',phase.hidden);phaseBody.style.display=phase.hidden?'none':'flex';memo.open=!memo.hidden;phaseButton.setAttribute('aria-expanded',String(!phase.hidden))}
  updateContentSplit();
 }
 function togglePhasePanel(){if(active){phasePanelOpen=!phasePanelOpen;rememberViewSetting('desktopContentPhaseExpanded',phasePanelOpen);syncPhaseHeading()}}
 phaseTitle.onclick=togglePhasePanel;phaseCollapse.onclick=togglePhasePanel;
 phaseHeading.addEventListener('click',event=>{if(!event.target.closest('button'))togglePhasePanel()});
 phaseSwitch.onclick=()=>{if(!active)return;selectedPhaseTool=selectedPhaseTool==='phase'?'memo':'phase';rememberViewSetting('desktopPhasePanelTab',selectedPhaseTool);syncPhaseHeading()};

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
  syncResizeHandle();syncPhaseHeading();
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
   if(active)showTool(editingTool,false)
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
  if(key==='phase'||key==='memo'){selectedPhaseTool=key;phasePanelOpen=true;syncPhaseHeading();return}
  currentTool=key;
  if(!data.activePhaseGroup&&(key==='phase'||key==='memo')){selectedPhaseTool=key;if(remember)rememberViewSetting('desktopPhasePanelTab',key)}
  if(active&&twoColumns&&key&&!readingMode)setDisclosure(listButton,document.getElementById('layerListPanel'),true);
  object.classList.toggle('is-open',key==='object');
  setDisclosure(objectButton,objectBody,key==='object');
  if(remember)rememberViewSetting('desktopPhaseTool',key);
  syncPhaseHeading();
 }
 function selectionChanged(){
  const groupSelected=!!data.activePhaseGroup;
  if(active&&groupSelected&&!groupWasSelected){toolBeforeGroup=readingMode?editingTool:currentTool;listBeforeGroup={twoColumns,open:listButton.getAttribute('aria-expanded')==='true'};twoColumns=false}
  if(active&&!groupSelected&&groupWasSelected){if(listBeforeGroup){twoColumns=listBeforeGroup.twoColumns;setDisclosure(listButton,document.getElementById('layerListPanel'),listBeforeGroup.open);listBeforeGroup=null}if(boardReadOnly||phaseComparisonActive())showTool('memo',false);else showTool(toolBeforeGroup)}
  if(active&&groupSelected){twoColumns=false;setDisclosure(listButton,document.getElementById('layerListPanel'),false);showTool('phase',false);memo.open=true;memo.classList.add('is-open')}
  listButton.disabled=readingMode||groupSelected;objectButton.disabled=readingMode||groupSelected;phaseButton.disabled=readingMode||groupSelected;
  groupWasSelected=groupSelected;
  // Selection updates the inspector content without changing the chosen panel.
 }
 function place(){
  const next=desktop.matches;if(next===active)return;
  if(next){
   mobileState={object:objectButton.getAttribute('aria-expanded')==='true',phase:phaseButton.getAttribute('aria-expanded')==='true',memo:memo.open,phaseList:phaseListButton.getAttribute('aria-expanded')==='true'};
   active=true;layout.classList.add('desktop-phase-tools');rail.hidden=false;
   setPhaseList(true);phaseListButton.disabled=true;phaseListButton.title='フェーズリスト';phaseListButton.setAttribute('role','heading');phaseListButton.setAttribute('aria-level','2');
   rail.append(list,resizeHandle,object);contentPhasePanel.append(phaseHeading,phase,memo);
   if(typeof viewSettings.desktopObjectListExpanded==='boolean')setDisclosure(listButton,document.getElementById('layerListPanel'),viewSettings.desktopObjectListExpanded);
   showTool(currentTool,false);syncReadingMode();selectionChanged();syncPropertyHeadings();syncColumns();
  }else{
   active=false;contentList.style.removeProperty('flex');
   syncReadingMode();
   objectButton.textContent='オブジェクト';objectButton.title='オブジェクト設定を開閉';
   phaseButton.firstChild.textContent='フェーズ：';phaseButton.title='選択中フェーズの設定を開閉';
   for(const {node,anchor} of homes)anchor.after(node);
   rail.hidden=true;contentPhasePanel.hidden=true;phase.hidden=false;memo.hidden=false;layout.classList.remove('desktop-phase-tools');syncColumns();
   phaseListButton.disabled=false;phaseListButton.title='フェーズリストを開閉';phaseListButton.removeAttribute('role');phaseListButton.removeAttribute('aria-level');setPhaseList(mobileState.phaseList);
   for(const node of [object,phase,memo])node.classList.remove('is-open');
   setDisclosure(objectButton,objectBody,mobileState.object);setDisclosure(phaseButton,phaseBody,mobileState.phase);memo.open=mobileState.memo;

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
 const selectionBeforeTools=renderSelectionOnly;renderSelectionOnly=function(){selectionBeforeTools.apply(this,arguments);selectionChanged();syncPropertyHeadings();syncColumns()};
 new MutationObserver(()=>{syncReadingMode();syncColumns()}).observe(document.body,{attributes:true,attributeFilter:['class']});
 desktop.addEventListener('change',()=>{place();syncPropertyHeadings()});place();syncPropertyHeadings();
})();

;
// ===== js/mobile/phone-canvas-pinch.js =====
(()=>{
 const mobile=matchMedia('(max-width:850px)'),space=document.getElementById('boardZoomSpace'),viewport=space.parentElement;
 let pinch=null,session=false,changed=false;const touchPointers=new Set();
 const enabled=()=>mobile.matches&&!document.querySelector('.layout').classList.contains('phone-content-open')&&!document.querySelector('.layout').classList.contains('phone-materials-open');
 const surface=()=>space.querySelector('.phase-group-overview:not([hidden]) .phase-group-artwork')||space.querySelector('.phase-comparison-grid')||document.getElementById('stage');
 function pair(touches){const a=Array.from(touches).find(touch=>touch.identifier===pinch.ids[0]),b=Array.from(touches).find(touch=>touch.identifier===pinch.ids[1]);return a&&b?{distance:Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY),x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}:null}
 function stop(event){if(event.cancelable)event.preventDefault();event.stopImmediatePropagation()}
 function stopObjectDrag(){
  if(tapPlacementGesture){const id=tapPlacementGesture.id;tapPlacementGesture=null;hideTouchPlacementPreview();if(stage.hasPointerCapture(id))stage.releasePointerCapture(id)}
  const previous=drag,hadSelection=selected!==null||selectedIds.length>0;
  drag=null;selected=null;selectedIds=[];
  previous?.box?.remove();clearAlignmentGuides();stage.classList.remove('ctrl-copy');
  if(previous?.beforeData)data=JSON.parse(previous.beforeData);
  if(previous)renderAndSave();else if(hadSelection)render();
 }
 const canvasTouch=touch=>viewport.contains(touch.target)||!!touch.target.closest?.('.obj,.controlbox,#boardZoomSpace');
 window.addEventListener('touchstart',event=>{
  if(!enabled()||event.touches.length<2||!Array.from(event.touches).every(canvasTouch))return;
  stop(event);session=true;
  if(pinch)return;
  stopObjectDrag();
  pinch={ids:[event.touches[0].identifier,event.touches[1].identifier],zoom:boardDisplayZoom};
  const point=pair(event.touches),rect=surface().getBoundingClientRect();
  if(!point?.distance||!rect.width||!rect.height){pinch=null;return}
  pinch.distance=point.distance;pinch.x=(point.x-rect.left)/rect.width;pinch.y=(point.y-rect.top)/rect.height;
 },{capture:true,passive:false});
 window.addEventListener('touchmove',event=>{
  if(!session)return;stop(event);
  if(!enabled()||!pinch)return;
  const point=pair(event.touches);if(!point)return;
  const before=boardDisplayZoom;
  setBoardDisplayZoom(pinch.zoom*point.distance/pinch.distance,false,false);
  changed=changed||boardDisplayZoom!==before;
  const rect=surface().getBoundingClientRect();
  viewport.scrollLeft+=rect.left+pinch.x*rect.width-point.x;
  viewport.scrollTop+=rect.top+pinch.y*rect.height-point.y;
 },{capture:true,passive:false});
 function finish(event){
  if(!session)return;
  if(event.touches.length<2)pinch=null;
  if(event.touches.length)return;
  session=false;
  if(changed)rememberViewSetting('boardDisplayZoom',boardDisplayZoom);
  changed=false;
 }
 for(const name of ['touchend','touchcancel'])window.addEventListener(name,finish,{capture:true,passive:true});
 window.addEventListener('pointermove',event=>{if(session&&event.pointerType==='touch')stop(event)},{capture:true,passive:false});
 window.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||!enabled()||!viewport.contains(event.target))return;
  touchPointers.add(event.pointerId);
  if(session||touchPointers.size>1){session=true;stopObjectDrag();stop(event)}
 },{capture:true,passive:false});
 for(const name of ['pointerup','pointercancel'])window.addEventListener(name,event=>touchPointers.delete(event.pointerId),true);
 window.addEventListener('click',event=>{if(session&&viewport.contains(event.target))stop(event)},true);
})();

;
// ===== js/mobile/phone-object-tabs.js =====
(()=>{
 const mobile=matchMedia('(max-width:850px)'),panel=document.getElementById('objectLayerPanel');
 const listButton=document.getElementById('toggleLayers'),propertyButton=document.getElementById('toggleInspector');
 let selected=viewSettings.phoneObjectTab==='properties'?'properties':'list';
 const entries=[['list',listButton],['properties',propertyButton]].map(([key,heading])=>{
  const group=heading.parentElement,bar=document.createElement('div');bar.className='phone-object-tabs';
  const title=document.createElement('span');title.className='phone-object-tabs-title';bar.append(title);
  const change=document.createElement('button');change.type='button';change.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-4-4M20 16H4l4 4"/></svg>';change.setAttribute('aria-label',key==='list'?'オブジェクトプロパティを表示':'オブジェクトリストに戻る');bar.append(change);
  const collapse=document.createElement('button');collapse.type='button';collapse.className='phone-object-collapse';collapse.setAttribute('aria-controls',heading.getAttribute('aria-controls'));bar.append(collapse);group.prepend(bar);
  change.onclick=()=>{selected=key==='list'?'properties':'list';rememberViewSetting('phoneObjectTab',selected);const target=selected==='list'?listButton:propertyButton;if(target.getAttribute('aria-expanded')!=='true')target.click();sync()};
  collapse.onclick=()=>{heading.click();sync()};
  bar.addEventListener('click',event=>{if(event.target.closest('button'))return;collapse.click()});
  title.setAttribute('role','button');title.tabIndex=0;title.setAttribute('aria-controls',heading.getAttribute('aria-controls'));
  title.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();collapse.click()}});

  return {key,heading,title,collapse};
 });
 function sync(){
  const enabled=mobile.matches&&!boardReadOnly;panel.classList.toggle('phone-object-tabbed',enabled);panel.dataset.objectTab=selected;panel.dataset.objectExpanded=(selected==='list'?listButton:propertyButton).getAttribute('aria-expanded');
  for(const entry of entries){entry.title.innerHTML=entry.key==='list'?'<strong>オブジェクト リスト</strong> / プロパティ':'<strong>オブジェクト</strong> リスト / <strong>プロパティ</strong>';entry.title.title=entry.key==='properties'?entry.heading.textContent.trim():'オブジェクトリスト';const open=entry.heading.getAttribute('aria-expanded')==='true';entry.title.setAttribute('aria-expanded',String(open));entry.collapse.textContent=open?'−':'＋';entry.collapse.setAttribute('aria-expanded',String(open));entry.collapse.setAttribute('aria-label',(entry.key==='list'?'オブジェクトリスト':'オブジェクトプロパティ')+(open?'を閉じる':'を開く'))}
 }
 panel.addEventListener('reveal-object-list',()=>{if(!mobile.matches)return;selected='list';rememberViewSetting('phoneObjectTab',selected);if(listButton.getAttribute('aria-expanded')!=='true')listButton.click();sync()});
 for(const heading of [listButton,propertyButton])new MutationObserver(sync).observe(heading,{attributes:true,attributeFilter:['aria-expanded'],childList:true,subtree:true,characterData:true});
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 const before=render;render=function(){before();sync()};mobile.addEventListener('change',sync);sync();
})();

;
// ===== js/mobile/phone-phase-tabs.js =====
(()=>{
 const mobile=matchMedia('(max-width:850px)'),host=document.getElementById('contentPanel'),memo=document.getElementById('phaseMemo'),properties=document.getElementById('toggleLayoutProperties'),body=document.getElementById('layoutPropertiesPanel');
 const tabs=document.createElement('div');tabs.className='phone-phase-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','フェーズの設定とノート');tabs.hidden=true;host.append(tabs);
 const shared=document.createElement('div');shared.className='phone-phase-shared';shared.hidden=true;host.append(shared);shared.append(tabs);
 const title=document.createElement('span');title.className='phone-phase-switch-title';title.setAttribute('aria-live','polite');title.setAttribute('role','button');title.tabIndex=0;title.setAttribute('aria-controls',body.id+' '+memo.id);tabs.append(title);
 let selected=viewSettings.phonePhaseTab==='memo'?'memo':'properties';
 const buttons=['toggle'].map(key=>{
  const button=document.createElement('button');button.type='button';button.id='phonePhaseSwitch-'+key;button.setAttribute('aria-controls',body.id+' '+memo.id);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-4-4M20 16H4l4 4"/></svg>';
  button.onclick=()=>{selected=selected==='properties'?'memo':'properties';rememberViewSetting('phonePhaseTab',selected);sync()};tabs.append(button);return button;
 });
 let expanded=viewSettings.phonePhaseSectionExpanded!==false;
 const collapse=document.createElement('button');collapse.type='button';collapse.id='phonePhaseSectionToggle';collapse.setAttribute('aria-controls',body.id+' '+memo.id);tabs.append(collapse);
 collapse.onclick=()=>{expanded=!expanded;rememberViewSetting('phonePhaseSectionExpanded',expanded);sync()};
 tabs.addEventListener('click',event=>{if(event.target.closest('button'))return;collapse.click()});
 title.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();collapse.click()}});
 const handle=document.getElementById('phasePropertyResize'),list=host.querySelector('.page-controls'),phaseButton=document.getElementById('toggleBattlePages');let gesture=null,ownsResize=false,resizedHeight=null;
 function canResize(){return mobile.matches&&!boardReadOnly&&expanded&&phaseButton.getAttribute('aria-expanded')==='true'}
 function resizeList(height){const available=list.getBoundingClientRect().height+shared.getBoundingClientRect().height;const next=Math.max(72,Math.min(available-120,height));resizedHeight=next;list.style.setProperty('flex','0 1 '+next+'px','important');ownsResize=true}
 handle.addEventListener('pointerdown',event=>{if(!canResize()||(event.pointerType!=='touch'&&event.button!==0))return;event.preventDefault();event.stopImmediatePropagation();gesture={id:event.pointerId,y:event.clientY,height:list.getBoundingClientRect().height};handle.classList.add('resizing');handle.setPointerCapture(event.pointerId)},true);
 handle.addEventListener('pointermove',event=>{if(!gesture||gesture.id!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();resizeList(gesture.height+event.clientY-gesture.y)},true);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(name,()=>{gesture=null;handle.classList.remove('resizing')},true);
 handle.addEventListener('keydown',event=>{if(!canResize()||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();resizeList(list.getBoundingClientRect().height+(event.key==='ArrowDown'?10:-10))},true);
 new MutationObserver(()=>{if(ownsResize&&phaseButton.getAttribute('aria-expanded')==='false'){list.style.removeProperty('flex');ownsResize=false}sync()}).observe(phaseButton,{attributes:true,attributeFilter:['aria-expanded']});
 function sync(){
  const enabled=mobile.matches&&!boardReadOnly;tabs.hidden=!enabled;host.classList.toggle('phone-phase-tabbed',enabled);host.dataset.phaseTab=selected;
  shared.hidden=!enabled;
  const open=expanded;collapse.disabled=false;
  shared.classList.toggle('is-collapsed',!open);collapse.textContent=open?'−':'＋';collapse.setAttribute('aria-expanded',String(open));collapse.title=open?'設定・ノートを閉じる':'設定・ノートを開く';collapse.setAttribute('aria-label',collapse.title);
  title.setAttribute('aria-expanded',String(expanded));
  if(enabled&&!canResize()&&ownsResize){list.style.removeProperty('flex');ownsResize=false}
  else if(enabled&&canResize()&&resizedHeight!==null){list.style.setProperty('flex','0 1 '+resizedHeight+'px','important');ownsResize=true}
  if(enabled)handle.style.setProperty('display',canResize()?'block':'none','important');else{handle.style.removeProperty('display');if(ownsResize){list.style.removeProperty('flex');ownsResize=false}}
  const propertyGroup=properties.parentElement;
  if(enabled){if(propertyGroup.parentElement!==shared)shared.append(propertyGroup);if(memo.parentElement!==shared)shared.append(memo)}
  else{
   if(propertyGroup.parentElement===shared||propertyGroup.parentElement===document.querySelector('.phone-view-content'))host.append(propertyGroup);
   if(mobile.matches){const target=boardReadOnly?document.querySelector('.phone-view-content'):host;if(target&&memo.parentElement!==target)target.append(memo)}
  }
  const prefix=data.activePhaseGroup?'グループ':'フェーズ';
  const titleMarkup=selected==='properties'?'<strong>'+prefix+' プロパティ</strong> / ノート':'<strong>'+prefix+'</strong> プロパティ / <strong>ノート</strong>';
  if(title.innerHTML!==titleMarkup)title.innerHTML=titleMarkup;
  title.setAttribute('aria-label','フェーズ '+(selected==='properties'?'プロパティ':'ノート')+'を表示中。設定・ノート欄を'+(expanded?'閉じる':'開く'));
  buttons.forEach(button=>{button.title=prefix+(selected==='properties'?'ノートを表示':'プロパティを表示');button.setAttribute('aria-label',button.title)});
  if(!enabled)return;
  if(selected==='memo')memo.open=true;
  else{properties.setAttribute('aria-expanded','true');body.hidden=false;body.classList.remove('hidden');body.style.display='flex'}
 }
 window.Bolxiv.phasePanel={
  capture:()=>({selected,expanded,memoOpen:memo.open,memoIsOpen:memo.classList.contains('is-open')}),
  restore(state){selected=state.selected;expanded=state.expanded;memo.open=state.memoOpen;memo.classList.toggle('is-open',state.memoIsOpen);rememberViewSetting('phonePhaseTab',selected);rememberViewSetting('phonePhaseSectionExpanded',expanded);sync()}
 };
 const previousRender=render;render=function(){previousRender();sync()};
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});mobile.addEventListener('change',sync);sync();
})();

;
// ===== js/help/pc-tutorial.js =====
(()=>{
 const desktop=matchMedia('(min-width:851px)');
 const menuButton=document.createElement('button');menuButton.type='button';menuButton.setAttribute('role','menuitem');menuButton.dataset.helpAction='tutorial';menuButton.textContent='チュートリアル';helpMenu.querySelector('[data-help-action="guide"]').after(menuButton);
 const intro=document.createElement('dialog');intro.id='tutorialIntro';intro.setAttribute('aria-labelledby','tutorialIntroTitle');
 intro.innerHTML='<h2 id="tutorialIntroTitle">小さな攻略図を作ってみよう</h2><p>配置・サイズ調整・移動・フェーズコピー・ノート・元に戻すを、約3分で試せます。</p><p>練習専用のコンテンツを追加します。終了すると練習データを削除し、練習を始める前の画面に戻ります。</p><div class="tutorial-intro-actions"><button type="button" id="tutorialCancel">キャンセル</button><button type="button" id="tutorialStart" class="tutorial-primary">練習を始める</button></div>';document.body.append(intro);
 const panel=document.createElement('section');panel.id='pcTutorial';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','PCチュートリアル');
 panel.innerHTML='<div class="tutorial-progress" id="tutorialProgress"></div><h2 id="tutorialTitle"></h2><p id="tutorialInstruction"></p><p id="tutorialStatus" role="status" aria-live="polite"></p><div class="tutorial-footer"><button type="button" id="tutorialExit">途中で終了</button><button type="button" id="tutorialNext" class="tutorial-primary">次へ</button></div>';document.body.append(panel);
 const highlight=document.createElement('div');highlight.id='tutorialHighlight';highlight.hidden=true;highlight.setAttribute('aria-hidden','true');document.body.append(highlight);
 const get=id=>document.getElementById(id);let session=null,timer=null,starting=false;
 const practice=()=>session&&data.tutorialPracticeId===session.id;
 const circle=()=>practice()?current().find(item=>item.type==='circle'):null;
 const steps=[
  {title:'円範囲を配置する',text:'左の「AoE」で円範囲をクリックし、キャンバスをクリックして配置してください。',target:()=>document.querySelector('.left .tool[data-tool="circle"] .glyph'),done:()=>!!circle()},
  {title:'サイズを変える',text:'円範囲をクリックして選び、右側のプロパティで「サイズ」を150px以上にしてください。スライダーでも数値入力でも変更できます。',target:()=>get('widthSpin')||document.querySelector('#objects .obj'),done:()=>!!circle()&&circle().width>=150},
  {title:'矢印キーで移動する',text:'キャンバス上の円範囲をクリックして選び、上下左右キーで動かしてください。数値欄を入力中なら、先に円範囲をクリックします。',target:()=>document.querySelector('#objects .obj'),enter:()=>{const item=circle();session.position=item?{x:item.x,y:item.y}:null},done:()=>{const item=circle();return !!item&&!!session.position&&(Math.abs(item.x-session.position.x)>.001||Math.abs(item.y-session.position.y)>.001)}},
  {title:'フェーズをコピーする',text:'フェーズリスト見出し右側のコピーを押し、「このコンテンツにコピー」を選んでください。配置と設定を引き継いだ次のフェーズを作れます。',target:()=>get('copyPage'),enter:()=>{session.sourcePage=data.page;session.sourceId=circle()?.id},done:()=>data.pages.length>=2&&data.page!==session.sourcePage&&!!circle()&&circle().id!==session.sourceId},
  {title:'ノートを残す',text:'コンテンツペイン下部の「フェーズ プロパティ / ノート」の＋で欄を開き、切り替えボタンでノートを表示します。「ここで集合」など短いメモを入力してください。ノートはフェーズごとに保存されます。',target:()=>get('phaseMemo').open?get('phaseMemo').querySelector('textarea'):get('desktopPhaseSectionToggle')?.getAttribute('aria-expanded')==='false'?get('desktopPhaseSectionToggle'):get('desktopPhaseSwitch'),done:()=>!!data.pageNotes?.[data.page]?.trim()},
  {title:'元に戻す・やり直す',text:'ノート欄の外をクリックし、左上の「元に戻す」、続けて「やり直す」を押してください。入力したノートが戻れば完了です。',target:()=>get(session.sawUndo?'redo':'undo'),enter:()=>{session.note=data.pageNotes[data.page];session.notePage=data.page;session.sawUndo=false},done:()=>{const note=data.pageNotes?.[session.notePage]||'';if(note!==session.note)session.sawUndo=true;return session.sawUndo&&note===session.note}}
 ];
 const mobileSteps=[
  {...steps[0],text:'「マテリアル」を開き、「AoE」の円範囲をタップします。一覧の外をタップして閉じ、キャンバスの空いている場所をタップして配置してください。',target:()=>document.querySelector('.layout').classList.contains('phone-materials-open')?document.querySelector('.left .tool[data-tool="circle"]'):document.querySelector('.phone-material-pin')},
  {...steps[1],enter:()=>{const item=circle();if(item){selected=item.id;selectedIds=[item.id];renderSelectionOnly()}const host=get('objectLayerPanel');if(host.dataset.objectTab!=='properties')get('toggleLayers').parentElement.querySelector('.phone-object-tabs button').click();if(get('toggleInspector').getAttribute('aria-expanded')!=='true')get('toggleInspector').click()},text:'円範囲をタップして選び、画面下の「プロパティ」でサイズのスライダーを右へ動かし、150px以上にします。「リスト」が表示中なら切り替えボタン、「＋」ならそれを押して欄を開いてください。',target:()=>get('widthInput')?.getClientRects().length?get('widthInput'):document.querySelector('.phone-object-tabs button')},
  {...steps[2],title:'指で移動する',text:'円範囲を指でドラッグして、別の場所へ動かしてください。',target:()=>document.querySelector('#objects .obj')},
  {...steps[3],text:'キャンバス左側の矢印からコンテンツを開き、フェーズリスト見出しのコピーから「このコンテンツにコピー」をタップしてください。',target:()=>document.querySelector('.layout').classList.contains('phone-content-open')?get('copyPage'):document.querySelector('.phone-content-icon')},
  {...steps[4],text:'コンテンツ内の「プロパティ／ノート」を切り替えてノートを開き、「ここで集合」など短いメモを入力してください。「＋」で欄を開けます。',target:()=>get('phaseMemo').getClientRects().length?get('phaseMemo').querySelector('textarea'):get('phonePhaseSwitch-toggle')},
  {...steps[5],text:'キーボードを閉じ、コンテンツを開いたまま画面上部の「元に戻す」、続けて「やり直す」をタップしてください。ノートが元どおりになれば完了です。',target:()=>get(session.sawUndo?'redo':'undo')}
 ];
 let activeSteps=steps;
 function animateHighlight(){
  if(!session)return;
  tick();timer=requestAnimationFrame(animateHighlight);
 }
 function focusStep(){get('tutorialTitle').focus({preventScroll:true})}
 function showStep(){
  if(!session)return;const step=activeSteps[session.step];highlight.hidden=true;
  document.body.classList.toggle('tutorial-content-step',!desktop.matches&&(session.step===3||session.step===4||session.step===5));
  get('tutorialTitle').tabIndex=-1;
  get('tutorialProgress').textContent=step?'ステップ '+(session.step+1)+' / '+activeSteps.length:'練習完了';
  get('tutorialTitle').textContent=step?step.title:'ひと通り操作できました';
  get('tutorialInstruction').textContent=step?step.text:'編集データはブラウザー内に自動保存されます。大切な作戦はメニューの「エクスポート」からJSONでも保存してください。終了すると練習データを削除し、元の作戦へ戻ります。';
  get('tutorialNext').textContent=step?'次へ':'終了して元の作戦へ';get('tutorialNext').disabled=!!step;get('tutorialExit').hidden=!step;get('tutorialStatus').textContent='';
  if(step?.enter)step.enter();focusStep();tick();
 }
 function tick(){
  if(!session)return;const step=activeSteps[session.step];
  if(!practice()){get('tutorialStatus').textContent='練習用コンテンツ以外を表示中です。終了すると元の作戦へ戻ります。';get('tutorialNext').disabled=true;highlight.hidden=true;return}
  if(!step){get('tutorialStatus').textContent='ヘルプから何度でも練習できます。';return}
  const done=!!step.done();get('tutorialNext').disabled=!done;
  const status=done?'できました。「次へ」で進めます。':'オレンジの枠が操作する場所の目印です。';if(get('tutorialStatus').textContent!==status)get('tutorialStatus').textContent=status;
  const target=step.target(),rect=target?.getBoundingClientRect();highlight.hidden=!rect||!rect.width||!rect.height;
  if(!highlight.hidden)Object.assign(highlight.style,{left:(rect.left-3)+'px',top:(rect.top-3)+'px',width:(rect.width+6)+'px',height:(rect.height+6)+'px'});
 }
 async function start(){
  if(session||starting)return;
  starting=true;
  try{flushScheduledBoardSave();await window.boardStorage.flush()}finally{starting=false}
  activeSteps=desktop.matches?steps:mobileSteps;panel.setAttribute('aria-label',desktop.matches?'PCチュートリアル':'スマホチュートリアル');intro.close();document.querySelector('.top').classList.remove('phone-menu-open');storeContentHistory();boardSaveSuspended=true;
  const id='tutorial-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  session={id,home:data,homeIndex:activeContent,selected,selectedIds:selectedIds.slice(),phases:selectedPhaseIndexes.slice(),wasReadOnly:boardReadOnly,pinned:document.querySelector('.left').classList.contains('pinned'),collapsed:document.querySelector('.layout').classList.contains('content-collapsed'),step:0};
  if(boardReadOnly)window.Bolxiv.setMode('edit');
  if(desktop.matches&&!session.pinned)get('leftRailToggle').click();
  if(desktop.matches&&session.collapsed)get('contentObjectPin').click();
  session.sections=['toggleBattlePages','toggleInspector'].map(id=>({id,open:get(id).getAttribute('aria-expanded')==='true'}));for(const section of session.sections)if(!section.open)get(section.id).click();
  const board=parseImportedBoards(JSON.stringify({title:'練習用：はじめの攻略図',pages:[[]],pageNames:['フェーズ1'],pageNotes:['']}))[0];board.tutorialPracticeId=id;
  contentBoards[activeContent]=data;contentBoards.push(board);activeContent=contentBoards.length-1;data=board;restoreContentHistory();selected=null;selectedIds=[];selectedPhaseIndexes=[];phaseSelectionOwner=data;drag=null;selectPlacementTool('select');
  renderAndSave();const aoeToggle=document.querySelector('[aria-controls="aoePanel"]');if(aoeToggle.getAttribute('aria-expanded')!=='true')aoeToggle.click();document.body.classList.add('tutorial-active');fitBoardDisplayZoom();panel.hidden=false;showStep();timer=requestAnimationFrame(animateHighlight);
 }
 function finish(){
  if(!session)return;const previous=session;cancelAnimationFrame(timer);timer=null;session=null;panel.hidden=true;highlight.hidden=true;document.body.classList.remove('tutorial-active','tutorial-content-step');if(!desktop.matches){if(document.querySelector('.layout').classList.contains('phone-materials-open'))document.querySelector('.phone-content-icon').click();if(document.querySelector('.layout').classList.contains('phone-content-open'))document.querySelector('.phone-content-close').click()}
  cancelScheduledBoardSave();contentBoards[activeContent]=data;storeContentHistory();contentBoards=contentBoards.filter(board=>board.tutorialPracticeId!==previous.id);
  const at=contentBoards.indexOf(previous.home);activeContent=at>=0?at:Math.max(0,Math.min(previous.homeIndex,contentBoards.length-1));data=contentBoards[activeContent];restoreContentHistory();
  selected=previous.selected;selectedIds=previous.selectedIds.filter(id=>current().some(item=>item.id===id));selectedPhaseIndexes=previous.phases.filter(i=>i<data.pages.length);phaseSelectionOwner=data;drag=null;selectPlacementTool('select');
  const layout=document.querySelector('.layout');if(document.querySelector('.left').classList.contains('pinned')!==previous.pinned)get('leftRailToggle').click();if(layout.classList.contains('content-collapsed')!==previous.collapsed)get('contentObjectPin').click();if(boardReadOnly!==previous.wasReadOnly)window.Bolxiv.setMode(previous.wasReadOnly?'view':'edit');
  boardSaveSuspended=false;renderAndSave();flushScheduledBoardSave();get('operationGuideBtn').focus({preventScroll:true});
  for(const section of previous.sections)if((get(section.id).getAttribute('aria-expanded')==='true')!==section.open)get(section.id).click();
 }
 helpMenu.addEventListener('click',event=>{if(!event.target.closest('[data-help-action="tutorial"]'))return;event.preventDefault();event.stopImmediatePropagation();closeHelpMenu();if(!session)intro.showModal()},true);
 get('tutorialStart').onclick=start;get('tutorialCancel').onclick=()=>intro.close();get('tutorialExit').onclick=finish;
 get('tutorialNext').onclick=()=>{if(!session||get('tutorialNext').disabled)return;if(session.step>=activeSteps.length){finish();return}session.step++;showStep()};
 desktop.addEventListener('change',()=>{if(intro.open)intro.close();finish()});
})();

;
// ===== js/mobile/phone-pressed-controls.js =====
(()=>{
 const mobile=matchMedia('(max-width:850px)');let pressed=null;
 const selector='.phone-object-tabs,.phone-phase-tabs,.phone-reader-tabs,.phone-object-tabs-title,.accordion-toggle:not(#toggleObjectList):not(#toggleContent),.phase-memo>summary,#contentSelect,.content-object-pin,.content-history-button,.board-grid-toggle,.phone-content-close,.phone-material-toggle,#phonePhaseSectionToggle,.phone-phase-switch-title,button:not(.color-swatch):not([data-color-value]):not(#toggleObjectList):not(#toggleContent):not(.phone-content-backdrop):not(:where(.page-tab,.page-tab *,.object-row,.object-row *,.content-option-row:not(.content-option-add-row),.content-option-row:not(.content-option-add-row) *,.phase-group-heading,.phase-group-heading *))';
 const deferredSelector='.color-trigger,.color-custom-trigger,.phone-number-step-buttons button';
 let flashed=null,flashTimer=null;
 function clearFlash(){clearTimeout(flashTimer);flashed?.classList.remove('phone-control-pressed');flashed=null}
 function clear(){pressed?.node.classList.remove('phone-control-pressed');pressed=null}
 document.addEventListener('pointerdown',event=>{
  if(!mobile.matches||event.pointerType!=='touch')return;
  clear();clearFlash();const node=event.target.closest(selector);if(!node||node.disabled)return;
  pressed={node,id:event.pointerId,x:event.clientX,y:event.clientY,deferred:node.matches(deferredSelector)};if(!pressed.deferred)node.classList.add('phone-control-pressed');
 },true);
 document.addEventListener('pointermove',event=>{if(pressed&&event.pointerId===pressed.id&&!pressed.node.matches('#objectControls .handle')&&Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)>10)clear()},true);
 document.addEventListener('pointerup',event=>{
  const current=pressed;
  if(!current||event.pointerId!==current.id)return;
  clear();
  if(current.deferred&&current.node.isConnected&&!current.node.disabled&&current.node.contains(event.target)){
   flashed=current.node;flashed.classList.add('phone-control-pressed');flashTimer=setTimeout(clearFlash,160);
  }
 },true);
 document.addEventListener('pointercancel',clear,true);
 const reset=()=>{clear();clearFlash()};window.addEventListener('blur',reset);mobile.addEventListener('change',reset);
})();

;
// Defer phone range changes until a tap or horizontal gesture is established.
(()=>{
 const mobile=matchMedia('(max-width:850px)');let gesture=null;
 const eligible=node=>node instanceof HTMLInputElement&&node.matches('#inspector input[type="range"],#layoutPropertiesPanel input[type="range"],#fieldGuideSettings input[type="range"]')&&!node.disabled;
 function valid(g){return g.input.isConnected&&!g.input.disabled&&!boardReadOnly&&!phaseComparisonActive()}
 function apply(g,x){
  if(!valid(g))return;
  const input=g.input,rect=input.getBoundingClientRect(),min=Number(input.min||0),max=Number(input.max||100),step=input.step==='any'?0:Number(input.step||1),thumb=16;
  let fraction=Math.max(0,Math.min(1,(x-rect.left-thumb/2)/Math.max(1,rect.width-thumb)));
  if(getComputedStyle(input).direction==='rtl')fraction=1-fraction;
  let value=min+fraction*(max-min);if(step)value=min+Math.round((value-min)/step)*step;
  const previous=input.value;input.value=String(Math.max(min,Math.min(max,value)));const next=input.value;input.value=previous;
  if(next===previous)return;
  if(!g.started){g.started=true;input.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:g.id,clientX:g.x,clientY:g.y}))}
  input.value=next;g.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 window.addEventListener('pointerdown',event=>{
  if(!mobile.matches||event.pointerType!=='touch'||!event.isTrusted)return;
  if(gesture){gesture=null;return}
  if(!eligible(event.target))return;
  const input=event.target;gesture={input,id:event.pointerId,x:event.clientX,y:event.clientY,mode:'pending',value:input.value,started:false};
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 window.addEventListener('pointermove',event=>{
  const g=gesture;if(!g||event.pointerId!==g.id)return;
  if(!valid(g)){gesture=null;return}
  const dx=event.clientX-g.x,dy=event.clientY-g.y;
  if(g.mode==='pending'&&Math.max(Math.abs(dx),Math.abs(dy))>=8)g.mode=Math.abs(dx)>Math.abs(dy)?'horizontal':'vertical';
  if(g.mode==='horizontal'){event.preventDefault();event.stopImmediatePropagation();apply(g,event.clientX)}
 },{capture:true,passive:false});
 window.addEventListener('pointerup',event=>{
  const g=gesture;if(!g||event.pointerId!==g.id)return;
  if(g.mode!=='vertical'){event.preventDefault();event.stopImmediatePropagation();apply(g,event.clientX);if(g.started&&valid(g))g.input.dispatchEvent(new Event('change',{bubbles:true}))}
  gesture=null;
 },true);
 window.addEventListener('pointercancel',event=>{if(gesture?.id===event.pointerId)gesture=null},true);
 window.addEventListener('input',event=>{
  const g=gesture;if(event.isTrusted&&g&&event.target===g.input){g.input.value=g.value;event.stopImmediatePropagation()}
 },true);
 window.addEventListener('blur',()=>{gesture=null});mobile.addEventListener('change',()=>{gesture=null});
})();
