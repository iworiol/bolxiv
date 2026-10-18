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
 function openGroupMenu(id,x,y){
  const item=data.phaseGroups.find(g=>g.id===id);if(!item)return;
  for(const menuId of ['phaseItemMenu','contentItemMenu','phaseContentCopyMenu']){const menu=document.getElementById(menuId);if(menu)menu.hidden=true}
  closeHelpMenu();groupMenu.replaceChildren();const owner=data,units=groupUnits(),at=units.findIndex(row=>row.dataset.groupId===id);
  for(const [action,label] of [['rename','名前変更'],['previous','前へ移動'],['next','後ろへ移動'],['delete','削除']]){
   if(action==='previous'||action==='delete'){const separator=document.createElement('div');separator.className='context-separator';separator.setAttribute('role','separator');groupMenu.append(separator)}
   const entry=button(label,()=>{
    if(boardReadOnly||phaseComparisonActive()||data!==owner)return;closeGroupMenu();
    if(action==='rename'){renameGroupInList(item);return}
    if(action==='delete'){recordHistory();data.pageGroupIds=data.pageGroupIds.map(groupId=>groupId===id?null:groupId);data.phaseGroups=data.phaseGroups.filter(g=>g.id!==id);if(data.activePhaseGroup===id)data.activePhaseGroup=null;renderAndSave();notify('グループを削除しました。フェーズは残しています');return}
    const next=units[at+(action==='previous'?-1:1)];if(!next)return;
    const transfer=new DataTransfer();transfer.setData('application/x-tactica-phase-group',id);const rect=next.getBoundingClientRect();
    next.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:rect.left+Math.max(40,rect.width/2),clientY:action==='previous'?rect.top+2:rect.bottom-2}));
   });entry.dataset.action=action;entry.setAttribute('role','menuitem');entry.disabled=boardReadOnly||phaseComparisonActive()||(action==='previous'&&at<=0)||(action==='next'&&at>=units.length-1);if(action==='delete')entry.className='context-delete';groupMenu.append(entry);
  }
  groupMenu.hidden=false;groupMenu.style.left=Math.max(8,Math.min(x,innerWidth-groupMenu.offsetWidth-8))+'px';groupMenu.style.top=Math.max(8,Math.min(y,innerHeight-groupMenu.offsetHeight-8))+'px';
 }
 document.addEventListener('pointerdown',event=>{suppressGroupClick=false;if(!groupMenu.contains(event.target))closeGroupMenu()},true);
 groupMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){closeGroupMenu();return}if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const items=[...groupMenu.querySelectorAll('button:not(:disabled)')],at=items.indexOf(document.activeElement);if(items.length)items[event.key==='Home'?0:event.key==='End'?items.length-1:(at+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus()});
 let groupHold=null,suppressGroupClick=false;
 function clearGroupHold(){if(groupHold)clearTimeout(groupHold.timer);groupHold=null}
 list.addEventListener('pointerdown',event=>{
  if(matchMedia('(max-width:850px)').matches||event.pointerType!=='touch'||event.target.closest('.phase-group-toggle,.phase-group-menu-trigger,.phase-group-range,input,textarea'))return;const row=event.target.closest('.phase-group-heading');if(!row)return;
  clearGroupHold();suppressGroupClick=false;const next={id:event.pointerId,x:event.clientX,y:event.clientY};groupHold=next;
  next.timer=setTimeout(()=>{if(groupHold!==next)return;suppressGroupClick=true;openGroupMenu(row.dataset.groupId,next.x,next.y)},450);
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
    for(const item of data.phaseGroups){if(!data.pageGroupIds.includes(item.id)){const slot=item.position??data.pages.length;item.position=remaining.filter(i=>i<slot).length+(at<remaining.filter(i=>i<slot).length?moving.length:0)}}
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
   row.draggable=!boardReadOnly&&!phaseComparisonActive();row.onpointerdown=event=>{row.draggable=!boardReadOnly&&!phaseComparisonActive()&&!event.target.closest('.phase-group-toggle,.phase-group-menu-trigger')};
   row.ondragstart=event=>{if(!row.draggable){event.preventDefault();return}event.dataTransfer.setData('application/x-tactica-phase-group',item.id);event.dataTransfer.effectAllowed='move';row.classList.add('dragging')};row.ondragend=()=>{row.classList.remove('dragging');clearDropGuide()};
   const toggle=button(item.collapsed?'＋':'−',()=>{item.collapsed=!item.collapsed;renderAndSave()});toggle.setAttribute('aria-label',item.name+(item.collapsed?'を開く':'を閉じる'));toggle.setAttribute('aria-expanded',String(!item.collapsed));
   toggle.classList.add('phase-group-toggle');const spacer=document.createElement('span');spacer.className='phase-select-check';spacer.setAttribute('aria-hidden','true');
   const count=data.pageGroupIds.filter(id=>id===item.id).length;
   const start=data.pageGroupIds.indexOf(item.id),end=data.pageGroupIds.lastIndexOf(item.id);
   const range=start<0?'0':String(start+1).padStart(2,'0')+'‐'+String(end+1).padStart(2,'0')+' ';
   const name=button('',()=>showGroup(item.id,true));name.className='phase-group-name';
   name.title=item.name+'：クリックでグループを選択、右クリック／長押しで操作メニュー';
   row.oncontextmenu=event=>{if(event.target.closest('input,textarea'))return;event.preventDefault();event.stopPropagation();openGroupMenu(item.id,event.clientX,event.clientY)};
   const number=document.createElement('span');number.className='phase-group-range';number.textContent=range.trim();const title=document.createElement('span');title.className='phase-group-title';title.textContent=item.name;name.append(number,title);
   if(!data.activePhaseGroup&&data.pageGroupIds[data.page]===item.id){const current=document.createElement('span');current.className='phase-group-current';current.textContent=String(data.page+1).padStart(2,'0');current.setAttribute('aria-label','表示中のフェーズ '+(data.page+1));name.append(current)}row.append(name);
   if(item.id===data.activePhaseGroup){const menuButton=button('…',()=>{const bounds=menuButton.getBoundingClientRect();openGroupMenu(item.id,bounds.left,bounds.bottom)});menuButton.className='phase-group-menu-trigger';menuButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';menuButton.title='グループの操作';menuButton.setAttribute('aria-label',item.name+'の操作メニュー');menuButton.setAttribute('aria-haspopup','menu');menuButton.addEventListener('pointerdown',event=>event.stopPropagation());row.append(menuButton)}
   row.append(toggle);
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
  const rows=[...list.querySelectorAll('.page-tab')];
  const sample=rows.find(row=>!row.hidden&&row.getBoundingClientRect().width>0);
  const heading=list.querySelector('.phase-group-heading');
  if(sample&&heading){const label=sample.querySelector('.page-tab-name'),style=getComputedStyle(heading);const offset=label.getBoundingClientRect().left-sample.getBoundingClientRect().left-parseFloat(style.paddingLeft)-parseFloat(style.borderLeftWidth);list.style.setProperty('--group-name-offset',Math.max(0,offset)+'px')}
  list.querySelectorAll('.phase-group-heading.group-expanded').forEach(heading=>{
   const last=rows[data.pageGroupIds.lastIndexOf(heading.dataset.groupId)];if(!last)return;
   const height=last.getBoundingClientRect().bottom-heading.getBoundingClientRect().top;
   heading.style.setProperty('--group-frame-height',Math.max(34,height)+'px');
  });
 }
 const frameObserver=new ResizeObserver(updateGroupFrames);
 const beforeRender=render;render=function(){
  arrangeGroups();
  beforeRender();drawOverview();
 };
 normalizePhaseGroups(data);render();
})();
