(()=>{
 const list=document.getElementById('pages'),menu=document.createElement('div');menu.id='phaseItemMenu';menu.className='object-context-menu phase-item-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','フェーズの操作');menu.hidden=true;document.body.append(menu);
 let targetBoard=null,targetPhase=null,gesture=null,consumeClick=false;
 function close(focus=false){menu.hidden=true;if(focus&&targetBoard===data){const index=data.pages.indexOf(targetPhase);list.querySelectorAll('.page-tab')[index]?.focus()}targetBoard=null;targetPhase=null}
 function cancelGesture(){if(gesture){clearTimeout(gesture.timer);gesture.row.draggable=gesture.draggable;gesture=null}}
 function move(from,to){
  const ownGroup=data.pageGroupIds[from]||null,direction=to>from?1:-1;
  if((to<0||to>=data.pages.length)&&!ownGroup)return;
  const targetGroup=data.pageGroupIds[to]||null;
  const current=data.pages[data.page],selected=selectedPhaseIndexes.map(index=>data.pages[index]);recordHistory();
  if(ownGroup&&targetGroup!==ownGroup){data.pageGroupIds[from]=null;to=from}
  else if(!ownGroup&&targetGroup){const group=data.phaseGroups.find(item=>item.id===targetGroup);if(group?.collapsed)to=direction>0?data.pageGroupIds.lastIndexOf(targetGroup):data.pageGroupIds.indexOf(targetGroup);else data.pageGroupIds[from]=targetGroup}
  for(const key of ['pageGroupIds','pages','pageNames','pageNotes','pageColors','pageBoardShapes','pageFieldBackgroundColors','pageFieldImageIds','pageFieldImageTints','pageFieldSizes']){const [value]=data[key].splice(from,1);data[key].splice(to,0,value)}
  data.page=data.pages.indexOf(current);selectedPhaseIndexes=selected.map(page=>data.pages.indexOf(page));renderAndSave();revealMovedPhase(to);
 }
 function open(row,x,y){
  const index=[...list.querySelectorAll('.page-tab')].indexOf(row);if(index<0||row.classList.contains('renaming'))return;
  document.getElementById('phaseContentCopyMenu').hidden=true;document.getElementById('copyPageToContent').setAttribute('aria-expanded','false');
  closeObjectContextMenu();closeColorPopovers();closeJsonImportMenu();closeJsonExportMenu();closeHelpMenu();
  targetBoard=data;targetPhase=data.pages[index];menu.replaceChildren();
  const actions=[['rename','名前変更'],['copy','コピー'],['cross-copy','別コンテンツへコピー'],['previous','前へ移動'],['next','後ろへ移動'],['delete','削除']];
  for(const [action,label] of actions){
   if(action==='copy'||action==='previous'||action==='delete'){const separator=document.createElement('div');separator.className='context-separator';separator.setAttribute('role','separator');menu.append(separator)}
   const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.action=action;button.setAttribute('role','menuitem');
   button.disabled=boardReadOnly||phaseComparisonActive()||(action==='previous'&&index===0&&!data.pageGroupIds[index])||(action==='next'&&index===data.pages.length-1&&!data.pageGroupIds[index]);
   if(action==='delete')button.className='context-delete';
   button.onclick=()=>{
    if(button.disabled||boardReadOnly||phaseComparisonActive()||targetBoard!==data)return;
    const at=data.pages.indexOf(targetPhase),tab=list.querySelectorAll('.page-tab')[at];if(at<0||!tab){close();return}close();
    if(action==='rename')beginPageRename(tab);
    else if(action==='copy')copyPhaseAt(at);
    else if(action==='cross-copy')document.dispatchEvent(new CustomEvent('open-phase-copy-targets',{detail:{index:at,anchor:tab}}));
    else if(action==='previous')move(at,at-1);
    else if(action==='next')move(at,at+1);
    else tab.querySelector('.page-tab-x').click();
   };menu.append(button);
  }
  menu.style.maxHeight=Math.max(80,innerHeight-16)+'px';menu.hidden=false;
  menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
 }
 list.addEventListener('open-row-actions',event=>{cancelGesture();const index=[...list.querySelectorAll('.page-tab')].indexOf(event.detail.row);if(index<0)return;selectPhase(index);open(list.querySelectorAll('.page-tab')[index],event.detail.x,event.detail.y)});
 list.addEventListener('contextmenu',event=>{const row=event.target.closest('.page-tab');if(!row||event.target.closest('input,textarea,button'))return;event.preventDefault();event.stopPropagation();if(gesture){clearTimeout(gesture.timer);consumeClick=true;list.setPointerCapture(gesture.id);if(menu.hidden)open(row,gesture.x,gesture.y);return}open(row,event.clientX,event.clientY)});
 list.addEventListener('pointerdown',event=>{
  if(matchMedia('(max-width:850px)').matches||event.pointerType!=='touch'||event.target.closest('input,textarea,button'))return;
  const row=event.target.closest('.page-tab');if(!row)return;cancelGesture();
  const next={id:event.pointerId,row,x:event.clientX,y:event.clientY,board:data,phase:data.pages[[...list.querySelectorAll('.page-tab')].indexOf(row)],draggable:row.draggable};row.draggable=false;
  next.timer=setTimeout(()=>{if(gesture!==next||data!==next.board||!row.isConnected)return;consumeClick=true;list.setPointerCapture(next.id);open(row,next.x,next.y)},350);gesture=next;
 });
 document.addEventListener('pointerdown',event=>{consumeClick=false;if(!menu.hidden&&!menu.contains(event.target))close()},true);
 list.addEventListener('dragstart',()=>{cancelGesture();close()},true);
 document.addEventListener('pointermove',event=>{if(gesture&&event.pointerId===gesture.id&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)cancelGesture()},true);
 for(const name of ['pointerup','pointercancel'])document.addEventListener(name,cancelGesture,true);
 document.addEventListener('click',event=>{if(!consumeClick)return;consumeClick=false;event.preventDefault();event.stopImmediatePropagation()},true);
 list.addEventListener('keydown',event=>{if(event.key!=='ContextMenu'&&!(event.shiftKey&&event.key==='F10'))return;const row=event.target.closest('.page-tab');if(!row||event.target.closest('input,textarea,button'))return;event.preventDefault();const rect=row.getBoundingClientRect();open(row,rect.left,rect.bottom);menu.querySelector('button:not(:disabled)')?.focus()});
 menu.addEventListener('keydown',event=>{consumeClick=false;if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const items=[...menu.querySelectorAll('button:not(:disabled)')];if(!items.length)return;const current=items.indexOf(document.activeElement),index=event.key==='Home'?0:event.key==='End'?items.length-1:(current+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[index].focus()});
 window.addEventListener('keydown',event=>{if(!menu.hidden&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();consumeClick=false;close(true)}},true);
 window.addEventListener('scroll',event=>{if(!menu.contains(event.target)){cancelGesture();close()}},true);window.addEventListener('resize',()=>{cancelGesture();close()});window.addEventListener('blur',()=>{cancelGesture();close()});
 const previousRender=render;render=function(){previousRender();cancelGesture();close()};
 new MutationObserver(()=>{cancelGesture();close()}).observe(document.body,{attributes:true,attributeFilter:['class']});
})();
