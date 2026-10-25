// ===== js/canvas/png-preview.js =====
(()=>{
 const host=document.querySelector('.layout>.right'),layout=document.querySelector('.layout');
 const dialog=document.createElement('dialog');dialog.id='pngPreview';dialog.className='png-preview-panel';dialog.setAttribute('aria-labelledby','pngPreviewTitle');
 dialog.innerHTML='<header class="png-preview-heading"><h2 id="pngPreviewTitle">画像生成・印刷</h2><span class="phone-canvas-mode-status" id="pngCanvasModeStatus">画像生成・印刷</span></header><div class="png-preview-content"><div class="png-preview-surface" aria-label="出力画像"><p class="png-preview-status" id="pngPreviewStatus" role="status" aria-live="polite"></p></div><aside class="png-preview-settings"><h3><button type="button" id="pngPropertiesToggle" aria-controls="pngPropertiesBody" aria-expanded="true"><span>画像生成・印刷プロパティ</span><span class="png-properties-mark" aria-hidden="true">−</span></button></h3><div class="png-preview-settings-body" id="pngPropertiesBody"><section class="output-section output-note-section"><h4>共通オプション</h4><label class="output-note-toggle"><input type="checkbox" id="outputIncludeNote"> ノートを含める</label><div id="outputPhaseGapField" hidden><span>フェーズ間隔</span><label for="outputPhaseGapX">横 <input id="outputPhaseGapX" class="output-phase-gap" type="number" min="0" max="100" step="1" value="12" aria-label="フェーズ間隔 横"> px</label><label for="outputPhaseGapY">縦 <input id="outputPhaseGapY" class="output-phase-gap" type="number" min="0" max="100" step="1" value="12" aria-label="フェーズ間隔 縦"> px</label></div><p id="outputNoteError" role="status" hidden></p></section><div class="output-section-separator" role="separator"></div><section class="output-section output-png-section"><h4>PNG</h4><div class="png-settings-fields"><label for="pngPreviewScale">出力倍率</label><select id="pngPreviewScale"><option value="1">1倍</option><option value="2">2倍</option></select></div><button type="button" class="btn primary" id="pngPreviewSave" disabled>PNGを保存</button></section><div class="output-section-separator" role="separator"></div><section class="output-section output-print-section"><h4>印刷</h4><button type="button" class="btn primary" id="outputPrintButton">印刷</button></section></div></aside></div>';
 host.append(dialog);
 const surface=dialog.querySelector('.png-preview-surface'),status=document.getElementById('pngPreviewStatus'),scaleInput=document.getElementById('pngPreviewScale'),save=document.getElementById('pngPreviewSave'),back=document.getElementById('editModeToggle'),printButton=document.getElementById('outputPrintButton');
 const toolbar=document.querySelector('.board-display-toolbar').cloneNode(true);toolbar.classList.add('png-preview-toolbar');toolbar.setAttribute('aria-label','PNGプレビューの表示');
 toolbar.querySelector('.phone-content-icon')?.remove();toolbar.querySelector('.phone-icon-help-toggle')?.remove();toolbar.querySelector('.phone-help-separator')?.remove();
 for(const node of toolbar.querySelectorAll('[id]')){node.dataset.sourceId=node.id;node.id='png-'+node.id}
 for(const button of toolbar.querySelectorAll('button')){
  const action=button.dataset.sourceId,zoom=['fitBoardZoom','zoomOut','resetBoardZoom','zoomIn'].includes(action);button.disabled=!zoom;
  if(zoom)button.onclick=()=>{if(!session)return;session.zoom=action==='zoomIn'?Math.min(3,session.zoom+.05):action==='zoomOut'?Math.max(.05,session.zoom-.05):action==='fitBoardZoom'?Math.max(.05,Math.min((surface.clientWidth-40)/outputDimensions().width,(surface.clientHeight-40)/outputDimensions().height)):1;fit();surface.scrollLeft=Math.max(0,(surface.scrollWidth-surface.clientWidth)/2);surface.scrollTop=Math.max(0,(surface.scrollHeight-surface.clientHeight)/2)};
 }
 dialog.querySelector('.png-preview-heading').append(toolbar);
 const helpButton=document.createElement('button');helpButton.type='button';helpButton.className='phone-icon-help-toggle png-icon-help';helpButton.textContent='？';helpButton.setAttribute('aria-label','画像生成・印刷のアイコン説明');helpButton.setAttribute('aria-controls','phoneIconHelp');helpButton.setAttribute('aria-haspopup','dialog');helpButton.setAttribute('aria-expanded','false');helpButton.onclick=()=>window.Bolxiv.iconHelp.open(helpButton);const helpSeparator=document.createElement('span');helpSeparator.className='phone-help-separator';helpSeparator.setAttribute('aria-hidden','true');toolbar.append(helpSeparator,helpButton);
 const liveSpace=document.getElementById('boardZoomSpace'),liveAnchor=document.createComment('PNG canvas home');liveSpace.before(liveAnchor);
 const zoomTrigger=toolbar.querySelector('[data-source-id=resetBoardZoom]'),zoomMenu=document.getElementById('boardZoomMenu').cloneNode(true);zoomMenu.id='pngPreviewZoomMenu';document.body.append(zoomMenu);zoomTrigger.setAttribute('aria-controls',zoomMenu.id);
 const zoomItems=[...zoomMenu.querySelectorAll('[data-zoom]')];
 function closeZoomMenu(focus=false){zoomMenu.hidden=true;zoomTrigger.setAttribute('aria-expanded','false');if(focus)zoomTrigger.focus({preventScroll:true})}
 function openZoomMenu(){if(!session||session.saving)return;addPhoneMenuClose(zoomMenu,()=>closeZoomMenu(true));zoomMenu.hidden=false;zoomTrigger.setAttribute('aria-expanded','true');for(const item of zoomItems)item.setAttribute('aria-checked',String(Number(item.dataset.zoom)===Math.round(session.zoom*100)));const rect=zoomTrigger.getBoundingClientRect();zoomMenu.style.left=Math.max(8,Math.min(rect.right-zoomMenu.offsetWidth,innerWidth-zoomMenu.offsetWidth-8))+'px';zoomMenu.style.top=Math.max(8,Math.min(rect.bottom+4,innerHeight-zoomMenu.offsetHeight-8))+'px';(zoomItems.find(item=>item.getAttribute('aria-checked')==='true')||zoomItems[0]).focus({preventScroll:true})}
 zoomTrigger.onclick=()=>zoomMenu.hidden?openZoomMenu():closeZoomMenu();
 for(const item of zoomItems)item.onclick=()=>{if(!session)return;session.zoom=Number(item.dataset.zoom)/100;fit();surface.scrollLeft=Math.max(0,(surface.scrollWidth-surface.clientWidth)/2);surface.scrollTop=Math.max(0,(surface.scrollHeight-surface.clientHeight)/2);closeZoomMenu(true)};
 zoomTrigger.onkeydown=event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();openZoomMenu()}};
 zoomMenu.onkeydown=event=>{const index=zoomItems.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();closeZoomMenu(true)}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();zoomItems[(index+(event.key==='ArrowDown'?1:zoomItems.length-1))%zoomItems.length].focus()}else if(['Home','End'].includes(event.key)){event.preventDefault();zoomItems[event.key==='Home'?0:zoomItems.length-1].focus()}else if(event.key==='Tab')closeZoomMenu()};
 window.addEventListener('pointerdown',event=>{if(!zoomMenu.hidden&&!zoomMenu.contains(event.target)&&!zoomTrigger.contains(event.target))closeZoomMenu()},true);window.addEventListener('resize',()=>closeZoomMenu());
 const propertiesToggle=document.getElementById('pngPropertiesToggle'),propertiesPanel=dialog.querySelector('.png-preview-settings');
 let propertiesExpanded=true;
 function syncProperties(){const mobile=matchMedia('(max-width:850px)').matches;propertiesPanel.classList.toggle('png-properties-collapsed',mobile&&!propertiesExpanded);propertiesToggle.setAttribute('aria-expanded',String(!mobile||propertiesExpanded));propertiesToggle.querySelector('.png-properties-mark').textContent=propertiesExpanded?'−':'＋';propertiesToggle.tabIndex=mobile?0:-1}
 propertiesToggle.onclick=()=>{if(!matchMedia('(max-width:850px)').matches||session?.saving)return;propertiesExpanded=!propertiesExpanded;syncProperties();syncPhoneLayout()};
 matchMedia('(max-width:850px)').addEventListener('change',syncProperties);syncProperties();
 let session=null,opening=false,revision=0,pinch=null;
 surface.addEventListener('touchstart',event=>{if(!session||event.touches.length!==2)return;event.preventDefault();event.stopImmediatePropagation();const [a,b]=event.touches,rect=stage.getBoundingClientRect();pinch={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:session.zoom,x:((a.clientX+b.clientX)/2-rect.left)/rect.width,y:((a.clientY+b.clientY)/2-rect.top)/rect.height}},{passive:false});
 surface.addEventListener('touchmove',event=>{if(!session||!pinch||event.touches.length!==2)return;event.preventDefault();event.stopImmediatePropagation();const [a,b]=event.touches;session.zoom=Math.max(.05,Math.min(3,Math.round(pinch.zoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/pinch.distance*20)/20));fit();const rect=stage.getBoundingClientRect();surface.scrollLeft+=rect.left+pinch.x*rect.width-(a.clientX+b.clientX)/2;surface.scrollTop+=rect.top+pinch.y*rect.height-(a.clientY+b.clientY)/2},{passive:false});
 for(const type of ['touchend','touchcancel'])surface.addEventListener(type,()=>{pinch=null},{passive:true});
 function syncPhoneCanvas(){if(!session||!matchMedia('(max-width:850px)').matches)return;if(liveSpace.parentElement!==surface){surface.append(liveSpace);liveSpace.inert=true}fit()}
 function syncPhoneLayout(){
  if(!session||!matchMedia('(max-width:850px)').matches)return;
  const content=dialog.querySelector('.png-preview-content'),reader=dialog.querySelector('.png-reader-controls');if(!reader)return;
  const expanded=document.getElementById('toggleBattlePages').getAttribute('aria-expanded')==='true',tab=session.phoneTab||'properties';
  if(reader.dataset.readerTab!==tab)reader.dataset.readerTab=tab;
  if(reader.dataset.readerExpanded!==String(expanded))reader.dataset.readerExpanded=String(expanded);
  const title=reader.querySelector('.phone-reader-title'),change=reader.querySelector('.phone-reader-switch'),collapse=reader.querySelector('.phone-reader-collapse');
  const propertiesName='画像生成・印刷プロパティ';const markup=tab==='list'?'<span class="phone-reader-label-part"><strong>フェーズリスト</strong> / </span><span class="phone-reader-label-part">'+propertiesName+'</span>':'<span class="phone-reader-label-part">フェーズリスト / </span><span class="phone-reader-label-part"><strong>'+propertiesName+'</strong></span>';
  if(title&&title.innerHTML!==markup)title.innerHTML=markup;
  const attr=(node,key,value)=>{if(node&&node.getAttribute(key)!==value)node.setAttribute(key,value)};
  attr(title,'aria-expanded',String(expanded));attr(title,'aria-label',(tab==='list'?'フェーズリスト':propertiesName)+'を'+(expanded?'閉じる':'開く'));
  attr(change,'aria-label',tab==='list'?propertiesName+'を表示':'フェーズリストを表示');
  const mark=expanded?'−':'＋';if(collapse&&collapse.textContent!==mark)collapse.textContent=mark;attr(collapse,'aria-expanded',String(expanded));attr(collapse,'aria-label',title?.getAttribute('aria-label'));
  const rowHeight=reader.querySelector('.content-select-row').getBoundingClientRect().height,metrics=phoneReaderLayoutMetrics(content,0,rowHeight,100);
  content.classList.toggle('png-phases-collapsed',!expanded);
  for(const [name,value] of Object.entries({'canvas-height':metrics.canvasHeight,'controls-min-height':metrics.controlsMinHeight,'closed-controls-height':metrics.closedControlsHeight})){const key='--png-phone-'+name,next=value+'px';if(content.style.getPropertyValue(key)!==next)content.style.setProperty(key,next)}
 }
 new ResizeObserver(syncPhoneLayout).observe(propertiesPanel);
 new ResizeObserver(syncPhoneLayout).observe(dialog.querySelector('.png-preview-content'));
 new MutationObserver(syncPhoneLayout).observe(document.getElementById('toggleBattlePages'),{attributes:true,attributeFilter:['aria-expanded']});
 function diagramDimensions(){const source=document.querySelector('.phase-group-overview:not([hidden]) .phase-group-artwork')||(phaseComparisonActive()?document.querySelector('.phase-comparison-grid'):null)||stage;return {width:source.offsetWidth||640,height:source.offsetHeight||640}}
 function outputDimensions(){const dimensions=diagramDimensions(),note=outputNoteLayout(dimensions.width);return {width:note.width||dimensions.width,height:dimensions.height+note.height}}
 function fitOutputImmediately(){if(!session)return;const dimensions=outputDimensions();session.zoom=Math.max(.05,Math.min((surface.clientWidth-40)/dimensions.width,(surface.clientHeight-40)/dimensions.height));fit();surface.scrollLeft=Math.max(0,(surface.scrollWidth-surface.clientWidth)/2);surface.scrollTop=0}
 async function fitOutputToViewport(){
  const active=session;if(!active)return;active.initialScroll=null;
  // Phone pane height also responds to zoom; measure again after each layout.
  for(let attempt=0;attempt<6;attempt++){
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(session!==active)return;const dimensions=outputDimensions(),zoom=Math.max(.05,Math.min((surface.clientWidth-40)/dimensions.width,(surface.clientHeight-40)/dimensions.height));
   const settled=Math.abs(active.zoom-zoom)<.001;active.zoom=zoom;fit();if(settled)break;
  }
  if(session!==active)return;surface.scrollLeft=Math.max(0,(surface.scrollWidth-surface.clientWidth)/2);surface.scrollTop=0;
 }
 let notePreviewRevision=0,notePreviewKey='',diagramVersion=0;
 function previewDiagram(){if(session.diagramVersion!==diagramVersion||!session.diagramCanvas){session.diagramVersion=diagramVersion;const finish=beginDesktopDisplayBusy();session.diagramCanvas=drawDiagramPngCanvas(2).finally(finish)}return session.diagramCanvas}
 function syncNotePreview(){
  if(!session)return;const dimensions=diagramDimensions(),note=outputNoteLayout(dimensions.width);let preview=liveSpace.querySelector('.output-note-preview');if(!preview){preview=document.createElement('canvas');preview.className='output-note-preview';preview.setAttribute('aria-label','出力ノート');liveSpace.append(preview);notePreviewKey=''}
  document.getElementById('outputPhaseGapField').hidden=!phaseComparisonActive();preview.hidden=(!note.height&&!note.notes)||!!note.error;liveSpace.classList.toggle('has-output-note',!!note.height||!!note.notes);
  const key=JSON.stringify({diagramVersion,note,width:dimensions.width,height:dimensions.height,page:data.page,objects:note.notes?selectedPhaseIndexes.map(i=>data.pages[i]):null});
  if(key!==notePreviewKey){notePreviewKey=key;const revision=++notePreviewRevision;
   if(note.notes&&!note.error){previewDiagram().then(source=>composeOutputPngCanvas(source,2)).then(canvas=>{if(revision!==notePreviewRevision||!session)return;preview.width=canvas.width;preview.height=canvas.height;preview.getContext('2d').drawImage(canvas,0,0)}).catch(error=>{if(revision===notePreviewRevision){document.getElementById('outputNoteError').textContent=error.message;document.getElementById('outputNoteError').hidden=false}})}
   else if(!note.notes){preview.width=dimensions.width*2;preview.height=Math.max(1,note.height*2);const ctx=preview.getContext('2d');ctx.scale(2,2);drawOutputNote(ctx,dimensions.width,0,note)}
  }
  preview.style.width=(note.width||dimensions.width)+'px';preview.style.height=(note.notes?dimensions.height+note.height:note.height)+'px';preview.style.top=(note.notes?20:20+dimensions.height*session.zoom)+'px';preview.style.transform='translateX(-50%) scale('+session.zoom+')';preview.style.zIndex=note.notes?'3':'';
  const warning=document.getElementById('outputNoteError');warning.textContent=note.error;warning.hidden=!note.error;save.disabled=printButton.disabled=!!session.saving||!!note.error;
 }
 function fit(){if(!session)return;const dimensions=outputDimensions();toolbar.querySelector('[data-source-id=boardZoomValue]').textContent=Math.round(session.zoom*100);liveSpace.style.setProperty('--board-display-scale',String(session.zoom));stage.style.setProperty('--board-display-scale',String(session.zoom));liveSpace.style.width=(dimensions.width*session.zoom+40)+'px';liveSpace.style.height=(dimensions.height*session.zoom+40)+'px';const comparison=liveSpace.querySelector('.phase-comparison-grid');if(comparison)comparison.style.transform='translate(-50%,-50%) scale('+session.zoom+')';syncNotePreview();syncPhoneLayout()}
 new ResizeObserver(fit).observe(surface);
 function syncToolbarAppearance(){
  const properties=['display','box-sizing','width','min-width','max-width','height','min-height','max-height','padding','margin','border','border-radius','background','color','-webkit-text-fill-color','font','line-height','letter-spacing','text-align','align-items','justify-content','gap','fill','stroke','stroke-width'];
  function copy(source,target,dimensions=true){if(!source||!target)return;const style=getComputedStyle(source);for(const key of properties){if(!dimensions&&['width','min-width','max-width'].includes(key))continue;target.style.setProperty(key,style.getPropertyValue(key),'important')}}
  for(const target of toolbar.querySelectorAll('[data-source-id]')){const source=document.getElementById(target.dataset.sourceId);copy(source,target);if(target===zoomTrigger)for(const key of ['background','color','-webkit-text-fill-color'])target.style.removeProperty(key);if(target.matches('button')){const children=source?.querySelectorAll('svg,path');target.querySelectorAll('svg,path').forEach((child,index)=>copy(children?.[index],child))}}
  copy(document.querySelector('.board-display-toolbar .board-zoom-group'),toolbar.querySelector('.board-zoom-group'),false);
  for(const className of ['board-toolbar-separator','board-zoom-separator'])copy(document.querySelector('.board-display-toolbar .'+className),toolbar.querySelector('.'+className));
  if(matchMedia('(max-width:850px)').matches){for(const button of toolbar.querySelectorAll('button:disabled'))button.style.setProperty('display','none','important');toolbar.querySelector('.board-toolbar-separator')?.style.setProperty('display','none','important')}
 }
 function alignFrame(){
  if(!session)return;syncToolbarAppearance();const normalLabel=document.querySelector('#layoutPropertiesPanel label');if(normalLabel)dialog.querySelector('.png-preview-settings-body label').style.font=getComputedStyle(normalLabel).font;
  const list=host.querySelector('.layer-list-group'),listHeading=document.getElementById('toggleInspector'),settingsHeading=dialog.querySelector('.png-preview-settings h3');
  if(list&&matchMedia('(min-width:851px)').matches)dialog.style.setProperty('--png-settings-width',list.getBoundingClientRect().width+'px');
  if(listHeading){const style=getComputedStyle(listHeading);for(const key of ['height','min-height','padding','background-color','color','font','line-height','letter-spacing','box-sizing','border-bottom'])settingsHeading.style.setProperty(key,style.getPropertyValue(key));if(matchMedia('(min-width:851px)').matches){const target=settingsHeading.firstElementChild;target.style.removeProperty('left');target.style.removeProperty('top')}}
  const frame=host.querySelector('.layer-group').getBoundingClientRect(),parent=host.getBoundingClientRect(),heading=host.querySelector('.board-title-row').getBoundingClientRect();
  for(const [name,value] of Object.entries({left:frame.left-parent.left-host.clientLeft,top:frame.top-parent.top-host.clientTop,width:frame.width,height:frame.height,'heading-height':heading.height}))dialog.style.setProperty('--png-'+name,value+'px');
 }
 const frameObserver=new ResizeObserver(alignFrame);frameObserver.observe(host);frameObserver.observe(host.querySelector('.layer-group'));
 function freeze(){
  const nodes=[...host.children].filter(node=>node&&node!==dialog);
  const states=[...new Set(nodes)].map(node=>({node,inert:node.inert}));for(const {node} of states)node.inert=true;return states;
 }
 function refresh(){if(!session)return;const sourceTitle=document.getElementById('selectionTitle'),previewTitle=document.getElementById('pngPreviewTitle');previewTitle.replaceChildren(...[...sourceTitle.childNodes].map(node=>node.cloneNode(true)));const prefix=previewTitle.querySelector('.phase-label-prefix');if(prefix)prefix.textContent='フェーズ：';previewTitle.title=previewTitle.textContent;session.scale=Number(scaleInput.value);const dimensions=outputDimensions();for(const option of scaleInput.options){const scale=Number(option.value);option.textContent=scale+'倍（'+dimensions.width*scale+' × '+dimensions.height*scale+' px）'}status.hidden=true;fit();save.disabled=printButton.disabled=!!session.saving||!!outputNoteLayout(diagramDimensions().width).error;if(session.initialScroll){surface.scrollLeft=session.initialScroll.left;surface.scrollTop=session.initialScroll.top;session.initialScroll=null}}
 async function open(scale=1){
  if(session||opening)return;opening=true;const focus=document.activeElement;focus?.blur();
  try{
   if(matchMedia('(max-width:850px)').matches&&layout.classList.contains('phone-content-open')){document.querySelector('.phone-content-close').click();await Promise.allSettled(layout.querySelector('.battle').getAnimations().map(animation=>animation.finished))}
   const placementControls=[...document.querySelectorAll('.left .tool,.left .icon-choice')].map(node=>({node,disabled:node.disabled}));for(const {node} of placementControls)node.disabled=true;
   const viewport=document.getElementById('boardZoomSpace').parentElement,viewportStyle=getComputedStyle(viewport);for(const key of ['background-color','background-image','background-size','background-position','border','border-radius'])surface.style.setProperty(key,viewportStyle.getPropertyValue(key));
   const readerHomes=[],phone=matchMedia('(max-width:850px)').matches;
   if(phone){const reader=document.createElement('div');reader.className='phone-view-content png-reader-controls';for(const node of [document.querySelector('.content-select-row'),document.querySelector('.page-controls')]){const anchor=document.createComment('PNG control home');node.before(anchor);readerHomes.push({node,anchor});reader.append(node)}const tabs=document.createElement('div');tabs.className='phone-reader-tabs';
    const title=document.createElement('button');title.type='button';title.className='phone-reader-title';
    const change=document.createElement('button');change.type='button';change.className='phone-reader-switch';change.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-4-4M20 16H4l4 4"/></svg>';
    const collapse=document.createElement('button');collapse.type='button';collapse.className='phone-reader-collapse';tabs.append(title,change,collapse);tabs.addEventListener('click',event=>{if(event.target.closest('button'))return;collapse.click()});
    reader.querySelector('.page-controls').before(tabs);
    collapse.onclick=()=>{if(session?.saving)return;document.getElementById('toggleBattlePages').click();syncPhoneLayout()};title.onclick=()=>collapse.click();
    change.onclick=()=>{if(!session||session.saving)return;session.phoneTab=session.phoneTab==='list'?'properties':'list';const toggle=document.getElementById('toggleBattlePages');if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();syncPhoneLayout()};
    propertiesExpanded=true;syncProperties();reader.append(dialog.querySelector('.png-preview-settings'));dialog.querySelector('.png-preview-content').append(reader)}
   session={kind:'output',phoneTab:'properties',returnMode:boardReadOnly||phaseComparisonActive()?'閲覧':'編集',displayBefore:{gridVisible,fieldVisible,fieldClipEnabled},readerHomes,placementControls,zoom:boardDisplayZoom/100,initialScroll:{left:viewport.scrollLeft,top:viewport.scrollTop},originalZoom:boardDisplayZoom,spaceInert:liveSpace.inert,scale:scale===2?2:1,inert:freeze(),focus,scrolls:[document.scrollingElement,...document.querySelectorAll('.layout,.right,#objectLayerPanel,.object-layout-rect,#objectList,#inspector,#layoutPropertiesPanel,#phaseMemo textarea')].filter(Boolean).map(node=>({node,left:node.scrollLeft,top:node.scrollTop}))};
   document.querySelector('.top').classList.remove('phone-menu-open');const headerMenu=document.querySelector('.phone-menu-toggle');headerMenu?.setAttribute('aria-expanded','false');
   for(const [menu,trigger] of [['#boardZoomMenu','#resetBoardZoom'],['#phoneDisplayMenu','.phone-display-menu-toggle']])if(document.querySelector(menu)?.hidden===false)document.querySelector(trigger)?.click();
   closeObjectContextMenu();closeColorPopovers();closeJsonImportMenu();closeJsonExportMenu();closeHelpMenu();
   gridVisible=false;fieldVisible=true;fieldClipEnabled=false;updateGridToggle();updateFieldToggle();updateClipToggle();for(const id of ['gridToggle','fieldToggle','clipToggle']){const source=document.getElementById(id),button=toolbar.querySelector('[data-source-id='+id+']');if(button){button.innerHTML=source.innerHTML;button.setAttribute('aria-pressed',source.getAttribute('aria-pressed'));button.title=source.title}}render();
   dialog.dataset.outputMode='output';propertiesToggle.firstElementChild.textContent='画像生成・印刷プロパティ';document.getElementById('pngCanvasModeStatus').textContent='画像生成・印刷';helpButton.setAttribute('aria-label','画像生成・印刷のアイコン説明');scaleInput.value=String(session.scale);scaleInput.disabled=false;back.disabled=false;dialog.style.setProperty('--png-heading-height',document.querySelector('.board-title-row').getBoundingClientRect().height+'px');document.body.classList.add('png-preview-active');updateModeStatus();updateHistoryButtons();alignFrame();surface.append(liveSpace);liveSpace.inert=true;dialog.show();syncPhoneCanvas();back.focus({preventScroll:true});await refresh();await fitOutputToViewport();
  }catch(error){if(session)close();throw error}finally{opening=false}
 }
 function close(){
  if(!session||session.saving)return;const previous=session;clearPhasePrintFrame();pinch=null;closeZoomMenu();session=null;revision++;dialog.close();document.body.classList.remove('png-preview-active');dialog.removeAttribute('aria-busy');const reader=dialog.querySelector('.png-reader-controls');if(reader){dialog.querySelector('.png-preview-content').append(dialog.querySelector('.png-preview-settings'));reader.remove()}for(const {node,anchor} of previous.readerHomes){anchor.after(node);anchor.remove()}liveSpace.querySelector('.output-note-preview')?.remove();liveSpace.classList.remove('has-output-note');liveAnchor.after(liveSpace);liveSpace.inert=previous.spaceInert;({gridVisible,fieldVisible,fieldClipEnabled}=previous.displayBefore);updateGridToggle();updateFieldToggle();updateClipToggle();setBoardDisplayZoom(previous.originalZoom,false,false);originalRender();updateModeStatus();updateHistoryButtons();
  for(const {node,inert} of previous.inert)node.inert=inert;for(const {node,disabled} of previous.placementControls)node.disabled=disabled;
  const restore=()=>{for(const {node,left,top} of previous.scrolls){node.scrollLeft=left;node.scrollTop=top}};restore();requestAnimationFrame(restore);
  const focus=[previous.focus,document.getElementById('exportBtn'),document.querySelector('.phone-menu-toggle')].find(node=>node?.isConnected&&node.getClientRects().length);focus?.focus({preventScroll:true});
 }
 scaleInput.onchange=refresh;document.getElementById('outputIncludeNote').onchange=()=>{refresh();fitOutputToViewport()};for(const input of document.querySelectorAll('.output-phase-gap'))input.oninput=()=>{if(input.value==='')return;input.value=String(Math.max(0,Math.min(100,Math.round(Number(input.value)||0))));refresh();fitOutputImmediately()};
 async function runOutput(printing){
  if(!session||session.saving)return;const current=session;current.saving=true;save.disabled=printButton.disabled=true;scaleInput.disabled=true;back.disabled=true;
  try{if(printing)await printOutputCanvas();else{const target=window.showSaveFilePicker?await window.showSaveFilePicker(exportPickerOptions(safeExportName('.png'),'image/png','PNG画像')):null;await exportPng(target,current.scale)}}
  catch(error){if(error?.name!=='AbortError')notify((printing?'印刷画面を開けませんでした：':'PNGを書き出せませんでした：')+(error?.message||String(error)))}
  finally{if(session===current){current.saving=false;save.disabled=printButton.disabled=false;scaleInput.disabled=false;back.disabled=false}}
 }
 save.onclick=()=>runOutput(false);printButton.onclick=()=>runOutput(true);
 dialog.addEventListener('close',()=>{if(session&&!dialog.open&&!session.saving)close()});
 window.addEventListener('keydown',event=>{
  if(!session||event.target.closest?.('#changeLogDialog,#operationGuideDialog,#aboutToolDialog,#phoneIconHelp'))return;
  if(event.target.closest?.('#modeSwitchMenu'))return;
  if(zoomMenu.contains(event.target)||event.target===zoomTrigger&&['ArrowDown','ArrowUp'].includes(event.key))return;
  if(!dialog.contains(event.target)&&['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home'].includes(event.key)&&allowed(event.target))return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return}
  if((event.ctrlKey||event.metaKey)&&['z','y','v','x'].includes(event.key.toLowerCase())||['Delete','Backspace'].includes(event.key))event.preventDefault();
  event.stopImmediatePropagation();
 },true);
 const navigation='#modeSwitchMenu,#editModeToggle,.top .phone-menu-toggle,#headerActions,#jsonExportMenu,#helpMenu,#phasePropertyResize,.phone-phase-navigation,.phone-phase-tabs,#contentPaneResize,.phone-content-icon,.phone-content-close,.phone-content-backdrop,#contentObjectPin,#toggleContent,#toggleBattlePages,#contentSelect,#contentOptions,#exitPhaseComparison';
 function allowed(target){return zoomMenu.contains(target)||target===back||dialog.contains(target)||target.closest(navigation)||target.closest('.left')&&!target.closest('.tool,.icon-choice')||target.closest('#pages .phase-group-toggle:not([data-cancel-group-addition]),#pages .phase-group-name')||target.closest('#pages .page-tab')&&!target.closest('.page-tab-x')}
 for(const type of ['click','dblclick','pointerdown','contextmenu','dragstart','drop','change'])window.addEventListener(type,event=>{if(!session||event.target.closest?.('#changeLogDialog,#operationGuideDialog,#aboutToolDialog,#phoneIconHelp')||session.saving&&event.target.matches('a[download]'))return;if(readOnlyTarget(event.target)){event.preventDefault();event.stopImmediatePropagation();return}if(event.target===back&&type==='pointerdown'){event.stopImmediatePropagation();return}if(session.saving&&event.target!==back&&!dialog.contains(event.target)||!allowed(event.target)||['dblclick','contextmenu','dragstart','drop'].includes(type)&&!dialog.contains(event.target)){event.preventDefault();event.stopImmediatePropagation()}},true);
 const originalRender=render;let refreshFrame;
 render=function(){originalRender();diagramVersion++;if(session){cancelAnimationFrame(refreshFrame);refreshFrame=requestAnimationFrame(()=>{if(session)refresh()})}};
 window.Bolxiv.pngPreview={open,close,get kind(){return 'output'},get active(){return !!session},get saving(){return !!session?.saving},get returnMode(){return session?.returnMode||'編集'}};
})();

;

// The shared output mode owns the preview; only the browser print document is separate.
let phasePrintFrame=null,phasePrintOverlay=null;
function clearPhasePrintFrame(){phasePrintFrame?.remove();phasePrintFrame=null;phasePrintOverlay?.remove();phasePrintOverlay=null;document.body.classList.remove('phase-print-preparing','phase-print-open')}
async function printOutputCanvas(){
 const finishBusy=beginDesktopDisplayBusy();try{await yieldDesktopBusyPaint();
 clearPhasePrintFrame();phasePrintOverlay=document.createElement('div');phasePrintOverlay.className='phase-print-overlay';phasePrintOverlay.setAttribute('role','status');phasePrintOverlay.setAttribute('aria-label','印刷画面を準備しています');document.body.append(phasePrintOverlay);document.body.classList.add('phase-print-preparing','phase-print-open');
 let src;try{await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));const canvas=await drawPngCanvas(2);src=canvas.toDataURL('image/png')}catch(error){clearPhasePrintFrame();throw error}
 await new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe');phasePrintFrame=frame;frame.title='表示中の攻略図の印刷';frame.className='phase-print-frame';
  frame.onload=async()=>{try{const win=frame.contentWindow;await frame.contentDocument.querySelector('img').decode();if(phasePrintFrame!==frame){resolve();return}win.addEventListener('afterprint',clearPhasePrintFrame,{once:true});document.body.classList.remove('phase-print-preparing');phasePrintOverlay?.setAttribute('aria-label','印刷画面を開いています');finishBusy();win.focus();win.print();resolve()}catch(error){clearPhasePrintFrame();reject(error)}};
  frame.srcdoc='<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>攻略図</title><style>@page{size:A4 portrait;margin:10mm}html,body{margin:0;padding:0;background:white}body{width:190mm;height:276mm;display:flex;align-items:center;justify-content:center}img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body><img alt="攻略図" src="'+src+'"></body></html>';document.body.append(frame);
 });
 }finally{finishBusy()}
}

window.Bolxiv.phasePrint={open:()=>window.Bolxiv.pngPreview.open(2,'print')};
