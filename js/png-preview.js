// ===== js/canvas/png-preview.js =====
// Conservative screen/print adjustment, not a printer ICC proof.
function plainPaperPrintFilter(){return document.getElementById('outputPlainPaper')?.checked?'saturate(0.85)':'none'}
function printReadabilityEnabled(){return !!document.getElementById('outputPrintReadability')?.checked}
function enhancePrintReadability(clone){
 // Adjust only detached output nodes. Keep text metrics, positions, colors and images intact.
 for(const text of clone.querySelectorAll('.labelobj,.labelobj *'))text.style.setProperty('-webkit-text-stroke','0.3px currentColor','important');
 for(const object of clone.querySelectorAll('.obj:not(.labelobj):not(.job-icon)')){
  for(const node of [object,...object.querySelectorAll('*')]){
   if(node.namespaceURI==='http://www.w3.org/2000/svg'){
    const stroke=node.style.stroke||node.getAttribute('stroke'),width=parseFloat(node.style.strokeWidth||node.getAttribute('stroke-width'));
    if(stroke&&stroke!=='none'&&Number.isFinite(width)&&width>0)node.style.setProperty('stroke-width',String(width*1.4),'important');
   }else for(const side of ['top','right','bottom','left']){
    const width=parseFloat(node.style.getPropertyValue('border-'+side+'-width')),style=node.style.getPropertyValue('border-'+side+'-style');
    if(width>0&&style!=='none'&&style!=='hidden')node.style.setProperty('border-'+side+'-width',width*1.4+'px','important');
   }
  }
  const segment=object.querySelector('.segment-visual');if(segment&&!segment.querySelector('svg')){segment.style.transform='scaleY(1.4)';segment.style.transformOrigin='center'}
 }
 return clone;
}
// A 1mm white cutting allowance surrounds the complete output, including notes/frame.
function layoutPrintCutGuide(node,page,unit,suffix){
 const left=Math.max(0,page.x-1),top=Math.max(0,page.y-1),right=Math.min(page.paperWidth,page.x+page.imageWidth+1),bottom=Math.min(page.paperHeight,page.y+page.imageHeight+1);
 Object.assign(node.style,{position:'absolute',boxSizing:'border-box',left:left*unit+suffix,top:top*unit+suffix,width:(right-left)*unit+suffix,height:(bottom-top)*unit+suffix,border:'0.15mm dashed #777',pointerEvents:'none'});
}
function printPageLayout(width,height){
 const value=id=>document.getElementById(id)?.value;
 const number=(id,fallback)=>{const raw=value(id);return raw===''||!Number.isFinite(Number(raw))?fallback:Math.max(0,Number(raw))};
 const sizes={A4:[210,297],A3:[297,420],B5:[182,257],B4:[257,364],A5:[148,210],Letter:[215.9,279.4]};
 let [paperWidth,paperHeight]=sizes[value('printPaper')]||sizes.A4;if(value('printOrientation')==='landscape')[paperWidth,paperHeight]=[paperHeight,paperWidth];
 const top=Math.min(number('printMarginTop',10),paperHeight-1),bottom=Math.min(number('printMarginBottom',10),paperHeight-top-1),left=Math.min(number('printMarginLeft',10),paperWidth-1),right=Math.min(number('printMarginRight',10),paperWidth-left-1);
 const availableWidth=paperWidth-left-right,availableHeight=paperHeight-top-bottom,fitWidth=Math.min(availableWidth,availableHeight*width/height);
 const requested=value('printSize')==='width'?Math.max(1,number('printWidth',150)):fitWidth;
 const imageWidth=Math.min(requested,fitWidth),imageHeight=imageWidth*height/width;
 const position=value('printPosition')||'center',alignment={center:[.5,.5],top:[.5,0],bottom:[.5,1],left:[0,.5],right:[1,.5],'top-left':[0,0],'top-right':[1,0],'bottom-left':[0,1],'bottom-right':[1,1]}[position]||[.5,.5],x=left+(availableWidth-imageWidth)*alignment[0],y=top+(availableHeight-imageHeight)*alignment[1];
 return {paperWidth,paperHeight,top,bottom,left,right,imageWidth,imageHeight,x,y,maxImageWidth:fitWidth,limited:requested>fitWidth+.01};
}
(()=>{
 const host=document.querySelector('.layout>.right'),layout=document.querySelector('.layout');
 const dialog=document.createElement('dialog');dialog.id='pngPreview';dialog.className='png-preview-panel';dialog.setAttribute('aria-labelledby','pngPreviewTitle');
 dialog.innerHTML='<header class="png-preview-heading"><h2 id="pngPreviewTitle">画像生成・印刷</h2><span class="phone-canvas-mode-status" id="pngCanvasModeStatus">画像生成・印刷</span></header><div class="png-preview-content"><div class="png-preview-surface" aria-label="出力画像"><p class="png-preview-status" id="pngPreviewStatus" role="status" aria-live="polite"></p></div><aside class="png-preview-settings"><h3><button type="button" id="pngPropertiesToggle" aria-controls="pngPropertiesBody" aria-expanded="true"><span>画像生成・印刷プロパティ</span><span class="png-properties-mark" aria-hidden="true">−</span></button><button type="button" id="printSettingsReset" class="btn" aria-label="印刷設定を初期値に戻す" hidden>設定リセット</button></h3><div class="png-preview-settings-body" id="pngPropertiesBody"><section class="output-section output-note-section"><h4>出力内容</h4><div class="output-note-row"><label for="outputNoteRows">ノート</label><select id="outputNoteRows" aria-label="出力ノートの行数"><option value="0">なし</option><option value="5">5行</option><option value="6">6行</option><option value="7">7行</option><option value="8">8行</option><option value="9">9行</option><option value="10">10行</option></select></div><label class="output-note-toggle"><input type="checkbox" id="outputShowBorder"> 外枠を表示</label><div id="outputPhaseGapField" hidden><span>フェーズ間隔（px）</span><label for="outputPhaseGapX"><span>横</span><input id="outputPhaseGapX" class="output-phase-gap" type="number" min="0" max="100" step="1" value="12" aria-label="フェーズ間隔 横（px）"></label><label for="outputPhaseGapY"><span>縦</span><input id="outputPhaseGapY" class="output-phase-gap" type="number" min="0" max="100" step="1" value="12" aria-label="フェーズ間隔 縦（px）"></label></div><p id="outputNoteError" role="status" hidden></p></section><section class="output-section output-png-section" id="outputPngSettings"><div class="png-settings-fields png-scale-field"><label for="pngPreviewScale">出力倍率</label><div class="png-scale-control"><select id="pngPreviewScale"><option value="1">1倍</option><option value="2">2倍</option></select><output id="pngOutputSize" for="pngPreviewScale" aria-live="polite"></output></div></div><button type="button" class="btn primary" id="pngPreviewSave" disabled>PNGを保存</button></section><section class="output-section output-print-section" id="outputPrintSettings" hidden><div class="print-page-fields"><label>用紙<select id="printPaper"><option>A4</option><option>A3</option><option>B5</option><option>B4</option><option>A5</option><option>Letter</option></select></label><label>向き<select id="printOrientation"><option value="portrait">縦</option><option value="landscape">横</option></select></label><fieldset><legend>余白（mm）</legend><label>上<input id="printMarginTop" type="number" min="0" max="419" value="10"></label><label>下<input id="printMarginBottom" type="number" min="0" max="419" value="10"></label><label>左<input id="printMarginLeft" type="number" min="0" max="419" value="10"></label><label>右<input id="printMarginRight" type="number" min="0" max="419" value="10"></label></fieldset><label>図の大きさ<select id="printSize"><option value="fit">用紙に合わせる</option><option value="width">幅を指定</option></select></label><label id="printWidthField" hidden>図の幅（mm）<input id="printWidth" type="number" min="1" max="420" value="150"></label><label>配置<select id="printPosition"><option value="center">中央</option><option value="top-left">左上</option><option value="top">上中央</option><option value="top-right">右上</option><option value="left">左中央</option><option value="right">右中央</option><option value="bottom-left">左下</option><option value="bottom">下中央</option><option value="bottom-right">右下</option></select></label><output id="printActualSize"></output><output id="printImageDpi" hidden></output></div><label class="output-note-toggle"><input type="checkbox" id="outputPrintCutGuide"> 切り取りガイド（点線）</label><p class="output-print-color-info">同じ用紙・向き／倍率100％／余白なし。</p><label class="output-note-toggle" title="印刷時だけ文字を少し太く、図形の線を約1.4倍にします。画像内の文字・線は変わりません。"><input type="checkbox" id="outputPrintReadability"> 文字・線を強調</label><label class="output-note-toggle"><input type="checkbox" id="outputPlainPaper" checked> 普通紙向けの色調整</label><p class="output-print-color-info"><button type="button" class="print-guide-link" id="printGuideLink">印刷の操作ガイド</button></p><button type="button" class="btn primary" id="outputPrintButton">印刷</button></section></div></aside></div>';
 host.append(dialog);

 const printWidthInput=document.getElementById('printWidth'),widthControl=document.createElement('span');widthControl.className='print-width-adjustment coordinate-control';
 widthControl.innerHTML='<input id="printWidthRange" type="range" min="1" max="420" step="1" value="150" aria-label="図の幅（mm）"><output id="printWidthValue" for="printWidthRange printWidthSpin"></output><input id="printWidthSpin" type="number" min="1" max="420" step="1" value="150" aria-label="図の幅（mm）">';printWidthInput.after(widthControl);
 const printWidthRange=document.getElementById('printWidthRange'),printWidthSpin=document.getElementById('printWidthSpin'),printWidthValue=document.getElementById('printWidthValue');
 const widthHeading=document.createElement('span');widthHeading.className='print-width-heading';widthHeading.innerHTML='図の幅<span class="print-width-unit">（mm）</span>';printWidthInput.parentElement.firstChild.replaceWith(widthHeading);widthHeading.append(printWidthValue);
 function syncPrintWidthControl(){for(const input of [printWidthRange,printWidthSpin]){input.min=printWidthInput.min;input.max=printWidthInput.max;input.value=printWidthInput.value;input.disabled=printWidthInput.disabled}printWidthValue.value=printWidthInput.value+' mm'}
 function setPrintWidthFromControl(value){const next=Math.max(Number(printWidthInput.min),Math.min(Number(printWidthInput.max),value));printWidthInput.value=String(next);printWidthInput.dispatchEvent(new Event('input',{bubbles:true}));syncPrintWidthControl()}
 printWidthRange.addEventListener('input',()=>setPrintWidthFromControl(Math.round(Number(printWidthRange.value))));
 printWidthSpin.addEventListener('input',()=>setPrintWidthFromControl(Number(printWidthSpin.value)));
 printWidthInput.addEventListener('input',syncPrintWidthControl);

 const printMarginControls=['Top','Bottom','Left','Right'].map(side=>{
  const input=document.getElementById('printMargin'+side),label=input.parentElement,heading=document.createElement('span'),control=document.createElement('span');heading.className='print-margin-heading';heading.textContent=label.firstChild.textContent;label.firstChild.replaceWith(heading);control.className='print-margin-adjustment coordinate-control';
  control.innerHTML='<input id="printMargin'+side+'Range" type="range" min="0" max="419" step="1" aria-label="余白 '+heading.textContent+'（mm）"><input id="printMargin'+side+'Spin" type="number" min="0" max="419" step="1" aria-label="余白 '+heading.textContent+'（mm）">';label.append(control);
  const range=control.querySelector('[type=range]'),spin=control.querySelector('[type=number]'),value=document.createElement('output');value.className='print-margin-value';value.htmlFor=range.id+' '+spin.id;heading.append(value);
  const sync=()=>{for(const node of [range,spin]){node.min=input.min;node.max=input.max;node.value=input.value;node.disabled=input.disabled}value.value=input.value+' mm'};
  const set=number=>{input.value=String(Math.max(Number(input.min),Math.min(Number(input.max),Math.round(number))));input.dispatchEvent(new Event('input',{bubbles:true}));sync()};
  range.addEventListener('input',()=>set(Number(range.value)));spin.addEventListener('input',()=>set(Number(spin.value)));input.addEventListener('input',sync);sync();return {sync,input};
 });
 const printSettingsKey='bolxiv-print-settings-v1',printDefaults={printPaper:'A4',printOrientation:'portrait',printMarginTop:'10',printMarginBottom:'10',printMarginLeft:'10',printMarginRight:'10',printSize:'fit',printWidth:'150',printPosition:'center',outputPlainPaper:true,outputPrintCutGuide:false,outputPrintReadability:false};
 const printSettingsReset=document.getElementById('printSettingsReset'),printSettings={...printDefaults};
 printSettingsReset.title='印刷設定を初期値に戻す';printSettingsReset.innerHTML='<span class="print-reset-label">設定リセット</span><svg class="print-reset-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg>';
 function validPrintSetting(node,value){
  if(node.type==='checkbox')return typeof value==='boolean';
  if(node.tagName==='SELECT')return typeof value==='string'&&[...node.options].some(option=>option.value===value);
  return typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=Number(node.min)&&Number(value)<=Number(node.max);
 }
 function applyPrintSettings(){for(const [id,value] of Object.entries(printSettings)){const node=document.getElementById(id);if(node.type==='checkbox')node.checked=value;else node.value=value}}
 function savePrintSettings(){try{localStorage.setItem(printSettingsKey,JSON.stringify(printSettings))}catch{}}
 try{const saved=JSON.parse(localStorage.getItem(printSettingsKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const id of Object.keys(printDefaults)){if(validPrintSetting(document.getElementById(id),saved[id]))printSettings[id]=saved[id]}}catch{}
 applyPrintSettings();
 for(const id of Object.keys(printDefaults)){
  const node=document.getElementById(id);node.addEventListener(node.type==='checkbox'?'change':'input',()=>{const value=node.type==='checkbox'?node.checked:node.value;if(validPrintSetting(node,value)){printSettings[id]=value;savePrintSettings()}});
 }
 printSettingsReset.onclick=()=>{if(!session||session.saving)return;Object.assign(printSettings,printDefaults);applyPrintSettings();savePrintSettings();syncPrintColor();fit();refreshPaperArtwork();fitOutputToViewport()};
 const surface=dialog.querySelector('.png-preview-surface'),status=document.getElementById('pngPreviewStatus'),scaleInput=document.getElementById('pngPreviewScale'),save=document.getElementById('pngPreviewSave'),back=document.getElementById('editModeToggle'),printButton=document.getElementById('outputPrintButton');
 let outputAction='png';
 function outputPropertiesName(){return outputAction==='png'?'画像生成プロパティ':'印刷プロパティ'}
 function syncPrintColor(){if(paperImage)paperImage.style.filter=plainPaperPrintFilter();liveSpace.style.setProperty('--plain-paper-print-filter',outputAction==='print'?plainPaperPrintFilter():'none')}
 function syncOutputAction(){syncPrintColor();const png=outputAction==='png',name=png?'画像生成':'印刷';document.getElementById('outputPngSettings').hidden=!png;document.getElementById('outputPrintSettings').hidden=png;printSettingsReset.hidden=png;document.getElementById('pngPropertiesToggle').firstElementChild.textContent=outputPropertiesName();document.getElementById('pngCanvasModeStatus').textContent=name;helpButton?.setAttribute('aria-label',name+'のアイコン説明');syncPaperMode();if(session&&!opening){refresh();fitOutputToViewport()}}
 function fitZoomStep(){const dimensions=previewDimensions(),style=getComputedStyle(surface),insetX=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight),insetY=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom),gutterX=paperMode()?72:40,gutterY=paperMode()?60:40,ratio=Math.min((surface.clientWidth-insetX-gutterX)/dimensions.width,(surface.clientHeight-insetY-gutterY)/dimensions.height);return Math.max(.05,Math.min(3,Math.floor((ratio+1e-9)*20)/20))}
 const toolbar=document.querySelector('.board-display-toolbar').cloneNode(true);toolbar.classList.add('png-preview-toolbar');toolbar.setAttribute('aria-label','出力プレビューの表示');
 toolbar.querySelector('.phone-icon-help-toggle')?.remove();toolbar.querySelector('.phone-help-separator')?.remove();
 for(const node of toolbar.querySelectorAll('[id]')){node.dataset.sourceId=node.id;node.id='png-'+node.id}
 for(const button of toolbar.querySelectorAll('button')){
  const action=button.dataset.sourceId,zoom=['fitBoardZoom','zoomOut','resetBoardZoom','zoomIn'].includes(action);button.disabled=!zoom&&!button.matches('.phone-content-icon');if(button.matches('.phone-content-icon')){button.id='pngPreviewContent';button.onclick=()=>document.querySelector('.board-display-toolbar:not(.png-preview-toolbar) .phone-content-icon').click()}
  if(zoom)button.onclick=()=>{if(!session)return;session.zoom=action==='zoomIn'?Math.min(3,(Math.round(session.zoom*20)+1)/20):action==='zoomOut'?Math.max(.05,(Math.round(session.zoom*20)-1)/20):action==='fitBoardZoom'?fitZoomStep():1;fit();surface.scrollLeft=Math.max(0,(surface.scrollWidth-surface.clientWidth)/2);surface.scrollTop=Math.max(0,(surface.scrollHeight-surface.clientHeight)/2)};
 }
 dialog.querySelector('.png-preview-heading').append(toolbar);
 const helpButton=document.createElement('button');helpButton.type='button';helpButton.className='phone-icon-help-toggle png-icon-help';helpButton.textContent='？';helpButton.setAttribute('aria-label','画像生成・印刷のアイコン説明');helpButton.setAttribute('aria-controls','phoneIconHelp');helpButton.setAttribute('aria-haspopup','dialog');helpButton.setAttribute('aria-expanded','false');helpButton.onclick=()=>window.Bolxiv.iconHelp.open(helpButton);const helpSeparator=document.createElement('span');helpSeparator.className='phone-help-separator';helpSeparator.setAttribute('aria-hidden','true');toolbar.append(helpSeparator,helpButton);
 const liveSpace=document.getElementById('boardZoomSpace'),liveAnchor=document.createComment('PNG canvas home');liveSpace.before(liveAnchor);
  const paperPreview=document.createElement('div');paperPreview.className='print-paper-preview';paperPreview.hidden=true;paperPreview.setAttribute('aria-label','印刷用紙プレビュー');
 const paperSheet=document.createElement('div');paperSheet.className='print-paper-sheet';const paperImage=document.createElement('img');paperImage.alt='用紙上の攻略図';const marginGuide=document.createElement('div');marginGuide.className='print-margin-guide';const cutGuide=document.createElement('div');cutGuide.className='print-cut-guide';cutGuide.setAttribute('aria-hidden','true');cutGuide.hidden=true;paperSheet.append(paperImage,marginGuide,cutGuide);paperPreview.append(paperSheet);surface.append(paperPreview);
 const paperWidthLabel=document.createElement('div'),paperHeightLabel=document.createElement('div');paperWidthLabel.className='print-paper-dimension print-paper-width';paperHeightLabel.className='print-paper-dimension print-paper-height';paperWidthLabel.append(document.createElement('span'));paperHeightLabel.append(document.createElement('span'));paperPreview.append(paperWidthLabel,paperHeightLabel);
 let paperRevision=0;
 function paperMode(){return outputAction==='print'}
 function syncPaperMode(){const paper=paperMode();surface.classList.toggle('print-paper-active',paper);paperPreview.hidden=!paper;printSettingsReset.hidden=!paper;}
 function previewDimensions(){if(!paperMode())return outputDimensions();const size=printPageLayout(1,1),unit=96/25.4;return {width:size.paperWidth*unit,height:size.paperHeight*unit}}
 function syncPrintImageDpi(source,page){
  const output=document.getElementById('printImageDpi'),parallel=phaseComparisonActive(),indexes=parallel?selectedPhaseIndexes:[data.page],tileScale=parallel?phaseComparisonLayout().cellSize/640:1,values=[];
  if(!data.activePhaseGroup)for(const index of indexes){
   if(!['image','image4'].includes(data.pageBoardShapes[index]))continue;
   const id=data.pageFieldImageIds[index],src=boardImageLibrary.get(id);if(!src)continue;
   let pixels=boardImageLibrary.dimensions(id);
   if(!pixels.width||!pixels.height){
    // Older JSON may lack pixel dimensions; decode once per output session.
    const active=session;active.dpiImages??=new Map();let img=active.dpiImages.get(id);
    if(!img){img=new Image();active.dpiImages.set(id,img);img.onload=()=>{if(session===active&&outputAction==='print')fitPaper()};img.src=src}
    pixels={width:img.naturalWidth,height:img.naturalHeight};
   }
   const field=data.pageFieldSizes[index],mmPerPixel=page.imageWidth/source.width;
   if(pixels.width&&pixels.height&&field?.width&&field?.height)values.push(Math.min(pixels.width/(field.width*tileScale*mmPerPixel),pixels.height/(field.height*tileScale*mmPerPixel))*25.4);
  }
  output.hidden=!values.length;
  if(values.length){const min=Math.round(Math.min(...values)),max=Math.round(Math.max(...values));output.textContent='フィールド画像：約'+min+(min===max?'':'〜'+max)+' dpi';output.title='保存されている画像の画素数と、印刷時のフィールドサイズから算出した目安です。プリンターの解像度設定ではありません。'}else output.textContent='';
 }
 function fitPaper(){
  if(!paperMode())return;const phonePrint=matchMedia('(max-width:850px)').matches;for(const control of printMarginControls){control.input.max=phonePrint?'50':'419';if(phonePrint&&Number(control.input.value)>50){control.input.value='50';printSettings[control.input.id]='50';savePrintSettings()}control.sync()}const source=outputDimensions();let page=printPageLayout(source.width,source.height);
  const widthInput=document.getElementById('printWidth'),maximum=Math.floor(page.maxImageWidth*1000)/1000;
  widthInput.max=String(maximum);widthInput.min=String(Math.min(1,maximum));widthInput.step='any';
  // Keep the phone's requested width so shrinking the margins restores the diagram.
  if(phonePrint&&document.getElementById('printSize').value==='width'){const requested=Number(printSettings.printWidth);widthInput.value=String(Math.min(maximum,Math.max(Number(widthInput.min),requested)));page=printPageLayout(source.width,source.height);page.limited=requested>maximum+.01}
  else if(document.activeElement!==widthInput&&document.getElementById('printSize').value==='width'&&widthInput.value!==''&&Number.isFinite(widthInput.valueAsNumber)&&widthInput.valueAsNumber>maximum){
   widthInput.value=String(maximum);printSettings.printWidth=widthInput.value;savePrintSettings();page=printPageLayout(source.width,source.height);
  }
  const unit=96/25.4,zoom=session.zoom;
  const displayWidth=page.paperWidth*unit*zoom,displayHeight=page.paperHeight*unit*zoom;
  paperPreview.style.width=(displayWidth+72)+'px';paperPreview.style.height=(displayHeight+60)+'px';paperPreview.style.setProperty('--paper-display-width',displayWidth+'px');paperPreview.style.setProperty('--paper-display-height',displayHeight+'px');
  paperWidthLabel.firstChild.textContent=page.paperWidth+' mm';paperHeightLabel.firstChild.textContent=page.paperHeight+' mm';
  Object.assign(paperSheet.style,{width:page.paperWidth*unit+'px',height:page.paperHeight*unit+'px',transform:'scale('+zoom+')'});
  Object.assign(paperImage.style,{left:page.x*unit+'px',top:page.y*unit+'px',width:page.imageWidth*unit+'px',height:page.imageHeight*unit+'px',filter:plainPaperPrintFilter()});
  Object.assign(marginGuide.style,{left:page.left*unit+'px',top:page.top*unit+'px',width:(page.paperWidth-page.left-page.right)*unit+'px',height:(page.paperHeight-page.top-page.bottom)*unit+'px'});
  cutGuide.hidden=!document.getElementById('outputPrintCutGuide').checked;layoutPrintCutGuide(cutGuide,page,unit,'px');
  syncPrintImageDpi(source,page);
  document.getElementById('printWidthField').hidden=document.getElementById('printSize').value!=='width';syncPrintWidthControl();
  document.getElementById('printActualSize').textContent='図：'+page.imageWidth.toFixed(1)+' × '+page.imageHeight.toFixed(1)+' mm'+(page.limited?'（用紙内に収まる幅に調整）':'');
 }
 function printSourceCacheKey(){return JSON.stringify([{...data,pageNotes:undefined},selectedPhaseIndexes,stage.className,[...stage.style].filter(name=>name!=='--board-display-scale').map(name=>[name,stage.style.getPropertyValue(name),stage.style.getPropertyPriority(name)]),boardDisplayZoom,innerWidth,innerHeight,devicePixelRatio,boardReadOnly,gridVisible,fieldVisible,fieldClipEnabled])}
 let paperArtworkRunning=null,paperArtworkRequested=false;
 function refreshPaperArtwork(){
  paperArtworkRequested=true;paperRevision++;
  if(paperArtworkRunning)return paperArtworkRunning;
  paperArtworkRunning=(async()=>{while(paperArtworkRequested){paperArtworkRequested=false;await buildPaperArtwork()}})().finally(()=>{paperArtworkRunning=null});return paperArtworkRunning;
 }
 async function buildPaperArtwork(){
  const ticket=++paperRevision;if(!paperMode()||!session)return;
  try{let src;if(desktopVectorPrintAvailable()){
   // Notes and borders change the output frame, not the diagram's computed styles.
   const active=session,key=printSourceCacheKey();if(active.printSourceVersion!==diagramVersion||active.printSourceKey!==key||!active.printSource){
    active.printSourceVersion=diagramVersion;active.printSourceKey=key;
    // Scope computed styles to this output session, and include the complete
    // board and rendering context so edits or responsive changes cannot reuse them.
    const cache=active.printSources||(active.printSources=new Map());let source=cache.get(key);
    if(source){cache.delete(key);cache.set(key,source)}else{
     source=createVectorPrintSource();cache.set(key,source);
     while(cache.size>3)cache.delete(cache.keys().next().value);
     source.then(()=>{if(cache.get(key)===source&&(session!==active||printSourceCacheKey()!==key))cache.delete(key)},()=>{if(cache.get(key)===source)cache.delete(key);if(active.printSource===source)active.printSource=null});
    }
    active.printSource=source;
   }
   const source=await active.printSource;if(ticket!==paperRevision||session!==active||outputAction!=='print')return;src=await createVectorPrintSvg(source);
  }else src=(await drawPngCanvas(2,printReadabilityEnabled())).toDataURL('image/png');if(ticket!==paperRevision||!session||outputAction!=='print')return;paperImage.src=src;fitPaper()}
  catch(error){if(ticket===paperRevision&&session){status.hidden=false;status.textContent='印刷プレビューを作成できませんでした：'+error.message}}
 }
 for(const input of dialog.querySelectorAll('.print-page-fields input,.print-page-fields select'))input.addEventListener('input',()=>{if(session){fit();fitOutputToViewport()}});
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
 let previewPan=null;
 function syncPreviewPanCursor(){surface.classList.toggle('can-drag-preview',!!session&&!session.saving&&matchMedia('(min-width:851px)').matches&&(surface.scrollWidth>surface.clientWidth||surface.scrollHeight>surface.clientHeight))}
 function endPreviewPan(){const pan=previewPan;previewPan=null;surface.classList.remove('dragging-preview');if(pan&&surface.hasPointerCapture(pan.id))surface.releasePointerCapture(pan.id)}
 surface.addEventListener('pointerenter',syncPreviewPanCursor);
 surface.addEventListener('pointerdown',event=>{
  if(!session||session.saving||event.pointerType!=='mouse'||event.button!==0||!matchMedia('(min-width:851px)').matches)return;
  const rect=surface.getBoundingClientRect(),x=event.clientX-rect.left-surface.clientLeft,y=event.clientY-rect.top-surface.clientTop;
  if(x<0||y<0||x>=surface.clientWidth||y>=surface.clientHeight||surface.scrollWidth<=surface.clientWidth&&surface.scrollHeight<=surface.clientHeight)return;
  event.preventDefault();event.stopPropagation();previewPan={id:event.pointerId,x:event.clientX,y:event.clientY,left:surface.scrollLeft,top:surface.scrollTop};surface.setPointerCapture(event.pointerId);surface.classList.add('dragging-preview');
 },true);
 surface.addEventListener('pointermove',event=>{if(!previewPan||previewPan.id!==event.pointerId)return;if(!session||session.saving||!(event.buttons&1)){endPreviewPan();return}event.preventDefault();surface.scrollLeft=previewPan.left+previewPan.x-event.clientX;surface.scrollTop=previewPan.top+previewPan.y-event.clientY});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,event=>{if(previewPan?.id===event.pointerId)endPreviewPan()});
 surface.addEventListener('dragstart',event=>{if(previewPan)event.preventDefault()});window.addEventListener('blur',endPreviewPan);
 matchMedia('(min-width:851px)').addEventListener('change',()=>{endPreviewPan();syncPreviewPanCursor()});

 surface.addEventListener('touchstart',event=>{if(!session||event.touches.length!==2)return;event.preventDefault();event.stopImmediatePropagation();const [a,b]=event.touches,rect=(paperMode()?paperSheet:stage).getBoundingClientRect();pinch={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:session.zoom,x:((a.clientX+b.clientX)/2-rect.left)/rect.width,y:((a.clientY+b.clientY)/2-rect.top)/rect.height}},{passive:false});
 surface.addEventListener('touchmove',event=>{if(!session||!pinch||event.touches.length!==2)return;event.preventDefault();event.stopImmediatePropagation();const [a,b]=event.touches;session.zoom=Math.max(.05,Math.min(3,Math.round(pinch.zoom*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/pinch.distance*20)/20));fit();const rect=(paperMode()?paperSheet:stage).getBoundingClientRect();surface.scrollLeft+=rect.left+pinch.x*rect.width-(a.clientX+b.clientX)/2;surface.scrollTop+=rect.top+pinch.y*rect.height-(a.clientY+b.clientY)/2},{passive:false});
 for(const type of ['touchend','touchcancel'])surface.addEventListener(type,()=>{pinch=null},{passive:true});
 function syncPhoneCanvas(){if(!session||!matchMedia('(max-width:850px)').matches)return;if(liveSpace.parentElement!==surface){surface.append(liveSpace);liveSpace.inert=true}fit()}
 function syncPhoneLayout(){
  if(!session||!matchMedia('(max-width:850px)').matches)return;
  const content=dialog.querySelector('.png-preview-content'),reader=dialog.querySelector('.png-reader-controls');if(!reader||!reader.querySelector('.content-select-row'))return;
  const expanded=document.getElementById('toggleBattlePages').getAttribute('aria-expanded')==='true',tab=session.phoneTab||'properties';
  if(reader.dataset.readerTab!==tab)reader.dataset.readerTab=tab;
  if(reader.dataset.readerExpanded!==String(expanded))reader.dataset.readerExpanded=String(expanded);
  const title=reader.querySelector('.phone-reader-title'),change=reader.querySelector('.phone-reader-switch'),collapse=reader.querySelector('.phone-reader-collapse');
  printSettingsReset.hidden=!paperMode()||tab!=='properties'||!expanded;
  const propertiesName=outputPropertiesName();const markup=tab==='list'?'<span class="phone-reader-label-part"><strong>フェーズリスト</strong> / </span><span class="phone-reader-label-part">'+propertiesName+'</span>':'<span class="phone-reader-label-part">フェーズリスト / </span><span class="phone-reader-label-part"><strong>'+propertiesName+'</strong></span>';
  if(title&&title.innerHTML!==markup)title.innerHTML=markup;
  const attr=(node,key,value)=>{if(node&&node.getAttribute(key)!==value)node.setAttribute(key,value)};
  attr(title,'aria-expanded',String(expanded));attr(title,'aria-label',(tab==='list'?'フェーズリスト':propertiesName)+'を'+(expanded?'閉じる':'開く'));
  attr(change,'aria-label',tab==='list'?propertiesName+'を表示':'フェーズリストを表示');
  const mark=expanded?'−':'＋';if(collapse&&collapse.textContent!==mark)collapse.textContent=mark;attr(collapse,'aria-expanded',String(expanded));attr(collapse,'aria-label',title?.getAttribute('aria-label'));
  const surfaceStyle=getComputedStyle(surface),displayPadding=(parseFloat(surfaceStyle.paddingTop)||0)+(parseFloat(surfaceStyle.paddingBottom)||0)+(paperMode()?60:40);
  const rowHeight=reader.querySelector('.content-select-row').getBoundingClientRect().height,metrics=phoneReaderLayoutMetrics(content,0,rowHeight,session.zoom*100,previewDimensions().height,displayPadding);
  content.classList.toggle('png-phases-collapsed',!expanded);
  for(const [name,value] of Object.entries({'canvas-height':metrics.canvasHeight,'controls-min-height':metrics.controlsMinHeight,'closed-controls-height':metrics.closedControlsHeight})){const key='--png-phone-'+name,next=value+'px';if(content.style.getPropertyValue(key)!==next)content.style.setProperty(key,next)}
 }
 new ResizeObserver(syncPhoneLayout).observe(propertiesPanel);
 new ResizeObserver(syncPhoneLayout).observe(dialog.querySelector('.png-preview-content'));
 new MutationObserver(syncPhoneLayout).observe(document.getElementById('toggleBattlePages'),{attributes:true,attributeFilter:['aria-expanded']});
 function diagramDimensions(){const source=document.querySelector('.phase-group-overview:not([hidden]) .phase-group-artwork')||(phaseComparisonActive()?document.querySelector('.phase-comparison-grid'):null)||stage;return {width:source.offsetWidth||640,height:source.offsetHeight||640}}
 function outputDimensions(){const dimensions=diagramDimensions(),frame=outputFrameLayout(dimensions.width,dimensions.height);return {width:frame.width,height:frame.height}}
 function fitOutputImmediately(){if(!session)return;const dimensions=outputDimensions();session.zoom=fitZoomStep();fit();surface.scrollLeft=Math.max(0,(surface.scrollWidth-surface.clientWidth)/2);surface.scrollTop=0}
 async function fitOutputToViewport(){
  const active=session;if(!active)return;active.initialScroll=null;
  // Phone pane height also responds to zoom; measure again after each layout.
  for(let attempt=0;attempt<6;attempt++){
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   if(session!==active)return;const dimensions=outputDimensions(),zoom=fitZoomStep();
   const settled=Math.abs(active.zoom-zoom)<.001;active.zoom=zoom;fit();if(settled)break;
  }
  if(session!==active)return;surface.scrollLeft=Math.max(0,(surface.scrollWidth-surface.clientWidth)/2);surface.scrollTop=0;
 }
 let notePreviewRevision=0,notePreviewKey='',diagramVersion=0;
 function previewDiagram(){const active=session;if(active.diagramVersion!==diagramVersion||!active.diagramCanvas){active.diagramVersion=diagramVersion;active.diagramResolvedCanvas=null;const version=diagramVersion,finish=beginDesktopDisplayBusy();active.diagramCanvas=drawDiagramPngCanvas(2).then(canvas=>{if(active.diagramVersion===version)active.diagramResolvedCanvas=canvas;return canvas}).finally(finish)}return active.diagramCanvas}
 function syncNotePreview(){
  if(!session)return;const dimensions=diagramDimensions(),frame=outputFrameLayout(dimensions.width,dimensions.height),{note,padding}=frame,full=!!note.notes;let preview=liveSpace.querySelector('.output-note-preview');if(!preview){preview=document.createElement('canvas');preview.className='output-note-preview';preview.setAttribute('aria-label','出力ノート');liveSpace.append(preview);notePreviewKey=''}
  document.getElementById('outputPhaseGapField').hidden=!phaseComparisonActive();preview.hidden=(!note.height&&!full)||!!note.error;liveSpace.classList.toggle('has-output-note',!!note.height||full);liveSpace.classList.toggle('has-output-frame',!!padding);liveSpace.style.setProperty('--output-frame-offset',padding*session.zoom+'px');
  const key=JSON.stringify({diagramVersion,note,padding,width:dimensions.width,height:dimensions.height,page:data.page,objects:note.notes?selectedPhaseIndexes.map(i=>data.pages[i]):null});
  if(key!==notePreviewKey){notePreviewKey=key;const revision=++notePreviewRevision;
   if(full&&!note.error){const paint=source=>{if(revision!==notePreviewRevision||!session)return;const canvas=composeOutputPngCanvas(source,2,false);preview.width=canvas.width;preview.height=canvas.height;preview.getContext('2d').drawImage(canvas,0,0)};if(session.diagramVersion===diagramVersion&&session.diagramResolvedCanvas)paint(session.diagramResolvedCanvas);else previewDiagram().then(paint).catch(error=>{if(revision===notePreviewRevision){document.getElementById('outputNoteError').textContent=error.message;document.getElementById('outputNoteError').hidden=false}})}

   else if(!full){preview.width=dimensions.width*2;preview.height=Math.max(1,note.height*2);const ctx=preview.getContext('2d');ctx.scale(2,2);drawOutputNote(ctx,dimensions.width,0,note)}
  }
  preview.style.width=(full?frame.width:dimensions.width)+'px';preview.style.height=(full?frame.height:note.height)+'px';preview.style.top=(full?20:20+dimensions.height*session.zoom)+'px';preview.style.transform='translateX(-50%) scale('+session.zoom+')';preview.style.zIndex=full?'3':'';
  const warning=document.getElementById('outputNoteError');warning.textContent=note.error;warning.hidden=!note.error;save.disabled=printButton.disabled=!!session.saving||!!note.error;
 }
 function outputContentAnchor(framed){const full=phaseComparisonActive(),source=full?liveSpace.querySelector('.output-note-preview'):document.querySelector('.phase-group-overview:not([hidden]) .phase-group-artwork')||stage,rect=source.getBoundingClientRect(),padding=full&&framed?outputBorderPadding*session.zoom:0;return {x:rect.left+padding,y:rect.top+padding}}
 function changeOutputBorder(){if(!session)return;const checked=document.getElementById('outputShowBorder').checked,before=outputContentAnchor(!checked);refresh();const after=outputContentAnchor(checked);surface.scrollLeft+=after.x-before.x;surface.scrollTop+=after.y-before.y;const remaining=outputContentAnchor(checked);session.borderShiftX=(session.borderShiftX||0)+before.x-remaining.x;session.borderShiftY=(session.borderShiftY||0)+before.y-remaining.y;liveSpace.style.translate=session.borderShiftX+'px '+session.borderShiftY+'px'}
 function syncOutputBorderPreview(){let border=liveSpace.querySelector('.output-border-preview');if(!border){border=document.createElement('canvas');border.className='output-border-preview';border.setAttribute('aria-hidden','true');liveSpace.append(border)}border.hidden=!document.getElementById('outputShowBorder').checked;const dimensions=outputDimensions();border.width=dimensions.width*2;border.height=dimensions.height*2;const ctx=border.getContext('2d');ctx.scale(2,2);const source=diagramDimensions();drawOutputBorder(ctx,source.width,source.height);border.style.width=dimensions.width+'px';border.style.height=dimensions.height+'px';border.style.transform='translateX(-50%) scale('+session.zoom+')';if(phaseComparisonActive())border.style.top='20px';else{const element=document.querySelector('.phase-group-overview:not([hidden]) .phase-group-artwork')||stage;border.style.top=(element.getBoundingClientRect().top-liveSpace.getBoundingClientRect().top-outputBorderPadding*session.zoom)+'px'}}
 function fit(){if(!session)return;const dimensions=outputDimensions();toolbar.querySelector('[data-source-id=boardZoomValue]').textContent=Math.round(session.zoom*100);liveSpace.style.setProperty('--board-display-scale',String(session.zoom));stage.style.setProperty('--board-display-scale',String(session.zoom));const contentWidth=dimensions.width*session.zoom,contentHeight=dimensions.height*session.zoom;liveSpace.style.width=(contentWidth<=surface.clientWidth?Math.min(contentWidth+40,surface.clientWidth):contentWidth+40)+'px';liveSpace.style.height=(contentHeight+20<=surface.clientHeight?Math.min(contentHeight+40,surface.clientHeight):contentHeight+40)+'px';const comparison=liveSpace.querySelector('.phase-comparison-grid');if(comparison)comparison.style.transform='translate(-50%,-50%) scale('+session.zoom+')';syncNotePreview();syncOutputBorderPreview();if(outputAction==='print')fitPaper();syncPhoneLayout();syncPreviewPanCursor()}
 new ResizeObserver(fit).observe(surface);
 function syncToolbarAppearance(){
  const properties=['display','box-sizing','width','min-width','max-width','height','min-height','max-height','padding','margin','border','border-radius','background','color','-webkit-text-fill-color','font','line-height','letter-spacing','text-align','align-items','justify-content','gap','fill','stroke','stroke-width'];
  function copy(source,target,dimensions=true){if(!source||!target)return;const style=getComputedStyle(source);for(const key of properties){if(!dimensions&&['width','min-width','max-width'].includes(key))continue;target.style.setProperty(key,style.getPropertyValue(key),'important')}}
  for(const target of toolbar.querySelectorAll('[data-source-id]')){const source=document.getElementById(target.dataset.sourceId);copy(source,target);if(target===zoomTrigger||target.dataset.sourceId==='boardZoomValue')for(const key of ['background','color','-webkit-text-fill-color'])target.style.removeProperty(key);if(target.matches('button')){const children=source?.querySelectorAll('svg,path');target.querySelectorAll('svg,path').forEach((child,index)=>copy(children?.[index],child))}}
  copy(document.querySelector('.board-display-toolbar .board-zoom-group'),toolbar.querySelector('.board-zoom-group'),false);
  for(const className of ['board-toolbar-separator','board-zoom-separator'])copy(document.querySelector('.board-display-toolbar .'+className),toolbar.querySelector('.'+className));
  if(matchMedia('(max-width:850px)').matches){for(const button of toolbar.querySelectorAll('button:disabled'))button.style.setProperty('display','none','important');toolbar.querySelector('.board-toolbar-separator')?.style.setProperty('display','none','important')}
 }
 function alignFrame(){
  if(!session)return;syncToolbarAppearance();const normalLabel=document.querySelector('#layoutPropertiesPanel label');if(normalLabel)dialog.querySelector('.png-preview-settings-body label').style.font=getComputedStyle(normalLabel).font;
  const list=host.querySelector('.desktop-phase-sidebar')||host.querySelector('.layer-list-group'),listHeading=document.getElementById('toggleInspector'),settingsHeading=dialog.querySelector('.png-preview-settings h3');
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
 let noteRefreshTimer=null;
 function cancelNoteRefresh(){clearTimeout(noteRefreshTimer);noteRefreshTimer=null}
 function scheduleNoteRefresh(){
  clearTimeout(noteRefreshTimer);if(!session)return;
  const active=session;noteRefreshTimer=setTimeout(()=>{noteRefreshTimer=null;if(session===active)refresh()},300);
 }
 function flushNoteRefresh(){if(noteRefreshTimer!==null){clearTimeout(noteRefreshTimer);noteRefreshTimer=null;if(session)refresh()}}
 function refresh(){if(!session)return;const sourceTitle=document.getElementById('selectionTitle'),previewTitle=document.getElementById('pngPreviewTitle');previewTitle.replaceChildren(...[...sourceTitle.childNodes].map(node=>node.cloneNode(true)));const prefix=previewTitle.querySelector('.phase-label-prefix');if(prefix)prefix.textContent='フェーズ：';previewTitle.title=previewTitle.textContent;session.scale=Number(scaleInput.value);const dimensions=outputDimensions();document.getElementById('pngOutputSize').textContent=Math.round(dimensions.width*session.scale)+' × '+Math.round(dimensions.height*session.scale)+' px';status.hidden=true;fit();refreshPaperArtwork();save.disabled=printButton.disabled=!!session.saving||!!outputNoteLayout(diagramDimensions().width).error;if(session.initialScroll){surface.scrollLeft=session.initialScroll.left;surface.scrollTop=session.initialScroll.top;session.initialScroll=null}}
 function mountPhoneReader(readerHomes){if(dialog.querySelector('.png-reader-controls'))return;const reader=document.createElement('div');reader.className='phone-view-content png-reader-controls';for(const node of [document.querySelector('.content-select-row'),document.querySelector('.page-controls')]){const anchor=document.createComment('PNG control home');node.before(anchor);readerHomes.push({node,anchor});reader.append(node)}const tabs=document.createElement('div');tabs.className='phone-reader-tabs';
    const title=document.createElement('button');title.type='button';title.className='phone-reader-title';
    const change=document.createElement('button');change.type='button';change.className='phone-reader-switch';change.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-4-4M20 16H4l4 4"/></svg>';
    const collapse=document.createElement('button');collapse.type='button';collapse.className='phone-reader-collapse';tabs.append(title,change,printSettingsReset,collapse);tabs.addEventListener('click',event=>{if(event.target.closest('button'))return;collapse.click()});
    reader.querySelector('.page-controls').before(tabs);
    collapse.onclick=()=>{if(session?.saving)return;document.getElementById('toggleBattlePages').click();syncPhoneLayout()};title.onclick=()=>collapse.click();
    change.onclick=()=>{if(!session||session.saving)return;session.phoneTab=session.phoneTab==='list'?'properties':'list';const toggle=document.getElementById('toggleBattlePages');if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();syncPhoneLayout()};
    propertiesExpanded=true;syncProperties();reader.append(dialog.querySelector('.png-preview-settings'));dialog.querySelector('.png-preview-content').append(reader)}
 function unmountPhoneReader(state){const reader=dialog.querySelector('.png-reader-controls');if(!reader)return;propertiesPanel.querySelector('h3').append(printSettingsReset);printSettingsReset.hidden=outputAction!=='print';dialog.querySelector('.png-preview-content').append(dialog.querySelector('.png-preview-settings'));for(const {node,anchor} of state.readerHomes){anchor.after(node);anchor.remove()}state.readerHomes.length=0;reader.remove()}
 let outputContentOpen=false;
 function syncOutputContentPane(){
  if(!session||!matchMedia('(max-width:850px)').matches)return;
  const open=layout.classList.contains('phone-content-open');if(open===outputContentOpen)return;outputContentOpen=open;
  for(const home of session.readerHomes){if(open){home.readerAnchor=document.createComment('output reader home');home.node.before(home.readerAnchor);home.anchor.after(home.node)}else{home.readerAnchor?.after(home.node);home.readerAnchor?.remove();home.readerAnchor=null}}
  if(!open){document.querySelector('#phaseMemo textarea')?.blur();flushNoteRefresh();syncPhoneLayout()}
  document.getElementById('pngPreviewContent')?.setAttribute('aria-expanded',String(open));
 }
 new MutationObserver(syncOutputContentPane).observe(layout,{attributes:true,attributeFilter:['class']});
 let responsiveFrame=0;
 function syncResponsiveOutput(){responsiveFrame=0;if(!session)return;syncPaperMode();if(matchMedia('(max-width:850px)').matches)mountPhoneReader(session.readerHomes);else unmountPhoneReader(session);syncProperties();surface.append(liveSpace);liveSpace.inert=true;alignFrame();fit();fitOutputToViewport()}
 function scheduleResponsiveOutput(){if(!session||responsiveFrame)return;responsiveFrame=requestAnimationFrame(syncResponsiveOutput)}
 matchMedia('(max-width:850px)').addEventListener('change',scheduleResponsiveOutput);window.addEventListener('resize',scheduleResponsiveOutput);
 async function open(scale=1,kind='image'){
  kind=kind==='print'?'print':'image';if(session){if(session.saving)return;outputAction=kind==='print'?'print':'png';session.kind=kind;dialog.dataset.outputMode=kind;syncOutputAction();syncPhoneLayout();updateModeStatus();return}if(opening)return;opening=true;const focus=document.activeElement;focus?.blur();
  try{
   if(matchMedia('(max-width:850px)').matches&&layout.classList.contains('phone-content-open')){document.querySelector('.phone-content-close').click();await Promise.allSettled(layout.querySelector('.battle').getAnimations().map(animation=>animation.finished))}
   const placementControls=[...document.querySelectorAll('.left .tool,.left .icon-choice')].map(node=>({node,disabled:node.disabled}));for(const {node} of placementControls)node.disabled=true;
   const viewport=document.getElementById('boardZoomSpace').parentElement,viewportStyle=getComputedStyle(viewport);for(const key of ['background-color','background-image','background-size','background-position','border','border-radius'])surface.style.setProperty(key,viewportStyle.getPropertyValue(key));
   const noteView=(matchMedia('(min-width:851px)').matches?[['desktopPhaseSwitch','desktopPhaseSectionToggle']]:[]).filter(([a,b])=>document.getElementById(a)&&document.getElementById(b)).map(([switchId,collapseId])=>({switchId,collapseId,title:document.getElementById(switchId).title,expanded:document.getElementById(collapseId).getAttribute('aria-expanded')}));
   for(const state of noteView){const change=document.getElementById(state.switchId),collapse=document.getElementById(state.collapseId);if(change.title.includes('ノートを表示'))change.click();if(collapse.getAttribute('aria-expanded')==='false')collapse.click()}if(noteView.length)document.getElementById('phaseMemo').open=true;
   const readerHomes=[];if(matchMedia('(max-width:850px)').matches)mountPhoneReader(readerHomes);

   outputAction=kind==='print'?'print':'png';session={phoneNoteState:window.Bolxiv.phasePanel.capture(),noteView,kind,phoneTab:'properties',returnMode:boardReadOnly||phaseComparisonActive()?'閲覧':'編集',displayBefore:{gridVisible,fieldVisible,fieldClipEnabled},readerHomes,placementControls,zoom:boardDisplayZoom/100,initialScroll:{left:viewport.scrollLeft,top:viewport.scrollTop},originalZoom:boardDisplayZoom,spaceInert:liveSpace.inert,scale:scale===2?2:1,inert:freeze(),focus,scrolls:[document.scrollingElement,...document.querySelectorAll('.layout,.right,#objectLayerPanel,.object-layout-rect,#objectList,#inspector,#layoutPropertiesPanel,#phaseMemo textarea')].filter(Boolean).map(node=>({node,left:node.scrollLeft,top:node.scrollTop}))};
   window.Bolxiv.phasePanel.showOutputNote();
   document.querySelector('.top').classList.remove('phone-menu-open');const headerMenu=document.querySelector('.phone-menu-toggle');headerMenu?.setAttribute('aria-expanded','false');
   for(const [menu,trigger] of [['#boardZoomMenu','#resetBoardZoom'],['#phoneDisplayMenu','.phone-display-menu-toggle']])if(document.querySelector(menu)?.hidden===false)document.querySelector(trigger)?.click();
   closeObjectContextMenu();closeColorPopovers();closeJsonImportMenu();closeJsonExportMenu();closeHelpMenu();
   gridVisible=false;fieldVisible=true;fieldClipEnabled=false;updateGridToggle();updateFieldToggle();updateClipToggle();for(const id of ['gridToggle','fieldToggle','clipToggle']){const source=document.getElementById(id),button=toolbar.querySelector('[data-source-id='+id+']');if(button){button.innerHTML=source.innerHTML;button.setAttribute('aria-pressed',source.getAttribute('aria-pressed'));button.title=source.title}}render();
   
   dialog.dataset.outputMode=kind;syncOutputAction();scaleInput.value=String(session.scale);scaleInput.disabled=false;back.disabled=false;dialog.style.setProperty('--png-heading-height',document.querySelector('.board-title-row').getBoundingClientRect().height+'px');document.body.classList.add('png-preview-active');updateModeStatus();updateHistoryButtons();alignFrame();surface.append(liveSpace);liveSpace.inert=true;dialog.show();syncPhoneCanvas();back.focus({preventScroll:true});await refresh();await fitOutputToViewport();
  }catch(error){if(session)close();throw error}finally{opening=false}
 }
 function close(){
  if(!session||session.saving)return;endPreviewPan();clearTimeout(noteRefreshTimer);noteRefreshTimer=null;const previous=session;layout.classList.remove('phone-content-open');clearPhasePrintFrame();paperRevision++;paperImage.removeAttribute('src');surface.classList.remove('print-paper-active');paperPreview.hidden=true;pinch=null;closeZoomMenu();session=null;outputContentOpen=false;revision++;dialog.close();document.body.classList.remove('png-preview-active');dialog.removeAttribute('aria-busy');unmountPhoneReader(previous);liveSpace.querySelector('.output-note-preview')?.remove();liveSpace.querySelector('.output-border-preview')?.remove();liveSpace.classList.remove('has-output-note','has-output-frame');liveSpace.style.removeProperty('translate');liveSpace.style.removeProperty('--plain-paper-print-filter');liveAnchor.after(liveSpace);liveSpace.inert=previous.spaceInert;({gridVisible,fieldVisible,fieldClipEnabled}=previous.displayBefore);updateGridToggle();updateFieldToggle();updateClipToggle();setBoardDisplayZoom(previous.originalZoom,false,false);originalRender();updateModeStatus();updateHistoryButtons();
  window.Bolxiv.phasePanel.restore(previous.phoneNoteState);
  for(const state of previous.noteView){const change=document.getElementById(state.switchId),collapse=document.getElementById(state.collapseId);change.disabled=false;if(change.title!==state.title)change.click();if(collapse.getAttribute('aria-expanded')!==state.expanded)collapse.click()}
  for(const {node,inert} of previous.inert)node.inert=inert;for(const {node,disabled} of previous.placementControls)node.disabled=disabled;
  const restore=()=>{for(const {node,left,top} of previous.scrolls){node.scrollLeft=left;node.scrollTop=top}};restore();requestAnimationFrame(restore);
  const focus=[previous.focus,document.getElementById('exportBtn'),document.querySelector('.phone-menu-toggle')].find(node=>node?.isConnected&&node.getClientRects().length);focus?.focus({preventScroll:true});
 }
 document.getElementById('outputPlainPaper').onchange=syncPrintColor;
 document.getElementById('outputPrintReadability').onchange=refreshPaperArtwork;
 document.getElementById('printGuideLink').onclick=()=>{const guide=document.getElementById('operationGuideDialog');guide.showModal();document.getElementById('printGuideSection').scrollIntoView({block:'start'})};
 document.getElementById('outputPrintCutGuide').onchange=()=>{if(session)fitPaper()};
 document.getElementById('outputNoteRows').onchange=()=>{refresh();fitOutputToViewport()};
 scaleInput.onchange=refresh;document.getElementById('outputShowBorder').onchange=changeOutputBorder;for(const input of document.querySelectorAll('.output-phase-gap'))input.oninput=()=>{if(input.value==='')return;input.value=String(Math.max(0,Math.min(100,Math.round(Number(input.value)||0))));refresh();fitOutputImmediately()};
 async function runOutput(printing){
  if(!session||session.saving)return;flushNoteRefresh();const current=session;current.saving=true;save.disabled=printButton.disabled=true;scaleInput.disabled=true;back.disabled=true;printSettingsReset.disabled=true;
  try{if(printing)await printOutputCanvas();else{const target=window.showSaveFilePicker?await window.showSaveFilePicker(exportPickerOptions(safeExportName('.png'),'image/png','PNG画像')):null;await exportPng(target,current.scale)}}
  catch(error){if(error?.name!=='AbortError')notify((printing?'印刷画面を開けませんでした：':'PNGを書き出せませんでした：')+(error?.message||String(error)))}
  finally{if(session===current){current.saving=false;save.disabled=printButton.disabled=false;scaleInput.disabled=false;back.disabled=false;printSettingsReset.disabled=false}}
 }
 save.onclick=()=>runOutput(false);printButton.onclick=()=>runOutput(true);
 dialog.addEventListener('close',()=>{if(session&&!dialog.open&&!session.saving)close()});
 window.addEventListener('keydown',event=>{
  if(!session||event.target.closest?.('#changeLogDialog,#operationGuideDialog,#aboutToolDialog,#phoneIconHelp'))return;
  if(event.key===' '&&event.target.matches?.('#desktopPhasePanelTitle,#desktopPhaseSectionToggle')){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)event.target.click();return}
  if(event.target.closest?.('#phaseMemo textarea,#outputNotePhase')&&!session.saving){event.stopImmediatePropagation();return}
  if(event.target.closest?.('#modeSwitchMenu')||event.target.matches?.('.print-page-fields input'))return;
  if(zoomMenu.contains(event.target)||event.target===zoomTrigger&&['ArrowDown','ArrowUp'].includes(event.key))return;
  if(!dialog.contains(event.target)&&['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home'].includes(event.key)&&allowed(event.target))return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return}
  if((event.ctrlKey||event.metaKey)&&['z','y','v','x'].includes(event.key.toLowerCase())||['Delete','Backspace'].includes(event.key))event.preventDefault();
  event.stopImmediatePropagation();
 },true);
 const navigation='.desktop-phase-shared-heading,#phaseMemo,#desktopPhaseSwitch,#desktopPhaseSectionToggle,#phonePhaseSwitch-toggle,#phonePhaseSectionToggle,#modeSwitchMenu,#editModeToggle,.top .phone-menu-toggle,#headerActions,#jsonExportMenu,#helpMenu,#phasePropertyResize,.phone-phase-navigation,.phone-phase-tabs,#contentPaneResize,.phone-content-icon,.phone-content-close,.phone-content-backdrop,#contentObjectPin,#toggleContent,#toggleBattlePages,#contentSelect,#contentOptions,#exitPhaseComparison';
 function allowed(target){return zoomMenu.contains(target)||target===back||dialog.contains(target)||target.closest(navigation)||target.closest('.left')&&!target.closest('.tool,.icon-choice')||target.closest('#pages .phase-group-toggle:not([data-cancel-group-addition]),#pages .phase-group-name')||target.closest('#pages .page-tab')&&!target.closest('.page-tab-x')}
 for(const type of ['click','dblclick','pointerdown','contextmenu','dragstart','drop','change'])window.addEventListener(type,event=>{if(!session||event.target.closest?.('#changeLogDialog,#operationGuideDialog,#aboutToolDialog,#phoneIconHelp')||session.saving&&event.target.matches('a[download]'))return;if(readOnlyTarget(event.target)){event.preventDefault();event.stopImmediatePropagation();return}if(event.target===back&&type==='pointerdown'){event.stopImmediatePropagation();return}if(session.saving&&event.target!==back&&!dialog.contains(event.target)||!allowed(event.target)||['dblclick','contextmenu','dragstart','drop'].includes(type)&&!dialog.contains(event.target)&&!event.target.closest('#phaseMemo textarea')){event.preventDefault();event.stopImmediatePropagation()}},true);
 const originalRender=render;let refreshFrame;
 render=function(){originalRender();diagramVersion++;if(session&&!opening){cancelAnimationFrame(refreshFrame);refreshFrame=requestAnimationFrame(()=>{if(session)refresh()})}};
 window.Bolxiv.pngPreview={open,close,refresh,cancelNoteRefresh,scheduleNoteRefresh,flushNoteRefresh,get kind(){return session?.kind||'image'},get active(){return !!session},get saving(){return !!session?.saving},get returnMode(){return session?.returnMode||'編集'}};
})();

;

// The shared output mode owns the preview; only the browser print document is separate.
function desktopVectorPrintAvailable(){return matchMedia('(min-width:851px)').matches}
// Reuse the output layout and typography, preserving vector content for printing.
async function createVectorPrintSource(){
 if(document.fonts)await document.fonts.ready;
 const groupArtwork=document.querySelector('.phase-group-overview:not([hidden]) .phase-group-artwork'),source=groupArtwork||(phaseComparisonActive()?document.querySelector('.phase-comparison-grid'):stage);
 for(const image of source.querySelectorAll('img')){if(!image.complete)await image.decode();if(!image.naturalWidth)throw new Error('画像を読み込めません：'+(image.alt||'アイコン'))}
 const width=source.offsetWidth,height=source.offsetHeight;
 const clone=source===stage?clonePngStage():clonePngNode(source);for(const [key,value] of Object.entries({margin:'0',position:'relative',left:'auto',top:'auto',right:'auto',bottom:'auto',transform:'none',zoom:'1',boxShadow:'none',display:'block',width:width+'px',height:height+'px'}))clone.style.setProperty(key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value,'important');
 // Keep the comparison grid's layout when removing the editor zoom transform.
 if(source.classList.contains('phase-comparison-grid'))clone.style.setProperty('display','grid','important');
 clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
 return {width,height,clone};
}
async function createVectorPrintSvg(source){
 const {width,height,clone}=source||await createVectorPrintSource(),frame=outputFrameLayout(width,height),{note,padding}=frame;if(note.error)throw new Error(note.error);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('xmlns',ns);svg.setAttribute('width',Math.ceil(frame.width));svg.setAttribute('height',Math.ceil(frame.height));svg.setAttribute('viewBox','0 0 '+frame.width+' '+frame.height);
 function element(tag,attributes){const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);svg.append(node);return node}
 element('rect',{width:frame.width,height:frame.height,fill:'#fff'});
 if(note.notes){
  const {cellSize,columns}=note.layout,cells=[...clone.querySelectorAll(':scope>.phase-comparison-cell')];
  for(let i=0;i<note.notes.length;i++){
   const entry=note.notes[i],column=i%columns,row=Math.floor(i/columns),x=column*(frame.blockWidth+note.gapX)+padding,y=row*(frame.blockHeight+note.gapY)+padding;
   const cell=cells[i].cloneNode(true);for(const [key,value] of Object.entries({position:'relative',left:'auto',top:'auto',margin:'0',transform:'none',width:cellSize+'px',height:cellSize+'px'}))cell.style.setProperty(key,value,'important');
   if(printReadabilityEnabled())enhancePrintReadability(cell);element('foreignObject',{x,y,width:cellSize,height:cellSize}).append(cell);
   if(entry.height){const group=element('g',{transform:'translate('+x+' '+(y+cellSize)+')'}),scale=entry.scale||1;
    function noteElement(tag,attributes){const node=element(tag,attributes);group.append(node);return node}
    noteElement('rect',{width:cellSize,height:entry.height,fill:'#fff'});
    noteElement('rect',{x:scale,y:scale,width:cellSize-2*scale,height:entry.height-2*scale,fill:'none',stroke:'#9ca8ba','stroke-width':2*scale});
    noteElement('rect',{x:5.5*scale,y:5.5*scale,width:cellSize-11*scale,height:entry.height-11*scale,fill:'none',stroke:'#e0e5ed','stroke-width':scale});
    entry.lines.forEach((line,j)=>{const text=noteElement('text',{x:entry.padding,y:entry.padding+entry.ascent+j*entry.lineHeight,fill:'#17212c','font-family':"'BIZ UDGothic', 'BIZ UDゴシック', monospace",'font-size':entry.font,'font-kerning':'none','xml:space':'preserve'});text.textContent=line;if(printReadabilityEnabled()){text.setAttribute('stroke','#17212c');text.setAttribute('stroke-width',String(.6*scale));text.setAttribute('paint-order','stroke fill')}});
   }
   if(padding)element('rect',{x:x-padding+1.5,y:y-padding+1.5,width:frame.blockWidth+padding*2-3,height:frame.blockHeight+padding*2-3,fill:'none',stroke:'#999','stroke-width':1});
  }
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
 }
 const artwork=clone.cloneNode(true);if(printReadabilityEnabled())enhancePrintReadability(artwork);element('foreignObject',{x:padding,y:padding,width,height}).append(artwork);
 if(note.height){const y=padding+height,scale=note.scale||1;element('rect',{x:padding,y,width,height:note.height,fill:'#fff'});element('rect',{x:padding+scale,y:y+scale,width:width-2*scale,height:note.height-2*scale,fill:'none',stroke:'#9ca8ba','stroke-width':2*scale});element('rect',{x:padding+5.5*scale,y:y+5.5*scale,width:width-11*scale,height:note.height-11*scale,fill:'none',stroke:'#e0e5ed','stroke-width':scale});note.lines.forEach((line,i)=>{const text=element('text',{x:padding+note.padding,y:y+note.padding+note.ascent+i*note.lineHeight,fill:'#17212c','font-family':"'BIZ UDGothic', 'BIZ UDゴシック', monospace",'font-size':note.font,'font-kerning':'none','xml:space':'preserve'});text.textContent=line;if(printReadabilityEnabled()){text.setAttribute('stroke','#17212c');text.setAttribute('stroke-width',String(.6*scale));text.setAttribute('paint-order','stroke fill')}})}
 if(padding)element('rect',{x:1.5,y:1.5,width:frame.width-3,height:frame.height-3,fill:'none',stroke:'#999','stroke-width':1});
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
}

let phasePrintFrame=null,phasePrintOverlay=null;
function clearPhasePrintFrame(){phasePrintFrame?.remove();phasePrintFrame=null;phasePrintOverlay?.remove();phasePrintOverlay=null;document.body.classList.remove('phase-print-preparing','phase-print-open')}
async function printOutputCanvas(){
 const finishBusy=beginDesktopDisplayBusy();try{await yieldDesktopBusyPaint();
 clearPhasePrintFrame();phasePrintOverlay=document.createElement('div');phasePrintOverlay.className='phase-print-overlay';phasePrintOverlay.setAttribute('role','status');phasePrintOverlay.setAttribute('aria-label','印刷画面を準備しています');document.body.append(phasePrintOverlay);document.body.classList.add('phase-print-preparing','phase-print-open');
 let src;try{await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));if(desktopVectorPrintAvailable())src=await createVectorPrintSvg();else{const canvas=await drawPngCanvas(2,printReadabilityEnabled());src=canvas.toDataURL('image/png')}}catch(error){clearPhasePrintFrame();throw error}
 await new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe');phasePrintFrame=frame;frame.title='表示中の攻略図の印刷';frame.className='phase-print-frame';
  frame.onload=async()=>{try{const win=frame.contentWindow;const image=frame.contentDocument.querySelector('img');await image.decode();{const page=printPageLayout(image.naturalWidth,image.naturalHeight);Object.assign(image.style,{left:page.x+'mm',top:page.y+'mm',width:page.imageWidth+'mm',height:page.imageHeight+'mm'});if(document.getElementById('outputPrintCutGuide').checked){const guide=frame.contentDocument.createElement('div');guide.className='print-cut-guide';layoutPrintCutGuide(guide,page,1,'mm');frame.contentDocument.body.append(guide)}}if(phasePrintFrame!==frame){resolve();return}win.addEventListener('afterprint',clearPhasePrintFrame,{once:true});document.body.classList.remove('phase-print-preparing');phasePrintOverlay?.setAttribute('aria-label','印刷画面を開いています');finishBusy();win.focus();win.print();resolve()}catch(error){clearPhasePrintFrame();reject(error)}};
  const page=printPageLayout(1,1);frame.srcdoc='<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>攻略図</title><style>@page{size:'+page.paperWidth+'mm '+page.paperHeight+'mm;margin:0}html,body{margin:0;padding:0;background:white;width:'+page.paperWidth+'mm;height:'+page.paperHeight+'mm}body{position:relative;overflow:hidden}img{position:absolute;display:block;max-width:none;max-height:none;filter:'+plainPaperPrintFilter()+';print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body><img alt="攻略図" src="'+src+'"></body></html>';document.body.append(frame);
 });
 }finally{finishBusy()}
}

window.Bolxiv.phasePrint={open:()=>window.Bolxiv.pngPreview.open(2,'print')};
