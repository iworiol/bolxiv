(()=>{
 const mobile=matchMedia('(max-width:850px)');let pressed=null;
 const selector='.phone-object-tabs-title,.accordion-toggle:not(#toggleObjectList):not(#toggleContent),.phase-memo>summary,#contentSelect,.content-object-pin,.content-history-button,.board-grid-toggle,.phone-content-close,.phone-material-toggle,#phonePhaseSectionToggle,.phone-phase-switch-title,button:not(.color-swatch):not([data-color-value]):not(#toggleObjectList):not(#toggleContent):not(.phone-content-backdrop):not(:where(.page-tab,.page-tab *,.object-row,.object-row *,.content-option-row:not(.content-option-add-row),.content-option-row:not(.content-option-add-row) *,.phase-group-heading,.phase-group-heading *))';
 function clear(){pressed?.node.classList.remove('phone-control-pressed');pressed=null}
 document.addEventListener('pointerdown',event=>{
  if(!mobile.matches||event.pointerType!=='touch')return;
  clear();const node=event.target.closest(selector);if(!node||node.disabled)return;
  pressed={node,id:event.pointerId,x:event.clientX,y:event.clientY};node.classList.add('phone-control-pressed');
 },true);
 document.addEventListener('pointermove',event=>{if(pressed&&event.pointerId===pressed.id&&Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)>10)clear()},true);
 for(const name of ['pointerup','pointercancel'])document.addEventListener(name,clear,true);
 window.addEventListener('blur',clear);mobile.addEventListener('change',clear);
})();
