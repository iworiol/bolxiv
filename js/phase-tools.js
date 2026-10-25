// ===== js/phases/phase-content-copy.js =====
(()=>{
 const original=document.getElementById('copyPage'),button=document.createElement('button');
 button.id='copyPageToContent';button.type='button';button.className=original.className;button.title='現在のフェーズを別のコンテンツにコピー';button.setAttribute('aria-label',button.title);button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v16h13v-6M8 8v8h5M12 3h9v9M21 3l-9 9"/></svg>';original.after(button);
 const menu=document.createElement('div');menu.id='phaseContentCopyMenu';menu.className='object-context-menu phase-content-copy-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','フェーズのコピー先');button.setAttribute('aria-controls',menu.id);document.body.append(menu);
 let sourceBoard=null,sourcePage=null,sourceGroup=null;
 function close(focus=false){menu.hidden=true;button.setAttribute('aria-expanded','false');sourceBoard=null;sourcePage=null;sourceGroup=null;if(focus&&!button.disabled)(button.getClientRects().length?button:original).focus()}
 function copyTo(destination){
  if(boardReadOnly||phaseComparisonActive()||sourceBoard!==data||destination===data||!contentBoards.includes(destination)){close();return}
  const selectedGroup=sourceGroup?sourceBoard.phaseGroups?.find(group=>group.id===sourceGroup):null;
  if(sourceGroup&&(!selectedGroup||data.activePhaseGroup!==sourceGroup)){close();return}
  if(!sourceGroup&&!sourceBoard.pages[sourcePage]){close();return}
  const fields=['pageNames','pageNotes','pageColors','pageBoardShapes','pageFieldBackgroundColors','pageFieldImageIds','pageFieldImageTints','pageFieldSizes'];
  const indexes=selectedGroup?sourceBoard.pages.flatMap((_,i)=>sourceBoard.pageGroupIds[i]===sourceGroup?[i]:[]):[sourcePage];
  const before=JSON.stringify(destination);
  normalizePhaseGroups(destination);destination.pageFieldImageTints=destination.pages.map((_,i)=>fieldImageTint(destination,i));
  let groupId=null;
  if(selectedGroup){const copied=JSON.parse(JSON.stringify(selectedGroup));groupId=copied.id=createObjectId();copied.position=destination.pages.length;destination.phaseGroups.push(copied)}
  for(const index of indexes){
   destination.pages.push(sourceBoard.pages[index].map(object=>({...JSON.parse(JSON.stringify(object)),id:createObjectId()})));
   for(const key of fields){const value=sourceBoard[key][index];destination[key].push(value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value)}
   destination.pageGroupIds.push(groupId);
  }
  const copiedLabel=selectedGroup?'フェーズグループ':'フェーズ';
  const historyEntry=contentHistoryStore.get(destination)||{history:[],future:[]};
  if(!historyEntry.history.length||!sameHistoryState(historyEntry.history.at(-1),before))historyEntry.history.push(before);
  if(historyEntry.history.length>100)historyEntry.history.shift();historyEntry.future=[];contentHistoryStore.set(destination,historyEntry);
  const destinationName=destination.title||'名称未設定のコンテンツ';
  close();save();flushScheduledBoardSave();notify(destinationName+'へ'+copiedLabel+'をコピーしました',[destinationName]);
 }
 function open(index=data.page,anchor=button,groupId=null){
  if(button.disabled||boardReadOnly||phaseComparisonActive()||(groupId?!data.phaseGroups?.some(group=>group.id===groupId):!Number.isInteger(index)||!data.pages[index]))return;
  closeColorPopovers();closeJsonExportMenu();closeJsonImportMenu();closeHelpMenu();
  sourceBoard=data;sourcePage=index;sourceGroup=groupId;menu.replaceChildren();
  const heading=document.createElement('p');heading.className='phase-content-copy-heading';heading.textContent='コピー先のコンテンツ';
  const separator=document.createElement('div');separator.className='context-separator';separator.setAttribute('role','separator');
  const hint=document.createElement('p');hint.className='phase-content-copy-hint';hint.textContent=groupId?'グループ名・共通メモ・配下の全フェーズを、コピー先の末尾に新しいグループとして追加します。':'選ぶと末尾にコピーします。オブジェクト・フィールド設定・背景・ノートを含みます。';menu.append(heading,separator,hint);
  contentBoards.forEach((board,index)=>{if(board===data)return;const item=document.createElement('button');item.type='button';item.setAttribute('role','menuitem');item.textContent=board.title||'コンテンツ'+(index+1);item.onclick=()=>copyTo(board);menu.append(item)});
  if(!menu.querySelector('button')){const empty=document.createElement('p');empty.className='phase-content-copy-hint';empty.textContent='コピー先のコンテンツがありません';menu.append(empty)}
  addPhoneMenuClose(menu,()=>close(true));menu._opener=anchor;menu.hidden=false;button.setAttribute('aria-expanded','true');
  const rect=anchor.getBoundingClientRect(),below=innerHeight-rect.bottom-8,above=rect.top-8;
  menu.style.maxHeight=Math.max(60,Math.min(360,Math.max(below,above)))+'px';
  menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';
  menu.style.top=Math.max(8,below>=menu.offsetHeight?rect.bottom+4:rect.top-menu.offsetHeight-4)+'px';
 };
 button.onclick=()=>{if(!menu.hidden)close();else open()};
 document.addEventListener('open-phase-copy-targets',event=>open(event.detail.index,event.detail.anchor,event.detail.groupId||null));
 menu.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close(true);return}
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  event.preventDefault();const items=[...menu.querySelectorAll('button')];if(!items.length)return;
  const current=items.indexOf(document.activeElement),index=event.key==='Home'?0:event.key==='End'?items.length-1:(current+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[index].focus();
 });
 button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();if(menu.hidden)button.click();menu.querySelector('button:not([hidden])')?.focus()}else if(event.key==='Escape')close(true)});
 document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!menu.contains(event.target)&&!button.contains(event.target))close()},true);
 window.addEventListener('keydown',event=>{if(!menu.hidden&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true)}},true);
 window.addEventListener('resize',()=>close());window.addEventListener('scroll',event=>{if(!menu.contains(event.target))close()},true);
 const previousRender=render;render=function(){previousRender();close();button.disabled=boardReadOnly||phaseComparisonActive()};
 new MutationObserver(()=>{button.disabled=boardReadOnly||phaseComparisonActive();if(button.disabled)close()}).observe(document.body,{attributes:true,attributeFilter:['class']});
 button.disabled=boardReadOnly||phaseComparisonActive();
})();

;
// ===== js/phases/phase-heading-actions.js =====
(()=>{
 document.getElementById('addPage').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
 document.getElementById('copyPage').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="1"/><path d="M15 9V4H4v11h5"/></svg>';
 const heading=document.querySelector('.phase-heading-row'),actions=document.createElement('div');actions.className='phase-heading-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label','フェーズの追加とコピー');for(const id of ['addPage','copyPage','copyPageToContent']){const button=document.getElementById(id);if(button)actions.append(button)}heading.append(actions);actions.addEventListener('click',event=>event.stopPropagation())})();

;
// ===== js/phases/phase-item-menu.js =====
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
  menu.style.maxHeight=Math.max(80,innerHeight-16)+'px';addPhoneMenuClose(menu,()=>close(true));menu.hidden=false;
  menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
 }
 list.addEventListener('open-row-actions',event=>{cancelGesture();const index=[...list.querySelectorAll('.page-tab')].indexOf(event.detail.row);if(index<0)return;selectPhase(index);open(list.querySelectorAll('.page-tab')[index],event.detail.x,event.detail.y)});
 list.addEventListener('contextmenu',event=>{const row=event.target.closest('.page-tab');if(!row||event.target.closest('input,textarea,button'))return;event.preventDefault();event.stopPropagation();if(gesture){clearTimeout(gesture.timer);consumeClick=true;list.setPointerCapture(gesture.id);if(menu.hidden)open(row,gesture.x,gesture.y);return}open(row,event.clientX,event.clientY)});
 list.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||event.target.closest('input,textarea,button'))return;
  const row=event.target.closest('.page-tab');if(!row)return;cancelGesture();
  const next={id:event.pointerId,row,x:event.clientX,y:event.clientY,board:data,phase:data.pages[[...list.querySelectorAll('.page-tab')].indexOf(row)],draggable:row.draggable};row.draggable=false;
  next.timer=setTimeout(()=>{if(gesture!==next||data!==next.board||!row.isConnected)return;consumeClick=true;list.setPointerCapture(next.id);open(row,next.x,next.y)},500);gesture=next;
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

;
// ===== js/canvas/object-list-long-press.js =====
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

;
// ===== js/canvas/touch-list-reorder.js =====
(()=>{
 for(const [id,rowSelector,handleSelector,mime] of [['objectList','.object-row','.object-index,.object-group-disclosure,.phone-row-actions','application/x-tactica-layer'],['pages','.page-tab,.phase-group-heading','.page-index,.phase-group-range,.phone-row-actions,.phase-group-menu-trigger','application/x-tactica-page'],['contentOptions','.content-options-scroll>.content-option-row','.content-option-index,.phone-row-actions','application/x-tactica-content']]){
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
   const transfer=new DataTransfer();if(id==='pages'&&row.classList.contains('phase-group-heading'))transfer.setData('application/x-tactica-phase-group',row.dataset.groupId);else transfer.setData(id==='objectList'&&row.classList.contains('object-group-member')?'application/x-tactica-group-member':mime,id==='objectList'?row.dataset.id:String(id==='pages'?[...list.querySelectorAll('.page-tab')].indexOf(row):rows().indexOf(row)));transfer.effectAllowed='move';
   gesture={id:event.pointerId,row,menuButton:event.target.closest('.list-drag-grip')?null:event.target.closest('.phone-row-actions,.phase-group-menu-trigger,.object-group-disclosure'),armed:false,draggable:row.draggable,transfer,x:event.clientX,y:event.clientY,sourceLeft:row.getBoundingClientRect().left,sourceTop:row.getBoundingClientRect().top,sourceHeight:row.getBoundingClientRect().height,moved:false,target:null,board:data,phase:current()};row.draggable=false;list.setPointerCapture(event.pointerId);
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
   const hit=document.elementFromPoint(event.clientX,event.clientY);const target=hit?.closest(id==='pages'?'.page-tab,.phase-group-heading':rowSelector)||(id==='pages'&&(hit===list||(event.clientY>=bounds.bottom-8&&event.clientY<=bounds.bottom+20&&event.clientX>=bounds.left&&event.clientX<=bounds.right))?list:id==='objectList'&&(hit===list||event.clientY>=bounds.bottom-8&&event.clientY<=bounds.bottom+20&&event.clientX>=bounds.left&&event.clientX<=bounds.right)?list:null);
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

;
// ===== js/contents/content-item-menu.js =====
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
  addPhoneMenuClose(menu,()=>close(true));menu.hidden=false;menu.style.maxHeight=Math.max(80,innerHeight-16)+'px';menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
 }
 list.addEventListener('open-row-actions',event=>{cancel();open(event.detail.row,event.detail.x,event.detail.y)});
 list.addEventListener('contextmenu',event=>{const row=rowAt(event.target);if(!row)return;event.preventDefault();event.stopImmediatePropagation();if(gesture){clearTimeout(gesture.timer);consumeClick=true;list.setPointerCapture(gesture.id);if(menu.hidden)open(row,gesture.x,gesture.y)}else open(row,event.clientX,event.clientY)},true);
 list.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||event.target.closest('.content-option-index'))return;const row=rowAt(event.target);if(!row||editingContentIndex>=0)return;cancel();
  const next={id:event.pointerId,row,x:event.clientX,y:event.clientY,board:contentBoards[rows().indexOf(row)],draggable:row.draggable};gesture=next;row.draggable=false;
  next.timer=setTimeout(()=>{if(gesture!==next||!row.isConnected||!contentBoards.includes(next.board))return;consumeClick=true;list.setPointerCapture(next.id);open(row,next.x,next.y)},500);
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

;
// ===== js/canvas/field-image-tint.js =====
(()=>{
 const settings=document.createElement('div');settings.id='fieldImageTintSettings';settings.innerHTML='<div class="field"><label>補正色</label><div id="fieldImageTintColorControl"></div></div><div class="field"><label for="fieldImageTintStrength">補正の強さ：<span id="fieldImageTintStrengthValue">0</span>%</label><div class="coordinate-control"><input id="fieldImageTintStrength" type="range" min="0" max="100" step="1" value="0"><input id="fieldImageTintStrengthSpin" type="number" min="0" max="100" step="1" value="0" aria-label="補正の強さ"></div></div>';document.getElementById('layoutPropertiesPanel').append(settings);
 const colors=document.createElement('div');colors.className='layout-background-colors';const colorField=settings.firstElementChild;colorField.before(colors);colors.append(colorField);
 const color=settings.querySelector('#fieldImageTintColorControl'),range=settings.querySelector('input[type=range]'),spin=settings.querySelector('input[type=number]'),label=settings.querySelector('#fieldImageTintStrengthValue');let session=null;
 function sync(){settings.hidden=!['image','image4'].includes(activeBoardShape());const tint=fieldImageTint(data,data.page),disabled=boardReadOnly||phaseComparisonActive();if(color.dataset.color!==tint.color){color.innerHTML=colorPickerMarkup('fieldImageTint',tint.color);color.dataset.color=tint.color}color.querySelector('[data-color-trigger]').disabled=disabled;range.disabled=spin.disabled=disabled;range.value=spin.value=tint.strength;label.textContent=tint.strength;if(session&&(session.board!==data||session.page!==data.page))session=null}
 for(const input of [range,spin]){
  input.addEventListener('input',()=>{if(boardReadOnly||phaseComparisonActive()||!['image','image4'].includes(activeBoardShape())||input.value==='')return;const tint=fieldImageTint(data,data.page),value=Math.max(0,Math.min(100,Math.round(Number(input.value)||0)));if(value===tint.strength)return;if(!session||session.board!==data||session.page!==data.page){recordHistory();session={board:data,page:data.page}}data.pageFieldImageTints[data.page]={...tint,strength:value};range.value=spin.value=value;label.textContent=value;stage.style.setProperty('--field-image-tint-strength',String(value/100));save()});
  for(const name of ['change','blur'])input.addEventListener(name,()=>{session=null;sync()});
 }
 const previousRender=render;render=function(){previousRender();sync()};new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});sync();
})();

;
// ===== js/help/help-contents.js =====
(()=>{
 for(const id of ['operationGuideDialog','aboutToolDialog']){
  const dialog=document.getElementById(id),body=dialog.querySelector('.operation-guide-body'),headings=[...body.querySelectorAll('h3')];
  const contents=document.createElement('nav');contents.className='help-contents';contents.id=id+'-contents';contents.tabIndex=-1;
  const title=document.createElement('p');title.className='help-contents-title';title.id=contents.id+'-title';title.textContent='目次';contents.setAttribute('aria-labelledby',title.id);contents.append(title);
  const list=document.createElement('ul');contents.append(list);body.prepend(contents);
  function goTo(target){body.scrollTop=Math.max(0,body.scrollTop+target.getBoundingClientRect().top-body.getBoundingClientRect().top-12);target.focus({preventScroll:true})}
  headings.forEach((heading,index)=>{
   const label=heading.textContent;heading.id=id+'-section-'+(index+1);heading.tabIndex=-1;heading.classList.add('help-section-heading');
   const text=document.createElement('span');text.textContent=label;heading.replaceChildren(text);
   const back=document.createElement('button');back.type='button';back.className='help-back-to-contents';back.textContent='目次へ';back.setAttribute('aria-label',label+'から目次へ戻る');back.onclick=()=>goTo(contents);heading.append(back);
   const item=document.createElement('li');for(const name of ['guide-pc-only','guide-mobile-only'])if(heading.classList.contains(name))item.classList.add(name);
   const link=document.createElement('a');link.href='#'+heading.id;link.textContent=label;link.onclick=event=>{event.preventDefault();goTo(heading)};item.append(link);list.append(item);
  });
  headings.forEach((heading,index)=>{
   const separator=document.createElement('hr');separator.className='help-section-separator';
   for(const name of ['guide-pc-only','guide-mobile-only'])if(heading.classList.contains(name))separator.classList.add(name);
   if(headings[index+1])headings[index+1].before(separator);else body.append(separator);
  });
 }
})();

;
// ===== js/phases/phase-groups.js =====
(()=>{
 const list=document.getElementById('pages'),host=document.getElementById('objectLayerPanel');
 const artwork=phaseGroupArtworkData;let propertiesBeforeGroup=null;
 const overview=document.createElement('section');overview.className='phase-group-overview';overview.hidden=true;overview.setAttribute('aria-label','ChatGPTのキャンバス（閲覧専用）');document.getElementById('boardZoomSpace').append(overview);
 const tools=document.querySelector('.phase-heading-actions');
 const add=document.createElement('button');add.type='button';add.id='addPhaseGroup';add.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 7V4h7l2 3h9v13H3V7Z"/><path d="M12 10v7M8.5 13.5h7"/></svg>';add.setAttribute('aria-label','フェーズグループを追加');add.title='フェーズグループを追加';tools.append(add);
 function button(text,action){const node=document.createElement('button');node.type='button';node.textContent=text;node.onclick=action;return node}
 function group(){return data.phaseGroups.find(item=>item.id===data.activePhaseGroup)}
 // Canvas gestures can cancel the browser's default focus change.
 window.addEventListener('pointerdown',event=>{
  const input=document.activeElement;
  if(!input?.matches('textarea,input[type="text"],input:not([type])')||input.contains(event.target))return;
  if(input.classList.contains('page-tab-input')&&event.target.closest('.page-tab')===input.closest('.page-tab')&&event.target.closest('.page-tab-x'))return;
  if(input.classList.contains('phase-group-rename')&&event.target.closest('.phase-group-heading')===input.closest('.phase-group-heading')&&event.target.closest('[data-cancel-group-addition]'))return;
  if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  const label=event.target.closest('label');if(label?.control===input)return;
  input.blur();
 },true);
 window.addEventListener('click',event=>{
  if(!data.activePhaseGroup||!event.target.closest('#toggleLayers,#toggleInspector,#toggleLayoutProperties,#phaseMemo>summary,.desktop-columns-toggle,.phone-object-tabs'))return;
  if(matchMedia('(max-width:850px)').matches)return;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 // The decorative group canvas is separate from editable phase data.
 window.addEventListener('keydown',event=>{
  if(!data.activePhaseGroup||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if((event.ctrlKey||event.metaKey)&&['v','x'].includes(event.key.toLowerCase())){event.preventDefault();event.stopImmediatePropagation()}
 },true);
 function drawGroupArtwork(){
  if(!overview.firstElementChild){
   const canvas=document.createElement('div');canvas.className='phase-group-artwork';canvas.inert=true;canvas.setAttribute('aria-label','ChatGPT');canvas.style.background=artwork.pageColor;
   artwork.objects.forEach((original,index)=>{if(original.visible===false)return;const object={...original,id:'group-art-'+original.id};canvas.append(createCanvasObjectVisual(object,index,[]))});overview.append(canvas);
  }
 }
 function showGroup(id,keepContentOpen=false){data.activePhaseGroup=id;selectedPhaseIndexes=[];selected=null;selectedIds=[];renderAndSave();if(!boardReadOnly)openGroupProperties();if(!keepContentOpen&&matchMedia('(max-width:850px)').matches&&document.querySelector('.layout').classList.contains('phone-content-open'))document.querySelector('.phone-content-close').click()}
 function selectPage(index,keepContentOpen=false){data.activePhaseGroup=null;selectPhase(index);renderAndSave();if(!keepContentOpen&&matchMedia('(max-width:850px)').matches&&document.querySelector('.layout').classList.contains('phone-content-open'))document.querySelector('.phone-content-close').click()}
 add.onclick=()=>{if(boardReadOnly||phaseComparisonActive())return;commitPendingHistory();const owner=data,before=JSON.parse(JSON.stringify(data)),beforeHistory=history.slice(),beforeFuture=future.slice();recordHistory();const item={id:createObjectId(),name:'新規グループ',note:'',collapsed:false};data.phaseGroups.push(item);renderAndSave();renameGroupInList(data.phaseGroups.find(group=>group.id===item.id),()=>{if(data!==owner)return;Object.assign(data,before);history=beforeHistory;future=beforeFuture;pendingHistoryState=null;pendingHistoryOwner=null;renderAndSave()})};
 const groupProperties=document.createElement('div');groupProperties.id='phaseGroupProperties';groupProperties.hidden=true;document.getElementById('layoutPropertiesPanel').append(groupProperties);
 function openGroupProperties(){
  if(matchMedia('(max-width:850px)').matches)return;
  const toggle=document.getElementById('toggleLayoutProperties');if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();
 }
 function expandGroupProperties(active){
  const heading=document.getElementById('toggleLayoutProperties'),panel=document.getElementById('layoutPropertiesPanel'),section=heading.parentElement;
  const phone=matchMedia('(max-width:850px)').matches;
  // The desktop sidebar owns both the snapshot and restoration of these sections.
  // Closing them here first would make it save the group's temporary state.
  if(!phone&&document.querySelector('.layout').classList.contains('desktop-phase-tools'))return;
  for(const id of ['toggleLayers','toggleInspector']){
   const button=document.getElementById(id),body=document.getElementById(button.getAttribute('aria-controls'));
   if(active&&!phone){button.setAttribute('aria-expanded','false');body.hidden=true;body.classList.add('hidden');body.style.display='none';button.parentElement.classList.remove('is-open')}
   button.disabled=!phone&&(active||boardReadOnly||phaseComparisonActive());
  }
  heading.disabled=!phone&&(active||boardReadOnly||phaseComparisonActive());
  // Phone selection retains the user's property/note tab and expansion state.
  if(phone)return;
  if(active){
   propertiesBeforeGroup??={expanded:heading.getAttribute('aria-expanded'),hidden:panel.hidden,hiddenClass:panel.classList.contains('hidden'),display:panel.style.display,open:section.classList.contains('is-open')};
   heading.setAttribute('aria-expanded','true');panel.hidden=false;panel.classList.remove('hidden');panel.style.display='flex';section.classList.add('is-open');const memo=document.getElementById('phaseMemo');memo.open=true;memo.classList.add('is-open');
  }else if(propertiesBeforeGroup){
   const previous=propertiesBeforeGroup;propertiesBeforeGroup=null;
   // Desktop tools have already restored their selected section during render.
   if(phone){heading.setAttribute('aria-expanded',previous.expanded);panel.hidden=previous.hidden;panel.classList.toggle('hidden',previous.hiddenClass);panel.style.display=previous.display;section.classList.toggle('is-open',previous.open)}
  }
 }
 function drawOverview(){
  const item=group();for(const id of ['gridToggle','fieldToggle','clipToggle'])document.getElementById(id).disabled=!!item;overview.hidden=!item;groupProperties.hidden=!item;host.classList.toggle('group-overview-active',!!item);if(document.body.classList.contains('phase-group-selected')!==!!item)document.body.classList.toggle('phase-group-selected',!!item);
  expandGroupProperties(!!item);
  const phaseListTitle=document.getElementById('toggleBattlePages');if(phaseListTitle.textContent!=='フェーズリスト')phaseListTitle.textContent='フェーズリスト';const propertyTitle=document.getElementById('toggleLayoutProperties');if(propertyTitle.firstChild?.nodeType===3)propertyTitle.firstChild.textContent=item?'グループプロパティ':'フェーズプロパティ';
  const phoneTitle=document.querySelector('.phone-phase-switch-title');if(item&&phoneTitle)phoneTitle.innerHTML='<strong>グループプロパティ</strong> / グループノート';
  if(!item)return;
  const selectedLabel=document.getElementById('selectionTitle');selectedLabel.textContent='グループ：'+item.name;selectedLabel.title=selectedLabel.textContent;document.getElementById('clearBtn').disabled=true;for(const id of ['copyPage','copyPageToContent'])document.getElementById(id).disabled=boardReadOnly||phaseComparisonActive();
  drawGroupArtwork();
  let caption=overview.querySelector('.phase-group-caption');if(!caption){caption=document.createElement('p');caption.className='phase-group-caption';for(const [part,text] of [['prefix','そう、フェーズグループ：'],['name',''],['suffix','よ。']]){const span=document.createElement('span');span.className='phase-group-caption-'+part;span.textContent=text;caption.append(span)}overview.append(caption)}caption.querySelector('.phase-group-caption-name').textContent=item.name;caption.title='そう、フェーズグループ：'+item.name+'よ。';
  if(groupProperties.dataset.group===item.id&&groupProperties.contains(document.activeElement))return;
  groupProperties.dataset.group=item.id;groupProperties.replaceChildren();
  const nameField=document.createElement('div');nameField.className='field';const label=document.createElement('label');label.htmlFor='phaseGroupNameInput';label.textContent='グループ名';const name=document.createElement('input');name.id='phaseGroupNameInput';name.type='text';name.value=item.name;name.readOnly=boardReadOnly;name.maxLength=120;nameField.append(label,name);groupProperties.append(nameField);
  name.onchange=()=>{if(boardReadOnly)return;recordHistory();item.name=name.value.trim()||'新規グループ';renderAndSave()};
  const noteField=document.createElement('div');noteField.className='field';const noteLabel=document.createElement('label');noteLabel.htmlFor='phaseGroupNoteInput';noteLabel.textContent='グループ概要';const note=document.createElement('textarea');note.id='phaseGroupNoteInput';note.value=item.note;note.readOnly=boardReadOnly;note.disabled=boardReadOnly;note.setAttribute('aria-label','グループ概要');note.placeholder='グループ全体の方針・共通の注意点・フェーズ間の流れなどを自由に記入';noteField.append(noteLabel,note);groupProperties.append(noteField);
  let noted=false;note.onfocus=()=>{noted=false};note.oninput=()=>{if(boardReadOnly)return;if(!noted){recordHistory();noted=true}item.note=note.value;save()};
 }
 const groupMenu=document.createElement('div');groupMenu.id='phaseGroupMenu';groupMenu.className='object-context-menu phase-group-menu';groupMenu.hidden=true;groupMenu.setAttribute('role','menu');groupMenu.setAttribute('aria-label','グループの操作');document.body.append(groupMenu);
 function closeGroupMenu(){groupMenu.hidden=true}
 function renameGroupInList(item,cancelAddition=null){
  const row=[...list.querySelectorAll('.phase-group-heading')].find(node=>node.dataset.groupId===item.id);if(!row||boardReadOnly||phaseComparisonActive())return;
  const owner=data,name=row.querySelector('.phase-group-name'),input=document.createElement('textarea');input.className='phase-group-rename';input.rows=1;input.value=item.name;input.setAttribute('aria-label','フェーズグループ名');
  row.append(input);row.classList.add('renaming');row.draggable=false;let finished=false;
  function finish(commit){if(finished)return;finished=true;if(owner!==data)return;if(!commit&&cancelAddition){cancelAddition();return}const value=input.value.replace(/[\r\n]+/g,' ').trim();if(commit&&value&&value!==item.name){if(!cancelAddition)recordHistory();item.name=value;renderAndSave()}else{if(commit&&!value)notify('フェーズグループ名を入力してください');render()}}
  if(cancelAddition){const cancel=row.querySelector('.phase-group-toggle');cancel.textContent='↶';cancel.title='グループ追加を取り消す';cancel.setAttribute('aria-label',cancel.title);cancel.removeAttribute('aria-expanded');cancel.dataset.cancelGroupAddition='true';cancel.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation()});cancel.onclick=event=>{event.preventDefault();event.stopPropagation();finish(false)}}
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.max(32,input.scrollHeight)+'px'});
  for(const event of ['pointerdown','click'])input.addEventListener(event,event=>event.stopPropagation());
  input.addEventListener('keydown',event=>{event.stopPropagation();if(event.isComposing||event.keyCode===229)return;if(event.key==='Enter'){event.preventDefault();finish(true)}else if(event.key==='Escape'){event.preventDefault();finish(false)}});
  input.addEventListener('blur',()=>finish(true));input.focus();input.select();
 }
 function groupUnits(){return [...list.children].filter(row=>row.classList.contains('phase-group-heading')||(row.classList.contains('page-tab')&&!row.classList.contains('group-member')))}
 function ungroupPhaseGroup(id){if(boardReadOnly||phaseComparisonActive()||!data.phaseGroups.some(g=>g.id===id))return;recordHistory();data.pageGroupIds=data.pageGroupIds.map(groupId=>groupId===id?null:groupId);data.phaseGroups=data.phaseGroups.filter(g=>g.id!==id);if(data.activePhaseGroup===id)data.activePhaseGroup=null;renderAndSave();notify('グループを解除しました。フェーズは残しています')}
 function openGroupMenu(id,x,y){
  const item=data.phaseGroups.find(g=>g.id===id);if(!item)return;
  for(const menuId of ['phaseItemMenu','contentItemMenu','phaseContentCopyMenu']){const menu=document.getElementById(menuId);if(menu)menu.hidden=true}
  closeHelpMenu();groupMenu.replaceChildren();const owner=data,units=groupUnits(),at=units.findIndex(row=>row.dataset.groupId===id);
  for(const [action,label] of [['rename','名前変更'],['previous','前へ移動'],['next','後ろへ移動'],['delete','グループ解除']]){
   if(action==='previous'||action==='delete'){const separator=document.createElement('div');separator.className='context-separator';separator.setAttribute('role','separator');groupMenu.append(separator)}
   const entry=button(label,()=>{
    if(boardReadOnly||phaseComparisonActive()||data!==owner)return;closeGroupMenu();
    if(action==='rename'){renameGroupInList(item);return}
    if(action==='delete'){ungroupPhaseGroup(id);return}
    const next=units[at+(action==='previous'?-1:1)];if(!next)return;
    const transfer=new DataTransfer();transfer.setData('application/x-tactica-phase-group',id);const rect=next.getBoundingClientRect();
    next.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:rect.left+Math.max(40,rect.width/2),clientY:action==='previous'?rect.top+2:rect.bottom-2}));
   });entry.dataset.action=action;entry.setAttribute('role','menuitem');entry.disabled=boardReadOnly||phaseComparisonActive()||(action==='previous'&&at<=0)||(action==='next'&&at>=units.length-1);if(action==='delete')entry.className='context-delete';groupMenu.append(entry);
  }
  addPhoneMenuClose(groupMenu,closeGroupMenu);groupMenu.hidden=false;groupMenu.style.left=Math.max(8,Math.min(x,innerWidth-groupMenu.offsetWidth-8))+'px';groupMenu.style.top=Math.max(8,Math.min(y,innerHeight-groupMenu.offsetHeight-8))+'px';
 }
 document.addEventListener('pointerdown',event=>{suppressGroupClick=false;if(!groupMenu.contains(event.target))closeGroupMenu()},true);
 groupMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){closeGroupMenu();return}if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const items=[...groupMenu.querySelectorAll('button:not(:disabled)')],at=items.indexOf(document.activeElement);if(items.length)items[event.key==='Home'?0:event.key==='End'?items.length-1:(at+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus()});
 let groupHold=null,suppressGroupClick=false;
 function clearGroupHold(){if(groupHold)clearTimeout(groupHold.timer);groupHold=null}
 list.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||event.target.closest('.phase-group-toggle,.phase-group-menu-trigger,.phase-group-range,input,textarea'))return;const row=event.target.closest('.phase-group-heading');if(!row)return;
  clearGroupHold();suppressGroupClick=false;const next={id:event.pointerId,x:event.clientX,y:event.clientY};groupHold=next;
  next.timer=setTimeout(()=>{if(groupHold!==next)return;suppressGroupClick=true;openGroupMenu(row.dataset.groupId,next.x,next.y)},500);
 },true);
 document.addEventListener('pointermove',event=>{if(groupHold&&Math.hypot(event.clientX-groupHold.x,event.clientY-groupHold.y)>10)clearGroupHold()},true);
 for(const event of ['pointerup','pointercancel'])document.addEventListener(event,clearGroupHold,true);
 document.addEventListener('click',event=>{if(suppressGroupClick&&event.target.closest('.phase-group-heading')){suppressGroupClick=false;event.preventDefault();event.stopImmediatePropagation()}},true);
 function revealSelectedPhase(){
  const row=list.querySelectorAll('.page-tab')[data.page];
  const target=row?.hidden?[...list.querySelectorAll('.phase-group-heading')].find(heading=>heading.dataset.groupId===data.pageGroupIds[data.page]):row;
  if(!target||!list.clientHeight)return;
  const bounds=list.getBoundingClientRect(),rect=target.getBoundingClientRect();if(!bounds.width||!rect.height)return;
  const top=bounds.top+list.clientTop,bottom=top+list.clientHeight;
  if(rect.top<top)list.scrollTop+=rect.top-top;
  else if(rect.bottom>bottom)list.scrollTop+=rect.bottom-bottom;
 }
 const beforeSelect=selectPhase;selectPhase=function(...args){data.activePhaseGroup=null;const result=beforeSelect(...args);revealSelectedPhase();return result};
 function arrangeGroups(){
  normalizePhaseGroups(data);
  const order=[],seen=new Set();
  data.pages.forEach((_,i)=>{const id=data.pageGroupIds[i];if(!id)order.push(i);else if(!seen.has(id)){seen.add(id);data.pageGroupIds.forEach((g,j)=>{if(g===id)order.push(j)})}});
  if(order.every((value,i)=>value===i))return;
  const at=data.page,comparisons=selectedPhaseIndexes.slice();
  for(const key of ['pageGroupIds','pages','pageNames','pageNotes','pageColors','pageBoardShapes','pageFieldBackgroundColors','pageFieldImageIds','pageFieldImageTints','pageFieldSizes']){const previous=data[key];if(Array.isArray(previous))data[key]=order.map(i=>previous[i])}
  data.page=order.indexOf(at);selectedPhaseIndexes=comparisons.map(i=>order.indexOf(i));
 }
 const beforePages=renderPages;renderPages=function(){
  arrangeGroups();
  // Empty headings must sit between whole groups, never between their phases.
  for(const group of data.phaseGroups){
   if(data.pageGroupIds.includes(group.id))continue;
   let slot=Math.max(0,Math.min(data.pages.length,group.position??data.pages.length));
   const owner=data.pageGroupIds[slot];
   if(slot>0&&owner&&data.pageGroupIds[slot-1]===owner)slot=data.pageGroupIds.lastIndexOf(owner)+1;
   group.position=slot;
  }
  beforePages();add.disabled=boardReadOnly||phaseComparisonActive();
  const rows=[...list.querySelectorAll('.page-tab')];
  function movePhase(event,groupId,position){
   event.preventDefault();event.stopPropagation();if(boardReadOnly||phaseComparisonActive())return;
   const movingGroup=event.dataTransfer?.getData('application/x-tactica-phase-group');
   if(movingGroup){
    if(event.target.closest('.page-tab.group-member'))return;
    const group=data.phaseGroups.find(item=>item.id===movingGroup);if(!group||groupId===movingGroup)return;
    if(groupId){const first=data.pageGroupIds.indexOf(groupId),last=data.pageGroupIds.lastIndexOf(groupId);if(first>=0)position=position>first?last+1:first}
    const active=data.pages[data.page],comparison=selectedPhaseIndexes.map(i=>data.pages[i]);
    const moving=[],remaining=[];data.pages.forEach((_,i)=>(data.pageGroupIds[i]===movingGroup?moving:remaining).push(i));
    const at=remaining.filter(i=>i<position).length,order=remaining.slice();order.splice(at,0,...moving);recordHistory();
    // An empty heading occupies a boundary, not a phase index. Inserting a block
    // immediately before that heading must move the heading past the block too.
    const targetHeading=event.target.closest('.phase-group-heading');
    const beforeEmpty=targetHeading&&groupId===null&&event.clientY<targetHeading.getBoundingClientRect().top+targetHeading.getBoundingClientRect().height/2?targetHeading.dataset.groupId:null;
    for(const item of data.phaseGroups){if(!data.pageGroupIds.includes(item.id)){const slot=item.position??data.pages.length,boundary=remaining.filter(i=>i<slot).length;item.position=boundary+(at<boundary||(at===boundary&&item.id===beforeEmpty)?moving.length:0)}}
    group.position=at;
    if(!moving.length){const target=data.phaseGroups.find(item=>item.id===groupId);data.phaseGroups=data.phaseGroups.filter(item=>item!==group);const index=target?data.phaseGroups.indexOf(target):data.phaseGroups.length;data.phaseGroups.splice(index<0?data.phaseGroups.length:index,0,group)}
    for(const key of ['pages','pageGroupIds','pageNames','pageNotes','pageColors','pageBoardShapes','pageFieldBackgroundColors','pageFieldImageIds','pageFieldImageTints','pageFieldSizes']){const previous=data[key];data[key]=order.map(i=>previous[i])}
    data.page=data.pages.indexOf(active);selectedPhaseIndexes=comparison.map(page=>data.pages.indexOf(page));renderAndSave();return;
   }
   const raw=event.dataTransfer?.getData('application/x-tactica-page');if(!raw)return;const from=Number(raw);
   if(!Number.isInteger(from)||!data.pages[from])return;
   const moving=data.pages[from],active=data.pages[data.page],comparison=selectedPhaseIndexes.map(i=>data.pages[i]);
   recordHistory();data.pageGroupIds[from]=groupId;
   const at=Math.max(0,Math.min(data.pages.length-1,position-(from<position?1:0)));
   for(const empty of data.phaseGroups.filter(g=>!data.pageGroupIds.includes(g.id))){let slot=Number.isInteger(empty.position)?empty.position:data.pages.length;if(from<slot)slot--;const targetGroup=event.target.closest('.phase-group-heading')?.dataset.groupId;if(at<slot||(at===slot&&groupId===null&&targetGroup===empty.id))slot++;empty.position=slot}
   for(const key of ['pages','pageGroupIds','pageNames','pageNotes','pageColors','pageBoardShapes','pageFieldBackgroundColors','pageFieldImageIds','pageFieldImageTints','pageFieldSizes']){const [value]=data[key].splice(from,1);data[key].splice(at,0,value)}
   const group=data.phaseGroups.find(g=>g.id===groupId);if(group)group.collapsed=false;
   data.page=data.pages.indexOf(active);selectedPhaseIndexes=comparison.map(page=>data.pages.indexOf(page));renderAndSave();revealMovedPhase(data.pages.indexOf(moving));
  }
  list._movePhase=movePhase;
  function clearDropGuide(){list.classList.remove('phase-drop-at-end');list.querySelectorAll('.drag-over,.drop-before,.drop-after').forEach(row=>row.classList.remove('drag-over','drop-before','drop-after'))}
  function dropTarget(event){
   const direct=event.target.closest('.page-tab,.phase-group-heading');if(direct&&list.contains(direct))return direct;
   const visible=[...list.children].filter(row=>!row.hidden),last=visible.at(-1);
   if(!last||event.clientY>=last.getBoundingClientRect().bottom)return list;
   return visible.reduce((nearest,row)=>Math.abs(event.clientY-(row.getBoundingClientRect().top+row.getBoundingClientRect().height/2))<Math.abs(event.clientY-(nearest.getBoundingClientRect().top+nearest.getBoundingClientRect().height/2))?row:nearest,visible[0]);
  }
  list._phaseDragGuide=event=>{
   if(boardReadOnly||phaseComparisonActive()||!Array.from(event.dataTransfer.types).some(type=>['application/x-tactica-page','application/x-tactica-phase-group'].includes(type)))return;
   event.stopImmediatePropagation();const target=dropTarget(event);
   if(Array.from(event.dataTransfer.types).includes('application/x-tactica-phase-group')&&target.classList.contains('group-member')){clearDropGuide();return}
   event.preventDefault();
   const lastVisible=[...list.children].filter(row=>!row.hidden).at(-1);
   const endsWithGroup=!!lastVisible&&(lastVisible.classList.contains('phase-group-heading')||lastVisible.classList.contains('group-member'));
   list.classList.toggle('phase-drop-at-end',target===list&&endsWithGroup);
   for(const row of list.children)if(row!==target)row.classList.remove('drag-over','drop-before','drop-after');
   if(target===list)return;
   target.classList.add('drag-over');
   if(target.classList.contains('phase-group-heading')){const bounds=target.getBoundingClientRect();target.classList.toggle('drop-before',event.clientY<bounds.top+bounds.height/2);target.classList.remove('drop-after')}
   if(target.classList.contains('page-tab')){const bounds=target.getBoundingClientRect(),mid=bounds.top+bounds.height/2;const after=target.classList.contains('drop-after')?event.clientY>mid-3:target.classList.contains('drop-before')?event.clientY>mid+3:event.clientY>mid;target.classList.toggle('drop-after',after);target.classList.toggle('drop-before',!after)}
  };
  list.ondragover=null;
  list.ondragleave=event=>{if(list.contains(event.relatedTarget))return;const bounds=list.getBoundingClientRect();if(event.clientX>=bounds.left&&event.clientX<=bounds.right&&event.clientY>=bounds.top&&event.clientY<=bounds.bottom)return;clearDropGuide()};
  list.ondragend=clearDropGuide;
  list.ondrop=event=>{const target=dropTarget(event);clearDropGuide();if(event.target!==list)return;if(target===list)movePhase(event,null,data.pages.length);else target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:event.dataTransfer,clientX:event.clientX,clientY:event.clientY}))};
  // Keep phase rows in their original order: existing selection and reorder code uses this order.
  for(const item of data.phaseGroups){
   const row=document.createElement('div');row.className='phase-group-heading'+(item.id===data.activePhaseGroup?' active':'');row.dataset.groupId=item.id;
   row.classList.toggle('contains-active-phase',!data.activePhaseGroup&&data.pageGroupIds[data.page]===item.id);
   row.draggable=!boardReadOnly&&!phaseComparisonActive();row.onpointerdown=event=>{row.draggable=!boardReadOnly&&!phaseComparisonActive()&&!event.target.closest('.phase-group-toggle,.phase-group-menu-trigger,.phase-group-ungroup')};
   row.ondragstart=event=>{if(!row.draggable){event.preventDefault();return}event.dataTransfer.setData('application/x-tactica-phase-group',item.id);event.dataTransfer.effectAllowed='move';row.classList.add('dragging')};row.ondragend=()=>{row.classList.remove('dragging');clearDropGuide()};
   const toggle=button('',()=>{item.collapsed=!item.collapsed;renderAndSave()});toggle.innerHTML='<span class="phase-group-disclosure-text" aria-hidden="true">'+(item.collapsed?'▸':'▾')+'</span><svg class="phase-group-disclosure-arrow" viewBox="0 0 18 18" aria-hidden="true"><path d="'+(item.collapsed?'M6 3v12l7-6Z':'M3 6h12l-6 7Z')+'"/></svg>';toggle.setAttribute('aria-label',item.name+(item.collapsed?'を開く':'を閉じる'));toggle.setAttribute('aria-expanded',String(!item.collapsed));
   toggle.classList.add('phase-group-toggle');
   const count=data.pageGroupIds.filter(id=>id===item.id).length;
   const name=button('',()=>showGroup(item.id,true));name.className='phase-group-name';
   name.title=item.name+'：クリックでグループを選択、右クリック／長押しで操作メニュー';
   row.oncontextmenu=event=>{if(event.target.closest('input,textarea'))return;event.preventDefault();event.stopPropagation();openGroupMenu(item.id,event.clientX,event.clientY)};
   const leading=document.createElement('span');leading.className='phase-group-leading';const grip=document.createElement('button');grip.type='button';grip.className='phase-group-range phase-group-drag';grip.title='ドラッグでグループ全体を並べ替え';grip.setAttribute('aria-label',item.name+'全体を並べ替え');leading.append(grip,toggle);row.append(leading);const title=document.createElement('span');title.className='phase-group-title';title.textContent=item.name;name.append(title);
   if(!data.activePhaseGroup&&data.pageGroupIds[data.page]===item.id){const current=document.createElement('span');current.className='phase-group-current';current.textContent=String(data.page+1).padStart(2,'0');current.setAttribute('aria-label','表示中のフェーズ '+(data.page+1));name.append(current)}row.append(name);
   if(item.id===data.activePhaseGroup){const menuButton=button('…',()=>{const bounds=menuButton.getBoundingClientRect();openGroupMenu(item.id,bounds.left,bounds.bottom)});menuButton.className='phase-group-menu-trigger';menuButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';menuButton.title='グループの操作';menuButton.setAttribute('aria-label',item.name+'の操作メニュー');menuButton.setAttribute('aria-haspopup','menu');menuButton.setAttribute('aria-controls','phaseGroupMenu');menuButton.setAttribute('aria-expanded','false');menuButton.addEventListener('pointerdown',event=>event.stopPropagation());row.append(menuButton)}
   const ungroup=button('×',()=>ungroupPhaseGroup(item.id));ungroup.className='phase-group-ungroup';ungroup.title='グループ解除（フェーズは残します）';ungroup.setAttribute('aria-label',item.name+'のグループ解除（フェーズは残します）');ungroup.disabled=boardReadOnly||phaseComparisonActive();ungroup.addEventListener('pointerdown',event=>event.stopPropagation());row.append(ungroup);
   row.onclick=event=>{if(event.target.closest('button'))return;showGroup(item.id,true)};
   row.classList.toggle('group-expanded',!item.collapsed&&count>0);
   const first=data.pageGroupIds.indexOf(item.id),anchor=first>=0?first:item.position;
   let target=Number.isInteger(anchor)?rows[anchor]:null;
   if(first<0&&target){const owner=data.pageGroupIds[anchor];if(owner&&data.pageGroupIds.indexOf(owner)===anchor)target=[...list.querySelectorAll('.phase-group-heading')].find(heading=>heading.dataset.groupId===owner)||target}
   if(target)list.insertBefore(row,target);else list.append(row);
   row.ondragover=e=>{if(boardReadOnly||phaseComparisonActive()||!Array.from(e.dataTransfer.types).includes('application/x-tactica-page'))return;e.preventDefault();row.classList.add('drag-over')};
   row.ondragleave=null;
   row.ondrop=event=>{const first=data.pageGroupIds.indexOf(item.id),last=data.pageGroupIds.lastIndexOf(item.id),bounds=row.getBoundingClientRect();const before=event.clientY<bounds.top+bounds.height/2;const final=[...list.children].filter(node=>!node.hidden).at(-1)===row,after=final&&event.clientY>=bounds.bottom-8;movePhase(event,before||after?null:item.id,after?data.pages.length:before?(first<0?(item.position??data.pages.length):first):(last<0?(item.position??data.pages.length):last+1))};
  }
  rows.forEach((row,index)=>{const id=data.pageGroupIds[index],item=data.phaseGroups.find(g=>g.id===id);row.classList.toggle('group-member',!!item);row.hidden=!!item?.collapsed;
   row.classList.toggle('group-last',!!item&&data.pageGroupIds[index+1]!==id);
   row.ondragleave=null;
   if(data.activePhaseGroup)row.classList.remove('active');
   row.ondrop=event=>{const bounds=row.getBoundingClientRect();movePhase(event,id,index+(event.clientY>bounds.top+bounds.height/2?1:0))};
  });
  frameObserver.disconnect();frameObserver.observe(list);list.querySelectorAll('.page-tab,.phase-group-heading').forEach(row=>frameObserver.observe(row));updateGroupFrames();
  drawOverview();
 };
 list.addEventListener('dragover',event=>list._phaseDragGuide?.(event),true);
 list.addEventListener('keydown',event=>{
  if(!['ArrowUp','ArrowDown'].includes(event.key)||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  event.preventDefault();event.stopImmediatePropagation();
  const next=data.page+(event.key==='ArrowUp'?-1:1);if(next<0||next>=data.pages.length)return;
  selectPhase(next);
  const row=list.querySelectorAll('.page-tab')[data.page];
  if(row&&!row.hidden)row.focus({preventScroll:true});
  else [...list.querySelectorAll('.phase-group-heading')].find(heading=>heading.dataset.groupId===data.pageGroupIds[data.page])?.querySelector('.phase-group-name')?.focus({preventScroll:true});
 },true);
 function updateGroupFrames(){
  const rows=[...list.querySelectorAll('.page-tab')],updates=[];
  const sample=rows.find(row=>!row.hidden&&row.getBoundingClientRect().width>0),heading=list.querySelector('.phase-group-heading');
  if(sample&&heading){const label=sample.querySelector('.page-tab-name'),style=getComputedStyle(heading),offset=label.getBoundingClientRect().left-sample.getBoundingClientRect().left-parseFloat(style.paddingLeft)-parseFloat(style.borderLeftWidth);updates.push([list,'--group-name-offset',Math.max(0,offset)+'px'])}
  // Read all bounds before writing styles, so one group cannot force layout for the next.
  for(const heading of list.querySelectorAll('.phase-group-heading.group-expanded')){updates.push([heading,'--group-header-height',heading.offsetHeight+'px']);const last=rows[data.pageGroupIds.lastIndexOf(heading.dataset.groupId)];if(last)updates.push([heading,'--group-frame-height',Math.max(34,last.getBoundingClientRect().bottom-heading.getBoundingClientRect().top)+'px'])}
  for(const [node,key,value] of updates)if(node.style.getPropertyValue(key)!==value)node.style.setProperty(key,value);
 }

 const frameObserver=new ResizeObserver(updateGroupFrames);
 const beforeRender=render;render=function(){
  arrangeGroups();
  beforeRender();drawOverview();
 };
 normalizePhaseGroups(data);render();
})();

;
// ===== js/phases/phase-name-property.js =====
(()=>{
 const panel=document.getElementById('layoutPropertiesPanel'),field=document.createElement('div');field.className='field';field.id='phaseNameField';
 const label=document.createElement('label');label.htmlFor='phaseNameInput';label.textContent='フェーズ名';
 const input=document.createElement('input');input.id='phaseNameInput';input.type='text';input.autocomplete='off';field.append(label,input);panel.prepend(field);
 let owner=null;
 input.addEventListener('focus',()=>{owner={board:data,page:data.pages[data.page]}});
 function sync(){input.disabled=boardReadOnly||phaseComparisonActive();if(document.activeElement!==input)input.value=data.pageNames[data.page]||''}
 function commit(){
  if(boardReadOnly||phaseComparisonActive()||!owner||owner.board!==data)return;
  const index=data.pages.indexOf(owner.page);if(index<0)return;
  const value=input.value.replace(/[\r\n]+/g,' ').trim();
  if(!value){input.value=data.pageNames[index]||'';notify('フェーズ名を入力してください');return}
  if(value===data.pageNames[index])return;
  recordHistory();data.pageNames[index]=value;input.value=value;renderAndSave();
 }
 input.addEventListener('change',commit);input.addEventListener('blur',()=>{commit();owner=null;sync()});
 input.addEventListener('keydown',event=>{if(event.isComposing||event.keyCode===229)return;if(event.key==='Enter'){event.preventDefault();commit()}else if(event.key==='Escape'){event.preventDefault();input.value=data.pageNames[data.page]||''}});
 const beforePages=renderPages;renderPages=function(...args){const result=beforePages(...args);sync();return result};
 const beforeRender=render;render=function(...args){const result=beforeRender(...args);sync();return result};sync();
})();

;
// ===== js/phases/phase-copy-dropdown.js =====
(()=>{
 const trigger=document.getElementById('copyPage'),directCopy=trigger.onclick;
 const caret=document.createElement('span');caret.className='phase-copy-caret';caret.textContent='▾';caret.setAttribute('aria-hidden','true');trigger.append(caret);
 trigger.title='フェーズのコピー';trigger.setAttribute('aria-label','フェーズのコピー');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','phaseCopyMenu');
 const menu=document.createElement('div');menu.id='phaseCopyMenu';menu.className='object-context-menu phase-copy-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','フェーズのコピー');document.body.append(menu);
 let owner=null,index=null,selectedGroup=null;
 function close(focus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true})}
 function action(label,callback){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('role','menuitem');button.onclick=()=>{close();if(boardReadOnly||phaseComparisonActive()||trigger.disabled||data!==owner||data.page!==index||(data.activePhaseGroup||null)!==selectedGroup)return;callback()};menu.append(button)}
 action('このコンテンツにコピー',()=>directCopy.call(trigger));
 action('別のコンテンツへコピー ▸',()=>document.dispatchEvent(new CustomEvent('open-phase-copy-targets',{detail:{index,anchor:trigger,groupId:selectedGroup}})));
 trigger.onclick=()=>{if(!menu.hidden){close();return}if(trigger.disabled||boardReadOnly||phaseComparisonActive())return;closeHelpMenu();closeJsonExportMenu();closeJsonImportMenu();document.getElementById('phaseContentCopyMenu').hidden=true;owner=data;index=data.page;selectedGroup=data.activePhaseGroup||null;menu.firstElementChild.hidden=!!selectedGroup;menu.setAttribute('aria-label',selectedGroup?'フェーズグループのコピー':'フェーズのコピー');addPhoneMenuClose(menu,()=>close(true));menu.hidden=false;trigger.setAttribute('aria-expanded','true');const rect=trigger.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,rect.bottom+4+menu.offsetHeight<=innerHeight?rect.bottom+4:rect.top-menu.offsetHeight-4)+'px'};
 trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();event.stopImmediatePropagation();if(menu.hidden)trigger.click();menu.querySelector('button:not([hidden])')?.focus()}});
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close(true);return}if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...menu.querySelectorAll('button:not([hidden])')],at=buttons.indexOf(document.activeElement);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(event.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus()});
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!trigger.contains(event.target))close()},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden)close(true)});
 window.addEventListener('resize',()=>close());window.addEventListener('scroll',event=>{if(!menu.contains(event.target))close()},true);
})();

;
// ===== js/mobile/phone-row-actions.js =====
(()=>{
 for(const type of ['contextmenu','dragstart'])window.addEventListener(type,event=>{
  if(!matchMedia('(max-width:850px)').matches||event.target.closest('input,textarea,[contenteditable="true"]')||!event.target.closest('#pages .page-tab,#pages .phase-group-heading,#objectList .object-row,#contentOptions .content-option-row:not(.content-option-add-row)'))return;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 const icon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
 function sync(){
  for(const [id,selector] of [['pages','.page-tab'],['objectList','.object-row'],['contentOptions','.content-options-scroll>.content-option-row']]){
   const host=document.getElementById(id);
   for(const row of host.querySelectorAll(selector)){
    let button=row.querySelector('.phone-row-actions');
    if(!button){button=document.createElement('button');button.type='button';button.className='phone-row-actions';button.innerHTML=icon;button.setAttribute('aria-label','操作メニュー');button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-controls',id==='objectList'?'objectContextMenu':id==='pages'?'phaseItemMenu':'contentItemMenu');button.setAttribute('aria-expanded','false');button.addEventListener('pointerdown',event=>event.stopPropagation());button.onclick=event=>{event.preventDefault();event.stopPropagation();const rect=button.getBoundingClientRect();if(id==='objectList'){const objectId=row.dataset.id;if(row.classList.contains('object-group-member')){if(!individualGroupSelectionActive()||!selectedIds.includes(objectId))selectIndividualGroupMember(objectId)}else if(!selectedIds.includes(objectId)){selected=objectId;selectedIds=[objectId];renderSelectionOnly()}closeColorPopovers();openObjectContextMenu(objectId,rect.left,rect.bottom)}else host.dispatchEvent(new CustomEvent('open-row-actions',{detail:{row,x:rect.left,y:rect.bottom}}))};row.append(button)}
    const hidden=id==='pages'?!row.classList.contains('active')||row.classList.contains('renaming'):id==='objectList'?!row.classList.contains('selected'):!!row.querySelector('input');
    if(id==='objectList')button.disabled=boardReadOnly||phaseComparisonActive();if(button.hidden!==hidden)button.hidden=hidden;
   }
  }
 }
 for(const id of ['pages','objectList','contentOptions'])new MutationObserver(sync).observe(document.getElementById(id),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 sync();
})();

;
// ===== js/phases/phase-multi-select-mode.js =====
(()=>{
 const layout=document.querySelector('.layout'),heading=document.getElementById('toggleBattlePages'),actions=document.querySelector('.phase-heading-actions'),exit=document.getElementById('exitPhaseComparison');
 const count=document.createElement('span');count.className='phase-mode-count';count.setAttribute('aria-live','polite');
 actions.append(exit);exit.title='複数選択モードを解除';exit.setAttribute('aria-label',exit.title);
 function sync(){const selectedCount=selectedPhaseIndexes.length,active=selectedCount>0;layout.classList.toggle('phase-multi-select-mode',active);heading.textContent=active?'フェーズ複数選択モード':'フェーズリスト';if(active){count.textContent=selectedCount+'件';heading.append(count);for(const id of ['phaseItemMenu','phaseGroupMenu','phaseContentCopyMenu']){const menu=document.getElementById(id);if(menu)menu.hidden=true}}exit.hidden=!active}
 const before=render;render=function(){before();sync()};
 window.addEventListener('contextmenu',event=>{if(selectedPhaseIndexes.length&&event.target.closest('#pages')){event.preventDefault();event.stopImmediatePropagation()}},true);
 window.addEventListener('click',event=>{if(selectedPhaseIndexes.length&&event.target.closest('#pages .phone-row-actions,#pages .phase-group-menu-trigger')){event.preventDefault();event.stopImmediatePropagation()}},true);
 sync();
})();

;
// ===== js/mobile/phone-initial-fit.js =====
// Wait for the phone panels to finish layout before fitting the initial canvas.
if(matchMedia('(max-width:850px)').matches&&!Number.isFinite(viewSettings.boardDisplayZoom)){
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(matchMedia('(max-width:850px)').matches&&!Number.isFinite(viewSettings.boardDisplayZoom))fitBoardDisplayZoom(false);
 }));
}

// A visible grip shares the existing number/disclosure drag target on phones.
(()=>{
 const targets='#pages .page-index,#pages .phase-group-range,#objectList .object-row:not(.object-group-row)>.object-index,#objectList .object-group-disclosure,#contentOptions .content-option-index';
 const artwork='<svg viewBox="0 0 10 16" aria-hidden="true" fill="currentColor"><circle cx="3" cy="3" r="1.2"/><circle cx="7" cy="3" r="1.2"/><circle cx="3" cy="8" r="1.2"/><circle cx="7" cy="8" r="1.2"/><circle cx="3" cy="13" r="1.2"/><circle cx="7" cy="13" r="1.2"/></svg>';
 function sync(){for(const target of document.querySelectorAll(targets)){if(target.querySelector('.list-drag-grip'))continue;const grip=document.createElement('span');grip.className='list-drag-grip';grip.setAttribute('aria-hidden','true');grip.innerHTML=artwork;target.prepend(grip)}}
 const observer=new MutationObserver(sync);for(const id of ['pages','objectList','contentOptions'])observer.observe(document.getElementById(id),{childList:true,subtree:true});sync();
})();
