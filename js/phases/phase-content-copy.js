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
  menu.hidden=false;button.setAttribute('aria-expanded','true');
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
