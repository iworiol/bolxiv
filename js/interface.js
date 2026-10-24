// ===== Features =====
// Object groups are stored on each member so JSON, history and phase copies retain them.
(function setupObjectGroups(){
 const beforeGroupInspector=renderInspector;renderInspector=function(){beforeGroupInspector();renderIndividualGroupHint(document.getElementById('inspector'))};
 const menu=document.getElementById('objectContextMenu');
 // Capture member-row selection before individual child handlers or reused rows.
 document.getElementById('objectList').addEventListener('click',event=>{
  const row=event.target.closest('.object-group-member');
  if(!row||event.target.closest('input,button:not(.object-name),textarea')||phaseComparisonActive())return;
  event.preventDefault();event.stopImmediatePropagation();selectIndividualGroupMember(row.dataset.id,event.shiftKey);
 },true);
 const membershipList=document.getElementById('objectList');for(const type of ['dragover','drop'])membershipList.addEventListener(type,handleObjectMembershipDrop,true);
 const clearMembershipGuide=()=>membershipList.querySelectorAll('.drag-over,.drop-before,.drop-after').forEach(n=>n.classList.remove('drag-over','drop-before','drop-after'));membershipList.addEventListener('dragleave',event=>{if(!membershipList.contains(event.relatedTarget))clearMembershipGuide()});document.addEventListener('dragend',clearMembershipGuide);
 const groupStart=document.createElement('div');groupStart.className='context-separator';groupStart.setAttribute('role','separator');menu.insertBefore(groupStart,document.getElementById('contextCopy'));
 for(const [id,label] of [['contextGroup','グループ化'],['contextUngroup','グループ解除'],['contextRenameObjectGroup','グループ名を変更']]){
  const button=document.createElement('button');button.id=id;button.type='button';button.setAttribute('role','menuitem');button.textContent=label;
  menu.insertBefore(button,document.getElementById('contextCopy'));
  button.onclick=()=>{
   const ids=expandObjectGroups(JSON.parse(menu.dataset.ids||'[]')),items=current().filter(o=>ids.includes(o.id));closeObjectContextMenu();
   if(id==='contextRenameObjectGroup'){if(selectedObjectGroup().length)beginObjectGroupRename(items[0].objectGroupId);return}
   if(boardReadOnly||phaseComparisonActive()||id==='contextGroup'&&items.length<2)return;
   recordHistory();const groupId=createObjectId();for(const item of items){if(id==='contextGroup'){item.objectGroupId=groupId;item.objectGroupName='グループ'}else{delete item.objectGroupId;delete item.objectGroupName}}
   selectedIds=ids;selected=ids[ids.length-1]||null;renderAndSave();
  };
 }
 const groupEnd=document.createElement('div');groupEnd.className='context-separator';groupEnd.setAttribute('role','separator');menu.insertBefore(groupEnd,document.getElementById('contextCopy'));
 document.addEventListener('pointermove',e=>{
  if(!['group-scale','group-rotate'].includes(drag?.mode)||drag.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
  if(drag.mode==='group-rotate'){
   if(drag.board!==data||drag.page!==current()){finish(null);return}
   const r=layer.getBoundingClientRect(),angle=Math.atan2(e.clientY-(r.top+drag.cy/100*r.height),e.clientX-(r.left+drag.cx/100*r.width));let delta=angle-drag.lastAngle;while(delta>Math.PI)delta-=2*Math.PI;while(delta<-Math.PI)delta+=2*Math.PI;drag.degrees+=delta*180/Math.PI;drag.lastAngle=angle;const degrees=Math.round(drag.degrees);drag.rotateContents=e.shiftKey;drag.orientationOnly=e.shiftKey;applyObjectGroupRotation(drag.items,drag.cx,drag.cy,degrees,drag.rotateContents,drag.orientationOnly);drag.moved=normalizedObjectRotation(degrees)!==0;for(const item of current().filter(o=>drag.items.some(original=>original.id===o.id)))updateShapeFromData(item,false);renderObjectGroupControls();const amount=objectGroupRotationValue(current().filter(o=>drag.items.some(original=>original.id===o.id)),drag.orientationOnly);for(const id of (drag.orientationOnly?['groupOrientationRange','groupOrientationNumber']:['groupRotationRange','groupRotationNumber'])){const input=document.getElementById(id);if(input)input.value=amount}const value=document.getElementById(drag.orientationOnly?'groupOrientationValue':'groupRotationValue');if(value)value.textContent=amount;const section=document.getElementById('objectGroupProperties');if(section)refreshObjectGroupDimensions(section,current().filter(o=>drag.items.some(original=>original.id===o.id)));return;
  }
  const denominator=drag.vx*drag.vx+drag.vy*drag.vy;if(!denominator)return;
  let factor=1+((e.clientX-drag.startX)*drag.vx+(e.clientY-drag.startY)*drag.vy)/denominator;
  drag.spacing=e.shiftKey;
  factor=applyObjectGroupScale(drag.items,drag.cx,drag.cy,factor,drag.spacing,drag.geometry);drag.moved=drag.moved||Math.abs(factor-1)>.0001;
  render();
 },true);
 function finish(e,cancel=false){
  if(!['group-scale','group-rotate'].includes(drag?.mode)||e&&drag.pointerId!==e.pointerId)return;e?.preventDefault();e?.stopImmediatePropagation();
  const gesture=drag;drag=null;if(stage.hasPointerCapture(gesture.pointerId))stage.releasePointerCapture(gesture.pointerId);
  if(gesture.board&&(gesture.board!==data||gesture.page!==current()))return;
  if(cancel){Object.assign(data,JSON.parse(gesture.beforeData));renderAndSave()}else if(gesture.moved){recordHistory(gesture.beforeData);renderAndSave()}
 }
 document.addEventListener('pointerup',e=>finish(e),true);document.addEventListener('pointercancel',e=>finish(e,true),true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&['group-scale','group-rotate'].includes(drag?.mode)){e.preventDefault();e.stopImmediatePropagation();finish(null,true)}},true);
 window.addEventListener('blur',()=>finish(null,true));
 // The canvas and phone list both expose the same menu on a stationary long press.
 let press=null,suppressClick=false;
 function cancelPress(){if(press)clearTimeout(press.timer);press=null}
 document.addEventListener('pointerdown',e=>{
  cancelPress();suppressClick=false;if(e.pointerType!=='touch'||boardReadOnly||phaseComparisonActive())return;
  const node=e.target.closest('#objects .obj,#objectList .object-row');if(!node||e.target.closest('input,.object-index')||e.target.closest('button')&&!e.target.closest('.object-name'))return;
  const p={id:e.pointerId,x:e.clientX,y:e.clientY,objectId:node.dataset.id};press=p;
  p.timer=setTimeout(()=>{if(press!==p)return;drag=null;suppressClick=true;if(!individualGroupSelectionActive()||!selectedIds.includes(p.objectId))selectedIds=selectedIds.includes(p.objectId)?expandObjectGroups(selectedIds):objectGroupIds(p.objectId);selected=p.objectId;renderSelectionOnly();openObjectContextMenu(p.objectId,p.x,p.y);cancelPress()},350);
 },true);
 document.addEventListener('pointermove',e=>{if(press&&press.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)cancelPress()},true);
 for(const type of ['pointerup','pointercancel'])document.addEventListener(type,cancelPress,true);
 document.addEventListener('click',e=>{if(suppressClick){suppressClick=false;if(e.isTrusted||e.target.closest('#objects .obj,#objectList .object-row')){e.preventDefault();e.stopImmediatePropagation()}}},true);
 // Keep the membership frame in sync with individual position/size edits.
 let groupContextFrame=0;
 new MutationObserver(()=>{if(groupContextFrame||!individualGroupSelectionActive())return;groupContextFrame=requestAnimationFrame(()=>{groupContextFrame=0;renderObjectGroupControls()})}).observe(layer,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
 // A second stationary press enters a member; dragging still moves the whole group.
 let memberPick=null;
 document.addEventListener('pointerdown',event=>{
  memberPick=null;if(event.button!==0||event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||boardReadOnly||phaseComparisonActive()||tapPlacementArmed)return;
  const node=event.target.closest('#objects .obj');if(!node||node.isContentEditable)return;
  const item=current().find(o=>o.id===node.dataset.id),group=selectedObjectGroup();
  if(!item?.objectGroupId||!group.some(o=>o.id===item.id))return;
  memberPick={pointerId:event.pointerId,id:item.id,board:data,page:current(),x:event.clientX,y:event.clientY};
 },true);
 document.addEventListener('pointermove',event=>{if(memberPick?.pointerId===event.pointerId&&Math.hypot(event.clientX-memberPick.x,event.clientY-memberPick.y)>8)memberPick=null},true);
 document.addEventListener('pointerup',event=>{
  const pick=memberPick;memberPick=null;if(!pick||pick.pointerId!==event.pointerId||pick.board!==data||pick.page!==current()||suppressClick||drag?.moved||boardReadOnly||phaseComparisonActive())return;
  selectIndividualGroupMember(pick.id);
 },true);
 document.addEventListener('pointercancel',()=>{memberPick=null},true);
 window.addEventListener('blur',()=>{memberPick=null});

})();

// Built-in presets use field-relative positions; each insertion is one undo step.
(function setupBuiltinPresets(){
 const button=document.getElementById('builtinFieldMarkers');
 button.onclick=()=>{
  if(boardReadOnly||phaseComparisonActive()||window.Bolxiv?.pngPreview?.active)return;
  const size=data.pageFieldSizes[data.page]||{width:538,height:538};
  const positions=[['A',0,-.285],['B',.285,0],['C',0,.275],['D',-.285,0],['1',-.17,-.17],['2',.175,-.17],['3',.175,.16],['4',-.17,.16]];
  const items=positions.map(([name,x,y])=>createPlacementObject({type:'icon',name:'フィールド'+name,src:iconPath(name.toLowerCase(),'field-marker-transparent')},50+x*size.width/640*100,50+y*size.height/640*100));
  const groupId=createObjectId();for(const item of items){item.objectGroupId=groupId;item.objectGroupName='フィールドマーカー'}
  snapshot();current().push(...items);selected=items[0].id;selectedIds=items.map(item=>item.id);
  tapPlacementArmed=false;selectPlacementTool('select');hideTouchPlacementPreview();
  renderAndSave();closePaletteAfterPlacement();notify('フィールドマーカー8個を配置しました');
 };
})();

// ===== js/canvas/edit-mode-setup.js =====
(function setupEditMode(){
 const button=document.getElementById('editModeToggle'),disabledForView=new Set();
 function syncControls(){
  if(!boardReadOnly&&!window.Bolxiv?.pngPreview?.active){for(const node of disabledForView)node.disabled=false;disabledForView.clear();return}
  for(const node of document.querySelectorAll(readOnlyEditTargets+',#objectList button,#inspector input,#inspector select,#inspector button')){
   if(!node.matches('button,input,select,textarea')||node.disabled)continue;
   node.disabled=true;disabledForView.add(node);
  }
  for(const node of disabledForView)if(!node.isConnected)disabledForView.delete(node);
 }
 const observer=new MutationObserver(syncControls);observer.observe(document.querySelector('.app'),{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});
 function update(){document.body.classList.toggle('board-read-only',boardReadOnly);updateModeStatus();syncControls()}
 document.addEventListener('board-view-mode-changed',update);
 button.onclick=event=>{
  if(window.Bolxiv?.pngPreview?.active){event?.stopPropagation();window.Bolxiv.pngPreview.close();return}
  document.activeElement?.blur();if(phaseComparisonActive()){selectedPhaseIndexes=[];boardReadOnly=false}else boardReadOnly=!boardReadOnly;
  try{localStorage.setItem('bolxiv-read-only',String(boardReadOnly))}catch{}
  selected=null;selectedIds=[];drag=null;tapPlacementArmed=false;selectPlacementTool('select');hideTouchPlacementPreview();clearAlignmentGuides();closeObjectContextMenu();closeColorPopovers();closeJsonImportMenu();
  update();render();
 };
 update();
})();

;
// ===== js/canvas/palette-long-press.js =====
(()=>{
 const pane=document.querySelector('.left');let gesture=null,suppressButton=null,lastTouch=0;
 function finish(){if(!gesture)return;clearTimeout(gesture.timer);const g=gesture;gesture=null;hideTouchPlacementPreview();if(g.button.hasPointerCapture(g.id))g.button.releasePointerCapture(g.id);g.button.draggable=g.draggable;return g}
 pane.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;const button=e.target.closest('.tool[data-tool],.icon-choice');if(!button)return;
  finish();lastTouch=Date.now();const g={id:e.pointerId,x:e.clientX,y:e.clientY,button,draggable:button.draggable,wasSelected:button.classList.contains('active'),active:false,moved:false};gesture=g;button.draggable=false;
  g.timer=setTimeout(()=>{if(gesture!==g||!button.isConnected)return;g.active=true;button.focus({preventScroll:true});button.click();suppressButton=button;tapPlacementArmed=true;g.payload=tool==='icon'&&activeIcon?{type:'icon',...activeIcon}:{type:tool};showTouchPlacementPreview(g.payload,g.x,g.y);button.setPointerCapture(g.id);button.classList.add('palette-dragging')},450);
 });
 document.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y);if(!gesture.active){if(distance>10)finish();return}gesture.moved=distance>10;moveTouchPlacementPreview(e.clientX,e.clientY);e.preventDefault();e.stopImmediatePropagation()},true);
 document.addEventListener('pointerup',e=>{
  if(gesture?.id!==e.pointerId)return;const g=finish();g.button.classList.remove('palette-dragging');if(!g.active)return;e.preventDefault();e.stopImmediatePropagation();
  if(g.wasSelected&&!g.moved){tapPlacementArmed=false;selectPlacementTool('select');return}const r=stage.getBoundingClientRect(),point=touchPlacementPoint(e.clientX,e.clientY);if(g.moved&&point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom&&!phaseComparisonActive()){placeObject(g.payload,point.x,point.y);tapPlacementArmed=false;selectPlacementTool('select');closePaletteAfterPlacement()}
 },true);
 document.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId){const g=finish();g.button.classList.remove('palette-dragging');suppressButton=null}},true);
 pane.addEventListener('click',e=>{if(e.isTrusted&&suppressButton){const same=e.target.closest('.tool[data-tool],.icon-choice')===suppressButton;suppressButton=null;if(same){e.preventDefault();e.stopImmediatePropagation()}}},true);
 pane.addEventListener('click',e=>{const button=e.target.closest('.tool[data-tool],.icon-choice');if(!e.isTrusted||!button?.classList.contains('active'))return;e.preventDefault();e.stopImmediatePropagation();tapPlacementArmed=false;selectPlacementTool('select');hideTouchPlacementPreview()},true);
 pane.addEventListener('contextmenu',e=>{if(Date.now()-lastTouch<2500&&e.target.closest('.tool[data-tool],.icon-choice'))e.preventDefault()});
 window.addEventListener('blur',()=>{suppressButton=null;const g=finish();g?.button.classList.remove('palette-dragging')});
})();

;
// ===== js/canvas/palette-drag-state.js =====
(()=>{
 const pane=document.querySelector('.left');
 function clear(){pane.querySelectorAll('.palette-dragging').forEach(button=>button.classList.remove('palette-dragging'))}
 pane.addEventListener('dragstart',e=>{
 clear();const button=e.target.closest('.tool[data-tool],.icon-choice');if(!button)return;button.classList.add('palette-dragging');
 const artwork=button.querySelector('img,.glyph');if(!artwork||!e.dataTransfer)return;
 const preview=document.createElement('div');preview.style.cssText='position:fixed;left:-10000px;top:0;width:48px;height:48px;display:grid;place-items:center;background:transparent;border:0;box-shadow:none;pointer-events:none;';
 const clone=artwork.cloneNode(true);clone.style.cssText='display:grid;place-items:center;width:48px;height:48px;max-width:none;max-height:none;background:transparent;border:0;box-shadow:none;color:#f39c12;font-size:32px;';
 const svg=clone.querySelector('svg');if(svg){svg.style.width='48px';svg.style.height='48px'}preview.append(clone);document.body.append(preview);e.dataTransfer.setDragImage(preview,24,24);setTimeout(()=>preview.remove(),0);
});
 document.addEventListener('dragend',clear);document.addEventListener('drop',clear);window.addEventListener('blur',clear);
})();

;
// ===== js/canvas/palette-open-without-toggle.js =====
(()=>{
 const pane=document.querySelector('.left');let opening=false,openingPointer=null,suppressClick=false;
 // Delay mouse hover expansion; focus and pinned styles remain immediate.
 const desktopHover=matchMedia('(min-width:851px) and (hover:hover)');let hoverTimer=null;
 function clearDelayedHover(){clearTimeout(hoverTimer);hoverTimer=null;pane.classList.remove('palette-hover-open')}
 pane.addEventListener('pointerenter',e=>{
  clearDelayedHover();
  if(e.pointerType!=='mouse'||!desktopHover.matches||pane.classList.contains('pinned'))return;
  hoverTimer=setTimeout(()=>{hoverTimer=null;if(desktopHover.matches)pane.classList.add('palette-hover-open')},300);
 });
 pane.addEventListener('pointerleave',clearDelayedHover);
 pane.addEventListener('pointercancel',clearDelayedHover);
 window.addEventListener('blur',clearDelayedHover);
 desktopHover.addEventListener('change',clearDelayedHover);
 pane.setAttribute('tabindex','-1');
 function clearOpeningStyleIfClosed(){if(!pane.matches(':focus-within')&&!pane.matches(':hover')&&!pane.classList.contains('pinned'))pane.classList.remove('palette-opening-neutral')}
 pane.addEventListener('focusout',()=>queueMicrotask(()=>{if(!pane.matches(':focus-within'))pane.classList.remove('palette-opening-neutral')}));
 pane.addEventListener('pointerleave',()=>queueMicrotask(clearOpeningStyleIfClosed));
 document.addEventListener('pointerdown',e=>{if(!pane.contains(e.target)){pane.classList.remove('palette-opening-neutral');if(pane.contains(document.activeElement))document.activeElement.blur()}},true);

 pane.addEventListener('pointerenter',e=>{opening=e.pointerType!=='mouse'&&!pane.classList.contains('pinned')&&!pane.matches(':focus-within');if(e.pointerType==='mouse')pane.classList.remove('palette-opening-neutral')});
 pane.addEventListener('pointerleave',()=>{if(openingPointer===null)opening=false});
 document.addEventListener('pointerdown',e=>{
  if(!pane.contains(e.target))return;pane.classList.remove('palette-opening-neutral');if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
  suppressClick=false;
  const railButton=e.target.closest('button');const compactButton=railButton&&railButton.getBoundingClientRect().width<=44;const closed=!pane.classList.contains('pinned')&&(opening||!pane.matches(':focus-within')||pane.getBoundingClientRect().width<100||compactButton&&railButton.matches('.accordion-toggle'));
  if(!closed)return;
  // Consume the complete opening gesture before focusing expands the rail.
  e.preventDefault();e.stopImmediatePropagation();openingPointer=e.pointerId;suppressClick=true;opening=false;pane.classList.add('palette-opening-neutral');pane.focus({preventScroll:true});pane.setPointerCapture(e.pointerId);
 },true);
 for(const type of ['pointerup','pointercancel'])pane.addEventListener(type,e=>{if(e.pointerId!==openingPointer)return;e.preventDefault();e.stopImmediatePropagation();openingPointer=null;if(pane.hasPointerCapture(e.pointerId))pane.releasePointerCapture(e.pointerId)},true);
 document.addEventListener('click',e=>{if(suppressClick&&e.isTrusted){suppressClick=false;e.preventDefault();e.stopImmediatePropagation()}},true);
 pane.addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();return}
  const button=e.target.closest('.accordion-toggle:not(.rail-toggle)');if(!button)return;
  const expandOnly=opening&&!pane.classList.contains('pinned');opening=false;if(!expandOnly)return;e.preventDefault();e.stopImmediatePropagation();button.focus({preventScroll:true});
 },true);
})();

;
// ===== js/mobile/mobile-layout.js =====
(function setupPhoneLayout(){
 const mobile=matchMedia('(max-width:850px)'),layout=document.querySelector('.layout');
 const nav=document.createElement('nav');nav.className='phone-nav';nav.setAttribute('aria-label','スマホの画面切り替え');
 for(const [pane,label] of [['canvas','キャンバス']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.pane=pane;button.setAttribute('aria-pressed',String(pane==='canvas'));
  button.onclick=()=>{closeMaterials();if(mobile.matches&&pane==='content'){layout.dataset.phonePane='canvas';layout.classList.add('phone-content-open');for(const item of nav.children)item.setAttribute('aria-pressed',String(item===button));return}layout.classList.remove('phone-content-open');layout.dataset.phonePane=pane;for(const item of nav.children)item.setAttribute('aria-pressed',String(item===button))};nav.append(button);
 }
 layout.dataset.phonePane='canvas';
 const contentIcon=document.createElement('button');contentIcon.type='button';contentIcon.className='phone-content-icon';contentIcon.setAttribute('aria-label','コンテンツを表示');contentIcon.title='コンテンツを表示';contentIcon.setAttribute('aria-controls','battlePanel');contentIcon.setAttribute('aria-expanded','false');
 contentIcon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
 document.querySelector('.board-display-toolbar').prepend(contentIcon);
 contentIcon.onclick=()=>{closeMaterials();layout.classList.add('phone-content-open')};
 new MutationObserver(()=>contentIcon.setAttribute('aria-expanded',String(layout.classList.contains('phone-content-open')))).observe(layout,{attributes:true,attributeFilter:['class']});

 const materialPane=document.querySelector('.left'),pin=document.createElement('button');let desktopMaterialPinned=materialPane.classList.contains('pinned'),materialOpenObjectCount=0;
 const placementHelp=document.createElement('div');placementHelp.className='phone-material-help';placementHelp.innerHTML='<p>アイコンをタップ → キャンバスをタップして配置。</p><p>長押しで移動 → 指を離して配置（指の少し上）。</p>';materialPane.insertBefore(placementHelp,materialPane.querySelector('.accordion-group'));
 pin.type='button';pin.className='board-grid-toggle phone-material-pin';pin.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="3.5"/><rect x="14" y="3" width="7" height="7" rx="1"/><path d="m6.5 13 4.5 8H2z"/><path d="m17.5 13 4.5 4.5-4.5 4.5-4.5-4.5z"/></svg>';
 pin.setAttribute('aria-label','マテリアルを開く');pin.title='マテリアルを開く';pin.setAttribute('aria-expanded','false');
 if(!materialPane.id)materialPane.id='materialPane';pin.setAttribute('aria-controls',materialPane.id);
 document.getElementById('objectLayerPanel').append(pin);
 function closeMaterials(){if(layout.classList.contains('phone-materials-open'))materialPane.classList.toggle('pinned',desktopMaterialPinned);layout.classList.remove('phone-materials-open');pin.setAttribute('aria-expanded','false');pin.setAttribute('aria-label','マテリアルを開く');pin.title='マテリアルを開く'}
 pin.onclick=()=>{materialOpenObjectCount=current().length;if(!layout.classList.contains('phone-materials-open'))desktopMaterialPinned=materialPane.classList.contains('pinned');materialPane.classList.add('pinned');let firstOpen=null;for(const category of materialPane.querySelectorAll('.accordion-toggle[aria-controls]')){if(category.getAttribute('aria-expanded')!=='true')continue;if(!firstOpen){firstOpen=category;continue}category.setAttribute('aria-expanded','false');document.getElementById(category.getAttribute('aria-controls')).hidden=true}const rect=document.querySelector('.board-title-row').getBoundingClientRect();layout.style.setProperty('--phone-material-top',(rect.bottom-layout.getBoundingClientRect().top)+'px');layout.classList.add('phone-materials-open');pin.setAttribute('aria-expanded','true');pin.setAttribute('aria-label','マテリアルを展開');pin.title='マテリアルを展開'};
 
 mobile.addEventListener('change',closeMaterials);
 // Reveal the canvas after a tap selection. Long-press uses a synthetic click
 // and must keep the palette in place while its pointer is captured.
 materialPane.addEventListener('click',event=>{
  if(mobile.matches&&event.isTrusted&&tapPlacementArmed&&event.target.closest('.tool[data-tool],.icon-choice'))closeMaterials();
 });
 let materialDismissClick=false;
 document.addEventListener('pointerdown',event=>{
  materialDismissClick=false;
  if(!mobile.matches||!layout.classList.contains('phone-materials-open')||operationGuide.open)return;
  if(event.target.closest('#pcTutorial')||materialPane.contains(event.target)||pin.contains(event.target)||contentIcon.contains(event.target))return;
  materialDismissClick=true;
  event.preventDefault();event.stopImmediatePropagation();
  closeMaterials();
 },true);
 document.addEventListener('click',event=>{
  if(!materialDismissClick)return;
  materialDismissClick=false;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 new MutationObserver(()=>{
  if(mobile.matches&&layout.classList.contains('phone-materials-open')&&current().length>materialOpenObjectCount)closeMaterials();
 }).observe(document.getElementById('objects'),{childList:true});


 // Pane changes retain the current zoom and browser scroll position.
 // Fitting is performed only by the explicit fit button.
})();

(function setupPhoneDisplayMenu(){
 const mobile=matchMedia('(max-width:850px)'),toolbar=document.querySelector('.board-display-toolbar'),trigger=document.createElement('button'),menu=document.createElement('div');
 trigger.type='button';trigger.className='board-grid-toggle phone-display-menu-toggle';trigger.title='表示設定';trigger.setAttribute('aria-label','表示設定');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','phoneDisplayMenu');
 trigger.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 3v4m0 5v9M12 3v10m0 5v3M19 3v4m0 5v9"/><rect x="2.5" y="7" width="5" height="5" rx="1"/><rect x="9.5" y="13" width="5" height="5" rx="1"/><rect x="16.5" y="7" width="5" height="5" rx="1"/></svg>';
 toolbar.insertBefore(trigger,document.getElementById('gridToggle'));
 menu.id='phoneDisplayMenu';menu.className='phone-display-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','表示設定');document.body.append(menu);
 const items=[['gridToggle','グリッドを表示'],['fieldToggle','フィールドを表示'],['clipToggle','フィールド外を表示']].map(([id,label])=>{
  const source=document.getElementById(id),item=document.createElement('button');item.type='button';item.setAttribute('role','menuitemcheckbox');item.innerHTML='<span>'+label+'</span><span class="phone-display-state" aria-hidden="true"></span>';
  const sync=()=>{const pressed=source.getAttribute('aria-pressed')==='true',checked=id==='clipToggle'?!pressed:pressed;item.setAttribute('aria-checked',String(checked));item.lastElementChild.textContent=checked?'オン':'オフ';item.disabled=source.disabled};
  item.onclick=()=>{source.click();sync();item.focus({preventScroll:true})};new MutationObserver(sync).observe(source,{attributes:true,attributeFilter:['aria-pressed','disabled']});sync();menu.append(item);return item;
 });
 const separator=document.createElement('div');separator.className='phone-display-menu-separator';separator.setAttribute('role','separator');menu.append(separator);
 const closeButton=document.createElement('button');closeButton.type='button';closeButton.setAttribute('role','menuitem');closeButton.textContent='閉じる';closeButton.onclick=()=>close(true);menu.append(closeButton);items.push(closeButton);
 function close(focus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true})}
 function open(){if(!mobile.matches)return;document.querySelector('#boardZoomMenu:not([hidden])')&&document.getElementById('resetBoardZoom').click();menu.hidden=false;trigger.setAttribute('aria-expanded','true');const rect=trigger.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+4,innerHeight-menu.offsetHeight-8))+'px';items[0].focus({preventScroll:true})}
 trigger.onclick=()=>menu.hidden?open():close();
 window.addEventListener('keydown',event=>{if(!menu.hidden&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true)}},true);
 trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();open()}});
 menu.addEventListener('keydown',event=>{const index=items.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();close(true)}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();items[(index+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(event.key==='Home'||event.key==='End'){event.preventDefault();items[event.key==='Home'?0:items.length-1].focus()}else if(event.key==='Tab')close()});
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!trigger.contains(event.target))close()},true);
 window.addEventListener('resize',()=>close());window.addEventListener('scroll',event=>{if(!menu.contains(event.target))close()},true);mobile.addEventListener('change',()=>close());
})();

;
// ===== js/mobile/mobile-object-panels.js =====
(function syncPhoneObjectPanels(){
 const mobile=matchMedia('(max-width:850px)'),layers=document.getElementById('toggleLayers'),objects=document.getElementById('toggleInspector');let syncing=false;
 function sync(source,target){if(!mobile.matches||syncing)return;if(source.getAttribute('aria-expanded')===target.getAttribute('aria-expanded'))return;syncing=true;try{target.click()}finally{syncing=false}}
 layers.addEventListener('click',()=>sync(layers,objects));objects.addEventListener('click',()=>sync(objects,layers));
 mobile.addEventListener('change',()=>sync(layers,objects));sync(layers,objects);
})();

;
// ===== js/mobile/mobile-delete-dialog.js =====
let pendingPhoneLayerDeletion=null;
const phoneLayerDeleteDialog=document.createElement('dialog');
phoneLayerDeleteDialog.className='confirm-dialog';phoneLayerDeleteDialog.id='phoneLayerDeleteDialog';phoneLayerDeleteDialog.setAttribute('aria-labelledby','phoneLayerDeleteMessage');
phoneLayerDeleteDialog.innerHTML='<p id="phoneLayerDeleteMessage"></p><div class="confirm-actions"><button type="button" class="btn" id="phoneLayerDeleteCancel" autofocus>キャンセル</button><button type="button" class="btn primary" id="phoneLayerDeleteConfirm">削除</button></div>';
document.body.append(phoneLayerDeleteDialog);
function confirmPhoneLayerDeletion(id,individual=false){
 const object=current().find(item=>item.id===id);if(!object||object.locked)return;
 pendingPhoneLayerDeletion={id,individual,board:data,page:current()};
 phoneLayerDeleteDialog.querySelector('p').textContent='「'+(object.objectGroupId&&!individual?objectGroupName(current().filter(o=>o.objectGroupId===object.objectGroupId))+'（'+objectGroupIds(id).length+'個）':objectTitle(object))+'」を削除しますか？';
 if(!phoneLayerDeleteDialog.open)phoneLayerDeleteDialog.showModal();
}
document.getElementById('phoneLayerDeleteCancel').onclick=()=>{pendingPhoneLayerDeletion=null;phoneLayerDeleteDialog.close()};
document.getElementById('phoneLayerDeleteConfirm').onclick=()=>{
 const pending=pendingPhoneLayerDeletion;pendingPhoneLayerDeletion=null;phoneLayerDeleteDialog.close();
 if(pending&&data===pending.board&&current()===pending.page)removeObject(pending.id,pending.individual);
};
phoneLayerDeleteDialog.addEventListener('close',()=>{pendingPhoneLayerDeletion=null});

;
// ===== js/mobile/mobile-content-panel.js =====
(function phoneContentPopup(){
 const mobile=matchMedia('(max-width:850px)'),layout=document.querySelector('.layout'),panel=layout.querySelector('.battle'),canvas=layout.querySelector('.right');
 const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)'),originalInert=canvas.inert;
 const viewport=document.getElementById('boardZoomSpace').parentElement,anchor=document.createComment('phone preview canvas home');viewport.before(anchor);
 const preview=document.createElement('div');preview.className='phone-content-preview';preview.hidden=true;preview.setAttribute('aria-label','キャンバスプレビュー');document.querySelector('.content-select-row').before(preview);
 const originalViewportInert=viewport.inert;
 const originalOpacity=viewport.style.getPropertyValue('opacity'),originalOpacityPriority=viewport.style.getPropertyPriority('opacity');
 let savedPosition=null,previewFrame=null,mountFrame=null;
 function restoreOpacity(){if(originalOpacity)viewport.style.setProperty('opacity',originalOpacity,originalOpacityPriority);else viewport.style.removeProperty('opacity')}
 function capturePosition(){const ancestors=[];for(let node=viewport.parentElement;node;node=node.parentElement)ancestors.push({node,left:node.scrollLeft,top:node.scrollTop});return {left:viewport.scrollLeft,top:viewport.scrollTop,ancestors}}
 function restorePosition(position){if(viewport.parentElement===preview)return;for(const item of position.ancestors){item.node.scrollLeft=item.left;item.node.scrollTop=item.top}viewport.scrollLeft=position.left;viewport.scrollTop=position.top}
 for(const button of document.querySelectorAll('.phone-content-icon,.phone-nav [data-pane="content"]')){const open=button.onclick;button.onclick=function(event){if(mobile.matches&&!layout.classList.contains('phone-content-open'))savedPosition=capturePosition();return open?.call(this,event)}}
 function fitPreview(){
  previewFrame=null;if(preview.hidden||viewport.parentElement!==preview)return;
  const comparison=document.querySelector('.phase-comparison-grid'),width=comparison?comparison.offsetWidth:640,height=comparison?comparison.offsetHeight:640;
  const scale=String(Math.max(0.01,Math.min(Math.max(0,viewport.clientWidth-8)/width,Math.max(0,viewport.clientHeight-8)/height)));
  // Only the surface consumes this non-inherited property. Updating it on the
  // whole preview used to invalidate styles for every object and SVG child.
  for(const surface of document.getElementById('boardZoomSpace').children)if(surface.matches('.stage,.phase-comparison-grid,.phase-group-overview')&&surface.style.getPropertyValue('--phone-preview-scale')!==scale)surface.style.setProperty('--phone-preview-scale',scale);
  if(viewport.scrollLeft)viewport.scrollLeft=0;if(viewport.scrollTop)viewport.scrollTop=0;
  restoreOpacity();preview.removeAttribute('aria-busy');
 }
 function schedulePreview(){if(preview.hidden||viewport.parentElement!==preview||closing||previewFrame!==null)return;previewFrame=requestAnimationFrame(fitPreview)}
 function syncPreview(open){
  preview.hidden=!open;viewport.inert=open||originalViewportInert;
  if(open){if(viewport.parentElement!==preview){savedPosition??=capturePosition();viewport.style.opacity='0';preview.append(viewport)}schedulePreview()}
  else{
   cancelAnimationFrame(previewFrame);previewFrame=null;preview.removeAttribute('aria-busy');restoreOpacity();
   if(viewport.parentElement===preview)anchor.after(viewport);
   const position=savedPosition;savedPosition=null;if(position){restorePosition(position);requestAnimationFrame(()=>{restorePosition(position);requestAnimationFrame(()=>restorePosition(position))})}
  }
 }
 new ResizeObserver(schedulePreview).observe(preview);
 const renderBeforeContentPreview=render;render=function(){renderBeforeContentPreview();if(!preview.hidden)schedulePreview()};
 const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='phone-content-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-label','コンテンツパネルを閉じる');layout.append(backdrop);
 let visible=false,closing=false,panelAnimation=null,backdropAnimation=null,closeAnimation=null;
 const duration=(closing=false)=>reducedMotion.matches?0:closing?120:200;
 // The phone pane is width:calc(100% - 28px). CSS units avoid a forced layout
 // read of panel.offsetWidth immediately after moving the canvas subtree.
 const offscreen='translateX(calc(28px - 100vw))';
 function cancelAnimations(){cancelAnimationFrame(mountFrame);mountFrame=null;panelAnimation?.cancel();backdropAnimation?.cancel();closeAnimation?.cancel();panelAnimation=backdropAnimation=closeAnimation=null}
 function sync(){
  const open=mobile.matches&&layout.classList.contains('phone-content-open');
  if(open===visible)return;
  cancelAnimations();visible=open;closing=false;canvas.inert=open||originalInert;backdrop.hidden=!open;
  closeButton.style.removeProperty('visibility');
  if(open){preview.hidden=false;preview.setAttribute('aria-busy','true');viewport.inert=true}else syncPreview(false);
  if(open){
   panelAnimation=panel.animate([{transform:'translateX(-100%)'},{transform:'translateX(0)'}],{duration:duration(),easing:'ease-out'});
   closeAnimation=closeButton.animate([{transform:offscreen},{transform:'translateX(0)'}],{duration:duration(),easing:'ease-out'});
   backdropAnimation=backdrop.animate([{opacity:0},{opacity:1}],{duration:duration(),easing:'ease-out'});
   // Hold the pane offscreen until the live preview has its final size.
   // fitPreview is queued first, so start the slide in the same prepared frame.
   const opening=panelAnimation;
   panelAnimation.pause();closeAnimation.pause();backdropAnimation.pause();
   syncPreview(true);
   mountFrame=requestAnimationFrame(()=>{
    mountFrame=null;
    if(!visible||closing||!mobile.matches||panelAnimation!==opening)return;
    panelAnimation.play();closeAnimation.play();backdropAnimation.play();
   });
  }
 }
 function close(hideCloseButton=false){
  if(closing||!layout.classList.contains('phone-content-open'))return;
  cancelAnimations();closing=true;
  cancelAnimationFrame(previewFrame);previewFrame=null;
  // Stop navigation geometry updates while the pane is sliding away.
  preview.setAttribute('aria-busy','true');
  if(hideCloseButton===true)closeButton.style.visibility='hidden';
  panelAnimation=panel.animate([{transform:'translateX(0)'},{transform:'translateX(-100%)'}],{duration:duration(true),easing:'ease-out',fill:'forwards'});
  closeAnimation=closeButton.animate([{transform:'translateX(0)'},{transform:offscreen}],{duration:duration(true),easing:'ease-out',fill:'forwards'});
  backdropAnimation=backdrop.animate([{opacity:1},{opacity:0}],{duration:duration(true),easing:'ease-out',fill:'forwards'});
  const ending=panelAnimation;
  ending.finished.then(()=>{
   if(panelAnimation!==ending||!closing)return;
   layout.classList.remove('phone-content-open');sync();closeButton.style.removeProperty('visibility');
   if(mobile.matches){for(const button of document.querySelectorAll('.phone-nav button'))button.setAttribute('aria-pressed',String(button.dataset.pane==='canvas'));document.querySelector('.phone-content-icon')?.focus({preventScroll:true})}
  }).catch(()=>{});
 }
 backdrop.onclick=close;
 const closeButton=document.createElement('button');closeButton.type='button';closeButton.className='phone-content-close';closeButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>';closeButton.setAttribute('aria-label','コンテンツパネルを閉じる');closeButton.title='コンテンツパネルを閉じる';closeButton.onclick=()=>close(true);layout.append(closeButton);
 document.addEventListener('keydown',event=>{
  if(!mobile.matches||!layout.classList.contains('phone-content-open')||event.target.closest?.('#phoneIconHelp'))return;
  if(event.key==='Escape'){event.preventDefault();close();return}
  if(event.target.closest('input,select,textarea,[contenteditable="true"],dialog'))return;
  const key=event.key.toLowerCase(),shortcut=(event.ctrlKey||event.metaKey)&&['c','v','x','z','y'].includes(key),objectAction=['delete','backspace'].includes(key)||key.startsWith('arrow')&&!event.target.closest('#pages,button,[role="separator"]');
  if(shortcut||objectAction){event.preventDefault();event.stopImmediatePropagation()}
 },true);
 new MutationObserver(sync).observe(layout,{attributes:true,attributeFilter:['class']});
 mobile.addEventListener('change',()=>{layout.classList.remove('phone-content-open');sync()});sync();
 document.addEventListener('pointerdown',event=>{if(!mobile.matches||!visible||event.target.closest('#undo,#redo,.battle,.phone-phase-navigation,.phone-content-backdrop,.phone-content-close,.color-popover,.native-color-picker,.phone-nav,.phone-content-icon,.phase-content-copy-menu,.phase-item-menu,.content-item-menu,.phase-group-menu,.phase-copy-menu,#phoneIconHelp,#pcTutorial'))return;close()},true);
})();

;
// ===== js/mobile/mobile-icon-help.js =====
(function setupPhoneIconHelp(){
 const mobile=matchMedia('(max-width:850px)'),toolbar=document.querySelector('.board-display-toolbar'),button=document.createElement('button');button.type='button';button.className='phone-icon-help-toggle';button.textContent='？';button.setAttribute('aria-label','アイコンの説明');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','phoneIconHelp');button.setAttribute('aria-expanded','false');toolbar.parentElement.append(button);
 const panel=document.createElement('dialog');panel.id='phoneIconHelp';panel.className='phone-icon-help';panel.setAttribute('aria-labelledby','phoneIconHelpTitle');panel.innerHTML='<div class="phone-icon-help-heading"><h2 id="phoneIconHelpTitle">アイコンの説明</h2><button type="button" class="btn">閉じる</button></div><div class="phone-icon-help-list"></div>';document.body.append(panel);
 const entries=[
 ['#editModeToggle','編集／閲覧を切り替える（鉛筆・薄い青背景＝編集中、鍵・白背景＝閲覧中）。並列表示中に押すと、並列表示を解除して編集に戻る。PNG生成は画像マークになり、押すと入る前の編集／閲覧モードに戻る'],
 ['help-png-mode','山と太陽の画像マーク：PNG生成。押すと入る前の編集／閲覧モードに戻る。見出しの下にも「PNG生成」と表示する'],
 ['#pngPropertiesToggle','PNGプロパティ見出しの＋／−：PNG保存用の設定欄を開閉する。「出力倍率」の1倍／2倍は保存画像の解像度。上部の表示倍率とは別で、画像サイズを確認して「PNGを保存」を押す'],
 ['.phone-menu-toggle','インポート・エクスポート・ヘルプなどのメニューを開閉'],
 ['.phone-content-icon','コンテンツペインを開く。プレビュー下の左右の矢印で、ペインを開いたままフェーズを切り替えられる。フェーズリストを閉じても使える。コンテンツのタイトル自体は開閉ボタンではない。プレビュー・フェーズリスト・設定／ノートを使う。コンテンツ一覧の名前を長押しすると、名前変更・前へ移動・後ろへ移動・削除のメニューを開く。左端の番号をドラッグすると並べ替え。閲覧中とPNG生成は開閉ボタンを表示せず、キャンバス下のコンテンツ・フェーズリストを使う。PNG生成はさらにPNGプロパティを表示する'],
 ['.phone-content-close','コンテンツペイン外側の矢印：ペインを閉じてキャンバスへ戻る'],
 ['.phone-material-pin','配置するオブジェクトの一覧を開閉'],
 ['#addPage','空のフェーズを末尾に追加して名称を入力。入力中の戻るボタン（↶）で追加を取り消す'],
 ['#addPhaseGroup','フェーズをまとめるグループを追加します。'],
 ['#copyPage','現在のフェーズのコピー先を選びます。グループを選択中は、所属フェーズもまとめてコピーします。'],
 ['#copyPageToContent','現在のフェーズ全体を、別コンテンツの末尾にコピーします。元のフェーズは残ります。'],
 ['#phonePhaseSwitch-toggle','フェーズプロパティとフェーズノートを切り替えます。'],
 ['#phonePhaseSectionToggle','フェーズ設定・ノートの共通枠を開閉します。'],
 ['#phasePropertyResize','コンテンツペイン：押したまま上下へ動かしてリストと設定／ノートの高さを調整。両方展開中だけ表示し、押している間は青くなる'],
 ['#toggleBattlePages','フェーズリストを開閉する。フェーズ名をタップして切り替え、項目を長押しして名前変更・コピー・別コンテンツへのコピー・前後移動・削除のメニューを開く'],
 ['.phase-select-check','フェーズの並列表示用チェック。2個以上で並べて閲覧し、編集不可になる。1個に戻すと元のモードに戻る'],
 ['.phone-phase-navigation>button:first-child','キャンバス下の左矢印：前のフェーズへ。グループ選択中はグループ直前のフェーズへ移動する。コンテンツペイン内でも使え、ペインは開いたまま。移動先がない場合は非表示'],
 ['.phone-phase-navigation>button:last-child','キャンバス下の右矢印：次のフェーズへ。グループ選択中はグループ内の最初のフェーズへ移動する。フェーズリストを閉じたままでも使える。移動先がない場合は非表示'],
 ['help-name-edit','コンテンツ名・フェーズ名を変更します。'],
 ['help-item-delete','その項目を削除します。コンテンツ・フェーズを削除すると、中のオブジェクトも削除されます。'],
 ['help-name-confirm','入力した名前を確定します。'],
 ['help-add-cancel','追加を取り消し、追加前の状態に戻します。'],
 ['help-object-selection','オブジェクトリストのチェック：複数選択・解除。名前をタップすると単独選択、長押しすると操作メニュー。左端の番号をドラッグすると並べ替え。フェーズリストも名前の長押しでメニュー、番号のドラッグで並べ替えができる'],
 ['help-object-visibility','選択したオブジェクトの表示・非表示を切り替えます。'],
 ['help-object-lock','選択したオブジェクトをロック・解除します。ロック中は移動・削除できません。'],
 ['help-number-step','対象のプロパティの数値を減らす・増やす操作です。'],
 ['help-disclosure','見出しの＋／−：一覧や欄を開閉する。閲覧中のフェーズノート、PNG生成のPNGプロパティも見出しをタップして開閉できる'],
 ['#undo','このコンテンツの操作を1回分元に戻します。別のコンテンツには影響しません。'],
 ['#redo','このコンテンツで元に戻した操作を1回分やり直します。'],
 ['#clearBtn','現在のフェーズのオブジェクトをすべて削除します。確認画面で対象を確認してください。'],
 ['.phone-display-menu-toggle','グリッド・フィールド・フィールド外の表示設定を開きます。保存するPNG画像の設定とは別です。'],
 ['#fitBoardZoom','キャンバス全体、または並べて表示中の全フェーズが収まる倍率にする。キャンバスの空白部分の長押しでも、全体表示・中央表示・貼り付け・全選択のメニューを開ける（閲覧・並列表示中は貼り付けと全選択が無効）'],
 ['#zoomOut','倍率を5ポイント下げる（例：100% → 95%）'],
 ['#resetBoardZoom','200%、150%、100%、75%、50%、25%から表示倍率を選ぶ'],
 ['#zoomIn','倍率を5ポイント上げる（例：100% → 105%）']
 ];
 const defaultSymbols={"#editModeToggle":{"svg":"<svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4Z\"/></svg>","text":"編集","color":"#000","background":"#eaf3ff"},".phone-menu-toggle":{"svg":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"><path d=\"M4 6h16M4 12h16M4 18h16\"/></svg>","text":"","color":"#fff","background":"var(--accent)"},".phone-content-icon":{"svg":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 5l7 7-7 7\"/></svg>","text":"","color":"#fff","background":"var(--accent)"},".phone-material-pin":{"svg":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"6.5\" cy=\"6.5\" r=\"3.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><path d=\"m6.5 13 4.5 8H2z\"/><path d=\"m17.5 13 4.5 4.5-4.5 4.5-4.5-4.5z\"/></svg>","text":"","color":"#fff","background":"var(--accent)"},"#addPage":{"svg":"","text":"＋","color":"#000","background":"#fff"},"#copyPage":{"svg":"","text":"⧉","color":"#000","background":"#fff"},".phone-phase-navigation>button:first-child":{"svg":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M15 5l-7 7 7 7\"/></svg>","text":"","color":"#fff","background":"var(--accent)"},".phone-phase-navigation>button:last-child":{"svg":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9 5l7 7-7 7\"/></svg>","text":"","color":"#fff","background":"var(--accent)"},"#undo":{"svg":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9 5L4 10l5 5M4 10h10a6 6 0 0 1 6 6v3\"/></svg>","text":"","color":"#000","background":"#fff"},"#redo":{"svg":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M15 5l5 5-5 5M20 10H10a6 6 0 0 0-6 6v3\"/></svg>","text":"","color":"#000","background":"#fff"},"#clearBtn":{"svg":"<svg class=\"clear-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7\"/></svg>","text":"","color":"#000","background":"#fff"},"#gridToggle":{"svg":"<svg viewBox=\"0 0 20 20\" aria-hidden=\"true\"><path d=\"M3 3h14v14H3zM8 3v14M13 3v14M3 8h14M3 13h14\"/></svg>","text":"","color":"#fff","background":"var(--accent)"},"#fieldToggle":{"svg":"<svg viewBox=\"0 0 20 20\" aria-hidden=\"true\"><path d=\"M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z\"/><circle cx=\"10\" cy=\"10\" r=\"2.2\"/></svg>","text":"","color":"#fff","background":"var(--accent)"},"#clipToggle":{"svg":"<svg viewBox=\"0 0 20 20\" aria-hidden=\"true\"><rect x=\"2\" y=\"2\" width=\"12\" height=\"12\" rx=\"1\"/><path d=\"M9 8h8v9H8v-3M8 8v6M8 8h6\"/><path d=\"M14 8h3v9H8v-3\" stroke-dasharray=\"2 2\"/></svg>","text":"","color":"#fff","background":"var(--accent)"},"#fitBoardZoom":{"svg":"<svg viewBox=\"0 0 20 20\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 3H3v4M13 3h4v4M17 13v4h-4M7 17H3v-4\"/></svg>","text":"","color":"#fff","background":"var(--accent)"},"#zoomOut":{"svg":"","text":"−","color":"#fff","background":"var(--accent)"},"#resetBoardZoom":{"svg":"","text":"100%","color":"#fff","background":"var(--accent)"},"#zoomIn":{"svg":"","text":"＋","color":"#fff","background":"var(--accent)"}};

 Object.assign(defaultSymbols,{
  'help-png-mode':{svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>',color:'#000',background:'#fff'},
  '#pngPropertiesToggle':{text:'＋ / −',color:'#33445f',background:'#eef2f7'},
  '.phone-display-menu-toggle':{svg:toolbar.querySelector('.phone-display-menu-toggle svg').outerHTML,color:'#000',background:'#fff'},
  '#addPhaseGroup':{svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V4h7l2 3h9v13H3V7Z M9 13h6M12 10v6"/></svg>',color:'#000',background:'#fff'},
  '#copyPageToContent':{svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H4v16h13v-6M8 8v8h5M12 3h9v9M21 3l-9 9"/></svg>',color:'#000',background:'#fff'},
  '.phone-content-close':{svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',color:'#33445f',background:'#eef2f7'},
  'help-name-edit':{svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4Z"/></svg>',color:'#000',background:'#fff'},
  'help-item-delete':{text:'×',color:'#000',background:'#fff'},
  'help-name-confirm':{text:'✓',color:'#000',background:'#fff'},
  'help-add-cancel':{text:'↶',color:'#000',background:'#fff'},
  'help-object-selection':{text:'☑',color:'#33445f',background:'#fff'},
  'help-object-visibility':{svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',color:'#33445f',background:'#fff'},
  'help-object-lock':{svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>',color:'#33445f',background:'#fff'},
  'help-number-step':{text:'− / ＋',color:'#33445f',background:'#fff'},
  'help-disclosure':{text:'＋ / −',color:'#33445f',background:'#eef2f7'},
  '#phonePhaseSwitch-toggle':{svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-4-4M20 16H4l4 4"/></svg>',color:'#33445f',background:'#eef2f7'},
  '#phonePhaseSectionToggle':{text:'＋ / −',color:'#33445f',background:'#eef2f7'},
  '#phasePropertyResize':{text:'━',color:'#999',background:'#fff'},
  '#toggleBattlePages':{text:'＋ / −',color:'#33445f',background:'#eef2f7'},
  '.phase-select-check':{text:'☑',color:'#33445f',background:'#fff'}
 });
 for(const key of ['.phone-phase-navigation>button:first-child','.phone-phase-navigation>button:last-child'])Object.assign(defaultSymbols[key],{color:'#000',background:'#fff'});
 for(const key of ['#phonePhaseSectionToggle','#toggleBattlePages','help-disclosure'])defaultSymbols[key].svg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7h6M5 4v6M14 3l-4 18M16 17h6"/></svg>';
 defaultSymbols['help-number-step'].svg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7h6M14 3l-4 18M16 17h6M19 14v6"/></svg>';
 const contentButton=button.cloneNode(true);contentButton.classList.add('phone-content-help');contentButton.setAttribute('aria-label','コンテンツのアイコン説明');document.querySelector('.content-heading-row').append(contentButton);
 let opener=button;
 const visible=node=>!!node&&node.getClientRects().length>0&&getComputedStyle(node).visibility!=='hidden';
 function close(){if(panel.open)panel.close();for(const node of document.querySelectorAll('.phone-icon-help-toggle'))if(node.getAttribute('aria-expanded')!=='false')node.setAttribute('aria-expanded','false')}
 function openHelp(source=button){
  if(panel.open){close();return}opener=source;
  const png=!!window.Bolxiv?.pngPreview?.active,content=source===contentButton,mode=png?'PNG生成':boardReadOnly?'閲覧':'編集';
  panel.querySelector('h2').textContent='アイコン説明 · '+mode+' · '+(content?'コンテンツ':'キャンバス');
  const list=panel.querySelector('.phone-icon-help-list');list.replaceChildren();
  const intro=document.createElement('p');intro.className='phone-icon-help-intro';intro.textContent='現在のモード・表示中の画面で使えるボタンを表示しています。モードや画面によって、アイコンの数や説明が変わります。';list.append(intro);
  const scope=content?document.querySelector('.battle'):png?document.getElementById('pngPreview'):document.querySelector('.right');
  const find=selector=>{try{return [...scope.querySelectorAll(selector),...document.querySelectorAll(selector)].find(node=>visible(node)&&!node.disabled&&(content?node.closest('.battle,.phone-content-close,.phone-phase-navigation,.header-mode-status'):!node.closest('.battle')))}catch{return null}};
  const contextual=[];
  for(const [selector,original] of entries){
   if(['#resetBoardZoom','#phasePropertyResize','.phase-select-check','help-object-selection'].includes(selector))continue;
   let description=original,node=null;
   if(selector.startsWith('help-')){
    if(selector==='help-png-mode'){if(!png||content)continue;node=document.getElementById('editModeToggle');description='画像マーク：PNG生成を終了し、入る前の編集／閲覧モードに戻ります。'}
    else if(selector==='help-disclosure'){continue}
    else if(selector==='help-number-step'){if(!content||!visible(document.querySelector('.battle .phone-number-step-buttons')))continue}
    else if(selector.startsWith('help-object-')){if(content||png||boardReadOnly||!visible(document.getElementById('objectList')))continue}
    else{if(!content||png||boardReadOnly||!visible(document.querySelector('.battle .page-tab-input,.battle .content-option-input')))continue}
   }else{
    if(selector==='#editModeToggle'){if(content||png)continue;description=boardReadOnly?'鍵マーク：閲覧中です。押すと編集モードに切り替えます。':'鉛筆マーク：編集中です。押すと閲覧モードに切り替えます。'}
    if(selector==='#pngPropertiesToggle')continue;
    if(selector==='.phone-content-icon'&&content)continue;
    if(selector==='.phone-content-close'&&!content)continue;
    if(selector==='.phone-menu-toggle'&&content)continue;
    if(selector==='#toggleBattlePages'&&!content)continue;
    const mapped=png&&['#fitBoardZoom','#zoomOut','#resetBoardZoom','#zoomIn'].includes(selector)?'#png-'+selector.slice(1):selector;
    node=find(mapped);if(!node)continue;
    if(content&&!node.closest('.battle,.phone-content-close,.phone-phase-navigation,.header-mode-status'))continue;
    if(selector==='.phone-content-icon')description='コンテンツペインを開きます。フェーズリスト、フェーズプロパティ、ノートを確認・編集できます。';
    if(selector==='#toggleBattlePages')description='フェーズリストを開閉します。フェーズ名をタップすると表示するフェーズを切り替えます。';
    if(selector==='.phase-select-check'&&(png||boardReadOnly))description='フェーズをチェックして並べて表示します。';
    if(selector==='#fitBoardZoom')description='キャンバス全体が収まる表示倍率にします。保存画像の出力倍率とは別です。';
    if(selector.startsWith('.phone-phase-navigation'))description=selector.includes('first-child')?'前のフェーズへ移動します。表示中のタブは維持します。':'次のフェーズへ移動します。表示中のタブは維持します。';
   }
   contextual.push({selector,description,node});
  }
  for(const [selector,description] of [
   ['.phone-reader-switch',png?'フェーズリストとPNGプロパティを切り替えます。出力倍率や表示中のフェーズは維持します。':'フェーズリストとフェーズノートを切り替えます。表示中のフェーズは維持します。'],
   ['.phone-reader-collapse','フェーズリスト／'+(png?'PNGプロパティ':'ノート')+'の共通枠を開閉します。'],
   ['.phone-object-tabs button:not(.phone-object-collapse)','オブジェクトリストとオブジェクトプロパティを切り替えます。'],
   ['.phone-object-collapse','オブジェクトリスト／プロパティの共通枠を開閉します。'],
  ]){const node=find(selector);if(node)contextual.push({selector,description,node})}
  const helpTitles={
   '#editModeToggle':'編集・閲覧の切り替え','help-png-mode':'PNG生成を終了',
   '.phone-menu-toggle':'操作メニュー','.phone-content-icon':'コンテンツペインを開く','.phone-content-close':'コンテンツペインを閉じる','.phone-material-pin':'マテリアルを開閉',
   '#addPage':'フェーズを追加','#addPhaseGroup':'フェーズグループを追加','#copyPage':'フェーズをコピー','#copyPageToContent':'別コンテンツへコピー',
   '#phonePhaseSwitch-toggle':'フェーズプロパティ・ノートの切り替え','#phonePhaseSectionToggle':'フェーズ設定・ノート欄を開閉','#toggleBattlePages':'フェーズリストを開閉',
   '.phone-phase-navigation>button:first-child':'前のフェーズへ','.phone-phase-navigation>button:last-child':'次のフェーズへ',
   'help-name-edit':'名前を変更','help-item-delete':'項目を削除','help-name-confirm':'名前を確定','help-add-cancel':'追加を取り消す',
   'help-object-visibility':'オブジェクトの表示・非表示','help-object-lock':'オブジェクトをロック','help-number-step':'プロパティの数値を調整',
   '#undo':'元に戻す','#redo':'やり直す','#clearBtn':'フェーズ内のオブジェクトを全削除',
   '.phone-display-menu-toggle':'キャンバスの表示設定','#fitBoardZoom':'キャンバス全体を表示','#zoomOut':'キャンバスを縮小','#zoomIn':'キャンバスを拡大',
   '.phone-reader-switch':png?'フェーズリスト・PNGプロパティの切り替え':'フェーズリスト・ノートの切り替え',
   '.phone-reader-collapse':png?'フェーズリスト・PNGプロパティ欄を開閉':'フェーズリスト・ノート欄を開閉',
   '.phone-object-tabs button:not(.phone-object-collapse)':'オブジェクトリスト・プロパティの切り替え','.phone-object-collapse':'オブジェクト欄を開閉'
  };
  // Follow the same top-to-bottom, left-to-right order as the current screen.
  const anchorFor=entry=>entry.node||find(entry.selector==='help-object-visibility'?'#visibleInput':entry.selector==='help-object-lock'?'#editableInput':entry.selector==='help-number-step'?'.phone-number-step-buttons':'.page-tab-input,.content-option-input');
  const ordered=contextual.map((entry,index)=>{
   const anchor=anchorFor(entry),rect=anchor?.getBoundingClientRect();
   const group=anchor?.closest('.top')?0:anchor?.closest('.board-title-row,.png-preview-heading,.phone-phase-navigation,.phone-content-preview,.phone-material-pin')?1:2;
   return {...entry,group,top:rect?.top??Infinity,left:rect?.left??Infinity,index};
  }).sort((a,b)=>a.group-b.group||a.top-b.top||a.left-b.left||a.index-b.index);
  let previousGroup=-1;
  for(const {selector,description,node,group} of ordered){
   if(group!==previousGroup){const section=document.createElement('h3');section.className='phone-icon-help-section';section.textContent=['上部の操作',content?'プレビューの操作':'キャンバスの操作',content?'コンテンツの操作':'下段の操作'][group];list.append(section);previousGroup=group}
   const row=document.createElement('div');row.className='phone-icon-help-row';row.dataset.helpFor=selector;
   const symbol=document.createElement('span');symbol.className='phone-icon-help-symbol';symbol.setAttribute('aria-hidden','true');
   const fallback=defaultSymbols[selector],svg=node?.querySelector('svg');
   if(svg){symbol.append(svg.cloneNode(true));const style=getComputedStyle(node);const transparent=style.backgroundColor==='rgba(0, 0, 0, 0)';symbol.style.color=transparent&&fallback?fallback.color:style.color;symbol.style.backgroundColor=transparent&&fallback?fallback.background:style.backgroundColor}
   else if(fallback){symbol.style.color=fallback.color;symbol.style.backgroundColor=fallback.background;if(fallback.svg)symbol.innerHTML=fallback.svg;else symbol.textContent=fallback.text||'＋ / −'}
   else{symbol.textContent=selector==='#pngPreviewScale'?'1倍':selector==='#pngPreviewSave'?'保存':node?.textContent.trim().slice(0,5)||'＋ / −'}
   const text=document.createElement('div');text.className='phone-icon-help-text';
   const heading=document.createElement('h3');heading.className='phone-icon-help-item-title';heading.textContent=helpTitles[selector]||node?.getAttribute('aria-label')||'アイコンの操作';
   const detail=document.createElement('p');detail.textContent=description;text.append(heading,detail);row.append(symbol,text);list.append(row);
  }
  const guide=document.createElement('button');guide.type='button';guide.className='btn phone-icon-help-guide';guide.textContent='詳しい操作ガイドを開く';guide.onclick=()=>{close();operationGuide.querySelector('.operation-guide-body').scrollTop=0;operationGuide.showModal()};list.append(guide);
  panel.style.top='max(12px, 8dvh)';panel.style.maxHeight='calc(84dvh - 12px)';panel.showModal();list.scrollTop=0;source.setAttribute('aria-expanded','true');
 }
 const helpSeparator=document.createElement('span');helpSeparator.className='phone-help-separator';helpSeparator.setAttribute('aria-hidden','true');
 function placeCanvasHelp(){if(mobile.matches)toolbar.append(helpSeparator,button);else{helpSeparator.remove();toolbar.parentElement.append(button)}}
 mobile.addEventListener('change',placeCanvasHelp);placeCanvasHelp();
 button.onclick=()=>openHelp(button);contentButton.onclick=()=>openHelp(contentButton);
 window.Bolxiv.iconHelp={open:openHelp,close};
 panel.querySelector('button').onclick=()=>{close();opener?.focus({preventScroll:true})};panel.addEventListener('cancel',close);panel.addEventListener('close',close);
 panel.addEventListener('pointerdown',event=>{if(event.target!==panel)return;const rect=panel.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){event.preventDefault();close()}});
 mobile.addEventListener('change',close);})();

;
// ===== js/mobile/mobile-menu.js =====
(function setupPhoneMenu(){
 const mobile=matchMedia('(max-width:850px)'),header=document.querySelector('.top'),actions=header.querySelector('.actions');
 actions.id='headerActions';const button=document.createElement('button');button.type='button';button.className='phone-menu-toggle';button.title='操作メニューを開閉';button.setAttribute('aria-label','操作メニュー');button.setAttribute('aria-controls',actions.id);button.setAttribute('aria-expanded','false');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span class="header-menu-label">メニュー</span>';header.insertBefore(button,actions);
 function close(){header.classList.remove('phone-menu-open');button.setAttribute('aria-expanded','false')}
 button.onclick=()=>{const open=header.classList.toggle('phone-menu-open');button.setAttribute('aria-expanded',String(open))};
 actions.addEventListener('click',event=>{const action=event.target.closest('button');if(action&&action.id!=='exportBtn'&&action.id!=='importBtn'&&action.id!=='operationGuideBtn')close()});for(const id of ['jsonExportMenu','jsonImportMenu','helpMenu'])document.getElementById(id).addEventListener('click',event=>{if(event.target.closest('button'))close()});
 document.addEventListener('pointerdown',event=>{if(!header.contains(event.target)&&!event.target.closest('#jsonExportMenu,#jsonImportMenu,#helpMenu'))close()},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('phone-menu-open')){close();button.focus()}});
 mobile.addEventListener('change',close);
})();

(function setupPhoneSaveSubtitle(){
 const mobile=matchMedia('(max-width:850px)'),status=document.getElementById('saved'),home=status.parentElement,brand=document.querySelector('.top>.brand');
 let timer,lastText=status.textContent.trim(),savedUntil=0;
 function update(){
  clearTimeout(timer);
  const text=status.textContent.trim();
  if(text!==lastText){savedUntil=text==='保存済み'?Date.now()+3000:0;lastText=text}
  if(!mobile.matches){home.append(status);brand.classList.remove('phone-save-status-visible');return}
  brand.append(status);
  const remaining=savedUntil-Date.now();
  brand.classList.toggle('phone-save-status-visible',text!=='保存済み'||remaining>0);
  if(text==='保存済み'&&remaining>0)timer=setTimeout(update,remaining);
 }
 new MutationObserver(update).observe(status,{childList:true,characterData:true,subtree:true});
 mobile.addEventListener('change',update);update();
})();

;
// ===== js/mobile/mobile-hover.js =====
(function clearPhoneButtonHover(){
 const mobile=matchMedia('(max-width:850px)');
 function update(){document.documentElement.classList.toggle('phone-touch-mode',mobile.matches)}
 mobile.addEventListener('change',update);update();
 document.addEventListener('click',event=>{
  if(!mobile.matches)return;const button=event.target.closest('button');
  if(button)requestAnimationFrame(()=>{if(document.activeElement===button)button.blur()});
 });
})();

;
// ===== js/mobile/mobile-pinch-guard.js =====
(function disablePhonePinchZoom(){
 const mobile=matchMedia('(max-width:850px)');
 function preventPinch(event){if(mobile.matches&&event.touches.length>1&&event.cancelable)event.preventDefault()}
 document.addEventListener('touchstart',preventPinch,{passive:false,capture:true});
 document.addEventListener('touchmove',preventPinch,{passive:false,capture:true});
 for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,event=>{if(mobile.matches&&event.cancelable)event.preventDefault()},{passive:false,capture:true});
})();

;
// ===== js/mobile/phone-phase-navigation.js =====
(function setupPhonePhaseNavigation(){
 const mobile=matchMedia('(max-width:850px)'),layout=document.querySelector('.layout'),viewport=document.getElementById('boardZoomSpace').parentElement;
 const nav=document.createElement('div');nav.className='phone-phase-navigation';nav.setAttribute('role','group');nav.setAttribute('aria-label','フェーズ切り替え');nav.hidden=true;
 function navigationIndex(step){if(data.activePhaseGroup){const group=data.phaseGroups?.find(item=>item.id===data.activePhaseGroup),first=data.pageGroupIds?.indexOf(data.activePhaseGroup),anchor=first>=0?first:(group?.position??data.page);return step<0?anchor-1:anchor}return data.page+step}
 function button(label,path,step){const node=document.createElement('button');node.type='button';node.title=label;node.setAttribute('aria-label',label);node.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+path+'"/></svg>';node.addEventListener('pointerdown',event=>event.stopPropagation());node.onclick=()=>{const index=navigationIndex(step);if(index>=0&&index<data.pages.length&&!phaseComparisonActive()){const zoom=boardDisplayZoom;selectPhase(index,false);setBoardDisplayZoom(zoom,false,false)}};nav.appendChild(node);return node}
 const previous=button('前のフェーズ','M15 5l-7 7 7 7',-1),next=button('次のフェーズ','M9 5l7 7-7 7',1);document.body.appendChild(nav);
 function update(){const previewOpen=mobile.matches&&layout.classList.contains('phone-content-open'),previewHost=previewOpen?document.querySelector('.phone-content-preview'):null;if(previewHost&&nav.parentElement!==previewHost){nav.removeAttribute('style');previewHost.append(nav)}else if(!previewOpen&&nav.parentElement!==document.body){nav.removeAttribute('style');document.body.append(nav)}const waitingForPreview=mobile.matches&&layout.classList.contains('phone-content-open')&&document.querySelector('.phone-content-preview')?.getAttribute('aria-busy')==='true';nav.hidden=waitingForPreview||(data.pages.length<2&&!data.activePhaseGroup)||phaseComparisonActive()||(mobile.matches?((layout.dataset.phonePane!=='canvas'&&!layout.classList.contains('phone-content-open'))||layout.classList.contains('phone-materials-open')):false);previous.hidden=mobile.matches&&navigationIndex(-1)<0;next.hidden=mobile.matches&&navigationIndex(1)>=data.pages.length;previous.disabled=!mobile.matches&&data.page<=0;next.disabled=!mobile.matches&&data.page>=data.pages.length-1;if(nav.hidden)return;const previewSurface=window.Bolxiv?.pngPreview?.active?document.querySelector('.png-preview-surface'):null;if(previewOpen)return;const rect=(previewSurface||viewport).getBoundingClientRect();if(!mobile.matches){const left=Math.max(0,rect.left)+12,right=Math.min(innerWidth,rect.right)-12;nav.style.left=left+'px';nav.style.top=(Math.min(innerHeight,rect.bottom)-40)+'px';nav.style.width=Math.max(0,right-left)+'px';return}const layoutRect=layout.getBoundingClientRect(),objectButton=document.querySelector('.phone-material-pin');const left=objectButton?.getClientRects().length?objectButton.getBoundingClientRect().left:layoutRect.left+8;const reader=document.querySelector('.phone-view-content'),readerClosed=boardReadOnly&&reader&&document.getElementById('toggleBattlePages').getAttribute('aria-expanded')==='false';const position={left,top:readerClosed?reader.getBoundingClientRect().top-36:rect.bottom-30,width:Math.max(0,layoutRect.width-(left-layoutRect.left)*2)};nav.style.left=position.left+'px';nav.style.top=position.top+'px';nav.style.width=position.width+'px'}
 let navigationFrame=0;function scheduleNavigation(){if(navigationFrame)return;navigationFrame=requestAnimationFrame(()=>{navigationFrame=0;update()})}const renderBeforeNavigation=render;render=function(){renderBeforeNavigation();update();scheduleNavigation()};new ResizeObserver(scheduleNavigation).observe(viewport);new MutationObserver(records=>{if(records.some(record=>!nav.contains(record.target)))scheduleNavigation()}).observe(layout,{subtree:true,attributes:true,attributeFilter:['class','data-phone-pane','style','aria-expanded','aria-busy']});new MutationObserver(scheduleNavigation).observe(document.body,{attributes:true,attributeFilter:['class']});mobile.addEventListener('change',scheduleNavigation);window.addEventListener('resize',scheduleNavigation);window.addEventListener('scroll',scheduleNavigation,true);update();scheduleNavigation();
})();

;
// ===== js/mobile/phone-view-content.js =====
(()=>{
 const mobile=matchMedia('(max-width:850px)'),row=document.querySelector('.content-select-row'),anchor=document.createComment('content selector home');row.before(anchor);
 const phases=document.querySelector('.page-controls'),phaseAnchor=document.createComment('phase selector home');phases.before(phaseAnchor);
 const host=document.createElement('div');host.className='phone-view-content';host.setAttribute('aria-label','閲覧用コンテンツ・フェーズ選択');document.getElementById('objectLayerPanel').append(host);
 let active=false;
 const phaseToggle=document.getElementById('toggleBattlePages');let phaseMode=false,editExpanded=phaseToggle.getAttribute('aria-expanded')==='true',viewExpanded=typeof viewSettings.viewPhasesExpanded==='boolean'?viewSettings.viewPhasesExpanded:true;
 function syncPhaseMode(){if(!mobile.matches||phaseMode===boardReadOnly)return;const expanded=phaseToggle.getAttribute('aria-expanded')==='true';if(phaseMode)viewExpanded=expanded;else editExpanded=expanded;phaseMode=boardReadOnly;const target=phaseMode?viewExpanded:editExpanded;if(expanded!==target)phaseToggle.onclick({currentTarget:phaseToggle})}
 const tabs=document.createElement('div');tabs.className='phone-reader-tabs';
 const title=document.createElement('button');title.type='button';title.className='phone-reader-title';
 const change=document.createElement('button');change.type='button';change.className='phone-reader-switch';change.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-4-4M20 16H4l4 4"/></svg>';
 const collapse=document.createElement('button');collapse.type='button';collapse.className='phone-reader-collapse';
 tabs.append(title,change,collapse);host.append(tabs);
 let readerTab=viewSettings.phoneReaderTab==='memo'?'memo':'list';
 function syncReaderTabs(){
  const open=phaseToggle.getAttribute('aria-expanded')==='true';
  if(host.dataset.readerTab!==readerTab)host.dataset.readerTab=readerTab;if(host.dataset.readerExpanded!==String(open))host.dataset.readerExpanded=String(open);
  const markup=readerTab==='list'?'<strong>フェーズリスト</strong> / ノート':'フェーズリスト / <strong>ノート</strong>';
  if(title.innerHTML!==markup)title.innerHTML=markup;
  const setAttribute=(node,name,value)=>{if(node.getAttribute(name)!==value)node.setAttribute(name,value)};
  setAttribute(title,'aria-expanded',String(open));setAttribute(title,'aria-label',(readerTab==='list'?'フェーズリスト':'フェーズノート')+'を'+(open?'閉じる':'開く'));
  setAttribute(change,'aria-label',readerTab==='list'?'フェーズノートを表示':'フェーズリストを表示');
  const mark=open?'−':'＋';if(collapse.textContent!==mark)collapse.textContent=mark;setAttribute(collapse,'aria-expanded',String(open));setAttribute(collapse,'aria-label',title.getAttribute('aria-label'));
  const memo=host.querySelector('.phase-memo');
  if(active&&memo&&readerTab==='memo'&&!memo.open)memo.open=true;
 }
 collapse.onclick=()=>{phaseToggle.click();syncReaderTabs()};title.onclick=()=>collapse.click();
 change.onclick=()=>{readerTab=readerTab==='list'?'memo':'list';rememberViewSetting('phoneReaderTab',readerTab);if(phaseToggle.getAttribute('aria-expanded')!=='true')phaseToggle.click();syncReaderTabs();size()};
 const panel=document.getElementById('objectLayerPanel'),space=document.getElementById('boardZoomSpace'),viewport=space.parentElement;
 function size(){
  if(!active||window.Bolxiv?.pngPreview?.active)return;
  syncReaderTabs();
  const noteHeight=0;
  const closed=phaseToggle.getAttribute('aria-expanded')==='false',rowHeight=row.getBoundingClientRect().height,metrics=phoneReaderLayoutMetrics(panel,noteHeight,rowHeight),closedHeight=metrics.closedControlsHeight;
  if(closed){
   if(panel.style.getPropertyValue('--phone-reader-controls-height')!==closedHeight+'px')panel.style.setProperty('--phone-reader-controls-height',closedHeight+'px');
   return;
  }
  const reserved=metrics.controlsMinHeight;
  const height=metrics.canvasHeight+'px';
  if(panel.style.getPropertyValue('--phone-reader-canvas-height')!==height)panel.style.setProperty('--phone-reader-canvas-height',height);
  if(panel.style.getPropertyValue('--phone-reader-controls-height')!==reserved+'px')panel.style.setProperty('--phone-reader-controls-height',reserved+'px');
 }
 let sizeFrame=0;function scheduleSize(){if(!sizeFrame)sizeFrame=requestAnimationFrame(()=>{sizeFrame=0;size()})}
 new MutationObserver(scheduleSize).observe(document.getElementById('toggleBattlePages'),{attributes:true,attributeFilter:['aria-expanded']});
 const resize=new ResizeObserver(scheduleSize);resize.observe(panel);resize.observe(viewport);window.addEventListener('resize',scheduleSize);
 host.addEventListener('toggle',scheduleSize,true);
 new MutationObserver(records=>{if(records.some(record=>!tabs.contains(record.target)))scheduleSize()}).observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 new MutationObserver(scheduleSize).observe(space,{childList:true,attributes:true,attributeFilter:['style']});viewport.addEventListener('scroll',scheduleSize,{passive:true});
 function sync(){syncPhaseMode();const next=mobile.matches&&boardReadOnly;if(next===active)return;active=next;document.getElementById('contentOptions').hidden=true;document.getElementById('contentSelect').setAttribute('aria-expanded','false');if(active){document.querySelector('.phone-content-close')?.click();host.append(row,tabs,phases);syncReaderTabs();const note=host.querySelector('.phase-memo');if(note)host.append(note)}else{anchor.after(row);phaseAnchor.after(phases)}}
 new MutationObserver(()=>{sync();scheduleSize()}).observe(document.body,{attributes:true,attributeFilter:['class']});mobile.addEventListener('change',()=>{sync();scheduleSize()});sync();scheduleSize();
})();

;
// ===== js/canvas/board-zoom-menu.js =====
(()=>{
 const trigger=document.getElementById('resetBoardZoom'),menu=document.createElement('div');menu.id='boardZoomMenu';menu.className='board-zoom-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','表示倍率');document.body.append(menu);
 trigger.title='表示倍率を選択';trigger.setAttribute('aria-label','表示倍率を選択');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-controls',menu.id);trigger.setAttribute('aria-expanded','false');
 const items=[200,150,100,75,50,25].map(value=>{const item=document.createElement('button');item.type='button';item.setAttribute('role','menuitemradio');item.dataset.zoom=String(value);item.textContent=value+'%';item.onclick=()=>{setBoardDisplayZoom(value);close(true)};menu.append(item);return item});
 function mark(){for(const item of items)item.setAttribute('aria-checked',String(Number(item.dataset.zoom)===boardDisplayZoom))}
 function close(focus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true})}
 function open(){closeColorPopovers();closeJsonExportMenu();closeJsonImportMenu();closeHelpMenu();mark();addPhoneMenuClose(menu,()=>close(true));menu.hidden=false;trigger.setAttribute('aria-expanded','true');const rect=trigger.getBoundingClientRect(),height=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(rect.right-menu.offsetWidth,window.innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-height-8))+'px';menu.style.maxHeight=Math.max(36,window.innerHeight-16)+'px';(items.find(item=>item.getAttribute('aria-checked')==='true')||items[0]).focus({preventScroll:true})}
 trigger.onclick=()=>{if(menu.hidden)open();else close()};
 trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open();if(event.key==='ArrowUp')items.at(-1).focus()}});
 menu.addEventListener('keydown',event=>{const index=items.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();close(true)}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();items[(index+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(event.key==='Home'||event.key==='End'){event.preventDefault();items[event.key==='Home'?0:items.length-1].focus()}else if(event.key==='Tab')close()});
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!trigger.contains(event.target))close()},true);
 window.addEventListener('resize',()=>close());
 new MutationObserver(mark).observe(document.getElementById('boardZoomValue'),{childList:true,subtree:true,characterData:true});
})();

;
