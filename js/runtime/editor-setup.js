// Initialization stage: editor-setup. Load order is owned by bolxiv.js.
document.getElementById("leftRailToggle").onclick=e=>{let pinned=document.querySelector(".left").classList.toggle("pinned");localStorage.setItem('tactica-left-pinned-v1',String(pinned));e.currentTarget.setAttribute("aria-pressed",String(pinned));e.currentTarget.title=pinned?"固定を解除":"展開を固定";e.currentTarget.setAttribute("aria-label",e.currentTarget.title);e.currentTarget.querySelector(".rail-label").textContent=pinned?"固定中":"固定"};

document.querySelector(".left").addEventListener("mouseleave",()=>{let pane=document.querySelector(".left");if(!pane.classList.contains("pinned")&&pane.contains(document.activeElement))document.activeElement.blur()});

document.querySelectorAll('.left .accordion-toggle').forEach(button=>button.onclick=()=>{let open=button.getAttribute('aria-expanded')!=='true';if(open&&(!viewSettings.objectCategoriesMultiple||matchMedia('(max-width:850px)').matches)){document.querySelectorAll('.left .accordion-toggle').forEach(other=>{if(other===button)return;other.setAttribute('aria-expanded','false');document.getElementById(other.getAttribute('aria-controls')).hidden=true})}button.setAttribute('aria-expanded',String(open));document.getElementById(button.getAttribute('aria-controls')).hidden=!open});

$('#toggleBattlePages').onclick=e=>{let open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));let panel=$('#pageListPanel'),controls=e.currentTarget.closest('.page-controls');panel.hidden=!open;panel.style.display=open?'flex':'none';panel.classList.toggle('hidden',!open);controls.style.flex=open?'1 1 0':'0 0 36px';controls.style.minHeight=open?'0':'36px';controls.style.height=open?'auto':'36px'};

$('#toggleLayoutProperties').onclick=e=>{let open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));let panel=$('#layoutPropertiesPanel');panel.hidden=!open;panel.style.display=open?'block':'none';panel.classList.toggle('hidden',!open)};

$('#toggleLayers').onclick=e=>{let open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));let panel=$('#layerListPanel');panel.hidden=!open;panel.style.display=open?'flex':'none';panel.classList.toggle('hidden',!open)};

$('#toggleInspector').onclick=e=>{let open=e.currentTarget.getAttribute('aria-expanded')!=='true';e.currentTarget.setAttribute('aria-expanded',String(open));let panel=$('#propertyPanel');panel.hidden=!open;panel.style.display=open?'flex':'none';panel.classList.toggle('hidden',!open)};

document.querySelectorAll('#tools,#aoeTools,#enemyTools').forEach(container=>{container.onclick=e=>{let b=e.target.closest('[data-tool]');if(!b)return;selectPlacementTool(b.dataset.tool)};container.addEventListener('dragstart',e=>{let b=e.target.closest('[data-tool]');if(!b)return;selectPlacementTool(b.dataset.tool);e.dataTransfer.setData('application/x-tactica',JSON.stringify({type:b.dataset.tool}));e.dataTransfer.effectAllowed='copy'})});

$('#iconGroup').onchange=()=>{if($('#iconGroup').value==='none'&&tool==='icon')selectPlacementTool('select');renderAllIconGrids()};

let placementDragPayload=null,placementShiftDisabled=false;

let touchPlacementPreview=null;

let tapPlacementArmed=false,tapPlacementGesture=null;

document.querySelector('.left').addEventListener('click',e=>{if(e.target.closest('.tool[data-tool],.icon-choice'))tapPlacementArmed=true});

document.addEventListener('dragstart',e=>{if(e.target.closest('.left'))tapPlacementArmed=false});

document.addEventListener('pointerdown',e=>{
 if(!tapPlacementArmed||phaseComparisonActive()||e.button!==0||!stage.contains(e.target)||e.target.closest('.obj,.controlbox')||e.target.closest('input,button,textarea'))return;
 e.preventDefault();e.stopImmediatePropagation();tapPlacementGesture={id:e.pointerId,x:e.clientX,y:e.clientY,touch:e.pointerType==='touch'};if(tapPlacementGesture.touch)showTouchPlacementPreview(tool==='icon'&&activeIcon?{type:'icon',...activeIcon}:{type:tool},e.clientX,e.clientY,0);stage.setPointerCapture(e.pointerId);
},true);

document.addEventListener('pointermove',e=>{if(!tapPlacementGesture||tapPlacementGesture.id!==e.pointerId)return;moveTouchPlacementPreview(e.clientX,e.clientY,0);e.preventDefault();e.stopImmediatePropagation()},true);

document.addEventListener('pointerup',finishTapPlacement,true);

document.addEventListener('pointercancel',finishTapPlacement,true);

document.addEventListener('keydown',e=>{if(e.key==='Escape')tapPlacementArmed=false});

document.addEventListener('dragstart',e=>{if(!e.target.closest('.left'))return;try{placementDragPayload=JSON.parse(e.dataTransfer.getData('application/x-tactica'))}catch{placementDragPayload=null}});

document.addEventListener('dragend',endPlacementGuides);

stage.addEventListener('dragover',e=>{if(!placementDragPayload)return;e.preventDefault();stage.classList.add('drag-over');e.dataTransfer.dropEffect='copy';placementShiftDisabled=e.shiftKey;const placement=placementAlignment(placementDragPayload,e.clientX,e.clientY,e.shiftKey);clearAlignmentGuides();drawAlignmentGuides(placement.guides,stage.clientWidth,stage.clientHeight)});

stage.addEventListener('dragleave',e=>{if(!stage.contains(e.relatedTarget)){stage.classList.remove('drag-over');clearAlignmentGuides()}});

stage.addEventListener('drop',e=>{if(!Array.from(e.dataTransfer.types).includes('application/x-tactica'))return;e.preventDefault();placementShiftDisabled=e.shiftKey;try{let payload=JSON.parse(e.dataTransfer.getData('application/x-tactica'));placeObject(payload,e.clientX,e.clientY);closePaletteAfterPlacement()}catch{notify('配置アイテムを読み込めませんでした')}finally{endPlacementGuides()}});

document.querySelector('.object-layout-rect').addEventListener('pointerdown',e=>{if(data.activePhaseGroup||e.button!==0||![stage,objectClip,layer,document.getElementById('boardZoomSpace'),e.currentTarget].includes(e.target)&&e.target.className!=='axis'&&e.target.className!=='centerpoint')return;e.preventDefault();let additive=e.shiftKey;if(!additive){selected=null;selectedIds=[];renderSelectionOnly()}let box=document.createElement('div');box.className='selection-marquee';let surface=document.getElementById('boardZoomSpace');surface.appendChild(box);drag={mode:'marquee',surface,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,additive,initialIds:selectedIds.slice(),box,moved:false}});

document.addEventListener('pointerdown',e=>{if(e.target.closest('.right,.battle,.phone-view-content,dialog,[role="menu"],.obj,.controlbox,.color-popover,.color-picker,.native-color-picker,.phone-phase-navigation')||!selectedIds.length)return;if(stage.contains(e.target)){let r=stage.getBoundingClientRect(),shape=activeBoardShape(),fw=data.pageFieldSizes?.[data.page]?.width||538,fh=data.pageFieldSizes?.[data.page]?.height||(shape==='landscape'?320:538),dx=(e.clientX-r.left-r.width/2)/(r.width*fw/1280),dy=(e.clientY-r.top-r.height/2)/(r.height*fh/1280);if(shape==='none'||(shape==='circle'?dx*dx+dy*dy<=1:Math.abs(dx)<=1&&Math.abs(dy)<=1))return}selected=null;selectedIds=[];renderSelectionOnly()},true);

document.addEventListener('pointerdown',e=>{if(drag&&(drag.mode==='move'||drag.mode.startsWith('resize-'))){drag.shiftGuidesDisabled=e.shiftKey;clearAlignmentGuides();drag.alignmentPrevious=alignmentSnapshot()}});

document.addEventListener('keydown',e=>{if(e.key==='Shift')setShiftAlignmentOverride(true)});

document.addEventListener('keyup',e=>{if(e.key==='Shift')setShiftAlignmentOverride(false)});

window.addEventListener('blur',()=>{if(drag)drag.shiftGuidesDisabled=false;clearAlignmentGuides()});

document.addEventListener('pointerdown',e=>{let spin=e.target.closest('.coordinate-control input[type=number]');if(!spin||spin.dataset.historyPushed)return;recordHistory();spin.dataset.historyPushed='true'});

document.addEventListener('input',e=>{let control=e.target.closest('.coordinate-control');if(!control)return;let range=control.querySelector('input[type=range]'),spin=control.querySelector('input[type=number]');if(e.target===range&&spin){spin.value=range.value;return}if(e.target===spin&&range){if(spin.id==='fieldWidthSpin'||spin.id==='fieldHeightSpin')return;if(e.target.value==='')return;let value=Math.max(Number(spin.min)||-Infinity,Math.min(Number(spin.max)||Infinity,Math.round(Number(spin.value)||0)));spin.value=value;range.value=value;range.dispatchEvent(new Event('input',{bubbles:true}))}});

document.addEventListener('change',e=>{if(e.target.matches('.coordinate-control input[type=number]'))delete e.target.dataset.historyPushed});

document.addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==undefined&&drag.pointerId!==e.pointerId)return;if(drag.mode==='move'&&drag.pointerType==='touch'&&!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6)return;drag.shiftGuidesDisabled=e.shiftKey;drag.lastX=e.clientX;drag.lastY=e.clientY;let r=stage.getBoundingClientRect();if(drag.mode==='marquee'){let surface=drag.surface.getBoundingClientRect(),x1=drag.startX-surface.left,y1=drag.startY-surface.top,x2=e.clientX-surface.left,y2=e.clientY-surface.top;drag.moved=Math.abs(e.clientX-drag.startX)>3||Math.abs(e.clientY-drag.startY)>3;drag.box.style.left=Math.min(x1,x2)+'px';drag.box.style.top=Math.min(y1,y2)+'px';drag.box.style.width=Math.abs(x2-x1)+'px';drag.box.style.height=Math.abs(y2-y1)+'px';return}if(drag.mode==='move'&&!drag.beforeData&&(e.clientX!==drag.startX||e.clientY!==drag.startY))drag.beforeData=JSON.stringify(data);drag.moved=drag.mode==='move'?(drag.moved||e.clientX!==drag.startX||e.clientY!==drag.startY):true;if(drag.mode==='move'){setMoveCopyMode(e.ctrlKey);stage.classList.toggle('ctrl-copy',drag.ctrlAtStart&&e.ctrlKey);let boardWidth=layer.clientWidth||stage.clientWidth,boardHeight=layer.clientHeight||stage.clientHeight,scaleX=r.width/stage.offsetWidth,scaleY=r.height/stage.offsetHeight,dx=(e.clientX-drag.startX)/scaleX,dy=(e.clientY-drag.startY)/scaleY,loX=-Infinity,hiX=Infinity,loY=-Infinity,hiY=Infinity;for(let p of drag.starts){let o=current().find(x=>x.id===p.id),ex=extents(o,r),mx=Math.min(12,ex.w),my=Math.min(12,ex.h),px=p.x/100*boardWidth,py=p.y/100*boardHeight;loX=Math.max(loX,mx-ex.w-px);hiX=Math.min(hiX,boardWidth-mx+ex.w-px);loY=Math.max(loY,my-ex.h-py);hiY=Math.min(hiY,boardHeight-my+ex.h-py)}dx=steppedObjectMove(dx,loX,hiX);dy=steppedObjectMove(dy,loY,hiY);if(!e.shiftKey){let snapped=snappedObjectMove(alignmentSnapshot(),drag.starts,dx,dy,boardWidth,boardHeight,loX,hiX,loY,hiY);dx=snapped.dx;dy=snapped.dy;}for(let p of drag.starts){let o=current().find(x=>x.id===p.id);o.x=p.x+dx/boardWidth*100;o.y=p.y+dy/boardHeight*100;let el=layer.querySelector(`[data-id="${o.id}"]`);if(el){el.style.left=o.x+'%';el.style.top=o.y+'%';if(o.type==='targetcircle')refreshTargetCircleTriangle(o,el)}}let box=controls.querySelector('.controlbox'),o=current().find(x=>x.id===selected);if(box&&o){box.style.left=o.x+'%';box.style.top=o.y+'%'}updateAlignmentGuides(drag.ids);scheduleBoardSave()}else{let o=current().find(x=>x.id===drag.id);if(!o)return;let ox=r.left+drag.ox/100*r.width,oy=r.top+drag.oy/100*r.height,dx=e.clientX-ox,dy=e.clientY-oy;let mdx=e.clientX-drag.startX,mdy=e.clientY-drag.startY;if(drag.mode==='resize-aoe-box'){const scaleX=r.width/stage.offsetWidth,scaleY=r.height/stage.offsetHeight,next=resizedAoeBox(drag,mdx/scaleX,mdy/scaleY);o.width=next.width;o.height=next.height;o.x=drag.ox+next.dx/(layer.clientWidth||stage.clientWidth)*100;o.y=drag.oy+next.dy/(layer.clientHeight||stage.clientHeight)*100;}if(drag.mode==='resize-donut-inner'){
 const scaleX=r.width/stage.offsetWidth,scaleY=r.height/stage.offsetHeight,cx=r.left+o.x/100*r.width,cy=r.top+o.y/100*r.height;
 const radius=Math.hypot((e.clientX-cx)/scaleX,(e.clientY-cy)/scaleY);
 setDonutInnerDiameter(o,radius*2);syncDonutInnerInputs(o);
}
if(drag.mode==='resize-angle'){let rot=(o.rotation||0)*Math.PI/180,cx=r.left+o.x/100*r.width,cy=r.top+o.y/100*r.height,dx=e.clientX-cx,dy=e.clientY-cy,lx=dx*Math.cos(rot)+dy*Math.sin(rot),ly=-dx*Math.sin(rot)+dy*Math.cos(rot),apexY=-(o.height||100)/2+(o.height||100)*.05;o.angle=Math.max(5,Math.min(179.5,Math.round(Math.atan2(Math.abs(lx),ly-apexY)*180/Math.PI)));updateShapeFromData(o)}if(drag.mode==='resize-icon'){let size=Math.max(24,Math.min(640,Math.round(drag.width+(mdx+mdy)/2)));o.width=o.height=size;let el=Array.from(layer.children).find(x=>x.dataset.id===o.id);if(el){el.style.width=size+'px';el.style.height=size+'px';let badge=el.querySelector('.role-badge');if(badge){badge.style.setProperty('font-size',Math.max(8,size*.36)+'px','important');badge.style.right=(size*.06)+'px';badge.style.bottom=(size*.06)+'px';badge.style.webkitTextStroke=(size*.03)+'px #111'}}let box=controls.querySelector('.controlbox');if(box){box.style.width=size+'px';box.style.height=size+'px'}}if(drag.mode==='resize-x'||drag.mode==='resize-y'){let a=(o.rotation||0)*Math.PI/180;if(o.type==='aoe'||o.type==='circle'||o.type==='donut'||(['knockback','lineknockback'].includes(o.type))||o.type==='gaze'||['stack','linestack'].includes(o.type)||o.type==='targetcircle'||(o.type==='icon'&&['フレア','ダイブボム','ターゲット赤','ターゲット紫'].includes(o.iconName))){let resizeSign=drag.resizeSign||1,desired=drag.mode==='resize-x'?drag.width+2*resizeSign*(mdx*Math.cos(a)+mdy*Math.sin(a)):drag.height+2*resizeSign*(-mdx*Math.sin(a)+mdy*Math.cos(a)),base=drag.mode==='resize-x'?drag.width:drag.height,factor=desired/base,minSize=o.type==='icon'?24:20,maxSize=o.type==='icon'?640:960,minFactor=Math.max(minSize/drag.width,minSize/drag.height),maxFactor=Math.min(maxSize/drag.width,maxSize/drag.height);factor=Math.max(minFactor,Math.min(maxFactor,factor));o.width=Math.round(drag.width*factor);o.height=Math.round(drag.height*factor)}else if(o.type==='segment'&&drag.mode==='resize-x'){let baseAngle=drag.rotation*Math.PI/180,anchorX=r.left+drag.ox/100*r.width-drag.width/2*Math.cos(baseAngle),anchorY=r.top+drag.oy/100*r.height-drag.width/2*Math.sin(baseAngle),dx=e.clientX-anchorX,dy=e.clientY-anchorY,newWidth=Math.max(20,Math.min(960,Math.round(Math.hypot(dx,dy)))),newAngle=Math.atan2(dy,dx);o.width=newWidth;o.rotation=Math.round(newAngle*180/Math.PI);o.x=(anchorX-r.left+newWidth/2*Math.cos(newAngle))/r.width*100;o.y=(anchorY-r.top+newWidth/2*Math.sin(newAngle))/r.height*100;let el=Array.from(layer.children).find(node=>node.dataset.id===o.id),box=controls.querySelector('.controlbox');if(el){el.style.left=o.x+'%';el.style.top=o.y+'%'}if(box){box.style.left=o.x+'%';box.style.top=o.y+'%'}}else if(o.type==='line'){let boardWidth=layer.clientWidth||stage.clientWidth,boardHeight=layer.clientHeight||stage.clientHeight,localDx=mdx/(r.width/stage.offsetWidth),localDy=mdy/(r.height/stage.offsetHeight),sign=drag.resizeSign||1,delta=drag.mode==='resize-x'?localDx*Math.cos(a)+localDy*Math.sin(a):-localDx*Math.sin(a)+localDy*Math.cos(a),base=drag.mode==='resize-x'?drag.width:drag.height,next=Math.max(20,Math.min(960,Math.round(base+sign*delta))),shift=sign*(next-base)/2;if(drag.mode==='resize-x'){o.width=next;o.x=(drag.ox+shift*Math.cos(a)/boardWidth*100);o.y=(drag.oy+shift*Math.sin(a)/boardHeight*100)}else{o.height=next;o.x=(drag.ox-shift*Math.sin(a)/boardWidth*100);o.y=(drag.oy+shift*Math.cos(a)/boardHeight*100)}}else if(o.type==='text'&&drag.mode==='resize-x'){const scaleX=r.width/stage.offsetWidth;o.width=Math.max(20,Math.min(960,Math.round(drag.width+mdx/scaleX)))}else if(drag.mode==='resize-x')o.width=Math.max(20,Math.min(960,Math.round(drag.width+2*(mdx*Math.cos(a)+mdy*Math.sin(a)))));else o.height=Math.max(20,Math.min(960,Math.round(drag.height+2*(-mdx*Math.sin(a)+mdy*Math.cos(a))))) }if(drag.mode==='rotate')o.rotation=Math.round(Math.atan2(dy,dx)*180/Math.PI+90);updateShapeFromData(o);if(['resize-x','resize-y','resize-icon','resize-angle','resize-aoe-box'].includes(drag.mode))updateAlignmentGuides([o.id])}});

document.addEventListener('keydown',e=>{if(e.key==='Control')setMoveCopyMode(true)});

document.addEventListener('keyup',e=>{if(e.key==='Control')setMoveCopyMode(false)});

document.addEventListener('pointerup',e=>{if(drag?.pointerId!==undefined&&drag.pointerId!==e.pointerId)return;const clearTouchMoveSelection=e.pointerType==='touch'&&drag?.mode==='move'&&drag.moved;setMoveCopyMode(e.ctrlKey);clearAlignmentGuides();if(drag?.mode==='marquee'){let activeDrag=drag,box=activeDrag.box;box?.remove();if(activeDrag.moved){let left=Math.min(activeDrag.startX,e.clientX),top=Math.min(activeDrag.startY,e.clientY),right=Math.max(activeDrag.startX,e.clientX),bottom=Math.max(activeDrag.startY,e.clientY),boardBounds=stage.getBoundingClientRect(),viewport=document.querySelector('.object-layout-rect'),viewportRect=viewport.getBoundingClientRect(),viewportBounds={left:viewportRect.left+viewport.clientLeft,top:viewportRect.top+viewport.clientTop,right:viewportRect.left+viewport.clientLeft+viewport.clientWidth,bottom:viewportRect.top+viewport.clientTop+viewport.clientHeight},hits=current().filter(o=>{if(o.visible===false)return false;let node=Array.from(layer.children).find(el=>el.dataset.id===o.id);if(!node)return false;let b=node.getBoundingClientRect();return marqueeContainsVisibleObject(b,{left,top,right,bottom},boardBounds,viewportBounds)}).map(o=>o.id);selectedIds=activeDrag.additive?[...new Set([...activeDrag.initialIds,...hits])]:hits;selected=selectedIds[selectedIds.length-1]||null}if(e.pointerType==='mouse'&&selectedIds.length===1)pendingLayerRevealId=selectedIds[0];drag=null;renderSelectionOnly();return}let shouldRender=false,copiedLayerIds=[],structuralChange=!!(drag?.mode==='move'&&drag.ctrlAtStart);if(drag?.mode==='move'&&drag.ctrlAtStart){let validClone=drag.moved&&e.ctrlKey&&!drag.ctrlBroken;if(!validClone){current().splice(0,current().length,...current().filter(item=>!drag.ids.includes(item.id)));selectedIds=drag.originalIds;selected=selectedIds[selectedIds.length-1]||null}else{recordHistory(drag.beforeData);save();renderInspector();copiedLayerIds=drag.ids.slice()}shouldRender=true}else if(drag?.moved){recordHistory(drag.beforeData);save();renderInspector()}drag=null;stage.classList.remove('ctrl-copy');if(clearTouchMoveSelection){selected=null;selectedIds=[];shouldRender=true}if(shouldRender){if(structuralChange)renderAndSave();else renderSelectionOnly()}if(copiedLayerIds.length)revealMovedLayers(copiedLayerIds)});

document.addEventListener('pointercancel',e=>{if(!drag||drag.pointerId!==undefined&&drag.pointerId!==e.pointerId)return;const cancelled=drag;drag=null;cancelled.box?.remove();clearAlignmentGuides();stage.classList.remove('ctrl-copy');if(cancelled.beforeData)data=JSON.parse(cancelled.beforeData);else if(cancelled.moved){recordHistory();save()}selected=null;selectedIds=[];renderAndSave()});

let keyboardNudgeSession=null,keyboardNudgeFrame=null;

document.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))finishKeyboardNudge()});

document.addEventListener('pointerdown',finishKeyboardNudge,true);

window.addEventListener('blur',finishKeyboardNudge);

document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target.isContentEditable||e.target.closest('input,select,textarea,button,dialog,[role="separator"],[role="menu"],#pages')||document.querySelector('.comparison-pan-enabled'))return;if(nudgeSelectedObjects(e.key,e.repeat)){e.preventDefault();e.stopImmediatePropagation()}});

document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea')||e.target.isContentEditable)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){if(selectedIds.length){e.preventDefault();clipboardObjects=current().filter(o=>selectedIds.includes(o.id)).map(o=>JSON.parse(JSON.stringify(o)));clipboardSourcePage=current()}}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){if(clipboardObjects.length){e.preventDefault();pasteClipboardObjects()}}if((e.key==='ArrowUp'||e.key==='ArrowDown')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.target.closest('#pages')){let next=data.page+(e.key==='ArrowUp'?-1:1);if(next>=0&&next<data.pages.length){e.preventDefault();selectPhase(next);document.querySelector('#pages .page-tab.active')?.focus()}}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}else if(e.key==='Delete'||e.key==='Backspace')deleteSelected();else if(e.key==='Escape'){if(drag?.mode==='move'){data=JSON.parse(drag.beforeData);selectedIds=drag.originalIds||selectedIds;selected=selectedIds[selectedIds.length-1]||null;drag=null;stage.classList.remove('ctrl-copy');renderAndSave()}tool='select';document.querySelectorAll('.tool').forEach(x=>x.classList.remove('active'));stage.style.cursor='default'}});

$('#undo').onclick=undo;

$('#redo').onclick=redo;

$('#clipToggle').onclick=()=>{fieldClipEnabled=!fieldClipEnabled;updateObjectClip();updateClipToggle()};

$('#fieldToggle').onclick=()=>{fieldVisible=!fieldVisible;stage.classList.toggle('field-hidden',!fieldVisible);updateFieldToggle()};

updateFieldToggle();

$('#gridToggle').onclick=()=>{gridVisible=!gridVisible;stage.classList.toggle('grid-hidden',!gridVisible);updateGridToggle()};

updateGridToggle();

updateClipToggle();

$('#addPage').onclick=()=>{commitPendingHistory();const owner=data,before=JSON.parse(JSON.stringify(data)),beforeHistory=history.slice(),beforeFuture=future.slice(),beforeSelected=selected,beforeSelectedIds=selectedIds.slice(),beforePhases=selectedPhaseIndexes.slice();snapshot();selectedPhaseIndexes=[];data.pages.push([]);data.pageNames.push('新規フェーズ');data.pageGroupIds.push(data.activePhaseGroup||null);data.pageNotes.push('');data.pageColors.push('#ffffff');data.pageBoardShapes.push('square');data.pageFieldBackgroundColors.push(activeFieldBackground());data.pageFieldImageIds.push('');data.pageFieldImageTints.push({color:"#000000",strength:0});data.pageFieldSizes.push({width:538,height:538});data.page=data.pages.length-1;data.activePhaseGroup=null;selected=null;selectedIds=[];renderAndSave();const tab=$('#pages').querySelectorAll('.page-tab')[data.page];if(tab){beginPageRename(tab,()=>{if(data!==owner)return;Object.assign(data,before);history=beforeHistory;future=beforeFuture;pendingHistoryState=null;pendingHistoryOwner=null;selected=beforeSelected;selectedIds=beforeSelectedIds;selectedPhaseIndexes=beforePhases;phaseSelectionOwner=data;renderAndSave()});const input=tab.querySelector('.page-tab-input');if(input)revealMovedListItems($('#pages'),[input])}};

$('#confirmNo').onclick=()=>{$('#deletePageDialog').close();deletePageIndex=null};

$('#confirmYes').onclick=()=>{$('#deletePageDialog').close();if(deletePageIndex!==null)deleteCurrentPage(deletePageIndex);deletePageIndex=null};

$('#deleteContentNo').onclick=()=>{$('#deleteContentDialog').close();deleteContentIndex=null};

$('#deleteContentYes').onclick=()=>{$('#deleteContentDialog').close();if(deleteContentIndex!==null)deleteContentBoard(deleteContentIndex);deleteContentIndex=null};

$('#clearUserDataBtn').onclick=()=>$('#clearUserDataDialog').showModal();

$('#clearUserDataNo').onclick=()=>$('#clearUserDataDialog').close();

$('#clearUserDataYes').onclick=async()=>{try{cancelScheduledBoardSave();await window.boardStorage.clear();localStorage.removeItem('tactica-board-v1');localStorage.removeItem('tactica-left-pinned-v1');localStorage.removeItem('tactica-view-settings-v1');location.reload()}catch(error){notify('保存データを削除できません：'+(error?.message||String(error)))}};

$('#clearBtn').onclick=()=>showDeletionDialog('clearDialog','コンテンツ「'+(data.title||'新規コンテンツ')+'」のフェーズ「'+(data.pageNames[data.page]||'フェーズ'+(data.page+1))+'」内のオブジェクトをすべて削除しますか？');

$('#clearNo').onclick=()=>$('#clearDialog').close();

$('#clearYes').onclick=()=>{$('#clearDialog').close();if(!current().length)return;snapshot();data.pages[data.page]=[];selected=null;selectedIds=[];renderAndSave()};
