// ===== js/images.js =====
// images: shared function declarations; initialized by bolxiv.js in the documented order.
function linearKnockbackSvg(color,id){const paths=Array.from({length:4},(_,row)=>Array.from({length:3},(_,col)=>{const x=28+col*32,y=20+row*22;return '<path d="M'+(x-11)+' '+(y+6)+'L'+x+' '+y+'L'+(x+11)+' '+(y+6)+'"/>'}).join('')).join('');return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" aria-hidden="true"><defs><filter id="'+id+'" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter></defs><g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="'+color+'" stroke-width="13" filter="url(#'+id+')" opacity=".9">'+paths+'</g><g stroke="'+color+'" stroke-width="8">'+paths+'</g><g stroke="#fff4bf" stroke-width="3">'+paths+'</g></g></svg>'}

function knockbackSvg(color,id){const rays=Array.from({length:10},(_,i)=>'<g transform="rotate('+i*36+' 100 100)">'+[[28,3.5,4,1.7],[36,4.8,5,2],[48,7,7,2.7],[65,10,9,4],[80,12,10,4.6]].map(([r,w,h,t])=>'<path d="M'+(100-w)+' '+(100-r+h)+'L100 '+(100-r)+'L'+(100+w)+' '+(100-r+h)+'" stroke-width="'+t+'"/>').join('')+'</g>').join('');return '<svg viewBox="0 0 200 200" aria-hidden="true"><defs><filter id="'+id+'" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4"/></filter></defs><g fill="none" stroke-linecap="square" stroke-linejoin="miter"><g stroke="'+color+'" filter="url(#'+id+')" opacity=".95">'+rays.replace(/stroke-width="([\d.]+)"/g,(_,w)=>'stroke-width="'+(Number(w)+13)+'"')+'</g><g stroke="'+color+'" opacity=".9">'+rays.replace(/stroke-width="([\d.]+)"/g,(_,w)=>'stroke-width="'+(Number(w)+5)+'"')+'</g><g stroke="#fff3c4">'+rays+'</g></g></svg>'}

function fieldImageSource(board=data,index=board.page){return boardImageLibrary.get(board.pageFieldImageIds?.[index])}

function objectImageSource(object){return object.imageId?boardImageLibrary.get(object.imageId):embeddedPngs[object.src]||object.src}

function migrateBoardImages(board,externalLibrary){
 const resolve=id=>{
  if(!id)return '';
  if(externalLibrary){const record=Object.hasOwn(externalLibrary,id)?externalLibrary[id]:null;if(!record||typeof record.source!=='string')throw new Error('画像ライブラリの参照先が見つかりません：'+id);return boardImageLibrary.register(record.source,record)}
  boardImageLibrary.requireImage(id);return id;
 };
 board.pageFieldImageIds=board.pages.map((_,i)=>{
  const image=board.pageFieldImageIds?.[i]??board.pageFieldImages?.[i]??'';
  return typeof image==='string'&&image.startsWith('data:image/')?boardImageLibrary.register(image):resolve(image);
 });
 delete board.pageFieldImages;
 let changedPages=false;const pages=board.pages.map(page=>{let changed=false;const objects=page.map(object=>{
  if(object.imageId){const id=resolve(object.imageId);if(id===object.imageId)return object;changed=true;return {...object,imageId:id}};
  if(typeof object.src==='string'&&object.src.startsWith('data:image/')){changed=true;const {src,...rest}=object;return {...rest,imageId:boardImageLibrary.register(src)}}
  return object;
 });if(changed){changedPages=true;return objects}return page;});
 if(changedPages)board.pages=pages;
 return board;
}

function iconPath(name,folder){if(folder==='00_ROLE'&&name==='MeleeDPS')return 'assets/job-icons/00_ROLE/MeleeDPS.svg';if(folder==='00_ROLE'&&name==='RangedDPS')return 'assets/job-icons/00_ROLE/RangedDPS.svg';if(folder==='field-marker-transparent'&&['1','2','3','4'].includes(name))return 'assets/field-marker-transparent/'+name+'.svg';if(folder==='field-marker-transparent'&&['b','c','d'].includes(name))return 'assets/field-marker-transparent/'+name+'.svg';if(folder==='field-marker-transparent'&&name==='a')return 'assets/field-marker-transparent/a.svg';if(folder==='field-marker-transparent'&&name==='1')return 'assets/field-marker-transparent/1.svg';let root=folder==='target-marker'||folder.startsWith('field-marker')?'assets':'assets/job-icons';return `${root}/${folder}/${name}.png`}

function isBossObject(o){return o.type==='icon'&&['大ボス','中ボス','小ボス'].includes(o.iconName)}

function bossDefaultColor(name){return {'大ボス':'#6b247d','中ボス':'#235b9c','小ボス':'#c8202d'}[name]||'#6b247d'}

function bossIconSource(o){const template=bossIconTemplates[o.iconName];if(!template)return isTowerObject(o)?towerIconSource(o):objectImageSource(o);const base=/^#[0-9a-f]{6}$/i.test(o.color)?o.color:bossDefaultColor(o.iconName);let svg=template;if(base.toLowerCase()!==bossDefaultColor(o.iconName)){const tint=amount=>'#'+[1,3,5].map(i=>Math.round(parseInt(base.slice(i,i+2),16)*(1-amount)+255*amount).toString(16).padStart(2,'0')).join('');const palette={'大ボス':['#6b247d','#e5a4ff','#f2c8ff'],'中ボス':['#235b9c','#8bc8ff','#d8efff'],'小ボス':['#c8202d','#ff7b83','#ffd9dc']}[o.iconName];const colors=[base,tint(.55),tint(.8)];svg=svg.replace(/#[0-9a-f]{6}/gi,color=>{const index=palette.indexOf(color.toLowerCase());return index<0?color:colors[index]})}return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}

function isTowerObject(o){return o.type==='icon'&&/^(塔踏み[1-4]|塔ふみ1)$/.test(o.iconName||'')}

function towerIconSource(o){const base=/^#[0-9a-f]{6}$/i.test(o.color)?o.color:'#f39c12';const tint=(amount,toward=255)=>'#'+[1,3,5].map(i=>Math.round(parseInt(base.slice(i,i+2),16)*(1-amount)+toward*amount).toString(16).padStart(2,'0')).join('');const colors={'#f39c12':base,'#fad59b':tint(.58),'#b6750e':tint(.25,0)};const count=Math.max(1,Math.min(4,Number(String(o.iconName||'').slice(-1))||1));const svg=towerIconTemplates[count].replace(/#[0-9a-f]{6}/gi,color=>colors[color.toLowerCase()]||color);return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}

;
// ===== js/phases.js =====
// phases: shared function declarations; initialized by bolxiv.js in the documented order.
function phaseComparisonLayout(count=selectedPhaseIndexes.length){const cellSize=count===1?640:320,columns=count===1?1:count<=4?2:count<=9?3:4,rows=count===1?1:count<=4?2:count<=9?3:Math.max(2,Math.ceil(count/columns));return {columns,rows,cellSize,width:columns*cellSize,height:rows*cellSize}}

function phaseComparisonActive(){return !phaseComparisonRendering&&selectedPhaseIndexes.length>1}

function selectPhase(index,extend=false){if(!Number.isInteger(index)||index<0||index>=data.pages.length)return;const previousPage=data.page;if(phaseSelectionOwner!==data){phaseSelectionOwner=data;selectedPhaseIndexes=[]}if(!extend){data.page=index;selectedPhaseIndexes=[]}else if(selectedPhaseIndexes.includes(index)){selectedPhaseIndexes=selectedPhaseIndexes.filter(i=>i!==index)}else{if(selectedPhaseIndexes.length>=12){document.querySelectorAll('#pages .phase-select-check').forEach((check,i)=>check.checked=selectedPhaseIndexes.includes(i));notify('選択できるフェーズは最大12個です');return}selectedPhaseIndexes.push(index)}if(selectedPhaseIndexes.length===1)data.page=selectedPhaseIndexes[0];selected=null;selectedIds=[];drag=null;clearAlignmentGuides();closeObjectContextMenu();closeColorPopovers();render();if(data.page!==previousPage)save(true)}

function comparisonStageClone(index){const clone=stage.cloneNode(true),prefix='phase-preview-'+index+'-';const ids=new Map();for(const node of [clone,...clone.querySelectorAll('[id]')]){if(!node.id)continue;ids.set(node.id,prefix+node.id);node.id=prefix+node.id}for(const node of [clone,...clone.querySelectorAll('*')]){for(const attr of Array.from(node.attributes)){let value=attr.value.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g,(match,quote,url)=>{const hash=url.lastIndexOf('#'),id=hash>=0?url.slice(hash+1):'',newId=ids.get(id);return newId?'url("#'+newId+'")':match});if(value.startsWith('#')&&ids.has(value.slice(1)))value='#'+ids.get(value.slice(1));if(value!==attr.value)node.setAttribute(attr.name,value)}node.removeAttribute('contenteditable');node.removeAttribute('tabindex');node.classList.remove('selected','selected-many','has-selection-controls')}clone.querySelector('[id="'+prefix+'objectControls"]')?.remove();clone.classList.add('phase-preview-stage');return clone}

function renderPhaseComparison(){const surface=document.getElementById('boardZoomSpace');surface.querySelector('.phase-comparison-grid')?.remove();const active=phaseComparisonActive();document.body.classList.toggle('phase-comparison-active',active);if(active){const grid=document.createElement('div');grid.className='phase-comparison-grid';const layout=phaseComparisonLayout();grid.style.gridTemplateColumns='repeat('+layout.columns+','+layout.cellSize+'px)';grid.style.gridTemplateRows='repeat('+layout.rows+','+layout.cellSize+'px)';grid.style.width=layout.width+'px';grid.style.height=layout.height+'px';grid.style.transform='translate(-50%,-50%) scale('+boardDisplayZoom/100+')';grid.setAttribute('aria-label','フェーズを並べて表示（閲覧専用）');const original=data,originalSelected=selected,originalIds=selectedIds;phaseComparisonRendering=true;try{data=JSON.parse(JSON.stringify(original));selected=null;selectedIds=[];for(const index of selectedPhaseIndexes){data.page=index;renderSingle();const cell=document.createElement('div');cell.className='phase-comparison-cell';cell.style.width=cell.style.height=layout.cellSize+'px';const label=document.createElement('div');label.className='phase-comparison-label';label.textContent=String(index+1).padStart(2,'0')+' '+(data.pageNames[index]||'');label.title=label.textContent;const tile=comparisonStageClone(index);tile.style.transform='scale('+(layout.cellSize/640)+')';cell.appendChild(tile);cell.appendChild(label);grid.appendChild(cell)}}finally{data=original;selected=originalSelected;selectedIds=originalIds;try{renderSingle()}finally{phaseComparisonRendering=false}}surface.appendChild(grid);document.getElementById('inspector').textContent='閲覧中は設定を変更できません。並列表示中はフェーズを1つに戻すと元のモードに戻ります。閲覧モードの場合は、編集モードに切り替えてください。';document.getElementById('toggleInspector').textContent='オブジェクト：閲覧専用';document.getElementById('toggleInspector').title='オブジェクト：閲覧専用\nオブジェクト設定を開閉';document.getElementById('selectionTitle').textContent='フェーズを並べて表示：'+selectedPhaseIndexes.map(i=>String(i+1).padStart(2,'0')).join('・');document.getElementById('selectionTitle').title=document.getElementById('selectionTitle').textContent}
document.getElementById('phaseComparisonStatus').hidden=selectedPhaseIndexes.length===0;document.getElementById('phaseComparisonStatus').classList.remove('comparison-pending');document.getElementById('phaseComparisonCount').textContent=active?'表示中：'+selectedPhaseIndexes.length:selectedPhaseIndexes.length===1?'選択中：1':'';document.getElementById('exitPhaseComparison').hidden=selectedPhaseIndexes.length===0;updateComparisonPropertyMessage(active||boardReadOnly);if(boardReadOnly){document.getElementById('inspector').textContent='閲覧中は設定を変更できません。並列表示中はフェーズを1つに戻すと元のモードに戻ります。閲覧モードの場合は、編集モードに切り替えてください。';document.getElementById('toggleInspector').textContent='オブジェクト：閲覧専用'}updateModeStatus();setBoardDisplayZoom(boardDisplayZoom,false,false);for(const id of ['clearBtn','undo','redo','addPage','copyPage','copyPageToContent']){const button=document.getElementById(id);if(button)button.disabled=active||(id==='undo'?history.length===0:id==='redo'?future.length===0:false)}if(active)document.querySelectorAll('#layoutPropertiesPanel input,#layoutPropertiesPanel select,#layoutPropertiesPanel button').forEach(node=>node.disabled=true);document.getElementById('pages').querySelectorAll('.page-tab').forEach((tab,i)=>{tab.classList.toggle('phase-selected',selectedPhaseIndexes.includes(i));tab.setAttribute('aria-pressed',String(active?selectedPhaseIndexes.includes(i):i===data.page));tab.draggable=!active;const checkbox=tab.querySelector('.phase-select-check');if(checkbox)checkbox.checked=selectedPhaseIndexes.includes(i);tab.querySelector('.page-tab-x').disabled=active;const renameButton=tab.querySelector('.page-tab-edit');if(renameButton)renameButton.disabled=active})}

function updateComparisonPropertyMessage(active){const panel=document.getElementById('layoutPropertiesPanel');let message=panel.querySelector('.comparison-property-message');if(!message){message=document.createElement('div');message.className='comparison-property-message';message.textContent='閲覧中は設定を変更できません。並列表示中はフェーズを1つに戻すと元のモードに戻ります。閲覧モードの場合は、編集モードに切り替えてください。';panel.prepend(message)}message.hidden=!active;}

function phaseComparisonBlocksTarget(target){return !!target.closest('#objects,#objectControls,#objectList,#inspector,#layoutPropertiesPanel,#objectContextMenu,.object-layout-rect,.phase-comparison-grid,.left .icon-choice,.left .tool,#clearBtn,#clearYes,#confirmYes,#addPage,#copyPage,#copyPageToContent,#undo,#redo,#fieldImageInput')}

function renderPages(){updateSelectionLabel();document.getElementById('activePhaseIndex').textContent=String(data.page+1).padStart(2,'0');document.getElementById('activePhaseLabel').textContent=data.pageNames[data.page]||'';document.getElementById('activePhaseLabel').title=data.pageNames[data.page]||'';let box=$('#pages');box.innerHTML='';data.pages.forEach((_,i)=>{let b=document.createElement('div');b.className='page page-tab'+(i===data.page?' active':'');b.setAttribute('role','button');b.tabIndex=0;b.title=(data.pageNames[i]||'フェーズ'+(i+1))+'\nクリックで単独選択、Shift＋クリックまたはチェックで複数選択（最大12個）\n右クリック／長押しで操作メニュー';let check=document.createElement('input');check.type='checkbox';check.className='phase-select-check';check.checked=selectedPhaseIndexes.includes(i);check.title=check.checked?'このフェーズを表示対象から外す':'このフェーズを表示対象にする';check.setAttribute('aria-label','フェーズ'+(i+1)+(check.checked?'を表示対象から外す':'を表示対象にする'));check.onclick=e=>{e.stopPropagation();selectPhase(i,true)};let index=document.createElement('span');index.className='page-index';index.textContent=String(i+1).padStart(2,'0');b.appendChild(index);b.appendChild(check);let label=document.createElement('span');label.className='page-tab-name';label.textContent=data.pageNames[i];b.appendChild(label);let del=document.createElement('button');del.className='page-tab-x';del.type='button';del.textContent='×';del.title='このフェーズを削除';del.onclick=e=>{e.stopPropagation();if(!data.pages[i]?.length){deleteCurrentPage(i);return}deletePageIndex=i;showDeletionDialog('deletePageDialog','コンテンツ「'+(data.title||'新規コンテンツ')+'」のフェーズ「'+(data.pageNames[i]||'フェーズ'+(i+1))+'」を削除しますか？')};b.appendChild(del);b.draggable=true;b.onclick=e=>{selectPhase(i,e.shiftKey);document.querySelector('#pages .page-tab.active')?.focus()};b.ondblclick=null;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPhase(i,e.shiftKey)}};b.ondragstart=e=>{e.dataTransfer.setData('application/x-tactica-page',String(i));e.dataTransfer.effectAllowed='move';b.classList.add('dragging')};b.ondragend=()=>b.classList.remove('dragging');b.ondragover=e=>{if(!Array.from(e.dataTransfer.types).includes('application/x-tactica-page')){b.classList.remove('drag-over','drop-before','drop-after');return}e.preventDefault();let after=e.clientY>b.getBoundingClientRect().top+b.offsetHeight/2;b.classList.add('drag-over');b.classList.toggle('drop-after',after);b.classList.toggle('drop-before',!after);e.dataTransfer.dropEffect='move'};b.ondragleave=()=>b.classList.remove('drag-over','drop-before','drop-after');b.ondrop=e=>{if(!Array.from(e.dataTransfer.types).includes('application/x-tactica-page')){b.classList.remove('drag-over','drop-before','drop-after');return}e.preventDefault();b.classList.remove('drag-over','drop-before','drop-after');let from=Number(e.dataTransfer.getData('application/x-tactica-page')),to=i;if(!Number.isInteger(from)||from===to)return;let groupMap=new Map(data.pages.map((page,index)=>[page,data.pageGroupIds[index]]));let comparisonPages=selectedPhaseIndexes.map(index=>data.pages[index]);let currentPage=data.pages[data.page],pages=data.pages.slice(),names=data.pageNames.slice(),notes=data.pageNotes.slice(),colors=data.pageColors.slice(),shapes=data.pageBoardShapes.slice(),fieldBackgrounds=data.pageFieldBackgroundColors.slice(),fieldImages=data.pageFieldImageIds.slice(),fieldImageTints=data.pageFieldImageTints.slice(),fieldSizes=data.pageFieldSizes.slice(),moving=pages[from],movingName=names[from],movingNote=notes[from],movingColor=colors[from],movingShape=shapes[from],movingFieldBackground=fieldBackgrounds[from],movingFieldImage=fieldImages[from],movingFieldImageTint=fieldImageTints[from],movingFieldSize=fieldSizes[from];recordHistory();pages.splice(from,1);names.splice(from,1);notes.splice(from,1);colors.splice(from,1);shapes.splice(from,1);fieldBackgrounds.splice(from,1);fieldImages.splice(from,1);fieldImageTints.splice(from,1);fieldSizes.splice(from,1);let at=pages.indexOf(data.pages[to])+(e.clientY>b.getBoundingClientRect().top+b.offsetHeight/2?1:0);pages.splice(at,0,moving);names.splice(at,0,movingName);notes.splice(at,0,movingNote);colors.splice(at,0,movingColor);shapes.splice(at,0,movingShape);fieldBackgrounds.splice(at,0,movingFieldBackground);fieldImages.splice(at,0,movingFieldImage);fieldImageTints.splice(at,0,movingFieldImageTint);fieldSizes.splice(at,0,movingFieldSize);data.pages=pages;data.pageGroupIds=pages.map(page=>groupMap.get(page)||null);data.pageNames=names;data.pageNotes=notes;data.pageColors=colors;data.pageBoardShapes=shapes;data.pageFieldBackgroundColors=fieldBackgrounds;data.pageFieldImageIds=fieldImages;data.pageFieldImageTints=fieldImageTints;data.pageFieldSizes=fieldSizes;data.page=data.pages.indexOf(currentPage);selectedPhaseIndexes=comparisonPages.map(page=>data.pages.indexOf(page));renderAndSave();revealMovedPhase(at)};box.appendChild(b)})}

function deleteCurrentPage(index=data.page){if(phaseComparisonActive())return;recordHistory();selectedPhaseIndexes=[];data.pages.splice(index,1);data.pageGroupIds.splice(index,1);data.pageNames.splice(index,1);data.pageNotes.splice(index,1);data.pageColors.splice(index,1);data.pageBoardShapes.splice(index,1);data.pageFieldBackgroundColors.splice(index,1);data.pageFieldImageIds.splice(index,1);data.pageFieldImageTints.splice(index,1);data.pageFieldSizes.splice(index,1);if(!data.pages.length){data.pageGroupIds=[null];data.pages=[[]];data.pageNames=['新規フェーズ'];data.pageNotes=[''];data.pageColors=['#ffffff'];data.pageBoardShapes=['square'];data.pageFieldBackgroundColors=['#17212c'];data.page=0}else data.page=Math.min(index,data.pages.length-1);selected=null;selectedIds=[];renderAndSave();notify('フェーズを削除しました')}

function normalizePhaseGroups(board){
 if(!Array.isArray(board.phaseGroups))board.phaseGroups=[];
 const ids=new Set();board.phaseGroups=board.phaseGroups.filter(group=>group&&typeof group.id==='string'&&!ids.has(group.id)&&ids.add(group.id)).map(group=>({...group,name:String(group.name||'新規グループ'),note:String(group.note||''),collapsed:!!group.collapsed}));
 board.pageGroupIds=board.pages.map((_,i)=>ids.has(board.pageGroupIds?.[i])?board.pageGroupIds[i]:null);
 if(!ids.has(board.activePhaseGroup))board.activePhaseGroup=null;
}

function normalizePageNames(){normalizePhaseGroups(data);data.pageFieldImageTints=data.pages.map((_,i)=>fieldImageTint(data,i));delete data.pageFieldImageOpacities;data.pageNotes=data.pages.map((_,i)=>typeof data.pageNotes?.[i]==='string'?data.pageNotes[i]:'');let defaults=['メイン','サブ','予備','前半','後半','処理','戻し','練習'];if(!/^#[0-9a-f]{6}$/i.test(data.layoutColor||''))data.layoutColor='#17212c';if(!Array.isArray(data.pageColors))data.pageColors=[];data.pageColors=data.pages.map((_,i)=>/^#[0-9a-f]{6}$/i.test(data.pageColors[i]||'')?data.pageColors[i]:data.layoutColor);if(!Array.isArray(data.pageBoardShapes))data.pageBoardShapes=[];let legacyShape=['none','square','landscape','portrait','circle','image','image4'].includes(data.boardShape)?data.boardShape:'square';data.pageBoardShapes=data.pages.map((_,i)=>['none','square','landscape','portrait','circle','image','image4'].includes(data.pageBoardShapes[i])?data.pageBoardShapes[i]:legacyShape);if(!Array.isArray(data.pageFieldSizes))data.pageFieldSizes=[];data.pageFieldSizes=data.pages.map((_,i)=>{let size=data.pageFieldSizes[i]||{},shape=data.pageBoardShapes[i],width=Math.max(64,Math.min(['image','image4'].includes(shape)?960:640,Number(size.width)||(shape==='portrait'?320:538))),height=Math.max(64,Math.min(['image','image4'].includes(shape)?960:640,Number(size.height)||(shape==='landscape'?320:538)));if(shape==='landscape'&&width<=height){width=538;height=320}else if(shape==='portrait'&&height<=width){width=320;height=538}return{width,height}});if(!Array.isArray(data.pageFieldBackgroundColors))data.pageFieldBackgroundColors=[];let legacyFieldBackground=/^#[0-9a-f]{6}$/i.test(data.fieldBackgroundColor||'')?data.fieldBackgroundColor:'#17212c';data.pageFieldBackgroundColors=data.pages.map((_,i)=>/^#[0-9a-f]{6}$/i.test(data.pageFieldBackgroundColors[i]||'')?data.pageFieldBackgroundColors[i]:legacyFieldBackground);migrateBoardImages(data);if(!Array.isArray(data.pageNames))data.pageNames=[];data.pageNames=data.pages.map((_,i)=>typeof data.pageNames[i]==='string'&&data.pageNames[i].trim()?data.pageNames[i].trim():defaults[i]||'新規フェーズ');data.pages.forEach(p=>p.forEach(o=>{if(o.type==='icon'&&/^ヒーラ[12]$/.test(o.iconName||''))o.iconName=o.iconName.replace('ヒーラ','ヒーラー');if(o.type==='icon'&&o.iconName==='塔ふみ1')o.iconName='塔踏み1';if(o.type==='icon'&&typeof o.src==='string')o.src=o.src.replace('assets/field-marker/','assets/field-marker-transparent/')}))}

function revealMovedPhase(index){
 const list=document.getElementById('pages');revealMovedListItems(list,list?.querySelectorAll('.page-tab')[index]?[list.querySelectorAll('.page-tab')[index]]:[]);
}

function beginPageRename(tab,cancelAddition=null){
 if(boardReadOnly)return;
 let index=Array.from($('#pages').querySelectorAll('.page-tab')).indexOf(tab),label=tab.querySelector('.page-tab-name');if(index<0||!label)return;
 let oldName=data.pageNames[index],input=document.createElement('textarea'),finished=false;
 input.className='page-tab-input';input.rows=1;input.value=oldName;input.setAttribute('aria-label','フェーズ名');input.draggable=false;
 tab.classList.add('renaming');tab.appendChild(input);tab.draggable=false;
 const resize=()=>{input.style.height='auto';input.style.height=(Math.max(23,input.scrollHeight)+input.offsetHeight-input.clientHeight)+'px'};
 let finish=commit=>{if(finished)return;finished=true;if(!commit&&cancelAddition){cancelAddition();return}let name=input.value.replace(/[\r\n]+/g,' ').trim();if(commit&&name&&name!==oldName){if(!cancelAddition)recordHistory();data.pageNames[index]=name;save()}else if(commit&&!name)notify('フェーズ名を入力してください');if(cancelAddition)renderAndSave();else renderPages()};
 if(cancelAddition){
  const cancel=tab.querySelector('.page-tab-x');cancel.textContent='↶';cancel.title='フェーズ追加を取り消す';cancel.setAttribute('aria-label',cancel.title);
  cancel.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
  cancel.onclick=e=>{e.preventDefault();e.stopPropagation();finish(false)};
 }
 input.addEventListener('input',resize);
 input.addEventListener('pointerdown',e=>e.stopPropagation());input.addEventListener('click',e=>e.stopPropagation());
 input.addEventListener('keydown',e=>{e.stopPropagation();if(e.isComposing||e.keyCode===229)return;if(e.key==='Enter'){e.preventDefault();finish(true)}else if(e.key==='Escape'){e.preventDefault();finish(false)}});
 input.addEventListener('blur',()=>finish(true));input.focus();input.select();resize();
}

function nextCopiedPhaseName(name,names){
 const base=(String(name||'フェーズ').replace(/(?:[\s　]+コピー|[\s　]*[（(][0-9]+[）)])+$/u,'').trim()||'フェーズ');
 let number=2;
 for(const existing of names){const match=String(existing).match(/^(.*?)[（(]([0-9]+)[）)]$/u);if(match&&match[1].trim()===base){const used=Number(match[2]);if(Number.isSafeInteger(used)&&used>=2)number=Math.max(number,used+1)}}
 let candidate=base+'（'+number+'）';while(names.includes(candidate)){number++;candidate=base+'（'+number+'）'}return candidate
}

function copyPhaseAt(from=data.page){if(boardReadOnly||phaseComparisonActive()||!Number.isInteger(from)||!data.pages[from])return;let at=from+1,copied=data.pages[from].map(o=>{let item=JSON.parse(JSON.stringify(o));item.id=createObjectId();return item});snapshot();selectedPhaseIndexes=[];data.pageGroupIds.splice(at,0,data.pageGroupIds[from]||null);data.pages.splice(at,0,copied);data.pageNames.splice(at,0,nextCopiedPhaseName(data.pageNames[from],data.pageNames));data.pageNotes.splice(at,0,data.pageNotes[from]||'');data.pageColors.splice(at,0,data.pageColors[from]);data.pageBoardShapes.splice(at,0,data.pageBoardShapes[from]);data.pageFieldBackgroundColors.splice(at,0,data.pageFieldBackgroundColors[from]);data.pageFieldImageIds.splice(at,0,data.pageFieldImageIds[from]);data.pageFieldImageTints.splice(at,0,fieldImageTint(data,from));data.pageFieldSizes.splice(at,0,JSON.parse(JSON.stringify(data.pageFieldSizes[from])));data.page=at;selected=null;selectedIds=[];renderAndSave();revealMovedPhase(at)}

;
// ===== js/help.js =====
// help: shared function declarations; initialized by bolxiv.js in the documented order.
function closeHelpMenu(restoreFocus=false){helpMenu.hidden=true;document.getElementById('operationGuideBtn').setAttribute('aria-expanded','false');if(restoreFocus)document.getElementById('operationGuideBtn').focus()}

function showDeletionDialog(id,message){const dialog=document.getElementById(id);dialog.querySelector('p').textContent=message;dialog.showModal()}

function positionToast(){
 const toast=$('#toast'),viewport=stage.closest('.object-layout-rect');
 if(!toast?.classList.contains('show')||!viewport)return;
 const rect=viewport.getBoundingClientRect(),left=Math.max(0,rect.left),right=Math.min(window.innerWidth,rect.right),top=Math.max(0,rect.top),bottom=Math.min(window.innerHeight,rect.bottom);
 if(right<=left||bottom<=top)return;
 const width=Math.max(0,right-left-24);
 toast.style.maxWidth=width+'px';
 toast.style.left=(left+right)/2+'px';
 toast.style.top='auto';
 toast.style.bottom=(window.innerHeight-bottom+12)+'px';
}

function notify(s,names=[]){
 let t=$('#toast');document.body.appendChild(t);const message=String(s).trimEnd().replace(/。*$/,'。'),ranges=[];
 for(const match of message.matchAll(/「([^」]+)」/g))ranges.push([match.index+1,match.index+1+match[1].length]);
 for(const name of names){if(!name)continue;let from=0,at;while((at=message.indexOf(name,from))>=0){ranges.push([at,at+name.length]);from=at+name.length}}
 t.replaceChildren();let from=0;for(const [start,end] of ranges.sort((a,b)=>a[0]-b[0]||b[1]-a[1])){if(start<from)continue;t.append(document.createTextNode(message.slice(from,start)));const span=document.createElement('span');span.className='toast-name';span.textContent=message.slice(start,end);t.append(span);from=end}t.append(document.createTextNode(message.slice(from)));t.classList.add('show');positionToast();
 if(!positionToast.watching){
  positionToast.watching=true;
  let frame=0;const schedule=()=>{if(!frame&&t.classList.contains('show'))frame=requestAnimationFrame(()=>{frame=0;positionToast()})};
  const resize=new ResizeObserver(schedule);resize.observe(t);const viewport=stage.closest('.object-layout-rect');if(viewport)resize.observe(viewport);resize.observe(document.querySelector('.layout'));
  new MutationObserver(schedule).observe(document.querySelector('.layout'),{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','data-phone-pane']});
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.visualViewport?.addEventListener('resize',schedule);
 }
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4000);
}

;
// ===== js/state-access.js =====
// state-access: shared function declarations; initialized by bolxiv.js in the documented order.
function current(){return data.pages[data.page]}

function activeBoardShape(){return data.pageBoardShapes?.[data.page]||data.boardShape||'square'}

function activeFieldBackground(){return data.pageFieldBackgroundColors?.[data.page]||data.fieldBackgroundColor||'#17212c'}

function activePageColor(){return data.pageColors?.[data.page]||data.layoutColor||'#808080'}

;
// ===== js/history.js =====
// history: shared function declarations; initialized by bolxiv.js in the documented order.
function storeContentHistory(){commitPendingHistory();pendingHistoryState=null;pendingHistoryOwner=null;contentHistoryStore.set(data,{history,future});}

function restoreContentHistory(){pendingHistoryState=null;pendingHistoryOwner=null;const saved=contentHistoryStore.get(data);history=saved?saved.history:[];future=saved?saved.future:[];}

function snapshot(){recordHistory();render()}

function historySnapshot(state){
 if(typeof state!=='string')return state;
 if(historySnapshotCache.has(state))return historySnapshotCache.get(state);
 const parsed=JSON.parse(state);historySnapshotCache.set(state,parsed);
 if(historySnapshotCache.size>8)historySnapshotCache.delete(historySnapshotCache.keys().next().value);
 return parsed;
}

function sameHistoryState(a,b){if(a===b)return true;const left=historySnapshot(a),right=historySnapshot(b),keys=Object.keys(left).filter(key=>key!=='page'&&key!=='title'),other=Object.keys(right).filter(key=>key!=='page'&&key!=='title');return keys.length===other.length&&keys.every(key=>Object.hasOwn(right,key)&&sameBoardSaveState(left[key],right[key]))}

function finishNumericHistoryGesture(){const gesture=numericHistoryGesture;numericHistoryGesture=null;if(!gesture)return;delete gesture.spin.dataset.historyPushed;if(gesture.board===data&&gesture.recorded)updateHistoryButtons()}

function startNumericHistoryGesture(spin,kind,id){
 if(numericHistoryGesture?.spin===spin&&numericHistoryGesture.board===data&&numericHistoryGesture.kind===kind&&numericHistoryGesture.id===id)return;
 finishNumericHistoryGesture();numericHistoryGesture={spin,kind,id,board:data,recorded:false};
}

function recordHistory(state){
 const gesture=numericHistoryGesture;
 if(gesture?.board===data&&gesture.recorded)return;
 state??=JSON.stringify(data);if(gesture?.board===data)gesture.recorded=true;
 commitPendingHistory(state);pendingHistoryState=state;pendingHistoryOwner=data;updateHistoryButtons(state);
}

function commitPendingHistory(currentState){if(phaseComparisonRendering||pendingHistoryState===null)return;if(pendingHistoryOwner!==data){pendingHistoryState=null;pendingHistoryOwner=null;return}if(sameHistoryState(pendingHistoryState,currentState??JSON.stringify(data)))return;if(!history.length||!sameHistoryState(history[history.length-1],pendingHistoryState))history.push(pendingHistoryState);if(history.length>100)history.shift();future=[];pendingHistoryState=null;pendingHistoryOwner=null;}

function historyActionLabel(beforeState,afterState){
 const cacheable=typeof beforeState==='string'&&typeof afterState==='string';
 if(cacheable){const cached=historyLabelCache.find(entry=>entry.before===beforeState&&entry.after===afterState);if(cached)return cached.label;}
 const before=historySnapshot(beforeState),after=historySnapshot(afterState),labels=[];
 const changed=(a,b)=>!sameBoardSaveState(a,b);

 if(before.pages.length!==after.pages.length)labels.push(after.pages.length>before.pages.length?'フェーズの追加':'フェーズの削除');
 else{
 const fields=[['pageNotes','フェーズノートの変更'],['pageNames','フェーズ名の変更'],['pageBoardShapes','フィールド形状の変更'],['pageFieldSizes','フィールドサイズの変更'],['pageFieldBackgroundColors','フィールド背景色の変更'],['pageColors','キャンバス背景色の変更'],['pageFieldImageIds','フィールド画像の変更'],['pageFieldImageTints','フィールド画像の色調補正']];
 for(const [key,label] of fields)if(changed(before[key],after[key]))labels.push(label);
 const oldObjects=new Map(before.pages.flat().map(o=>[o.id,o])),newObjects=new Map(after.pages.flat().map(o=>[o.id,o]));
 if([...newObjects.keys()].some(id=>!oldObjects.has(id)))labels.push('オブジェクトの追加');
 if([...oldObjects.keys()].some(id=>!newObjects.has(id)))labels.push('オブジェクトの削除');
 const groups=[['オブジェクトの移動',['x','y']],['オブジェクトのサイズ変更',['width','height','innerSize','fontSize']],['オブジェクトの回転',['rotation']],['オブジェクトの色変更',['color','strokeColor']],['オブジェクトの透明度変更',['opacity']],['オブジェクトの表示切替',['visible']],['オブジェクトの固定切替',['locked']],['オブジェクトの文字変更',['label']]];
 for(const [label,keys] of groups)if([...newObjects].some(([id,o])=>oldObjects.has(id)&&keys.some(k=>changed(oldObjects.get(id)[k],o[k]))))labels.push(label);
 if(!labels.length&&changed(before.pages.map(p=>p.map(o=>o.id)),after.pages.map(p=>p.map(o=>o.id))))labels.push('フェーズ・レイヤーの並べ替え');
 }
 const label=labels.length===1?labels[0]:labels.length>1?'複数の変更':'設定の変更';
 if(cacheable){historyLabelCache.push({before:beforeState,after:afterState,label});if(historyLabelCache.length>8)historyLabelCache.shift()}
 return label;
}

function historyResultMessage(beforeState,afterState,action){
 const before=historySnapshot(beforeState),after=historySnapshot(afterState);
 const shortName=(value,limit)=>{const chars=Array.from(String(value||'').replace(/\s+/g,' ').trim());return chars.length>limit?chars.slice(0,limit).join('')+'…':chars.join('')};
 const phaseName=index=>'フェーズ'+String(index+1).padStart(2,'0')+'「'+shortName(after.pageNames?.[index]||before.pageNames?.[index]||'名称未設定',16)+'」';
 let scope='コンテンツ「'+shortName(after.title||before.title||'名称未設定',20)+'」';
 if(before.title===after.title&&before.pages.length===after.pages.length){
  const keys=['pages','pageNames','pageNotes','pageBoardShapes','pageFieldSizes','pageFieldBackgroundColors','pageColors','pageFieldImageIds','pageFieldImageTints'];
  const indexes=before.pages.map((_,i)=>i).filter(i=>keys.some(key=>!sameBoardSaveState(before[key]?.[i],after[key]?.[i])));
  if(indexes.length===1)scope=phaseName(indexes[0]);
  else if(indexes.length>1)scope=indexes.length<=2?indexes.map(phaseName).join('・'):'複数フェーズ（'+indexes.length+'件）';
 }
 return scope+'：'+historyActionLabel(beforeState,afterState)+'を'+action;
}

function updateHistoryButtons(state=JSON.stringify(data)){commitPendingHistory(state);let undoButton=document.getElementById('undo'),redoButton=document.getElementById('redo');if(!undoButton||!redoButton)return;undoButton.disabled=!!window.Bolxiv?.pngPreview?.active||phaseComparisonActive()||history.length===0;redoButton.disabled=!!window.Bolxiv?.pngPreview?.active||phaseComparisonActive()||future.length===0;undoButton.setAttribute('aria-disabled',String(undoButton.disabled));redoButton.setAttribute('aria-disabled',String(redoButton.disabled));let undoState;for(let i=history.length-1;i>=0;i--){if(!sameHistoryState(history[i],state)){undoState=history[i];break}}const redoState=future[future.length-1];const comparison=phaseComparisonActive();undoButton.title=comparison?'並列表示中は元に戻せません':undoState?'このコンテンツの操作を元に戻す (Ctrl+Z)\n対象：'+historyActionLabel(undoState,state):'このコンテンツに元に戻せる操作はありません';redoButton.title=comparison?'並列表示中はやり直せません':redoState?'このコンテンツの操作をやり直す (Ctrl+Y)\n対象：'+historyActionLabel(state,redoState):'このコンテンツにやり直せる操作はありません';undoButton.setAttribute('aria-label',undoButton.title);redoButton.setAttribute('aria-label',redoButton.title)}

// Keep the mobile inspector on surviving objects when applying history.
function restoreHistorySelection(){
 const panel=document.getElementById('objectLayerPanel');
 if(matchMedia('(max-width:850px)').matches&&panel?.dataset.objectTab==='properties'){
  const ids=new Set(current().map(object=>object.id));
  selectedIds=selectedIds.filter(id=>ids.has(id));
  selected=selectedIds.includes(selected)?selected:selectedIds[selectedIds.length-1]||null;
  if(!selectedIds.length)document.getElementById('toggleInspector').parentElement.querySelector('.phone-object-tabs button')?.click();
 }else{selected=null;selectedIds=[]}
}

function undo(){if(boardReadOnly)return;if(phaseComparisonActive())return;commitPendingHistory();pendingHistoryState=null;pendingHistoryOwner=null;let page=data.page,currentState=JSON.stringify(data);while(history.length&&history[history.length-1]===currentState)history.pop();if(!history.length)return;future.push(currentState);const restoredState=history.pop(),message=historyResultMessage(restoredState,currentState,'元に戻しました');const previousBoard=data;data=cloneBoardSaveState(historySnapshot(restoredState));data.title=previousBoard.title;replaceContentHistoryBoard(previousBoard,data);data.page=Math.max(0,Math.min(page,data.pages.length-1));restoreHistorySelection();contentBoards[activeContent]=data;render();scheduleObjectPropertySave();notify(message)}

function redo(){if(boardReadOnly)return;if(phaseComparisonActive())return;commitPendingHistory();pendingHistoryState=null;pendingHistoryOwner=null;if(!future.length)return;let page=data.page;const previousState=JSON.stringify(data),restoredState=future.pop(),message=historyResultMessage(previousState,restoredState,'やり直しました');history.push(previousState);const previousBoard=data;data=cloneBoardSaveState(historySnapshot(restoredState));data.title=previousBoard.title;replaceContentHistoryBoard(previousBoard,data);data.page=Math.max(0,Math.min(page,data.pages.length-1));restoreHistorySelection();contentBoards[activeContent]=data;render();scheduleObjectPropertySave();notify(message)}

;
// ===== js/contents.js =====
// contents: shared function declarations; initialized by bolxiv.js in the documented order.
// List history keeps board references, not copies of every canvas. Content edits
// remain in their own history and survive removing/restoring a content item.
function captureContentList(){return {boards:contentBoards.slice(),active:data}}
function recordContentListChange(label,before,rename=null){
 contentListHistory.push({label,before,after:captureContentList(),rename});
 if(contentListHistory.length>100)contentListHistory.shift();contentListFuture.length=0;contentSelectorCache=null;
}
function replaceContentHistoryBoard(previous,next){
 const saved=contentHistoryStore.get(previous);if(saved)contentHistoryStore.set(next,saved);
 for(const entry of [...contentListHistory,...contentListFuture]){
  for(const state of [entry.before,entry.after]){state.boards=state.boards.map(board=>board===previous?next:board);if(state.active===previous)state.active=next}
  if(entry.rename?.board===previous)entry.rename.board=next;
 }
}
function restoreContentList(redo=false){
 if(boardReadOnly||phaseComparisonActive()||editingContentIndex>=0)return;
 const source=redo?contentListFuture:contentListHistory,target=redo?contentListHistory:contentListFuture,entry=source.pop();if(!entry)return;
 flushScheduledBoardSave();storeContentHistory();contentBoards[activeContent]=data;
 const state=redo?entry.after:entry.before,active=data;
 contentBoards=state.boards.slice();
 if(entry.rename)entry.rename.board.title=redo?entry.rename.after:entry.rename.before;
 activeContent=contentBoards.indexOf(active);if(activeContent<0)activeContent=Math.max(0,contentBoards.indexOf(state.active));
 data=contentBoards[activeContent];restoreContentHistory();selected=null;selectedIds=[];selectedPhaseIndexes=[];phaseSelectionOwner=data;
 target.push(entry);contentSelectorCache=null;
 $('#contentOptions').hidden=false;$('#contentSelect').setAttribute('aria-expanded','true');
 renderAndSave();notify('コンテンツ一覧：'+entry.label+'を'+(redo?'やり直しました':'元に戻しました'));
}
function appendContentListHistoryButtons(row){
 const actions=document.createElement('div');actions.className='content-list-history-actions';
 for(const [id,label,entries,redo] of [['contentListUndo','元に戻す',contentListHistory,false],['contentListRedo','やり直す',contentListFuture,true]]){
  const button=document.createElement('button');button.id=id;button.type='button';button.className='content-list-history-button';
  button.innerHTML=document.getElementById(redo?'redo':'undo').innerHTML;
  button.disabled=boardReadOnly||phaseComparisonActive()||editingContentIndex>=0||!entries.length;
  button.title=entries.length?'コンテンツ一覧：'+entries.at(-1).label+'を'+label:'コンテンツ一覧に'+(redo?'やり直せる':'元に戻せる')+'操作はありません';
  button.setAttribute('aria-label',button.title);button.onclick=event=>{event.stopPropagation();restoreContentList(redo)};actions.append(button);
 }row.append(actions);
}
function switchContent(next){if(!Number.isInteger(next)||next<0||next>=contentBoards.length||next===activeContent||editingContentIndex>=0)return;flushScheduledBoardSave();storeContentHistory();contentBoards[activeContent]=data;activeContent=next;data=contentBoards[activeContent];restoreContentHistory();selected=null;selectedIds=[];$('#contentOptions').hidden=true;$('#contentSelect').setAttribute('aria-expanded','false');render();save(true)}

function moveContentBoard(from,to,after){if(editingContentIndex>=0||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=contentBoards.length||to>=contentBoards.length||from===to)return;contentBoards[activeContent]=data;const before=captureContentList();let target=contentBoards[to],moving=contentBoards[from];contentBoards.splice(from,1);contentBoards.splice(contentBoards.indexOf(target)+(after?1:0),0,moving);activeContent=contentBoards.indexOf(data);recordContentListChange('並べ替え',before);save()}

function updateContentSelector(){const signature=JSON.stringify([activeContent,editingContentIndex,contentEditDraft,pendingContentAddition?.index,contentListHistory.length,contentListFuture.length,boardReadOnly,phaseComparisonActive(),contentBoards.map(board=>board.title)]);if(contentSelectorCache&&contentSelectorCache.signature===signature&&contentSelectorCache.boards.length===contentBoards.length&&contentSelectorCache.boards.every((board,index)=>board===contentBoards[index]))return;contentSelectorCache={signature,boards:contentBoards.slice()};let select=$('#contentSelect'),options=$('#contentOptions');if(!select||!options)return;let board=contentBoards[activeContent];select.textContent=board?.title||`コンテンツ${activeContent+1}`;select.title=select.textContent+'\nコンテンツリストを開閉';options.innerHTML='';let addRow=document.createElement('div');addRow.className='content-option-row content-option-add-row';let addButton=document.createElement('button');addButton.id='addContent';addButton.className='page page-add content-option-add';addButton.type='button';addButton.textContent='＋';addButton.title='コンテンツを追加';addButton.setAttribute('aria-label','コンテンツを追加');addButton.onclick=addContentBoard;addRow.appendChild(addButton);appendContentListHistoryButtons(addRow);options.appendChild(addRow);let list=document.createElement('div');list.className='content-options-scroll';options.appendChild(list);contentBoards.forEach((item,i)=>{let row=document.createElement('div');row.className='content-option-row'+(i===activeContent?' active':'');row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===activeContent));row.draggable=editingContentIndex<0;row.title='左ボタンでドラッグして並べ替え';row.onpointerdown=e=>{row.draggable=editingContentIndex<0&&!e.target.closest('.content-row-action,input')};row.ondragstart=e=>{if(!row.draggable){e.preventDefault();return}e.dataTransfer.setData('application/x-tactica-content',String(i));e.dataTransfer.effectAllowed='move';row.classList.add('dragging')};row.ondragend=()=>options.querySelectorAll('.content-option-row').forEach(node=>node.classList.remove('dragging','drop-before','drop-after'));row.ondragover=e=>{if(editingContentIndex>=0||!Array.from(e.dataTransfer.types).includes('application/x-tactica-content'))return;e.preventDefault();let after=e.clientY>row.getBoundingClientRect().top+row.offsetHeight/2;row.classList.toggle('drop-after',after);row.classList.toggle('drop-before',!after);e.dataTransfer.dropEffect='move'};row.ondragleave=()=>row.classList.remove('drop-before','drop-after');row.ondrop=e=>{if(!Array.from(e.dataTransfer.types).includes('application/x-tactica-content'))return;e.preventDefault();let from=Number(e.dataTransfer.getData('application/x-tactica-content')),after=e.clientY>row.getBoundingClientRect().top+row.offsetHeight/2;row.classList.remove('drop-before','drop-after');moveContentBoard(from,i,after)};let index=document.createElement('span');index.className='content-option-index';index.textContent=String(i+1).padStart(2,'0');row.appendChild(index);if(i===editingContentIndex){let input=document.createElement('input');input.className='content-option-input';input.type='text';input.value=contentEditDraft;input.setAttribute('aria-label',`コンテンツ${i+1}の名称`);input.oninput=e=>contentEditDraft=e.target.value;input.onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==='Enter'){e.preventDefault();finishContentRename(i,true)}else if(e.key==='Escape'){e.preventDefault();finishContentRename(i,false)}};if(pendingContentAddition?.index===i)input.onblur=()=>finishContentRename(i,true);row.appendChild(input);let done=document.createElement('button');done.className='content-row-action';done.type='button';done.textContent='✓';done.title='名称を保存';done.setAttribute('aria-label','名称を保存');done.onclick=()=>finishContentRename(i,true);row.appendChild(done);let cancel=document.createElement('button');cancel.className='content-row-action';cancel.type='button';cancel.textContent=pendingContentAddition?.index===i?'↶':'×';cancel.title=pendingContentAddition?.index===i?'コンテンツ追加を取り消す':'編集をキャンセル';cancel.setAttribute('aria-label',cancel.title);cancel.onpointerdown=e=>{e.preventDefault();e.stopPropagation()};cancel.onclick=()=>finishContentRename(i,false);row.appendChild(cancel)}else{let button=document.createElement('button');button.className='content-option-select';button.type='button';button.textContent=item.title||`コンテンツ${i+1}`;button.title=button.textContent+'\nクリックで切り替え、左ボタンでドラッグして並べ替え';button.onclick=()=>switchContent(i);row.appendChild(button);let edit=document.createElement('button');edit.className='content-row-action';edit.type='button';edit.textContent='✎';edit.title='この項目の名前を編集';edit.setAttribute('aria-label',`${item.title||`コンテンツ${i+1}`}の名前を編集`);edit.onclick=()=>{editingContentIndex=i;contentEditDraft=String(item.title||`コンテンツ${i+1}`);$('#contentOptions').hidden=false;$('#contentSelect').setAttribute('aria-expanded','true');updateContentSelector();document.querySelector('#contentOptions input')?.focus();document.querySelector('#contentOptions input')?.select()};row.appendChild(edit);let remove=document.createElement('button');remove.className='content-row-action content-row-delete';remove.type='button';remove.textContent='×';remove.title='コンテンツを削除';remove.setAttribute('aria-label','コンテンツを削除');remove.onclick=e=>{e.stopPropagation();deleteContentIndex=i;showDeletionDialog('deleteContentDialog','コンテンツ「'+(contentBoards[i].title||'新規コンテンツ')+'」と、その中のすべてのフェーズを削除しますか？')};row.appendChild(remove)}list.appendChild(row)});options.hidden=!(editingContentIndex>=0||$('#contentSelect').getAttribute('aria-expanded')==='true')}

function finishContentRename(i,commit){if(i!==editingContentIndex)return;const addition=pendingContentAddition?.index===i?pendingContentAddition:null;if(!commit&&addition){editingContentIndex=-1;contentEditDraft='';pendingContentAddition=null;contentHistoryStore.delete(addition.board);contentBoards.splice(i,1);activeContent=addition.previousIndex;data=contentBoards[activeContent];restoreContentHistory();selected=addition.selected;selectedIds=addition.selectedIds;selectedPhaseIndexes=addition.phases;phaseSelectionOwner=data;$('#contentOptions').hidden=false;$('#contentSelect').setAttribute('aria-expanded','true');renderAndSave();notify('コンテンツ追加を取り消しました');return}let name=contentEditDraft.trim();if(commit&&!name){notify('コンテンツ名を入力してください');document.querySelector('#contentOptions input')?.focus();return}if(commit&&!addition&&contentBoards[i].title!==name)recordContentListChange('名称変更',captureContentList(),{board:contentBoards[i],before:contentBoards[i].title,after:name});if(commit){contentBoards[i].title=name;if(i===activeContent){data.title=name;updateSelectionLabel()}}editingContentIndex=-1;contentEditDraft='';if(addition){recordContentListChange('追加',addition.before);pendingContentAddition=null;renderAndSave()}else if(commit)save();else updateContentSelector();if(commit)notify(addition?'コンテンツを追加しました':'コンテンツ名を保存しました')}

function deleteContentBoard(index){if(!Number.isInteger(index)||index<0||index>=contentBoards.length)return;storeContentHistory();contentBoards[activeContent]=data;const before=captureContentList();contentBoards.splice(index,1);if(!contentBoards.length)contentBoards=[{title:'新規コンテンツ1',layout:'square',boardShape:'square',pageBoardShapes:['square'],layoutColor:'#ffffff',fieldBackgroundColor:'#17212c',pageFieldBackgroundColors:['#17212c'],pageFieldImageIds:[''],pageFieldImageTints:[{color:"#000000",strength:0}],pageFieldSizes:[{width:538,height:538}],pageColors:['#ffffff'],pages:[[]],pageNames:['新規フェーズ'],pageNotes:[''],page:0}];if(index<activeContent)activeContent--;else if(index===activeContent)activeContent=Math.min(index,contentBoards.length-1);data=contentBoards[activeContent];restoreContentHistory();selected=null;selectedIds=[];editingContentIndex=-1;$('#contentOptions').hidden=false;$('#contentSelect').setAttribute('aria-expanded','true');recordContentListChange('削除',before);renderAndSave();notify('コンテンツを削除しました')}

function addContentBoard(){if(editingContentIndex>=0){finishContentRename(editingContentIndex,true);if(editingContentIndex>=0)return}const before=captureContentList(),previousIndex=activeContent,previousSelected=selected,previousSelectedIds=selectedIds.slice(),previousPhases=selectedPhaseIndexes.slice();storeContentHistory();contentBoards[activeContent]=data;let n=contentBoards.length+1;data={title:`新規コンテンツ${n}`,layout:'square',boardShape:'square',pageBoardShapes:['square'],layoutColor:'#ffffff',fieldBackgroundColor:'#17212c',pageFieldBackgroundColors:['#17212c'],pageFieldImageIds:[''],pageFieldImageTints:[{color:"#000000",strength:0}],pageFieldSizes:[{width:538,height:538}],pageColors:['#ffffff'],pages:[[]],pageNames:['新規フェーズ'],pageNotes:[''],page:0};contentBoards.push(data);activeContent=contentBoards.length-1;restoreContentHistory();selected=null;selectedIds=[];pendingContentAddition={before,index:activeContent,board:data,previousIndex,selected:previousSelected,selectedIds:previousSelectedIds,phases:previousPhases};editingContentIndex=activeContent;contentEditDraft=data.title;selectedPhaseIndexes=[];phaseSelectionOwner=data;$('#contentOptions').hidden=false;$('#contentSelect').setAttribute('aria-expanded','true');renderAndSave();const input=document.querySelector('#contentOptions input');if(input){input.focus();input.select();revealMovedListItems(input.closest('.content-options-scroll'),[input])}}

;
// ===== js/storage.js =====
// storage: shared function declarations; initialized by bolxiv.js in the documented order.
function persistBoardSafely(value,navigationOnly=false){if(boardSaveSuspended)return false;return window.boardStorage.save(value,{navigationOnly,imageAssets:boardImageLibrary.entries(contentBoards)})}

function renderAndSave(){contentBoards[activeContent]=data;render();save(false,true)}

function cloneBoardSaveState(value){if(!value||typeof value!=='object')return value;if(Array.isArray(value))return value.map(cloneBoardSaveState);const copy={};for(const key of Object.keys(value))copy[key]=cloneBoardSaveState(value[key]);return copy}

function sameBoardSaveState(left,right){
 if(Object.is(left,right))return true;
 if(!left||!right||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return false;
 const keys=Object.keys(left);if(keys.length!==Object.keys(right).length)return false;
 return keys.every(key=>Object.hasOwn(right,key)&&sameBoardSaveState(left[key],right[key]));
}

function boardSaveState(){contentBoards[activeContent]=data;return {version:4,activeContent,contents:contentBoards}}

function cancelScheduledBoardSave(){clearTimeout(boardSaveDelayTimer);clearTimeout(boardSaveMaxTimer);boardSaveDelayTimer=boardSaveMaxTimer=null;boardSavePending=false;boardSaveNavigationOnly=false;boardSaveNoteOnly=false;boardSavePropertyOnly=false;}

function flushScheduledBoardSave(){
 if(boardSaveSuspended)return;
 if(!boardSavePending)return;
 const navigationOnly=boardSaveNavigationOnly,noteOnly=boardSaveNoteOnly,propertyOnly=boardSavePropertyOnly;
 cancelScheduledBoardSave();
 try{
  const state=boardSaveState();
  if(boardSaveCheckpointDirty){boardSaveCheckpoint=cloneBoardSaveState(state);boardSaveCheckpointDirty=false}
  if(noteOnly||propertyOnly)updateHistoryButtons();
  persistBoardSafely(JSON.stringify(state),navigationOnly);
 }
 catch(error){boardSavePending=true;const status=document.getElementById('saved');if(status)status.textContent='未保存';console.warn('Board serialization failed',error);notify('自動保存できません：'+(error?.message||String(error)))}
}

function scheduleBoardSave(navigationOnly=false){
 if(boardSaveSuspended)return;
 if(phaseComparisonRendering)return;
 const state=boardSaveState();
 if(boardSaveCheckpoint===null){boardSaveCheckpoint=cloneBoardSaveState(state);return}
 if(!boardSavePending&&!boardSaveCheckpointDirty&&sameBoardSaveState(boardSaveCheckpoint,state))return;
 // The immutable checkpoint is refreshed once at flush, not for every drag event.
 boardSaveCheckpointDirty=true;
 // Navigation must not postpone an outstanding note edit.
 if(navigationOnly&&boardSavePending&&(boardSaveNoteOnly||boardSavePropertyOnly))return;
 boardSaveNoteOnly=false;boardSavePropertyOnly=false;
 boardSaveNavigationOnly=navigationOnly&&(!boardSavePending||boardSaveNavigationOnly);
 boardSavePending=true;
 const status=document.getElementById('saved');if(status&&!boardSaveNavigationOnly)status.textContent='未保存の変更あり';
 clearTimeout(boardSaveDelayTimer);boardSaveDelayTimer=setTimeout(flushScheduledBoardSave,boardSaveNavigationOnly?phaseSaveDelay:boardSaveDelay);
 if(boardSaveMaxTimer===null)boardSaveMaxTimer=setTimeout(flushScheduledBoardSave,boardSaveNavigationOnly?phaseSaveMaxWait:boardSaveMaxWait);
}

function scheduleObjectPropertySave(){
 if(boardSaveSuspended)return;
 if(phaseComparisonRendering)return;
 contentBoards[activeContent]=data;boardSaveCheckpointDirty=true;
 const propertyOnly=!boardSavePending||boardSaveNavigationOnly||boardSavePropertyOnly;
 if(boardSavePending&&boardSaveNavigationOnly){clearTimeout(boardSaveDelayTimer);clearTimeout(boardSaveMaxTimer);boardSaveDelayTimer=boardSaveMaxTimer=null}
 boardSavePending=true;boardSaveNavigationOnly=false;boardSaveNoteOnly=false;boardSavePropertyOnly=propertyOnly;
 const status=document.getElementById('saved');if(status&&status.textContent!=='未保存の変更あり')status.textContent='未保存の変更あり';
 clearTimeout(boardSaveDelayTimer);boardSaveDelayTimer=setTimeout(flushScheduledBoardSave,boardSaveDelay);
 if(boardSaveMaxTimer===null)boardSaveMaxTimer=setTimeout(flushScheduledBoardSave,boardSaveMaxWait);
}

function scheduleNoteSave(){
 if(boardSaveSuspended)return;
 if(phaseComparisonRendering)return;
 contentBoards[activeContent]=data;
 boardSavePropertyOnly=false;
 boardSaveCheckpointDirty=true;
 const noteOnly=!boardSavePending||boardSaveNavigationOnly||boardSaveNoteOnly;
 if(boardSavePending&&boardSaveNavigationOnly){clearTimeout(boardSaveDelayTimer);clearTimeout(boardSaveMaxTimer);boardSaveDelayTimer=boardSaveMaxTimer=null}
 boardSavePending=true;boardSaveNavigationOnly=false;boardSaveNoteOnly=noteOnly;
 const status=document.getElementById('saved');if(status&&status.textContent!=='未保存の変更あり')status.textContent='未保存の変更あり';
 if(!noteOnly)return;
 clearTimeout(boardSaveDelayTimer);boardSaveDelayTimer=setTimeout(flushScheduledBoardSave,noteSaveDelay);
 if(boardSaveMaxTimer===null)boardSaveMaxTimer=setTimeout(flushScheduledBoardSave,noteSaveMaxWait);
}

function save(navigationOnly=false,historyFresh=false){if(phaseComparisonRendering)return;if(objectPropertyInputActive&&!navigationOnly){scheduleObjectPropertySave();return}if(!historyFresh)updateHistoryButtons();for(let o of current()){if(o.type==='targetcircle'){let el=Array.from(layer.children).find(node=>node.dataset.id===o.id);if(el)refreshTargetCircleTriangle(o,el)}}contentBoards[activeContent]=data;updateContentSelector();scheduleBoardSave(navigationOnly)}

function rememberViewSetting(key,value){viewSettings[key]=value;try{localStorage.setItem(viewSettingsKey,JSON.stringify(viewSettings))}catch{}}

;
// ===== js/file-io.js =====
// file-io: shared function declarations; initialized by bolxiv.js in the documented order.
function safeExportName(ext){const group=data.phaseGroups?.find(group=>group.id===data.activePhaseGroup);let name=ext==='.png'?(group?[(data.title||'strategy-board'),'グループ',group.name].join('_'):phaseComparisonActive()?[(data.title||'strategy-board'),'フェーズを並べて表示',selectedPhaseIndexes.map(i=>i+1).join('-')].join('_'):[(data.title||'strategy-board'),data.page+1,(data.pageNames?.[data.page]||'フェーズ'+(data.page+1))].join('_')):(data.title||'strategy-board');return name.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')+ext}

function exportPickerOptions(filename,mime,description){return {suggestedName:filename,types:[{description,accept:{[mime]:[filename.slice(filename.lastIndexOf('.'))]}}]}}

async function saveExportBlob(blob,filename,mime,description,handlePromise){let handle=null;if(handlePromise){try{handle=await handlePromise}catch(error){if(error?.name==='AbortError')return false;throw error}}else if(window.showSaveFilePicker){try{handle=await window.showSaveFilePicker(exportPickerOptions(filename,mime,description))}catch(error){if(error?.name==='AbortError')return false;throw error}}if(handle){let writable=await handle.createWritable();try{await writable.write(new Uint8Array(await blob.arrayBuffer()));await writable.close()}catch(error){try{await writable.abort()}catch{}throw error}}else{let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}notify(handle?(description||'ファイル')+'を保存しました':(description||'ファイル')+'のダウンロードを開始しました');return handle?'saved':'download'}

function jsonExportPayload(boards){
 const contents=boards.map(board=>{const {page,...content}=board;return content});
 return {version:4,imageLibrary:Object.fromEntries(boardImageLibrary.entries(boards)),contents};
}

function importedFieldImage(image,assets){
 if(image&&typeof image==='object'){
  const index=image.imageRef;
  if(!Number.isInteger(index)||index<0||!Array.isArray(assets)||typeof assets[index]!=='string'||!assets[index])throw new Error('フィールド画像の参照先が見つかりません');
  return assets[index];
 }
 return typeof image==='string'?image:'';
}

async function exportJson(scope){
 save();flushScheduledBoardSave();
 const contents=(scope==='selected'?[data]:contentBoards).map(board=>{
  const {page,...content}=board;return content;
 });
 const snapshot=JSON.stringify(jsonExportPayload(contents)),contentName=data.title||'名称未設定';
 const blob=new Blob([JSON.stringify(JSON.parse(snapshot),null,2)],{type:'application/json'});
 const delivery=await saveExportBlob(blob,safeExportName('.json'),'application/json','JSONファイル');
 if(delivery)await rememberJsonBackup(scope,snapshot,contentName,delivery);
}

function loadJsonBackupRecords(){try{return JSON.parse(localStorage.getItem(jsonBackupRecordKey)||'{}')||{}}catch{return {}}}

function jsonBackupSnapshot(scope){
 const boards=scope==='selected'?[data]:contentBoards.map((board,i)=>i===activeContent?data:board);
 return JSON.stringify(jsonExportPayload(boards));
}

async function jsonBackupFingerprint(snapshot){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot));
 return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function rememberJsonBackup(scope,snapshot,contentName,delivery){
 try{
  const records=loadJsonBackupRecords();records[scope]={at:Date.now(),fingerprint:await jsonBackupFingerprint(snapshot),contentName,delivery};
  localStorage.setItem(jsonBackupRecordKey,JSON.stringify(records));
 }catch(error){console.warn('JSON backup record could not be saved',error)}
}

function jsonBackupStatusText(scope,record,fingerprint){
 if(!record?.at||!record.fingerprint)return 'JSON書き出し記録：まだありません';
 const date=new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(record.at));
 const label=record.delivery==='download'?'最終ダウンロード開始':'最終JSON保存';
 const target=scope==='selected'?'\n保存対象：'+record.contentName:'';
 const state=record.fingerprint===fingerprint?'書き出し時から変更はありません':scope==='selected'?'選択中の内容は、このJSONと異なります':'書き出し後に変更があります';
 return label+'：'+date+target+'\n'+state;
}

async function updateJsonBackupStatus(){
 const records=loadJsonBackupRecords();
 await Promise.all(['all','selected'].map(async scope=>{
  const node=jsonExportMenu.querySelector('[data-backup-status="'+scope+'"]');
  try{node.textContent=jsonBackupStatusText(scope,records[scope],records[scope]?await jsonBackupFingerprint(jsonBackupSnapshot(scope)):null)}
  catch{node.textContent='JSON書き出し記録を確認できません'}
 }));
}

function closeJsonExportMenu(restoreFocus=false){jsonExportMenu.hidden=true;$('#exportBtn').setAttribute('aria-expanded','false');if(restoreFocus)$('#exportBtn').focus()}

function closeJsonImportMenu(restoreFocus=false){jsonImportMenu.hidden=true;$('#importBtn').setAttribute('aria-expanded','false');if(restoreFocus)$('#importBtn').focus()}

function parseImportedBoards(text){
 const value=JSON.parse(String(text).replace(/^\uFEFF/,''));
 if(!value||typeof value!=='object')throw new Error('コンテンツまたはフェーズのデータがありません');
 const source=Array.isArray(value.contents)?value.contents:[value];
 const boards=source.filter(board=>board&&Array.isArray(board.pages)&&board.pages.length);
 if(!boards.length)throw new Error('コンテンツまたはフェーズのデータがありません');
 return boards.map(board=>migrateBoardImages({
  ...board,title:String(board.title||'Imported Strategy'),page:0,
  pages:board.pages.map(page=>Array.isArray(page)?page:[]),
  pageNotes:Array.from({length:board.pages.length},(_,i)=>typeof board.pageNotes?.[i]==='string'?board.pageNotes[i]:''),
  pageFieldImageIds:Array.from({length:board.pages.length},(_,i)=>board.pageFieldImageIds?.[i]??importedFieldImage(board.pageFieldImages?.[i],value.imageAssets)),
  pageFieldImageTints:Array.from({length:board.pages.length},(_,i)=>fieldImageTint(board,i)),
  pageFieldSizes:Array.from({length:board.pages.length},(_,i)=>board.pageFieldSizes?.[i]||{width:538,height:538}),
  pageBoardShapes:Array.from({length:board.pages.length},(_,i)=>board.pageBoardShapes?.[i]||board.boardShape||'square'),
  pageFieldBackgroundColors:Array.from({length:board.pages.length},(_,i)=>board.pageFieldBackgroundColors?.[i]||board.fieldBackgroundColor||'#17212c'),
  pageColors:Array.from({length:board.pages.length},(_,i)=>board.pageColors?.[i]||board.layoutColor||'#808080')
 },value.version>=4?(value.imageLibrary||{}):null));
}

function applyImportedBoards(imported,mode){if(boardReadOnly)throw new Error("閲覧中はインポートできません");
 flushScheduledBoardSave();storeContentHistory();contentBoards[activeContent]=data;
 const before=captureContentList();if(mode==='append'){contentBoards=[...contentBoards,...imported]}
 else{contentBoards=imported;activeContent=0;data=contentBoards[0];restoreContentHistory()}
 selected=null;selectedIds=[];selectedPhaseIndexes=[];phaseSelectionOwner=data;
 recordContentListChange(mode==='append'?'JSONによる追加':'JSONによる置換',before);
 renderAllIconGrids();renderAndSave();flushScheduledBoardSave();
}

function confirmReplaceImport(imported){
 return new Promise(resolve=>{
  document.getElementById('replaceImportSummary').textContent='現在の全コンテンツ（'+contentBoards.length+'件）が、読み込んだ編集データ（'+imported.length+'件）に置き換わります。';
  const finish=accepted=>{replaceImportDialog.oncancel=null;replaceImportDialog.onclose=null;replaceImportDialog.close();resolve(accepted)};
  document.getElementById('replaceImportCancel').onclick=()=>finish(false);
  document.getElementById('replaceImportConfirm').onclick=()=>finish(true);
  replaceImportDialog.oncancel=e=>{e.preventDefault();finish(false)};
  replaceImportDialog.onclose=()=>finish(false);
  replaceImportDialog.showModal();document.getElementById('replaceImportCancel').focus();
 });
}

function pngStyleValue(value){return value.replace(/url\((['"]?)(.*?)\1\)/g,(match,quote,url)=>{let hash=url.lastIndexOf('#');if(hash<0)return match;let id=url.slice(hash+1),definition=document.getElementById(id);return definition&&(stage.contains(definition)||definition.closest('.phase-comparison-grid,.phase-group-artwork'))?'url("#'+id+'")':match})}

function copyPngStyle(source,target,pseudo){let style=getComputedStyle(source,pseudo);for(let key of style){try{target.style.setProperty(key,pngStyleValue(style.getPropertyValue(key)),style.getPropertyPriority(key))}catch{}}target.style.setProperty('animation','none','important');target.style.setProperty('transition','none','important');return style}

function clonePngNode(source){if(source.nodeType===Node.TEXT_NODE)return source.cloneNode();if(source.nodeType!==Node.ELEMENT_NODE)return null;if(source.id==='objectControls'||source.classList.contains('selection-marquee'))return null;let target=source.cloneNode(false);copyPngStyle(source,target);if(source.namespaceURI!=='http://www.w3.org/2000/svg')target.removeAttribute('id');if(source.classList.contains('selected')){target.classList.remove('selected');target.style.filter='none';target.style.outline='none'}if(source instanceof HTMLImageElement){let src=source.getAttribute('src');target.src=embeddedPngs[src]||source.currentSrc||source.src;if(!target.src.startsWith('data:'))throw new Error('画像を埋め込めません：'+(source.alt||src));target.removeAttribute('srcset');target.loading='eager'}let appendPseudo=pseudo=>{let style=getComputedStyle(source,pseudo);if(style.content==='none'||style.content==='normal'||style.display==='none')return;let node=document.createElement('span');copyPngStyle(source,node,pseudo);node.style.setProperty('content','normal');if(style.content!=='""'&&style.content!=="''")node.textContent=style.content.replace(/^['"]|['"]$/g,'');target.appendChild(node)};if(source.namespaceURI==='http://www.w3.org/1999/xhtml')appendPseudo('::before');for(let child of source.childNodes){let cloned=clonePngNode(child);if(cloned)target.appendChild(cloned)}if(source.namespaceURI==='http://www.w3.org/1999/xhtml')appendPseudo('::after');return target}

function clonePngStage(){let originalClass=stage.className,originalClip=objectClip.style.getPropertyValue('clip-path'),originalPriority=objectClip.style.getPropertyPriority('clip-path');try{stage.classList.add('grid-hidden');stage.classList.remove('field-hidden');objectClip.style.setProperty('clip-path','none','important');return clonePngNode(stage)}finally{stage.className=originalClass;if(originalClip)objectClip.style.setProperty('clip-path',originalClip,originalPriority);else objectClip.style.removeProperty('clip-path')}}

async function drawPngCanvas(scale=1){if(document.fonts)await document.fonts.ready;const groupArtwork=document.querySelector('.phase-group-overview:not([hidden]) .phase-group-artwork'),comparison=phaseComparisonActive()?document.querySelector('.phase-comparison-grid'):null,source=groupArtwork||comparison||stage;for(let image of source.querySelectorAll('img')){if(!image.complete)await image.decode();if(!image.naturalWidth)throw new Error('画像を読み込めません：'+(image.alt||'アイコン'))}let width=source.offsetWidth,height=source.offsetHeight,clone=groupArtwork?clonePngNode(groupArtwork):comparison?clonePngNode(comparison):clonePngStage();for(let [key,value] of Object.entries({margin:'0',position:'relative',left:'auto',top:'auto',right:'auto',bottom:'auto',transform:'none',zoom:'1',boxShadow:'none',display:comparison?'grid':'block',width:width+'px',height:height+'px'}))clone.style.setProperty(key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value,'important');clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');let outputWidth=width*scale,outputHeight=height*scale;let html=new XMLSerializer().serializeToString(clone),svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+outputWidth+'" height="'+outputHeight+'" viewBox="0 0 '+width+' '+height+'"><foreignObject x="0" y="0" width="100%" height="100%">'+html+'</foreignObject></svg>',image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();let canvas=document.createElement('canvas');canvas.width=outputWidth;canvas.height=outputHeight;let ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas context unavailable');ctx.drawImage(image,0,0);return canvas}

async function exportPng(handlePromise,scale=1,previewCanvas=null){let filename=safeExportName('.png'),c=previewCanvas||await drawPngCanvas(scale),blob=await new Promise((resolve,reject)=>{c.toBlob(result=>result?resolve(result):reject(new Error('PNG encoding failed')),'image/png')});let bytes=new Uint8Array(await blob.arrayBuffer()),signature=[137,80,78,71,13,10,26,10];if(bytes.length<33||!signature.every((value,index)=>bytes[index]===value))throw new Error('Invalid PNG data');await saveExportBlob(new Blob([bytes],{type:'image/png'}),filename,'image/png','PNG画像',handlePromise)}

;
