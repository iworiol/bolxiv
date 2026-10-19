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

(function setupPhoneDisplayMenu(){
 const mobile=matchMedia('(max-width:850px)'),toolbar=document.querySelector('.board-display-toolbar'),trigger=document.createElement('button'),menu=document.createElement('div');
 trigger.type='button';trigger.className='board-grid-toggle phone-display-menu-toggle';trigger.title='表示設定';trigger.setAttribute('aria-label','表示設定');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','phoneDisplayMenu');
 trigger.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 3v4m0 5v9M12 3v10m0 5v3M19 3v4m0 5v9"/><rect x="2.5" y="7" width="5" height="5" rx="1"/><rect x="9.5" y="13" width="5" height="5" rx="1"/><rect x="16.5" y="7" width="5" height="5" rx="1"/></svg>';
 toolbar.insertBefore(trigger,document.getElementById('gridToggle'));
 menu.id='phoneDisplayMenu';menu.className='phone-display-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','表示設定');document.body.append(menu);
 const items=[['gridToggle','グリッドを表示'],['fieldToggle','フィールドを表示'],['clipToggle','フィールド外を表示']].map(([id,label])=>{
  const source=document.getElementById(id),item=document.createElement('button');item.type='button';item.setAttribute('role','menuitemcheckbox');item.innerHTML='<span>'+label+'</span><span class="phone-display-state" aria-hidden="true"></span>';
  const sync=()=>{const pressed=source.getAttribute('aria-pressed')==='true',checked=id==='clipToggle'?!pressed:pressed;item.setAttribute('aria-checked',String(checked));item.lastElementChild.textContent=checked?'オン':'オフ';item.disabled=source.disabled};
  item.onclick=()=>{source.click();sync();item.focus({preventScroll:true})};new MutationObserver(sync).observe(source,{attributes:true,attributeFilter:['aria-pressed','disabled']});sync();menu.append(item);return item;
 });
 const separator=document.createElement('div');separator.className='phone-display-menu-separator';separator.setAttribute('role','separator');menu.append(separator);
 const closeButton=document.createElement('button');closeButton.type='button';closeButton.setAttribute('role','menuitem');closeButton.textContent='閉じる';closeButton.onclick=()=>close(true);menu.append(closeButton);items.push(closeButton);
 function close(focus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true})}
 function open(){if(!mobile.matches)return;document.querySelector('#boardZoomMenu:not([hidden])')&&document.getElementById('resetBoardZoom').click();menu.hidden=false;trigger.setAttribute('aria-expanded','true');const rect=trigger.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+4,innerHeight-menu.offsetHeight-8))+'px';items[0].focus({preventScroll:true})}
 trigger.onclick=()=>menu.hidden?open():close();
 window.addEventListener('keydown',event=>{if(!menu.hidden&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(true)}},true);
 trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();open()}});
 menu.addEventListener('keydown',event=>{const index=items.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();close(true)}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();items[(index+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(event.key==='Home'||event.key==='End'){event.preventDefault();items[event.key==='Home'?0:items.length-1].focus()}else if(event.key==='Tab')close()});
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!trigger.contains(event.target))close()},true);
 window.addEventListener('resize',()=>close());window.addEventListener('scroll',event=>{if(!menu.contains(event.target))close()},true);mobile.addEventListener('change',()=>close());
})();
