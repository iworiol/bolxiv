(function setupPhoneLayout(){
 const mobile=matchMedia('(max-width:850px)'),layout=document.querySelector('.layout');
 const nav=document.createElement('nav');nav.className='phone-nav';nav.setAttribute('aria-label','スマホの画面切り替え');
 for(const [pane,label] of [['canvas','キャンバス']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.pane=pane;button.setAttribute('aria-pressed',String(pane==='canvas'));
  button.onclick=()=>{closeMaterials();if(mobile.matches&&pane==='content'){layout.dataset.phonePane='canvas';layout.classList.add('phone-content-open');for(const item of nav.children)item.setAttribute('aria-pressed',String(item===button));return}layout.classList.remove('phone-content-open');layout.dataset.phonePane=pane;for(const item of nav.children)item.setAttribute('aria-pressed',String(item===button))};nav.append(button);
 }
 layout.dataset.phonePane='canvas';
 const contentIcon=document.createElement('button');contentIcon.type='button';contentIcon.className='phone-content-icon';contentIcon.setAttribute('aria-label','コンテンツを表示');contentIcon.title='コンテンツを表示';contentIcon.setAttribute('aria-controls','battlePanel');contentIcon.setAttribute('aria-expanded','false');
 contentIcon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
 document.querySelector('.board-display-toolbar').prepend(contentIcon);
 contentIcon.onclick=()=>{closeMaterials();layout.classList.add('phone-content-open')};
 new MutationObserver(()=>contentIcon.setAttribute('aria-expanded',String(layout.classList.contains('phone-content-open')))).observe(layout,{attributes:true,attributeFilter:['class']});

 const materialPane=document.querySelector('.left'),pin=document.createElement('button');let desktopMaterialPinned=materialPane.classList.contains('pinned'),materialOpenObjectCount=0;
 const placementHelp=document.createElement('div');placementHelp.className='phone-material-help';placementHelp.innerHTML='<p>アイコンをタップ → キャンバスをタップして配置。</p><p>長押しで移動 → 指を離して配置（指の少し上）。</p>';materialPane.insertBefore(placementHelp,materialPane.querySelector('.accordion-group'));
 pin.type='button';pin.className='board-grid-toggle phone-material-pin';pin.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.5" cy="6.5" r="3.5"/><rect x="14" y="3" width="7" height="7" rx="1"/><path d="m6.5 13 4.5 8H2z"/><path d="m17.5 13 4.5 4.5-4.5 4.5-4.5-4.5z"/></svg>';
 pin.setAttribute('aria-label','マテリアルを開く');pin.title='マテリアルを開く';pin.setAttribute('aria-expanded','false');
 if(!materialPane.id)materialPane.id='materialPane';pin.setAttribute('aria-controls',materialPane.id);
 document.getElementById('objectLayerPanel').append(pin);
 function closeMaterials(){if(layout.classList.contains('phone-materials-open'))materialPane.classList.toggle('pinned',desktopMaterialPinned);layout.classList.remove('phone-materials-open');pin.setAttribute('aria-expanded','false');pin.setAttribute('aria-label','マテリアルを開く');pin.title='マテリアルを開く'}
 pin.onclick=()=>{materialOpenObjectCount=current().length;if(!layout.classList.contains('phone-materials-open'))desktopMaterialPinned=materialPane.classList.contains('pinned');materialPane.classList.add('pinned');let firstOpen=null;for(const category of materialPane.querySelectorAll('.accordion-toggle[aria-controls]')){if(category.getAttribute('aria-expanded')!=='true')continue;if(!firstOpen){firstOpen=category;continue}category.setAttribute('aria-expanded','false');document.getElementById(category.getAttribute('aria-controls')).hidden=true}const rect=document.querySelector('.board-title-row').getBoundingClientRect();layout.style.setProperty('--phone-material-top',(rect.bottom-layout.getBoundingClientRect().top)+'px');layout.classList.add('phone-materials-open');pin.setAttribute('aria-expanded','true');pin.setAttribute('aria-label','マテリアルを展開');pin.title='マテリアルを展開'};
 
 mobile.addEventListener('change',closeMaterials);
 // Reveal the canvas after a tap selection. Long-press uses a synthetic click
 // and must keep the palette in place while its pointer is captured.
 materialPane.addEventListener('click',event=>{
  if(mobile.matches&&event.isTrusted&&tapPlacementArmed&&event.target.closest('.tool[data-tool],.icon-choice'))closeMaterials();
 });
 let materialDismissClick=false;
 document.addEventListener('pointerdown',event=>{
  materialDismissClick=false;
  if(!mobile.matches||!layout.classList.contains('phone-materials-open')||operationGuide.open)return;
  if(event.target.closest('#pcTutorial')||materialPane.contains(event.target)||pin.contains(event.target)||contentIcon.contains(event.target))return;
  materialDismissClick=true;
  event.preventDefault();event.stopImmediatePropagation();
  closeMaterials();
 },true);
 document.addEventListener('click',event=>{
  if(!materialDismissClick)return;
  materialDismissClick=false;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 new MutationObserver(()=>{
  if(mobile.matches&&layout.classList.contains('phone-materials-open')&&current().length>materialOpenObjectCount)closeMaterials();
 }).observe(document.getElementById('objects'),{childList:true});


 // Pane changes retain the current zoom and browser scroll position.
 // Fitting is performed only by the explicit fit button.
})();
