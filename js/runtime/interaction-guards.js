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
  menu.style.maxHeight=Math.max(80,innerHeight-16)+'px';menu.hidden=false;
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

const readOnlyEditTargets='#importBtn,#jsonImportMenu,#fileInput,#fieldImageInput,#clearUserDataBtn,#addContent,.content-option-add,.content-row-action,.content-option-input,#addPage,#copyPage,#copyPageToContent,.page-tab-edit,.page-tab-x,.page-tab-input,#undo,#redo,#clearBtn,.left .tool,.left .icon-choice,#layoutPropertiesPanel input,#layoutPropertiesPanel select,#layoutPropertiesPanel textarea,#layoutPropertiesPanel button,#layoutPropertiesPanel .color-picker,#objectList,#inspector,#objectContextMenu,.confirm-dialog';

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
