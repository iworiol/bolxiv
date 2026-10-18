(()=>{
 const list=document.getElementById('objectList'),menu=document.getElementById('objectContextMenu');let gesture=null,consumeClick=false,lastTouch=0;
 function cancel(){if(!gesture)return;clearTimeout(gesture.timer);gesture.row.draggable=gesture.draggable;gesture=null}
 function openGesture(next){
  if(gesture!==next||next.opened||data!==next.board||current()!==next.phase||boardReadOnly||phaseComparisonActive()||!next.row.isConnected)return;
  next.opened=true;clearTimeout(next.timer);consumeClick=true;list.setPointerCapture(next.id);
  if(!selectedIds.includes(next.objectId)){selected=next.objectId;selectedIds=[next.objectId];renderSelectionOnly()}
  closeColorPopovers();closeJsonExportMenu();closeJsonImportMenu();closeHelpMenu();
  for(const id of ['canvasContextMenu','phaseItemMenu','phaseContentCopyMenu']){const other=document.getElementById(id);if(other)other.hidden=true}
  openObjectContextMenu(next.objectId,next.x,next.y);
 }
 list.addEventListener('pointerdown',event=>{
  if(matchMedia('(max-width:850px)').matches||event.pointerType!=='touch'||boardReadOnly||phaseComparisonActive()||event.target.closest('input,.object-toggle,.object-delete,.phone-row-actions'))return;
  const row=event.target.closest('.object-row');if(!row)return;cancel();lastTouch=Date.now();
  const next={id:event.pointerId,row,objectId:row.dataset.id,x:event.clientX,y:event.clientY,board:data,phase:current(),draggable:row.draggable};row.draggable=false;gesture=next;
  next.timer=setTimeout(()=>openGesture(next),350);
 });
 list.addEventListener('contextmenu',event=>{if((event.pointerType==='touch'||!event.pointerType&&Date.now()-lastTouch<1000)&&event.target.closest('.object-row')){event.preventDefault();event.stopImmediatePropagation();if(gesture)openGesture(gesture)}},true);
 list.addEventListener('selectstart',event=>{if(matchMedia('(max-width:850px)').matches&&event.target.closest('.object-row'))event.preventDefault()});
 document.addEventListener('pointerdown',()=>consumeClick=false,true);
 document.addEventListener('pointermove',event=>{if(gesture&&event.pointerId===gesture.id&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)cancel()},true);
 for(const name of ['pointerup','pointercancel'])document.addEventListener(name,cancel,true);
 document.addEventListener('click',event=>{if(!consumeClick)return;consumeClick=false;event.preventDefault();event.stopImmediatePropagation()},true);
 list.addEventListener('scroll',()=>{cancel();menu.hidden=true});
 for(const name of ['resize','blur'])window.addEventListener(name,()=>{cancel();menu.hidden=true});
})();
