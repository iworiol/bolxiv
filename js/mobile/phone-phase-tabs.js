(()=>{
 const mobile=matchMedia('(max-width:850px)'),host=document.getElementById('contentPanel'),memo=document.getElementById('phaseMemo'),properties=document.getElementById('toggleLayoutProperties'),body=document.getElementById('layoutPropertiesPanel');
 const tabs=document.createElement('div');tabs.className='phone-phase-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','フェーズの設定とノート');tabs.hidden=true;host.append(tabs);
 const shared=document.createElement('div');shared.className='phone-phase-shared';shared.hidden=true;host.append(shared);shared.append(tabs);
 const title=document.createElement('span');title.className='phone-phase-switch-title';title.setAttribute('aria-live','polite');title.setAttribute('role','button');title.tabIndex=0;title.setAttribute('aria-controls',body.id+' '+memo.id);tabs.append(title);
 let selected=viewSettings.phonePhaseTab==='memo'?'memo':'properties';
 const buttons=['toggle'].map(key=>{
  const button=document.createElement('button');button.type='button';button.id='phonePhaseSwitch-'+key;button.setAttribute('aria-controls',body.id+' '+memo.id);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-4-4M20 16H4l4 4"/></svg>';
  button.onclick=()=>{selected=selected==='properties'?'memo':'properties';rememberViewSetting('phonePhaseTab',selected);sync()};tabs.append(button);return button;
 });
 let expanded=viewSettings.phonePhaseSectionExpanded!==false;
 const collapse=document.createElement('button');collapse.type='button';collapse.id='phonePhaseSectionToggle';collapse.setAttribute('aria-controls',body.id+' '+memo.id);tabs.append(collapse);
 collapse.onclick=()=>{expanded=!expanded;rememberViewSetting('phonePhaseSectionExpanded',expanded);sync()};
 tabs.addEventListener('click',event=>{if(event.target.closest('button'))return;collapse.click()});
 title.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();collapse.click()}});
 const handle=document.getElementById('phasePropertyResize'),list=host.querySelector('.page-controls'),phaseButton=document.getElementById('toggleBattlePages');let gesture=null,ownsResize=false,resizedHeight=null;
 function canResize(){return mobile.matches&&!boardReadOnly&&expanded&&phaseButton.getAttribute('aria-expanded')==='true'}
 function resizeList(height){const available=list.getBoundingClientRect().height+shared.getBoundingClientRect().height;const next=Math.max(72,Math.min(available-120,height));resizedHeight=next;list.style.setProperty('flex','0 1 '+next+'px','important');ownsResize=true}
 handle.addEventListener('pointerdown',event=>{if(!canResize()||(event.pointerType!=='touch'&&event.button!==0))return;event.preventDefault();event.stopImmediatePropagation();gesture={id:event.pointerId,y:event.clientY,height:list.getBoundingClientRect().height};handle.classList.add('resizing');handle.setPointerCapture(event.pointerId)},true);
 handle.addEventListener('pointermove',event=>{if(!gesture||gesture.id!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();resizeList(gesture.height+event.clientY-gesture.y)},true);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(name,()=>{gesture=null;handle.classList.remove('resizing')},true);
 handle.addEventListener('keydown',event=>{if(!canResize()||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();resizeList(list.getBoundingClientRect().height+(event.key==='ArrowDown'?10:-10))},true);
 new MutationObserver(()=>{if(ownsResize&&phaseButton.getAttribute('aria-expanded')==='false'){list.style.removeProperty('flex');ownsResize=false}sync()}).observe(phaseButton,{attributes:true,attributeFilter:['aria-expanded']});
 function sync(){
  const enabled=mobile.matches&&!boardReadOnly;tabs.hidden=!enabled;host.classList.toggle('phone-phase-tabbed',enabled);host.dataset.phaseTab=selected;
  shared.hidden=!enabled;
  const open=expanded;collapse.disabled=false;
  shared.classList.toggle('is-collapsed',!open);collapse.textContent=open?'−':'＋';collapse.setAttribute('aria-expanded',String(open));collapse.title=open?'設定・ノートを閉じる':'設定・ノートを開く';collapse.setAttribute('aria-label',collapse.title);
  title.setAttribute('aria-expanded',String(expanded));
  if(enabled&&!canResize()&&ownsResize){list.style.removeProperty('flex');ownsResize=false}
  else if(enabled&&canResize()&&resizedHeight!==null){list.style.setProperty('flex','0 1 '+resizedHeight+'px','important');ownsResize=true}
  if(enabled)handle.style.setProperty('display',canResize()?'block':'none','important');else{handle.style.removeProperty('display');if(ownsResize){list.style.removeProperty('flex');ownsResize=false}}
  const propertyGroup=properties.parentElement;
  if(enabled){if(propertyGroup.parentElement!==shared)shared.append(propertyGroup);if(memo.parentElement!==shared)shared.append(memo)}
  else{
   if(propertyGroup.parentElement===shared||propertyGroup.parentElement===document.querySelector('.phone-view-content'))host.append(propertyGroup);
   if(mobile.matches){const target=boardReadOnly?document.querySelector('.phone-view-content'):host;if(target&&memo.parentElement!==target)target.append(memo);if(boardReadOnly&&data.activePhaseGroup&&target&&propertyGroup.parentElement!==target)target.append(propertyGroup)}
  }
  const prefix=data.activePhaseGroup?'グループ':'フェーズ';
  const titleMarkup=selected==='properties'?'<strong>'+prefix+' プロパティ</strong> / ノート':'<strong>'+prefix+'</strong> プロパティ / <strong>ノート</strong>';
  if(title.innerHTML!==titleMarkup)title.innerHTML=titleMarkup;
  title.setAttribute('aria-label','フェーズ '+(selected==='properties'?'プロパティ':'ノート')+'を表示中。設定・ノート欄を'+(expanded?'閉じる':'開く'));
  buttons.forEach(button=>{button.title=prefix+(selected==='properties'?'ノートを表示':'プロパティを表示');button.setAttribute('aria-label',button.title)});
  if(!enabled)return;
  if(selected==='memo')memo.open=true;
  else{properties.setAttribute('aria-expanded','true');body.hidden=false;body.classList.remove('hidden');body.style.display='flex'}
 }
 window.Bolxiv.phasePanel={
  capture:()=>({selected,expanded,memoOpen:memo.open,memoIsOpen:memo.classList.contains('is-open')}),
  restore(state){selected=state.selected;expanded=state.expanded;memo.open=state.memoOpen;memo.classList.toggle('is-open',state.memoIsOpen);rememberViewSetting('phonePhaseTab',selected);rememberViewSetting('phonePhaseSectionExpanded',expanded);sync()}
 };
 const previousRender=render;render=function(){previousRender();sync()};
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});mobile.addEventListener('change',sync);sync();
})();
