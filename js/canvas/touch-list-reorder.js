(()=>{
 for(const [id,rowSelector,handleSelector,mime] of [['objectList','.object-row','.object-index,.phone-row-actions','application/x-tactica-layer'],['pages','.page-tab,.phase-group-heading','.page-index,.phase-group-range,.phone-row-actions,.phase-group-menu-trigger','application/x-tactica-page'],['contentOptions','.content-options-scroll>.content-option-row','.content-option-index,.phone-row-actions','application/x-tactica-content']]){
  const list=document.getElementById(id);let gesture=null,consumeClick=false,lastPress=null;
  const rows=()=>[...list.querySelectorAll(rowSelector)],scrollHost=()=>id==='contentOptions'?list.querySelector('.content-options-scroll'):list;
  function moveGhost(next,x,y){
   if(!next.ghost){
    const ghost=next.row.cloneNode(true),sources=[next.row,...next.row.querySelectorAll('*')],copies=[ghost,...ghost.querySelectorAll('*')];
    sources.forEach((source,index)=>{const copy=copies[index],style=getComputedStyle(source);for(const property of style)copy.style.setProperty(property,style.getPropertyValue(property));copy.removeAttribute('id');copy.removeAttribute('autofocus');copy.removeAttribute('draggable');copy.style.setProperty('pointer-events','none','important')});
    const bounds=next.row.getBoundingClientRect();ghost.setAttribute('aria-hidden','true');ghost.dataset.listDragGhost='true';ghost.inert=true;
    Object.assign(ghost.style,{position:'fixed',margin:'0',width:bounds.width+'px',height:bounds.height+'px',minWidth:'0',maxWidth:'calc(100vw - 16px)',opacity:'.8',zIndex:'100100',transform:'translateY(-100%)',boxShadow:'0 3px 10px #0003',transition:'none'});
    document.body.append(ghost);next.ghost=ghost;
   }
   next.ghost.style.left=(next.sourceLeft+x-next.x)+'px';
   next.ghost.style.top=Math.max(next.ghost.getBoundingClientRect().height+8,next.sourceTop+next.sourceHeight/2+y-next.y)+'px';
  }
  list.addEventListener('pointerdown',event=>{const row=event.target.closest(rowSelector);if(row)lastPress={row,x:event.clientX,y:event.clientY}},true);
  list.addEventListener('dragstart',event=>{
   if(gesture){event.preventDefault();return}
   const row=event.target.closest(rowSelector);if(!row||!event.dataTransfer)return;
   const bounds=row.getBoundingClientRect(),press=lastPress?.row===row?lastPress:{x:event.clientX,y:event.clientY};event.dataTransfer.setDragImage(row,press.x-bounds.left,bounds.height+press.y-bounds.top-bounds.height/2);
  },true);
  function clear(){if(!gesture)return;const previous=gesture;gesture=null;clearTimeout(previous.timer);previous.ghost?.remove();previous.row.draggable=previous.draggable;previous.row.classList.remove('dragging');list.classList.remove('phase-drop-at-end');for(const row of rows())row.classList.remove('drag-over','drop-before','drop-after');if(list.hasPointerCapture(previous.id))list.releasePointerCapture(previous.id)}
  list.addEventListener('pointerdown',event=>{
   if(event.pointerType!=='touch'||!event.target.closest(handleSelector)||boardReadOnly||phaseComparisonActive()||(id==='contentOptions'&&editingContentIndex>=0))return;
   clear();const row=event.target.closest(rowSelector);if(!row||event.target.closest('[data-cancel-group-addition]'))return;event.preventDefault();event.stopImmediatePropagation();
   const transfer=new DataTransfer();if(id==='pages'&&row.classList.contains('phase-group-heading'))transfer.setData('application/x-tactica-phase-group',row.dataset.groupId);else transfer.setData(mime,id==='objectList'?row.dataset.id:String(id==='pages'?[...list.querySelectorAll('.page-tab')].indexOf(row):rows().indexOf(row)));transfer.effectAllowed='move';
   gesture={id:event.pointerId,row,menuButton:event.target.closest('.phone-row-actions,.phase-group-menu-trigger'),armed:false,draggable:row.draggable,transfer,x:event.clientX,y:event.clientY,sourceLeft:row.getBoundingClientRect().left,sourceTop:row.getBoundingClientRect().top,sourceHeight:row.getBoundingClientRect().height,moved:false,target:null,board:data,phase:current()};row.draggable=false;list.setPointerCapture(event.pointerId);
   const next=gesture;next.timer=setTimeout(()=>{
    if(gesture!==next||!row.isConnected||next.board!==data||next.phase!==current()||boardReadOnly||phaseComparisonActive())return;
    next.armed=true;consumeClick=true;moveGhost(next,next.x,next.y);row.classList.add('dragging');
   },350);
  },true);
  document.addEventListener('pointermove',event=>{
   const next=gesture;if(!next||event.pointerId!==next.id)return;
   if(next.board!==data||next.phase!==current()||boardReadOnly||phaseComparisonActive()){clear();return}
   event.preventDefault();if(!next.moved&&Math.hypot(event.clientX-next.x,event.clientY-next.y)<8)return;
   if(next.menuButton&&!next.armed){consumeClick=true;clear();return}clearTimeout(next.timer);next.moved=true;consumeClick=true;moveGhost(next,event.clientX,event.clientY);next.row.classList.add('dragging');
   const scroller=scrollHost(),bounds=scroller.getBoundingClientRect();if(event.clientY<bounds.top)scroller.scrollTop-=12;else if(event.clientY>bounds.bottom)scroller.scrollTop+=12;
   const hit=document.elementFromPoint(event.clientX,event.clientY);const target=hit?.closest(id==='pages'?'.page-tab,.phase-group-heading':rowSelector)||(id==='pages'&&(hit===list||(event.clientY>=bounds.bottom-8&&event.clientY<=bounds.bottom+20&&event.clientX>=bounds.left&&event.clientX<=bounds.right))?list:null);
   for(const row of rows())row.classList.remove('drag-over','drop-before','drop-after');next.target=target&&list.contains(target)&&target!==next.row?target:null;
   if(next.target)next.target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:next.transfer,clientX:event.clientX,clientY:event.clientY}));
  },{passive:false});
  document.addEventListener('pointerup',event=>{
   const next=gesture;if(!next||event.pointerId!==next.id)return;const tapMenu=next.menuButton&&!next.armed&&!next.moved&&next.board===data&&next.phase===current();const target=next.target,valid=next.moved&&next.board===data&&next.phase===current()&&!boardReadOnly&&!phaseComparisonActive();clear();
   if(tapMenu&&next.menuButton.isConnected){event.preventDefault();consumeClick=true;next.menuButton.onclick?.(new MouseEvent('click',{cancelable:true}));return}
   if(valid&&target?.isConnected){event.preventDefault();target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:next.transfer,clientX:event.clientX,clientY:event.clientY}))}
  });
  document.addEventListener('pointercancel',event=>{if(gesture?.id===event.pointerId)clear()});
  document.addEventListener('pointerdown',()=>consumeClick=false,true);
  document.addEventListener('click',event=>{if(!consumeClick)return;consumeClick=false;event.preventDefault();event.stopImmediatePropagation()},true);
  list.addEventListener('contextmenu',event=>{if(gesture&&(event.target.closest(handleSelector)||event.target.closest('.page-tab-edit,.page-tab-x,.object-delete,.object-toggle,.content-row-action,input[type=checkbox]'))){event.preventDefault();event.stopImmediatePropagation()}},true);
  for(const name of ['resize','blur'])window.addEventListener(name,clear);
 }
})();
