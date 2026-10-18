(()=>{
 const mobile=matchMedia('(max-width:850px)'),row=document.querySelector('.content-select-row'),anchor=document.createComment('content selector home');row.before(anchor);
 const phases=document.querySelector('.page-controls'),phaseAnchor=document.createComment('phase selector home');phases.before(phaseAnchor);
 const host=document.createElement('div');host.className='phone-view-content';host.setAttribute('aria-label','閲覧用コンテンツ・フェーズ選択');document.getElementById('objectLayerPanel').append(host);
 let active=false;
 const phaseToggle=document.getElementById('toggleBattlePages');let phaseMode=false,editExpanded=phaseToggle.getAttribute('aria-expanded')==='true',viewExpanded=typeof viewSettings.viewPhasesExpanded==='boolean'?viewSettings.viewPhasesExpanded:true;
 function syncPhaseMode(){if(!mobile.matches||phaseMode===boardReadOnly)return;const expanded=phaseToggle.getAttribute('aria-expanded')==='true';if(phaseMode)viewExpanded=expanded;else editExpanded=expanded;phaseMode=boardReadOnly;const target=phaseMode?viewExpanded:editExpanded;if(expanded!==target)phaseToggle.onclick({currentTarget:phaseToggle})}
 const panel=document.getElementById('objectLayerPanel'),space=document.getElementById('boardZoomSpace'),viewport=space.parentElement;
 function size(){
  if(!active)return;
  const note=host.querySelector('.phase-memo'),noteHeight=note&&!note.hidden?note.getBoundingClientRect().height+8:0;
  const closed=phaseToggle.getAttribute('aria-expanded')==='false',rowHeight=row.getBoundingClientRect().height,closedHeight=rowHeight+8+36+noteHeight;
  if(closed){
   panel.style.setProperty('--phone-reader-controls-height',closedHeight+'px');
   return;
  }
  const reserved=230+noteHeight;
  const height=phoneCanvasDisplayHeight(panel)+'px';
  if(panel.style.getPropertyValue('--phone-reader-canvas-height')!==height)panel.style.setProperty('--phone-reader-canvas-height',height);
  if(panel.style.getPropertyValue('--phone-reader-controls-height')!==reserved+'px')panel.style.setProperty('--phone-reader-controls-height',reserved+'px');
 }
 new MutationObserver(()=>requestAnimationFrame(size)).observe(document.getElementById('toggleBattlePages'),{attributes:true,attributeFilter:['aria-expanded']});
 const resize=new ResizeObserver(size);resize.observe(panel);resize.observe(viewport);window.addEventListener('resize',size);
 host.addEventListener('toggle',()=>requestAnimationFrame(size),true);
 new MutationObserver(()=>requestAnimationFrame(size)).observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 new MutationObserver(()=>requestAnimationFrame(size)).observe(space,{childList:true,attributes:true,attributeFilter:['style']});viewport.addEventListener('scroll',size,{passive:true});
 function sync(){syncPhaseMode();const next=mobile.matches&&boardReadOnly;if(next===active)return;active=next;document.getElementById('contentOptions').hidden=true;document.getElementById('contentSelect').setAttribute('aria-expanded','false');if(active){document.querySelector('.phone-content-close')?.click();host.append(row,phases);const note=host.querySelector('.phase-memo');if(note)host.append(note)}else{anchor.after(row);phaseAnchor.after(phases)}}
 new MutationObserver(()=>{sync();requestAnimationFrame(size)}).observe(document.body,{attributes:true,attributeFilter:['class']});mobile.addEventListener('change',()=>{sync();requestAnimationFrame(size)});sync();requestAnimationFrame(size);
})();
