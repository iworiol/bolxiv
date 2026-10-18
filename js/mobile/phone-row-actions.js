(()=>{
 for(const type of ['contextmenu','dragstart'])window.addEventListener(type,event=>{
  if(!matchMedia('(max-width:850px)').matches||event.target.closest('input,textarea,[contenteditable="true"]')||!event.target.closest('#pages .page-tab,#pages .phase-group-heading,#objectList .object-row,#contentOptions .content-option-row:not(.content-option-add-row)'))return;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 const icon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
 function sync(){
  for(const [id,selector] of [['pages','.page-tab'],['objectList','.object-row'],['contentOptions','.content-options-scroll>.content-option-row']]){
   const host=document.getElementById(id);
   for(const row of host.querySelectorAll(selector)){
    let button=row.querySelector('.phone-row-actions');
    if(!button){button=document.createElement('button');button.type='button';button.className='phone-row-actions';button.innerHTML=icon;button.setAttribute('aria-label','操作メニュー');button.setAttribute('aria-haspopup','menu');button.addEventListener('pointerdown',event=>event.stopPropagation());button.onclick=event=>{event.preventDefault();event.stopPropagation();const rect=button.getBoundingClientRect();if(id==='objectList'){const objectId=row.dataset.id;if(!selectedIds.includes(objectId)){selected=objectId;selectedIds=[objectId];renderSelectionOnly()}closeColorPopovers();openObjectContextMenu(objectId,rect.left,rect.bottom)}else host.dispatchEvent(new CustomEvent('open-row-actions',{detail:{row,x:rect.left,y:rect.bottom}}))};row.append(button)}
    const hidden=id==='pages'?!row.classList.contains('active')||row.classList.contains('renaming'):id==='objectList'?!row.classList.contains('selected'):!!row.querySelector('input');
    if(button.hidden!==hidden)button.hidden=hidden;
   }
  }
 }
 for(const id of ['pages','objectList','contentOptions'])new MutationObserver(sync).observe(document.getElementById(id),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 sync();
})();
