// Shared field definitions. Per-phase arrays are rendering caches, not saved overrides.
window.Bolxiv.phaseMasters=(()=>{
 const INITIAL='initial',clone=value=>JSON.parse(JSON.stringify(value));
 const keys=['pageBoardShapes','pageFieldSizes','pageFieldBackgroundColors','pageColors','pageFieldImageIds','pageFieldTileImageIds','pageFieldImageTints','pageFieldGuides'];
 const defaults={pageBoardShapes:'square',pageFieldSizes:{width:538,height:538},pageFieldBackgroundColors:'#17212c',pageColors:'#ffffff',pageFieldImageIds:'',pageFieldTileImageIds:[],pageFieldImageTints:{color:'#000000',strength:0},pageFieldGuides:fieldGuides({},0)};
 let masters=[],masterGroups=[],selectedGroupId=null,active=false,selectedId=INITIAL,editorBoard=null,returnState=null,refreshUI=()=>{},past=[],next=[],restoring=false,confirmRemoval=()=>{};
 const freeze=value=>{Object.values(value).filter(v=>v&&typeof v==='object').forEach(freeze);return Object.freeze(value)};freeze(defaults);
 const initial=Object.freeze({id:INITIAL,name:'初期フィールド',settings:defaults});
 function units(){const valid=new Set(masterGroups.map(g=>g.id)),result=masters.filter(m=>!valid.has(m.groupId)).map(item=>({item}));for(const group of masterGroups.slice().sort((a,b)=>(a.position??1e9)-(b.position??1e9)))result.splice(Math.max(0,Math.min(result.length,group.position??result.length)),0,{group,items:masters.filter(m=>m.groupId===group.id)});return result}
 function writeUnits(value){masters=value.flatMap(unit=>unit.group?unit.items:[unit.item]);masterGroups=value.flatMap((unit,index)=>unit.group?[{...unit.group,position:index}]:[])}
 function all(){return [initial,...units().flatMap(unit=>unit.group?unit.items:[unit.item])]} 
 function get(id){return id===INITIAL?initial:masters.find(item=>item.id===id)||initial}
 function settings(board,index){return Object.fromEntries(keys.map(key=>[key,clone(board[key]?.[index]??defaults[key])]))}
 function put(board,index,value){for(const key of keys){board[key]??=[];board[key][index]=clone(value[key]??defaults[key])}}
 function clean(value){
  const result=clone(defaults);for(const key of keys)if(value&&Object.hasOwn(value,key))result[key]=clone(value[key]);
  if(!['none','square','landscape','portrait','circle','image','image4'].includes(result.pageBoardShapes))throw Error('フィールド形状が不正です');
  for(const key of ['pageColors','pageFieldBackgroundColors'])if(!/^#[0-9a-f]{6}$/i.test(result[key]))throw Error('フィールドの色が不正です');
  const size=result.pageFieldSizes;if(!size||!['width','height'].every(key=>Number.isFinite(size[key])&&size[key]>=(result.pageBoardShapes==='image4'?32:64)&&size[key]<=960))throw Error('フィールドの大きさが不正です');
  result.pageFieldGuides=fieldGuides({pageFieldGuides:[result.pageFieldGuides]},0);
  result.pageFieldImageTints=fieldImageTint({pageFieldImageTints:[result.pageFieldImageTints]},0);
  const tiles=result.pageFieldTileImageIds;
  if(!Array.isArray(tiles)||tiles.length>4||tiles.some(id=>id!==null&&typeof id!=='string'))throw Error('区画の画像参照が不正です');
  while(tiles.at(-1)==='')tiles.pop();
  if(typeof result.pageFieldImageIds!=='string')throw Error('フィールドの画像参照が不正です');return result;
 }
 function newMaster(name,value,groupId=null){const item={id:createObjectId(),name:String(name||'新規フィールド'),settings:clean(value)};if(masterGroups.some(g=>g.id===groupId))item.groupId=groupId;masters.push(item);writeUnits(units());return item}
 function ensure(board,legacy=false){
  if(board===editorBoard)return;
  if(!Array.isArray(board.pageMasterIds))board.pageMasterIds=board.pages.map((_,i)=>legacy?newMaster((board.title||'コンテンツ')+'／'+(board.pageNames?.[i]||'フェーズ'+(i+1)),settings(board,i)).id:INITIAL);
  board.pageMasterIds=board.pages.map((_,i)=>get(board.pageMasterIds[i]).id);apply(board);
 }
 function apply(board){if(board===editorBoard)return;for(let i=0;i<board.pages.length;i++)put(board,i,get(board.pageMasterIds?.[i]).settings)}
 function stripped(board){const result=clone(board);delete result.page;for(const key of keys)delete result[key];delete result.boardShape;delete result.layoutColor;delete result.fieldBackgroundColor;return result}
 function imageBoards(boards,records=masters){return [...boards,...records.map(item=>({pages:[],pageFieldImageIds:[item.settings.pageFieldImageIds,...(item.settings.pageFieldTileImageIds||[])]}))]}
 function state(){if(!active)contentBoards[activeContent]=data;return {version:5,activeContent,phaseMasters:clone(masters),phaseMasterGroups:clone(masterGroups),contents:contentBoards.map(board=>({...stripped(board),page:board.page}))}}
 function exportPayload(boards,includeUnused=false){
  const ids=new Set(boards.flatMap(board=>board.pageMasterIds||[])),records=masters.filter(item=>includeUnused||ids.has(item.id));
  return {version:5,phaseMasters:clone(records),phaseMasterGroups:clone(masterGroups.filter(group=>includeUnused||records.some(item=>item.groupId===group.id))),imageLibrary:Object.fromEntries(boardImageLibrary.entries(imageBoards(boards,records))),contents:boards.map(stripped)};
 }
 function signature(value,ignoreInactiveGuides=false){
  const v=clone(value),guides=v.pageFieldGuides;
  if(ignoreInactiveGuides&&guides){
   if(!guides.circles)for(const key of ['rings','ringScale','outerRing'])delete guides[key];
   if(!guides.rays)for(const key of ['sectors','rayMode','fieldRayLength','circleRayLength','rayLength','rayBoundary','rayScale','rotation'])delete guides[key];
   if(!guides.circles&&!guides.rays&&!guides.shapes?.length)v.pageFieldGuides={};
  }
  v.pageFieldImageIds=boardImageLibrary.get(v.pageFieldImageIds)||'';
  v.pageFieldTileImageIds=(v.pageFieldTileImageIds||[]).map(id=>id===null?null:boardImageLibrary.get(id)||'');
  const groups=new Map();if(guides?.shapes)for(const shape of guides.shapes){delete shape.id;if(shape.objectGroupId){if(!groups.has(shape.objectGroupId))groups.set(shape.objectGroupId,groups.size);shape.objectGroupId=groups.get(shape.objectGroupId)}}
  const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(key=>[key,stable(x[key])])):x;return JSON.stringify(stable(v));
 }
 function prepareImport(boards,value){
  const modern=Number(value.version)>=5,records=[],groups=[];
  if(modern){
   if(!Array.isArray(value.phaseMasters))throw Error('フィールド一覧がありません');
   for(const group of value.phaseMasterGroups||[]){if(!group||typeof group.id!=='string'||groups.some(g=>g.id===group.id))throw Error('フィールドグループのIDが不正です');groups.push({id:group.id,name:String(group.name||'新規グループ'),collapsed:group.collapsed===true,position:Number.isInteger(group.position)?group.position:groups.length})}
   const seen=new Set();for(const entry of value.phaseMasters){
    if(!entry||typeof entry.id!=='string'||entry.id===INITIAL||seen.has(entry.id))throw Error('フィールドのIDが不正です');seen.add(entry.id);
    const setting=clean(entry.settings);
    const importImage=id=>{
     if(!id)return '';
     const record=value.imageLibrary?.[id];
     if(!record||typeof record.source!=='string')throw Error('フィールドの画像がありません');
     return boardImageLibrary.register(record.source,record);
    };
    setting.pageFieldImageIds=importImage(setting.pageFieldImageIds);
    setting.pageFieldTileImageIds=setting.pageFieldTileImageIds.map(id=>id===null?null:importImage(id));
    if(entry.groupId&&!groups.some(g=>g.id===entry.groupId))throw Error('所属するフィールドグループがありません');records.push({id:entry.id,name:String(entry.name||'フィールド'),settings:setting,...(entry.groupId?{groupId:entry.groupId}:{})});
   }
   for(const board of boards){if(!Array.isArray(board.pageMasterIds)||board.pageMasterIds.length!==board.pages.length||board.pageMasterIds.some(id=>id!==INITIAL&&!seen.has(id)))throw Error('使用するフィールドがありません')}
  }else for(const board of boards){
   board.pageMasterIds=board.pages.map((_,i)=>{const record={id:createObjectId(),name:(board.title||'コンテンツ')+'／'+(board.pageNames?.[i]||'フェーズ'+(i+1)),settings:clean(settings(board,i))};records.push(record);return record.id});
  }
  for(const board of boards)for(let i=0;i<board.pages.length;i++)put(board,i,board.pageMasterIds[i]===INITIAL?defaults:records.find(item=>item.id===board.pageMasterIds[i]).settings);
  Object.defineProperty(boards,'phaseMasterImport',{value:{records,groups,modern}});return boards;
 }
 function acceptImport(boards,mode){
  const incoming=boards.phaseMasterImport;if(!incoming)return;
  if(active)leave();if(mode!=='append'){masters=[];masterGroups=[]}selectedGroupId=null;
  const remap=new Map([[INITIAL,INITIAL]]);
  const groupMap=new Map();function importGroup(id){if(!id)return null;if(!groupMap.has(id)){const original=incoming.groups?.find(g=>g.id===id);if(!original)return null;const group={...original,id:createObjectId(),position:units().length};masterGroups.push(group);groupMap.set(id,group.id)}return groupMap.get(id)}
  const layout=incoming.records.filter(item=>!item.groupId).map(item=>({item}));for(const group of (incoming.groups||[]).slice().sort((a,b)=>a.position-b.position))layout.splice(Math.max(0,Math.min(layout.length,group.position)),0,{group,items:incoming.records.filter(item=>item.groupId===group.id)});
  for(const unit of layout){if(unit.group&&!unit.items.length)importGroup(unit.group.id);for(const item of unit.group?unit.items:[unit.item]){const same=incoming.modern?all().find(existing=>signature(existing.settings)===signature(item.settings)):null;remap.set(item.id,same?.id||newMaster(item.name,item.settings,importGroup(item.groupId)).id)}}writeUnits(units());
  for(const board of boards){board.pageMasterIds=board.pageMasterIds.map(id=>remap.get(id)||INITIAL);apply(board)}
  past=[];next=[];
 }
 function capture(){return JSON.stringify({masters,masterGroups,selectedGroupId,refs:contentBoards.map(board=>board.pageMasterIds),selectedId,guideSelection:window.Bolxiv.fieldGuideEditor?.captureSelection()})}
 function record(){if(!active||restoring)return;const before=capture();if(past.at(-1)!==before)past.push(before);if(past.length>100)past.shift();next=[]}
 function masterHistory(forward){const from=forward?next:past,to=forward?past:next;if(!from.length)return;to.push(capture());const value=JSON.parse(from.pop());masters=value.masters;masterGroups=value.masterGroups||[];selectedGroupId=value.selectedGroupId||null;contentBoards.forEach((board,i)=>{board.pageMasterIds=value.refs[i]||board.pages.map(()=>INITIAL);apply(board)});selectedId=get(value.selectedId).id;restoring=true;try{showSelected();window.Bolxiv.fieldGuideEditor?.restoreSelection(value.guideSelection)}finally{restoring=false}persist()}
 function persist(){scheduleBoardSave(false)}
 function commit(){
  if(!active)return;
  const item=get(selectedId),value=selectedId!==INITIAL?clean(settings(editorBoard,0)):item.settings;
  if(selectedId===INITIAL||JSON.stringify(item.settings)===JSON.stringify(value)){if(window.BolxivSaveStatus.get('content')==='未保存')persist();return}
  item.settings=value;
  for(const board of contentBoards)for(let index=0;index<board.pages.length;index++)if(board.pageMasterIds?.[index]===item.id)put(board,index,value);
  persist();refreshUI();
 }
 function makeEditor(item){const board={title:item.name,pages:[[]],page:0,pageNames:[item.name],pageNotes:[''],pageGroupIds:[null],phaseGroups:[],pageMasterIds:[item.id],layout:'square',boardShape:item.settings.pageBoardShapes,layoutColor:item.settings.pageColors,fieldBackgroundColor:item.settings.pageFieldBackgroundColors};put(board,0,item.settings);return board}
 function showSelected(){
  const wasOpen=document.querySelector('.layout').classList.contains('phone-content-open');const guide=window.Bolxiv.fieldGuideEditor;if(guide?.active)guide.close();editorBoard=makeEditor(get(selectedId));data=editorBoard;selected=null;selectedIds=[];selectedPhaseIndexes=[];phaseSelectionOwner=data;render();guide?.open();if(wasOpen)document.querySelector('.layout').classList.add('phone-content-open');refreshUI();
 }
 function enter(){
  if(active||boardReadOnly||window.Bolxiv.pngPreview?.active)return;commitPendingHistory();flushScheduledBoardSave();
  returnState={data,selected,ids:selectedIds.slice(),phases:selectedPhaseIndexes.slice(),history,future,scrolls:[...document.querySelectorAll('#pages,#contentPanel,.battle,#boardViewport')].map(node=>[node,node.scrollTop,node.scrollLeft]),contentExpanded:document.getElementById('toggleContent').getAttribute('aria-expanded'),phonePane:document.querySelector('.layout').dataset.phonePane,phoneOpen:document.querySelector('.layout').classList.contains('phone-content-open')};
  active=true;if(document.getElementById('toggleContent').getAttribute('aria-expanded')==='false')document.getElementById('toggleContent').click();document.body.classList.add('phase-master-editing');showSelected();
 }
 function leave(){
  if(!active)return;commit();window.Bolxiv.fieldGuideEditor?.close();active=false;editorBoard=null;document.body.classList.remove('phase-master-editing');data=returnState.data;selected=returnState.selected;selectedIds=returnState.ids;selectedPhaseIndexes=returnState.phases;history=returnState.history;future=returnState.future;phaseSelectionOwner=data;
  renderAndSave();const layout=document.querySelector('.layout');layout.dataset.phonePane=returnState.phonePane;layout.classList.toggle('phone-content-open',returnState.phoneOpen);for(const [node,top,left]of returnState.scrolls){node.scrollTop=top;node.scrollLeft=left}if(document.getElementById('toggleContent').getAttribute('aria-expanded')!==returnState.contentExpanded)document.getElementById('toggleContent').click();refreshUI();returnState=null;
 }
 function select(id){if(!active)return;commit();selectedGroupId=null;selectedId=get(id).id;const group=masterGroups.find(g=>g.id===get(id).groupId);if(group)group.collapsed=false;showSelected()}
 function add(copy=false){record();const source=copy?get(selectedId).settings:defaults,groupId=selectedGroupId||get(selectedId).groupId;const item=newMaster(copy?get(selectedId).name+' コピー':'新規フィールド',source,groupId);selectedGroupId=null;selectedId=item.id;const group=masterGroups.find(g=>g.id===groupId);if(group)group.collapsed=false;showSelected();persist()}
 function cancelAddition(){masterHistory(false);next=[];refreshUI()}
 function rename(name){if(selectedId===INITIAL||!name.trim()||name.trim()===get(selectedId).name)return;record();get(selectedId).name=name.trim();editorBoard.title=name.trim();editorBoard.pageNames[0]=name.trim();refreshUI();persist()}
 function remove(confirmed=false){if(selectedId===INITIAL)return;const used=contentBoards.reduce((sum,board)=>sum+board.pageMasterIds.filter(id=>id===selectedId).length,0);if(used&&!confirmed){confirmRemoval(selectedId,used);return}record();const id=selectedId;const layout=units();for(const unit of layout)if(unit.group)unit.items=unit.items.filter(item=>item.id!==id);writeUnits(layout.filter(unit=>unit.group||unit.item.id!==id));selectedGroupId=null;for(const board of contentBoards){board.pageMasterIds=board.pageMasterIds.map(value=>value===id?INITIAL:value);apply(board)}selectedId=INITIAL;showSelected();persist()}
 function move(from,to,after){if(from===INITIAL||from===to)return;const moving=masters.find(m=>m.id===from),target=get(to);if(!moving||to===INITIAL&&after!==true)return;if(after===undefined)after=all().indexOf(moving)<all().indexOf(target);record();const layout=units();for(const unit of layout)if(unit.group)unit.items=unit.items.filter(m=>m.id!==from);let next=layout.filter(unit=>unit.group||unit.item.id!==from);if(to===INITIAL){delete moving.groupId;next.unshift({item:moving})}else{const unit=next.find(unit=>unit.group?unit.items.some(m=>m.id===to):unit.item.id===to);if(!unit)return;if(unit.group){moving.groupId=unit.group.id;unit.items.splice(unit.items.findIndex(m=>m.id===to)+(after?1:0),0,moving);unit.group.collapsed=false}else{delete moving.groupId;next.splice(next.indexOf(unit)+(after?1:0),0,{item:moving})}}writeUnits(next);refreshUI();persist()}
 function selectGroup(id){if(!masterGroups.some(g=>g.id===id))return;commit();selectedGroupId=id;refreshUI()}
 function addGroup(){record();const group={id:createObjectId(),name:'新規グループ',collapsed:false,position:units().length};masterGroups.push(group);selectedGroupId=group.id;refreshUI();persist();return group.id}
 function renameGroup(id,name){const group=masterGroups.find(g=>g.id===id);if(!group||!name.trim()||name.trim()===group.name)return;record();group.name=name.trim();refreshUI();persist()}
 function toggleGroup(id){const group=masterGroups.find(g=>g.id===id);if(!group)return;group.collapsed=!group.collapsed;refreshUI();persist()}
 function ungroup(id){if(!masterGroups.some(g=>g.id===id))return;record();const layout=units().flatMap(unit=>unit.group?.id===id?unit.items.map(item=>{delete item.groupId;return {item}}):[unit]);writeUnits(layout);if(selectedGroupId===id)selectedGroupId=null;refreshUI();persist()}
 function moveIntoGroup(from,id){const moving=masters.find(m=>m.id===from);if(!moving||!masterGroups.some(g=>g.id===id))return;record();const layout=units();for(const unit of layout)if(unit.group)unit.items=unit.items.filter(m=>m.id!==from);const next=layout.filter(unit=>unit.group||unit.item.id!==from),group=next.find(unit=>unit.group?.id===id);moving.groupId=id;group.items.push(moving);group.group.collapsed=false;writeUnits(next);refreshUI();persist()}
 function moveGroup(from,target,after=false){const layout=units(),moving=layout.find(unit=>unit.group?.id===from),to=layout.find(unit=>unit.group?.id===target||unit.group&&unit.items.some(m=>m.id===target)||unit.item?.id===target);if(!moving||moving===to)return;record();layout.splice(layout.indexOf(moving),1);layout.splice(target===INITIAL?0:to?layout.indexOf(to)+(after?1:0):layout.length,0,moving);writeUnits(layout);refreshUI();persist()}
 function moveBeforeGroup(from,id){const moving=masters.find(m=>m.id===from);if(!moving||!masterGroups.some(g=>g.id===id))return;record();const layout=units();for(const unit of layout)if(unit.group)unit.items=unit.items.filter(m=>m.id!==from);const value=layout.filter(unit=>unit.group||unit.item.id!==from);delete moving.groupId;value.splice(value.findIndex(unit=>unit.group?.id===id),0,{item:moving});writeUnits(value);refreshUI();persist()}
 function moveToEnd(from,isGroup=false){if(isGroup){moveGroup(from,null);return}const moving=masters.find(m=>m.id===from);if(!moving)return;record();const layout=units();for(const unit of layout)if(unit.group)unit.items=unit.items.filter(m=>m.id!==from);const value=layout.filter(unit=>unit.group||unit.item.id!==from);delete moving.groupId;value.push({item:moving});writeUnits(value);refreshUI();persist()}
 function mergeDuplicates(){
  if(!active)return 0;commit();const first=new Map(),remap=new Map();
  for(const item of all()){const key=signature(item.settings,true);if(first.has(key))remap.set(item.id,first.get(key));else first.set(key,item.id)}
  if(!remap.size){notify('同じ設定のフィールドはありません');return 0}
  record();for(const board of contentBoards){board.pageMasterIds=board.pageMasterIds.map(id=>remap.get(id)||id);apply(board)}
  const layout=units();for(const unit of layout)if(unit.group)unit.items=unit.items.filter(item=>!remap.has(item.id));writeUnits(layout.filter(unit=>unit.group||!remap.has(unit.item.id)));selectedId=remap.get(selectedId)||selectedId;if(!selectedGroupId){const group=masterGroups.find(g=>g.id===get(selectedId).groupId);if(group)group.collapsed=false}showSelected();persist();document.getElementById('phaseMasters').dispatchEvent(new Event('reveal-master-selection'));notify('同じ設定のフィールドを'+remap.size+'件統合しました');return remap.size;
 }
 function canCombineImagePhases(){
  if(active||boardReadOnly||window.Bolxiv.pngPreview?.active||selectedPhaseIndexes.length<2||selectedPhaseIndexes.length>4)return false;
  const first=selectedPhaseIndexes[0],id=data.pageMasterIds[first];
  return !!id&&data.pageBoardShapes[first]==='image'&&!!fieldImageSource(data,first)&&
   selectedPhaseIndexes.every(index=>data.pageMasterIds[index]===id);
 }
 function combineImagePhases(){
  if(!canCombineImagePhases())return;
  const indexes=selectedPhaseIndexes.slice().sort((a,b)=>a-b),first=indexes[0];
  const baseName='2×2 フェーズ',name=data.pageNames.includes(baseName)?nextCopiedPhaseName(baseName,data.pageNames):baseName;
  const source=settings(data,first),size=source.pageFieldSizes,guide=source.pageFieldGuides;
  const items=[],shapes=[];
  for(const [tile,index] of indexes.entries()){
   const left=(tile%2)*320,top=Math.floor(tile/2)*320,objects=clone(data.pages[index]),groups=new Map();
   for(const shape of guide.shapes){
    const copy={...shape,id:createObjectId(),x:left+shape.x/2,y:top+shape.y/2,width:shape.width/2,height:shape.height/2};
    if(shape.objectGroupId){
     if(!groups.has(shape.objectGroupId))groups.set(shape.objectGroupId,createObjectId());
     copy.objectGroupId=groups.get(shape.objectGroupId);
    }
    shapes.push(copy);
   }
   remapCopiedObjectGroups(objects);
   for(const object of objects){
    object.id=createObjectId();object.x=left/6.4+object.x/2;object.y=top/6.4+object.y/2;
    for(const key of ['width','height','fontSize','strokeWidth'])if(Number.isFinite(object[key]))object[key]/=2;
    items.push(object);
   }
  }
  const notes=indexes.map((index,tile)=>data.pageNotes[index]?['左上','右上','左下','右下'][tile]+' · '+data.pageNames[index]+'\n'+data.pageNotes[index]:'').filter(Boolean).join('\n\n');
  recordHistory();
  const master=newMaster(name,{...source,pageBoardShapes:'image4',pageFieldSizes:{width:size.width/2,height:size.height/2},
   pageFieldTileImageIds:Array.from({length:4},(_,tile)=>tile<indexes.length?'':null),
   pageFieldGuides:{...guide,reference:null,shapes}
  });
  const index=data.pages.length;
  data.pages.push(items);data.pageNames.push(name);data.pageNotes.push(notes);data.pageGroupIds.push(null);data.pageMasterIds.push(master.id);
  data.page=index;data.activePhaseGroup=null;selectedPhaseIndexes=[];selectedIds=[];selected=null;
  openPhaseListForCreation(index);renderAndSave();revealCreatedPhase(index);
  notify(indexes.length+'つのフェーズから2×2フェーズを作成しました');
 }
 function assign(id){if(active||boardReadOnly||window.Bolxiv.pngPreview?.active||phaseComparisonActive()||data.activePhaseGroup)return;recordHistory();data.pageMasterIds[data.page]=get(id).id;apply(data);renderAndSave()}
 masterGroups=(window.boardPhaseMasterGroupsInitial||[]).map(g=>({...g}));window.boardPhaseMasterGroupsInitial=null;const saved=window.boardPhaseMastersInitial||[];window.boardPhaseMastersInitial=null;
 for(const entry of saved){if(entry.id===INITIAL)continue;masters.push({id:entry.id,name:String(entry.name||'フィールド'),settings:clean(entry.settings),...(masterGroups.some(g=>g.id===entry.groupId)?{groupId:entry.groupId}:{})})}
 const original=data;for(const board of contentBoards){data=board;normalizePageNames();ensure(board,!firstRun&&!Array.isArray(board.pageMasterIds))}data=original;
 return {INITIAL,keys,all,get,ensure,apply,state,imageBoards,exportPayload,prepareImport,acceptImport,record,history:masterHistory,commit,enter,leave,select,add,cancelAddition,rename,remove,move,mergeDuplicates,assign,canCombineImagePhases,combineImagePhases,units,selectGroup,addGroup,renameGroup,toggleGroup,ungroup,moveIntoGroup,moveGroup,moveBeforeGroup,moveToEnd,groupRecords:()=>clone(masterGroups),get selectedGroupId(){return selectedGroupId},get active(){return active},get selectedId(){return selectedId},get locked(){return active&&(selectedId===INITIAL||!!selectedGroupId)},get canUndo(){return past.length>0},get canRedo(){return next.length>0},records:()=>clone(masters),restoreRecords:(value,groups=[])=>{masters=clone(value);masterGroups=clone(groups);selectedGroupId=null},paint:()=>refreshUI(),set confirmRemoval(fn){confirmRemoval=fn},set refresh(fn){refreshUI=fn},get editorBoard(){return editorBoard}};
})();

window.Bolxiv.initializePhaseMasterUI=()=>{
 let masterRowsCache=null;
 const originalName=document.getElementById('phaseNameInput');if(originalName)originalName.closest('.field').hidden=true;
 const pm=window.Bolxiv.phaseMasters,$=selector=>document.querySelector(selector),heading=$('.content-heading-row'),toggle=document.createElement('button');
 toggle.id='phaseMasterModeToggle';toggle.type='button';toggle.className='btn iconbtn content-history-button';toggle.title='フィールドへ切り替え';toggle.setAttribute('aria-label',toggle.title);toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h15l-4-4M20 17H5l4 4"/></svg>';heading.insertBefore(toggle,heading.children[1]||null);toggle.onclick=()=>pm.active?pm.leave():openUsedField();
 function sizeModeTitle(){const title=$('#toggleContent'),style=getComputedStyle(title),probe=document.createElement('span');probe.textContent='フィールド';Object.assign(probe.style,{position:'absolute',visibility:'hidden',whiteSpace:'pre',font:style.font,letterSpacing:style.letterSpacing});document.body.append(probe);let width=0;for(const label of ['コンテンツ','フィールド']){probe.textContent=label;width=Math.max(width,probe.getBoundingClientRect().width)}heading.style.setProperty('--mode-title-width',Math.ceil(width+(parseFloat(style.paddingLeft)||0)+(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.borderRightWidth)||0))+'px');probe.remove();masterRowsCache=null}sizeModeTitle();document.fonts.ready.then(sizeModeTitle);window.addEventListener('resize',sizeModeTitle);

 const listPanel=document.createElement('section');listPanel.id='phaseMasterListPanel';listPanel.className='page-controls';listPanel.innerHTML='<div class="phase-heading-row"><div class="master-list-heading" id="phaseMasterListToggle">フィールドリスト</div><div class="phase-heading-actions"><button class="page page-add" id="addPhaseMaster" title="フィールドを追加" aria-label="フィールドを追加">＋</button><button class="page page-add page-copy" id="duplicatePhaseMaster" title="フィールドを複製" aria-label="フィールドを複製"></button></div></div><div class="page-list-panel" id="phaseMasterRowsPanel"><div class="page-list-box"><div class="page-tabs" id="phaseMasters"></div></div></div>';
 $('#contentPanel').append(listPanel);$('#duplicatePhaseMaster').innerHTML=$('#copyPage').querySelector('svg').outerHTML;$('#duplicatePhaseMaster').onclick=()=>createMaster(true);
 const phase=document.createElement('div');phase.id='phaseMasterAssignment';phase.innerHTML='<div class="field"><label for="phaseMasterSelect">フィールド</label><div class="phase-field-selection"><select id="phaseMasterSelect"></select><button type="button" id="editUsedField" class="btn iconbtn" title="使用フィールドを編集" aria-label="使用フィールドを編集"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/></svg></button></div></div>';
 phase.prepend(createPropertyTextField({id:'phaseMasterPhaseName',label:'フェーズ名',onCommit(raw,event){const value=raw.trim(),original=data.pageNames[data.page];event.target.value=value||original;if(!value||value===original)return;recordHistory();data.pageNames[data.page]=value;renderAndSave()}}).field);$('#layoutPropertiesPanel').before(phase);$('#phaseMasterSelect').onchange=e=>pm.assign(e.target.value);$('#editUsedField').onclick=()=>{if(!$('#editUsedField').disabled)openUsedField()};
 function revealMasterSelection(){const reveal=()=>{const row=pm.selectedGroupId?[...$('#phaseMasters').querySelectorAll('.phase-group-heading')].find(n=>n.dataset.masterGroupId===pm.selectedGroupId):[...$('#phaseMasters').querySelectorAll('.page-tab')].find(n=>n.dataset.masterId===pm.selectedId);if(row)revealMovedListItems($('#phaseMasters'),[row])};reveal();requestAnimationFrame(reveal)}
 $('#phaseMasters').addEventListener('reveal-master-selection',revealMasterSelection);
 function openUsedField(){if(pm.active)return;const id=data.pageMasterIds?.[data.page]||pm.INITIAL;pm.enter();if(!pm.active)return;pm.select(id);revealMasterSelection()}
 const fields=$('#layoutPropertiesPanel'),guide=$('#fieldGuideEditor'),body=guide.querySelector('.guide-properties-body'),home=fields.parentNode,placeholder=document.createComment('phase master field settings');fields.before(placeholder);
 $('#editFieldGuides').hidden=true;
 const masterGroupPreview=document.createElement('section');masterGroupPreview.className='master-group-overview';masterGroupPreview.id='masterGroupPreview';masterGroupPreview.hidden=true;masterGroupPreview.setAttribute('aria-label','フィールドグループのプレビュー');$('#boardZoomSpace').append(masterGroupPreview);const previewCanvas=guide.querySelector('.guide-editor-canvas');new ResizeObserver(()=>masterGroupPreview.style.setProperty('--master-preview-scale',String(previewCanvas.clientWidth/640))).observe(previewCanvas);
 const groupSettings=document.createElement('div');groupSettings.id='masterGroupSettings';groupSettings.className='master-group-settings';groupSettings.hidden=true;groupSettings.append(createPropertyTextField({id:'masterGroupName',label:'グループ名',className:'field phase-master-name',onCommit(value,event){pm.renameGroup(pm.selectedGroupId,value);event.target.value=pm.groupRecords().find(group=>group.id===pm.selectedGroupId)?.name||''}}).field);guide.querySelector('.guide-editor-properties').append(groupSettings);
 const masterName=createPropertyTextField({id:'phaseMasterName',label:'フィールド名',className:'field phase-master-name',describedBy:'fieldUsageNote',onCommit(value,event){pm.rename(value);event.target.value=pm.get(pm.selectedId).name}}).field;const usageNote=document.createElement('p');usageNote.id='fieldUsageNote';usageNote.className='property-help';masterName.append(usageNote);body.prepend(masterName);
 const fieldFrame=document.createElement('section');fieldFrame.id='masterFieldSettings';fieldFrame.className='guide-property-frame';const fieldToggle=document.createElement('button');fieldToggle.type='button';fieldToggle.className='guide-section-toggle';fieldToggle.setAttribute('aria-expanded','true');fieldToggle.setAttribute('aria-controls','masterFieldSettingsBody');fieldToggle.innerHTML='<span>フィールド</span><span class="guide-section-mark" aria-hidden="true">−</span>';const fieldBody=document.createElement('div');fieldBody.id='masterFieldSettingsBody';fieldBody.className='guide-section-body';fieldFrame.append(fieldToggle,fieldBody);masterName.after(fieldFrame);fieldToggle.onclick=()=>{fieldBody.hidden=!fieldBody.hidden;fieldToggle.setAttribute('aria-expanded',String(!fieldBody.hidden));fieldToggle.querySelector('.guide-section-mark').textContent=fieldBody.hidden?'＋':'−'};

 const note=$('#phaseMemo');if($('#desktopPhaseSwitch')?.title.includes('ノートを表示'))$('#desktopPhaseSwitch').click();if($('#contentPanel').dataset.phaseTab!=='memo')$('#phonePhaseSwitch-toggle')?.click();if(note){note.open=true;phase.append(note)}
 const phaseHeading=document.createElement('button');phaseHeading.type='button';phaseHeading.className='accordion-toggle';phaseHeading.textContent='フェーズプロパティ';phaseHeading.setAttribute('aria-expanded','true');const phaseBody=document.createElement('div');phaseBody.className='phase-master-phase-body';phaseBody.id='phaseMasterAssignmentBody';phaseHeading.setAttribute('aria-controls',phaseBody.id);while(phase.firstChild)phaseBody.append(phase.firstChild);phase.className='accordion-group content-properties';phase.append(phaseHeading,phaseBody);$('#contentPanel').append(phase);phaseHeading.onclick=()=>{setPanelExpanded(phaseHeading,phaseBody,phaseBody.hidden,{manageDisplay:false,hiddenClass:false,frame:phase,collapsedClass:'phase-properties-collapsed'});window.dispatchEvent(new Event('phase-properties-toggle'))};
 const groupPanel=document.createElement('section');groupPanel.id='phaseMasterGroupProperties';groupPanel.className='accordion-group content-properties';const groupTitle=document.createElement('button');groupTitle.type='button';groupTitle.className='accordion-toggle';groupTitle.textContent='グループプロパティ';groupTitle.setAttribute('aria-expanded','true');groupPanel.append(groupTitle);const groupBody=document.createElement('div');groupBody.className='phase-master-phase-body';groupBody.id='phaseMasterGroupBody';groupTitle.setAttribute('aria-controls',groupBody.id);const originalGroup=$('#phaseGroupProperties');if(originalGroup)groupBody.append(originalGroup);groupBody.append(groupSettings);groupPanel.append(groupBody);$('#contentPanel').append(groupPanel);groupTitle.onclick=()=>{setPanelExpanded(groupTitle,groupBody,groupBody.hidden,{manageDisplay:false,hiddenClass:false,frame:groupPanel,collapsedClass:'phase-properties-collapsed'});window.dispatchEvent(new Event('phase-properties-toggle'))};
 let draggingMaster=null,draggingMasterGroup=null;function clearMasterDrop(){$('#phaseMasters').classList.remove('phase-drop-at-end');for(const row of $('#phaseMasters').children)row.classList.remove('drop-before','drop-after','drag-over');}$('#phaseMasters').ondragend=()=>{draggingMaster=null;draggingMasterGroup=null;clearMasterDrop()};$('#phaseMasters').ondragleave=e=>{if(!$('#phaseMasters').contains(e.relatedTarget))clearMasterDrop()};
 const masterList=$('#phaseMasters');masterList.addEventListener('dragover',e=>{if(e.target!==masterList||!e.dataTransfer.types.some(t=>['application/x-phase-master','application/x-phase-master-group'].includes(t)))return;e.preventDefault();clearMasterDrop();masterList.classList.add('phase-drop-at-end')});masterList.addEventListener('drop',e=>{if(e.target!==masterList)return;e.preventDefault();const group=e.dataTransfer.getData('application/x-phase-master-group'),item=e.dataTransfer.getData('application/x-phase-master');clearMasterDrop();if(group||item)pm.moveToEnd(group||item,!!group)});
 const deletion=createConfirmationView({id:'deletePhaseMasterDialog',cancelId:'deletePhaseMasterNo',confirmId:'deletePhaseMasterYes',captureEscape:true,onConfirm(id){if(pm.active&&id&&pm.get(id).id===id){pm.select(id);pm.remove(true)}}});
 pm.confirmRemoval=(id,count)=>deletion.show('フィールド「'+pm.get(id).name+'」は'+count+'フェーズで使用されています。削除すると使用先は初期フィールドに切り替わります。削除しますか？',id);
 const menu=document.createElement('div');menu.id='phaseMasterMenu';menu.className='object-context-menu';menu.hidden=true;menu.setAttribute('role','menu');document.body.append(menu);
 function createMaster(copy){pm.add(copy);renameInList(pm.selectedId,true)}
 function renameInList(id,addition=false,isGroup=false){
 const row=document.querySelector(isGroup?'[data-master-group-id="'+id+'"]':'[data-master-id="'+id+'"]');if(!row||id===pm.INITIAL)return;
 beginListNameEdit({row,list:$('#phaseMasters'),value:isGroup?pm.groupRecords().find(g=>g.id===id).name:pm.get(id).name,label:isGroup?'グループ名':'フィールド名',inputClass:isGroup?'phase-group-rename':'page-tab-input',group:isGroup,addition,cancelButton:row.querySelector(isGroup?'.phase-group-ungroup':'.page-tab-x'),additionLabel:isGroup?'グループ':'フィールド',onFinish(commit,value){if(!commit&&addition){pm.cancelAddition();return}if(commit&&value){if(isGroup)pm.renameGroup(id,value);else pm.rename(value)}else pm.paint()}});
 }
 function closeMenu(){menu.hidden=true}
 function openMenu(event,id,opener=null){event.preventDefault();const anchor=(opener||event.target).getBoundingClientRect();pm.select(id);menu.replaceChildren();for(const [label,action,disabled]of [['名前変更',()=>renameInList(id),id===pm.INITIAL],['複製',()=>createMaster(true),false],['前へ移動',()=>{const a=pm.all(),at=a.findIndex(item=>item.id===id);pm.move(id,a[at-1].id)},pm.all().findIndex(item=>item.id===id)<=1],['後ろへ移動',()=>{const a=pm.all(),at=a.findIndex(item=>item.id===id);pm.move(id,a[at+1].id)},id===pm.INITIAL||pm.all().at(-1).id===id],['削除',()=>pm.remove(),id===pm.INITIAL]]){const button=createMenuAction({label,disabled,destructive:label==='削除',shortcut:label==='名前変更'?'F2':null,onInvoke(){closeMenu();action()}});menu.append(button)}addPhoneMenuClose(menu,closeMenu);menu.hidden=false;const r=anchor;menu.style.left=Math.max(4,Math.min(event.clientX||r.left,innerWidth-menu.offsetWidth-4))+'px';menu.style.top=Math.max(4,Math.min(event.clientY||r.bottom,innerHeight-menu.offsetHeight-4))+'px';menu.querySelector('button:not(:disabled)')?.focus()}
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))closeMenu()},true);
 function createMasterGroup(){const id=pm.addGroup();renameInList(id,true,true)}
 function addMenu(trigger,id,items,isMaster=false){const popup=document.createElement('div');popup.id=id;popup.className='object-context-menu phase-copy-menu';popup.hidden=true;popup.setAttribute('role','menu');document.body.append(popup);const caret=document.createElement('span');caret.className='phase-copy-caret';caret.textContent='▾';caret.setAttribute('aria-hidden','true');trigger.append(caret);trigger.classList.add('add-menu-trigger');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id);trigger.title=isMaster?'フィールドの追加・整理':'フェーズの追加';trigger.setAttribute('aria-label',trigger.title);let owner=null;
 const blocked=()=>trigger.disabled||boardReadOnly||phaseComparisonActive()||!!window.Bolxiv.pngPreview?.active||(isMaster?!pm.active:pm.active);
 function close(focus=false){popup.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true})}
 for(const [label,action,key]of items){if(!label){const separator=document.createElement('div');separator.className='context-separator';separator.setAttribute('role','separator');popup.append(separator);continue}const button=createMenuAction({label,onInvoke(){close();if(!blocked()&&data===owner)action()}});button.dataset.addAction=key;popup.append(button)}
 trigger.onclick=()=>{if(!popup.hidden){close();return}if(blocked())return;owner=data;addPhoneMenuClose(popup,()=>close(true));popup.hidden=false;trigger.setAttribute('aria-expanded','true');const r=trigger.getBoundingClientRect();popup.style.left=Math.max(8,Math.min(r.left,innerWidth-popup.offsetWidth-8))+'px';popup.style.top=Math.max(8,r.bottom+4+popup.offsetHeight<=innerHeight?r.bottom+4:r.top-popup.offsetHeight-4)+'px'};
 trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();if(popup.hidden)trigger.click();popup.querySelector('button:not(:disabled)')?.focus()}});document.addEventListener('pointerdown',e=>{if(!popup.contains(e.target)&&!trigger.contains(e.target))close()},true);window.addEventListener('keydown',e=>{if(!popup.hidden&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close(true)}},true);window.addEventListener('resize',()=>close());
 }
 const directPhaseAdd=$('#addPage').onclick,directPhaseGroup=$('#addPhaseGroup').onclick;$('#addPhaseGroup').hidden=true;$('#addPhaseGroup').style.setProperty('display','none','important');addMenu($('#addPage'),'phaseAddMenu',[['フェーズを追加',()=>directPhaseAdd.call($('#addPage')),'item'],['グループを追加',()=>directPhaseGroup.call($('#addPhaseGroup')),'group']]);addMenu($('#addPhaseMaster'),'masterAddMenu',[['フィールドを追加',()=>createMaster(false),'item'],['グループを追加',createMasterGroup,'group'],[null],['同じ設定のフィールドを統合',()=>pm.mergeDuplicates(),'merge']],true);
 function masterGroupMenu(event,id,opener){event.preventDefault();const r=(opener||event.target).getBoundingClientRect();pm.selectGroup(id);menu.replaceChildren();const units=pm.units(),at=units.findIndex(u=>u.group?.id===id),target=unit=>unit.group?.id||unit.item.id;
 for(const [label,action,disabled]of [['名前変更',()=>renameInList(id,false,true),false],['前へ移動',()=>pm.moveGroup(id,target(units[at-1]),false),at<=0],['後ろへ移動',()=>pm.moveGroup(id,target(units[at+1]),true),at===units.length-1],['グループ解除',()=>pm.ungroup(id),false]]){const button=createMenuAction({label,disabled,shortcut:label==='名前変更'?'F2':null,onInvoke(){closeMenu();action()}});menu.append(button)}addPhoneMenuClose(menu,closeMenu);menu.hidden=false;menu.style.left=Math.max(4,Math.min(event.clientX||r.left,innerWidth-menu.offsetWidth-4))+'px';menu.style.top=Math.max(4,Math.min(event.clientY||r.bottom,innerHeight-menu.offsetHeight-4))+'px';menu.querySelector('button:not(:disabled)')?.focus();
 }
 function renderMasterGroups(){if($('#phaseMasters .page-tab-input,#phaseMasters .phase-group-rename'))return;const list=$('#phaseMasters'),rows=new Map([...list.querySelectorAll('.page-tab')].map(row=>[row.dataset.masterId,row])),output=[rows.get(pm.INITIAL)];
 for(const unit of pm.units()){if(!unit.group){output.push(rows.get(unit.item.id));continue}const group=unit.group,{row,grip,toggle,name,title,remove}=createListGroupView({name:group.name,active:pm.selectedGroupId===group.id,collapsed:group.collapsed,onToggle:()=>pm.toggleGroup(group.id),onSelect:()=>pm.selectGroup(group.id),onUngroup:()=>pm.ungroup(group.id),ungroupTitle:'グループ解除（フィールドは残します）',ungroupLabel:group.name+'のグループ解除'});row.dataset.masterGroupId=group.id;row.dataset.groupId=group.id;row.classList.toggle('group-expanded',!group.collapsed&&!!unit.items.length);row.classList.toggle('contains-active-phase',!pm.selectedGroupId&&unit.items.some(item=>item.id===pm.selectedId));row.title=group.name+'：右クリック／長押しで操作メニュー';row.draggable=matchMedia('(min-width:851px)').matches;row.ondragstart=e=>{if(!row.draggable||e.target.closest('input,textarea,.phase-group-toggle,.phase-group-ungroup,.phase-group-menu-trigger')){e.preventDefault();return}draggingMasterGroup=group.id;e.dataTransfer.setData('application/x-phase-master-group',group.id);e.dataTransfer.effectAllowed='move'};
 if(pm.selectedGroupId===group.id){const more=document.createElement('button');more.type='button';more.className='phase-group-menu-trigger';more.textContent='…';more.setAttribute('aria-label',group.name+'の操作メニュー');more.onclick=e=>masterGroupMenu(e,group.id,more);row.insertBefore(more,remove)}
 row.oncontextmenu=e=>{if(!e.target.closest('input,textarea'))masterGroupMenu(e,group.id,row)};
 row.ondragover=e=>{if(!e.dataTransfer.types.some(type=>['application/x-phase-master','application/x-phase-master-group'].includes(type)))return;clearMasterDrop();const fromGroup=draggingMasterGroup||e.dataTransfer.getData('application/x-phase-master-group');if(fromGroup===group.id)return;e.preventDefault();e.dataTransfer.dropEffect='move';const before=e.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;row.classList.add(before?'drop-before':'drag-over')};
 row.ondrop=e=>{e.preventDefault();e.stopPropagation();const fromGroup=e.dataTransfer.getData('application/x-phase-master-group')||draggingMasterGroup,from=e.dataTransfer.getData('application/x-phase-master')||draggingMaster,before=e.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;clearMasterDrop();if(fromGroup)pm.moveGroup(fromGroup,group.id,!before);else if(before)pm.moveBeforeGroup(from,group.id);else pm.moveIntoGroup(from,group.id);draggingMaster=draggingMasterGroup=null};output.push(row);
 unit.items.forEach((item,index)=>{const child=rows.get(item.id);child.classList.add('group-member');child.classList.toggle('group-member-last',index===unit.items.length-1);child.hidden=group.collapsed;output.push(child)});
 }
 list.replaceChildren(...output.filter(Boolean));requestAnimationFrame(()=>{const sample=list.querySelector('.page-tab'),heading=list.querySelector('.phase-group-heading');if(sample&&heading){const label=sample.querySelector('.page-tab-name'),style=getComputedStyle(heading);list.style.setProperty('--group-name-offset',Math.max(0,label.getBoundingClientRect().left-sample.getBoundingClientRect().left-parseFloat(style.paddingLeft)-parseFloat(style.borderLeftWidth))+'px')}for(const header of list.querySelectorAll('.phase-group-heading.group-expanded')){const members=[...list.querySelectorAll('.group-member')].filter(row=>pm.get(row.dataset.masterId).groupId===header.dataset.masterGroupId),last=members.at(-1);if(last){header.style.setProperty('--group-header-height',header.offsetHeight+'px');header.style.setProperty('--group-frame-height',(last.getBoundingClientRect().bottom-header.getBoundingClientRect().top)+'px')}}});
 }
 function reuseMasterRows(items,signature){
  const list=$('#phaseMasters'),cache=masterRowsCache;
  return !!cache&&cache.signature===signature&&!list.querySelector('.renaming')&&cache.items.length===items.length&&cache.items.every((item,index)=>item===items[index])&&cache.nodes.length===list.children.length&&cache.nodes.every((node,index)=>node===list.children[index]);
 }
 function updateMasterOptions(select,items){
  const signature=JSON.stringify(items.map(item=>[item.id,item.name])),cache=select._phaseMasterOptions;
  if(cache?.signature===signature&&cache.nodes.length===select.options.length&&cache.nodes.every((node,index)=>node===select.options[index]&&node.value===items[index].id&&node.textContent===items[index].name))return;
  const nodes=items.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.name;return option});select.replaceChildren(...nodes);select._phaseMasterOptions={signature,nodes};
 }
 const tileNames=['左上','右上','左下','右下'];
 const tileControls=document.createElement('div');
 tileControls.className='field image4-image-controls';
 const imageAction=(key,label,path)=>'<button type="button" class="btn" data-'+key+' title="'+label+'" aria-label="'+label+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg></button>';
 tileControls.innerHTML='<label>フィールド区画</label><div class="image4-image-actions" role="group" aria-label="区画の画像操作">'+
  imageAction('common','共通画像を差し替え','M3 3h18v18H3z M3 12h18 M12 3v18 M14 17l2-2 3 3')+
  '<span class="image4-action-separator" aria-hidden="true"></span>'+
  imageAction('replace','選択区画の画像を差し替え','M3 3h18v18H3z M3 17l5-5 4 4 3-3 6 6 M15 8h2')+
  imageAction('reset','選択区画を共通画像に戻す','M4 10h10a5 5 0 0 1 0 10H9 M4 10l5-5 M4 10l5 5')+
  imageAction('empty','選択区画を画像なしにする','M3 3h18v18H3z M5 19 19 5')+
  '</div><div class="image4-image-choices" role="group" aria-label="画像を編集する区画"></div>';
 fields.querySelector('#boardShapeInput').closest('.field').after(tileControls);
 const choices=tileControls.querySelector('.image4-image-choices');
 const replace=tileControls.querySelector('[data-replace]'),reset=tileControls.querySelector('[data-reset]'),empty=tileControls.querySelector('[data-empty]');
 let selectedTile=0,tileOwner=null;
 const tiles=tileNames.map((name,index)=>{
  const button=document.createElement('button');
  button.type='button';button.className='image4-quadrant';
  choices.append(button);
  button.onclick=()=>{selectedTile=index;refreshTileControls()};
  return {button,name};
 });
 function refreshTileControls(){
  tileControls.hidden=!pm.active||activeBoardShape()!=='image4'||!!pm.selectedGroupId;
  if(tileControls.hidden)return;
  if(tileOwner!==pm.selectedId){tileOwner=pm.selectedId;selectedTile=0}
  const ids=data.pageFieldTileImageIds?.[data.page]||[];
  for(const [index,{button,name}] of tiles.entries()){
   button.textContent=name+' · '+(ids[index]===null?'なし':ids[index]?'個別':'共通');
   button.setAttribute('aria-pressed',String(index===selectedTile));button.disabled=pm.locked;
  }
  replace.disabled=pm.locked;reset.disabled=pm.locked||(!ids[selectedTile]&&ids[selectedTile]!==null);
  empty.disabled=pm.locked||ids[selectedTile]===null;
  tileControls.querySelector('[data-common]').disabled=pm.locked;
 }
 function chooseTileImage(mode){
  if(tileControls.hidden||pm.locked)return;
  fieldImageInput.dataset.mode=mode;
  fieldImageInput.value='';fieldImageInput.click();
 }
 tileControls.querySelector('[data-common]').onclick=()=>chooseTileImage('image4-common');
 replace.onclick=()=>chooseTileImage('image4-tile-'+selectedTile);
 function setTileImage(value){
  pm.record();
  const ids=data.pageFieldTileImageIds[data.page];
  while(ids.length<=selectedTile)ids.push('');
  ids[selectedTile]=value;
  renderAndSave();
 }
 reset.onclick=()=>{if(!tileControls.hidden&&!reset.disabled)setTileImage('')};
 empty.onclick=()=>{if(!tileControls.hidden&&!empty.disabled)setTileImage(null)};
 function refresh(){
  const focusedMaster=document.activeElement?.matches('#phaseMasters .page-tab')?document.activeElement.dataset.masterId:null;
  const active=pm.active;masterGroupPreview.hidden=!(active&&pm.selectedGroupId);const embeddedPreview=matchMedia('(min-width:851px)').matches;masterGroupPreview.classList.toggle('master-preview-embedded',embeddedPreview);const previewHost=embeddedPreview?previewCanvas:$('#boardZoomSpace');if(masterGroupPreview.parentNode!==previewHost)previewHost.append(masterGroupPreview);if(!masterGroupPreview.hidden)window.Bolxiv.drawGroupPreview(masterGroupPreview,pm.groupRecords().find(g=>g.id===pm.selectedGroupId).name,'フィールドグループ');const resizeBar=$('#phasePropertyResize');if(active){resizeBar.style.setProperty('display','none','important');resizeBar.dataset.masterHidden='true'}else if(resizeBar.dataset.masterHidden){resizeBar.style.removeProperty('display');delete resizeBar.dataset.masterHidden}const phoneReading=boardReadOnly&&matchMedia('(max-width:850px)').matches&&!window.Bolxiv.pngPreview?.active;if(note&&matchMedia('(min-width:851px)').matches&&!window.Bolxiv.pngPreview?.active&&note.parentNode!==phaseBody)phaseBody.append(note);if(note&&!phoneReading&&!window.Bolxiv.pngPreview?.active)note.open=true;phase.hidden=active||!!data.activePhaseGroup;const groupWasHidden=groupPanel.hidden;groupPanel.hidden=active?!pm.selectedGroupId:!data.activePhaseGroup;if(originalGroup){originalGroup.style.setProperty('display',active?'none':'flex','important')}if(groupWasHidden!==groupPanel.hidden)window.dispatchEvent(new Event('phase-properties-toggle'));toggle.setAttribute('aria-pressed',String(active));toggle.title=active?'コンテンツへ切り替え':'フィールドへ切り替え';toggle.setAttribute('aria-label',toggle.title);toggle.disabled=!active&&(boardReadOnly||!!window.Bolxiv.pngPreview?.active);$('#toggleContent').textContent=active?'フィールド':'コンテンツ';listPanel.hidden=!active;
  if(active){const items=pm.all(),usage=new Map();for(const board of contentBoards)for(const id of board.pageMasterIds||[])usage.set(id,(usage.get(id)||0)+1);const rowsSignature=JSON.stringify([pm.selectedId,pm.selectedGroupId,matchMedia('(max-width:850px)').matches,pm.groupRecords(),items.map(item=>[item.id,item.name,item.groupId,usage.get(item.id)||0])]);for(const id of ['gridToggle','fieldToggle','clipToggle'])$('#'+id).disabled=!!pm.selectedGroupId;if(fields.parentNode!==fieldBody)fieldBody.append(fields);fields.hidden=false;fields.inert=pm.locked;for(const control of fields.querySelectorAll('input,select,button'))if(pm.locked)control.disabled=true;for(const control of guide.querySelectorAll('.guide-editor-tools button'))control.disabled=pm.locked;masterName.hidden=false;const usedBy=usage.get(pm.selectedId)||0;$('#fieldUsageNote').textContent=pm.selectedId===pm.INITIAL?'初期フィールドは編集できません':usedBy?'使用中：'+usedBy+'フェーズ（変更はすべてに反映）':'使用中：0フェーズ';$('#phaseMasterName').disabled=pm.locked;if(document.activeElement!==$('#phaseMasterName'))$('#phaseMasterName').value=pm.get(pm.selectedId).name;
   const title='フィールド：'+pm.get(pm.selectedId).name;$('#selectionTitle').textContent=title;$('#guideEditorTitle').textContent=title;guide.querySelector('.guide-properties-title').childNodes[0].textContent='フィールドプロパティ';
   if(!$('#phaseMasters .page-tab-input,#phaseMasters .phase-group-rename')&&!reuseMasterRows(items,rowsSignature)){$('#phaseMasters').replaceChildren(...items.map((item,index)=>{const {row,index:number,label:name,action:more}=createListItemView({model:{name:item.name,number:(usage.get(item.id)||0),active:!pm.selectedGroupId&&item.id===pm.selectedId,selected:!pm.selectedGroupId&&item.id===pm.selectedId},select:()=>pm.select(item.id),resolveRow:()=>[...$('#phaseMasters').querySelectorAll('.page-tab')].find(row=>row.dataset.masterId===item.id),ignoreSelect:'.page-tab-x,input,textarea',keyboardTargetOnly:true,stopActionPropagation:false,action:e=>{if(matchMedia('(max-width:850px)').matches)openMenu(e,item.id,more);else{pm.select(item.id);pm.remove()}},context:e=>openMenu(e,item.id)});row.dataset.masterId=item.id;row.title=item.name+'\nクリックで選択、右クリック／長押しで操作メニュー'+(item.id===pm.INITIAL?'':'、ドラッグで並べ替え');row.draggable=index>0&&matchMedia('(min-width:851px)').matches;row.ondragstart=e=>{if(e.target.closest('input,.page-tab-x')){e.preventDefault();return}draggingMaster=item.id;e.dataTransfer.setData('application/x-phase-master',item.id);e.dataTransfer.effectAllowed='move'};const usageCount=(usage.get(item.id)||0);number.textContent=String(usageCount).padStart(2,'0');number.title=usageCount+'フェーズで使用';number.setAttribute('aria-label',number.title);number.draggable=index>0;number.ondragstart=e=>{draggingMaster=item.id;e.dataTransfer.setData('application/x-phase-master',item.id);e.dataTransfer.effectAllowed='move'};name.title=item.name;const phone=matchMedia('(max-width:850px)').matches;more.className=phone?'page-tab-x phone-row-actions':'page-tab-x';more.textContent=phone?'…':'×';more.disabled=!phone&&item.id===pm.INITIAL;if(more.disabled){more.style.visibility='hidden';more.setAttribute('aria-hidden','true')}more.setAttribute('aria-label',item.name+(phone?'の操作':'を削除'));row.ondragover=e=>{if(!e.dataTransfer.types.some(type=>['application/x-phase-master','application/x-phase-master-group'].includes(type)))return;clearMasterDrop();if(e.dataTransfer.types.includes('application/x-phase-master-group')&&item.groupId)return;const after=e.clientY>=row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;const source=draggingMaster||e.dataTransfer.getData('application/x-phase-master');if(item.id===source||item.id===pm.INITIAL&&!after)return;e.preventDefault();e.dataTransfer.dropEffect='move';row.classList.add(after?'drop-after':'drop-before')};row.ondrop=e=>{e.preventDefault();if(e.dataTransfer.types.includes('application/x-phase-master-group')){const after=e.clientY>=row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;clearMasterDrop();pm.moveGroup(e.dataTransfer.getData('application/x-phase-master-group')||draggingMasterGroup,item.id,after);return}if(!e.dataTransfer.types.includes('application/x-phase-master'))return;const after=e.clientY>=row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;clearMasterDrop();pm.move(e.dataTransfer.getData('application/x-phase-master')||draggingMaster,item.id,after);draggingMaster=null};return row}));
   renderMasterGroups();masterRowsCache={signature:rowsSignature,items:items.slice(),nodes:[...$('#phaseMasters').children]};}document.body.classList.toggle('master-group-selected',!!pm.selectedGroupId);groupSettings.hidden=!pm.selectedGroupId;if(pm.selectedGroupId){const group=pm.groupRecords().find(g=>g.id===pm.selectedGroupId);if(document.activeElement!==$('#masterGroupName'))$('#masterGroupName').value=group.name;$('#selectionTitle').textContent='フィールドグループ：'+group.name;$('#guideEditorTitle').textContent='フィールドグループ：'+group.name;}$('#duplicatePhaseMaster').disabled=!!pm.selectedGroupId;body.classList.toggle('phase-master-locked',pm.locked);body.inert=pm.locked;updateHistoryButtons();
  }else{document.body.classList.remove('master-group-selected');groupSettings.hidden=true;body.inert=false;if(fields.parentNode!==home)placeholder.after(fields);fields.hidden=true;fields.inert=false;masterName.hidden=true;const select=$('#phaseMasterSelect');updateMasterOptions(select,pm.all());select.value=data.pageMasterIds?.[data.page]||pm.INITIAL;select.disabled=boardReadOnly||!!window.Bolxiv.pngPreview?.active||phaseComparisonActive()||!!data.activePhaseGroup;if(document.activeElement!==$('#phaseMasterPhaseName'))$('#phaseMasterPhaseName').value=data.pageNames[data.page];$('#phaseMasterPhaseName').disabled=select.disabled;$('#editUsedField').disabled=select.disabled;}
  refreshTileControls();
  if(active&&focusedMaster&&document.activeElement===document.body)[...$('#phaseMasters').querySelectorAll('.page-tab')].find(row=>row.dataset.masterId===focusedMaster)?.focus({preventScroll:true});
 }
 window.addEventListener('keydown',event=>{
 if(event.key!=='F2'||event.repeat||event.ctrlKey||event.altKey||event.metaKey||!matchMedia('(min-width:851px)').matches||boardReadOnly||phaseComparisonActive()||window.Bolxiv.pngPreview?.active)return;
 const target=event.target;if(target.closest('#contentOptions,#contentSelect'))return;if(target.closest('input,textarea,select,[contenteditable="true"],[role="menu"]')||document.querySelector('dialog[open]:not(#fieldGuideEditor)'))return;
 let rename;
 if(pm.active){if(pm.selectedGroupId)rename=()=>renameInList(pm.selectedGroupId,false,true);else if(pm.selectedId!==pm.INITIAL)rename=()=>renameInList(pm.selectedId)}

 else if(target.closest('#userPresetManager .preset-manager-row'))rename=()=>target.closest('.preset-manager-row').dispatchEvent(new Event('rename-item'));
 else if(data.activePhaseGroup){const row=[...document.querySelectorAll('#pages .phase-group-heading')].find(row=>row.dataset.groupId===data.activePhaseGroup);if(row)rename=()=>row.dispatchEvent(new Event('rename-item'))}
 else if(!target.closest('#contentPanel')&&selectedObjectGroup().length)rename=()=>beginObjectGroupRename(selectedObjectGroup()[0].objectGroupId);
 else rename=()=>beginPageRename(document.querySelectorAll('#pages .page-tab')[data.page]);
 if(rename){event.preventDefault();event.stopImmediatePropagation();rename()}
 },true);
 window.bindTouchListReorder?.(['phaseMasters','.page-tab,.phase-group-heading','.phase-group-range,.phase-group-menu-trigger,.page-tab:not(.renaming) .page-index[draggable="true"],.page-tab:not([data-master-id="initial"]):not(.renaming) .phone-row-actions','application/x-phase-master']);
 document.getElementById('contextRenameObjectGroup').dataset.shortcut='F2';
 for(const button of document.querySelectorAll('#toggleBattlePages,#toggleLayers,#toggleInspector,#phaseMasterAssignment>.accordion-toggle,#phaseMasterGroupProperties>.accordion-toggle,#fieldGuideEditor .guide-section-toggle'))button.classList.add('panel-disclosure');
 pm.refresh=refresh;refresh();window.dispatchEvent(new Event('phase-properties-toggle'));
 // Compare the complete current-format state against the original stored data.
 boardSaveSuspended=false;save();
 const originalRender=render;render=function(...args){if(!pm.active)pm.ensure(data);const result=originalRender(...args);refresh();return result};
 document.addEventListener('keydown',event=>{if(!pm.active||event.target.closest('input,textarea,select'))return;if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){event.preventDefault();event.stopImmediatePropagation();pm.history(event.key.toLowerCase()==='y'||event.shiftKey)}},true);
};
