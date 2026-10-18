(()=>{
 const list=document.getElementById('contentOptions'),menu=document.createElement('div');menu.id='contentItemMenu';menu.className='object-context-menu content-item-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','コンテンツの操作');document.body.append(menu);
 let target=null,gesture=null,consumeClick=false;
 const rows=()=>[...list.querySelectorAll('.content-options-scroll>.content-option-row')];
 function rowAt(element){if(!(element instanceof Element)||element.closest('input,.content-row-action,.content-option-add-row,.phone-row-actions'))return null;return element.closest('.content-options-scroll>.content-option-row')}
 function cancel(){if(gesture){clearTimeout(gesture.timer);gesture.row.draggable=gesture.draggable;gesture=null}}
 function close(){menu.hidden=true;target=null}
 function open(row,x,y){
  if(editingContentIndex>=0)return;const index=rows().indexOf(row);if(index<0)return;
  closeObjectContextMenu();closeColorPopovers();closeJsonExportMenu();closeJsonImportMenu();closeHelpMenu();for(const id of ['phaseItemMenu','phaseContentCopyMenu','canvasContextMenu']){const other=document.getElementById(id);if(other)other.hidden=true}
  target=contentBoards[index];menu.replaceChildren();
  const heading=document.createElement('div');heading.className='row-action-menu-title';heading.textContent=target.title||'コンテンツ'+(index+1);menu.append(heading);
  for(const [action,label] of [['rename','名前変更'],['previous','前へ移動'],['next','後ろへ移動'],['delete','削除']]){
   if(action==='previous'||action==='delete'){const separator=document.createElement('div');separator.className='context-separator';separator.setAttribute('role','separator');menu.append(separator)}
   const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=label;button.setAttribute('role','menuitem');if(action==='delete')button.className='context-delete';
   button.disabled=boardReadOnly||phaseComparisonActive()||(action==='previous'&&index===0)||(action==='next'&&index===contentBoards.length-1);
   button.onclick=()=>{if(button.disabled||boardReadOnly||phaseComparisonActive()||editingContentIndex>=0)return;const at=contentBoards.indexOf(target),row=rows()[at];close();if(at<0||!row)return;
    if(action==='rename')row.querySelector('.content-row-action:not(.content-row-delete)').click();
    else if(action==='delete')row.querySelector('.content-row-delete').click();
    else moveContentBoard(at,at+(action==='previous'?-1:1),action==='next');
   };menu.append(button);
  }
  menu.hidden=false;menu.style.maxHeight=Math.max(80,innerHeight-16)+'px';menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
 }
 list.addEventListener('open-row-actions',event=>{cancel();open(event.detail.row,event.detail.x,event.detail.y)});
 list.addEventListener('contextmenu',event=>{const row=rowAt(event.target);if(!row)return;event.preventDefault();event.stopImmediatePropagation();if(gesture){clearTimeout(gesture.timer);consumeClick=true;list.setPointerCapture(gesture.id);if(menu.hidden)open(row,gesture.x,gesture.y)}else open(row,event.clientX,event.clientY)},true);
 list.addEventListener('pointerdown',event=>{
  if(matchMedia('(max-width:850px)').matches||event.pointerType!=='touch'||event.target.closest('.content-option-index'))return;const row=rowAt(event.target);if(!row||editingContentIndex>=0)return;cancel();
  const next={id:event.pointerId,row,x:event.clientX,y:event.clientY,board:contentBoards[rows().indexOf(row)],draggable:row.draggable};gesture=next;row.draggable=false;
  next.timer=setTimeout(()=>{if(gesture!==next||!row.isConnected||!contentBoards.includes(next.board))return;consumeClick=true;list.setPointerCapture(next.id);open(row,next.x,next.y)},350);
 });
 document.addEventListener('pointerdown',event=>{consumeClick=false;if(!menu.hidden&&!menu.contains(event.target))close()},true);
 document.addEventListener('pointermove',event=>{if(gesture&&event.pointerId===gesture.id&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)cancel()},true);
 for(const name of ['pointerup','pointercancel'])document.addEventListener(name,cancel,true);
 document.addEventListener('click',event=>{if(!consumeClick)return;consumeClick=false;event.preventDefault();event.stopImmediatePropagation()},true);
 menu.addEventListener('click',event=>event.stopPropagation());list.addEventListener('dragstart',()=>{cancel();close()},true);
 list.addEventListener('keydown',event=>{if(event.key!=='ContextMenu'&&!(event.shiftKey&&event.key==='F10'))return;const row=rowAt(event.target);if(!row)return;event.preventDefault();const r=row.getBoundingClientRect();open(row,r.left,r.bottom);menu.querySelector('button:not(:disabled)')?.focus()});
 menu.addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const items=[...menu.querySelectorAll('button:not(:disabled)')];if(!items.length)return;const at=items.indexOf(document.activeElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:(at+(event.key==='ArrowDown'?1:-1)+items.length)%items.length].focus()});
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();event.stopImmediatePropagation();const row=rows()[contentBoards.indexOf(target)];close();row?.querySelector('.content-option-select')?.focus({preventScroll:true})}},true);
 window.addEventListener('scroll',event=>{if(!menu.contains(event.target)){cancel();close()}},true);for(const name of ['resize','blur'])window.addEventListener(name,()=>{cancel();close()});
 new MutationObserver(()=>{if(list.hidden){cancel();close()}}).observe(list,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(()=>{cancel();close()}).observe(document.body,{attributes:true,attributeFilter:['class']});
 const previousRender=render;render=function(){previousRender();cancel();close()};
})();
