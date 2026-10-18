(()=>{
 const pane=document.querySelector('.left');let opening=false,openingPointer=null,suppressClick=false;
 // Delay mouse hover expansion; focus and pinned styles remain immediate.
 const desktopHover=matchMedia('(min-width:851px) and (hover:hover)');let hoverTimer=null;
 function clearDelayedHover(){clearTimeout(hoverTimer);hoverTimer=null;pane.classList.remove('palette-hover-open')}
 pane.addEventListener('pointerenter',e=>{
  clearDelayedHover();
  if(e.pointerType!=='mouse'||!desktopHover.matches||pane.classList.contains('pinned'))return;
  hoverTimer=setTimeout(()=>{hoverTimer=null;if(desktopHover.matches)pane.classList.add('palette-hover-open')},300);
 });
 pane.addEventListener('pointerleave',clearDelayedHover);
 pane.addEventListener('pointercancel',clearDelayedHover);
 window.addEventListener('blur',clearDelayedHover);
 desktopHover.addEventListener('change',clearDelayedHover);
 pane.setAttribute('tabindex','-1');
 function clearOpeningStyleIfClosed(){if(!pane.matches(':focus-within')&&!pane.matches(':hover')&&!pane.classList.contains('pinned'))pane.classList.remove('palette-opening-neutral')}
 pane.addEventListener('focusout',()=>queueMicrotask(()=>{if(!pane.matches(':focus-within'))pane.classList.remove('palette-opening-neutral')}));
 pane.addEventListener('pointerleave',()=>queueMicrotask(clearOpeningStyleIfClosed));
 document.addEventListener('pointerdown',e=>{if(!pane.contains(e.target)){pane.classList.remove('palette-opening-neutral');if(pane.contains(document.activeElement))document.activeElement.blur()}},true);

 pane.addEventListener('pointerenter',e=>{opening=e.pointerType!=='mouse'&&!pane.classList.contains('pinned')&&!pane.matches(':focus-within');if(e.pointerType==='mouse')pane.classList.remove('palette-opening-neutral')});
 pane.addEventListener('pointerleave',()=>{if(openingPointer===null)opening=false});
 document.addEventListener('pointerdown',e=>{
  if(!pane.contains(e.target))return;pane.classList.remove('palette-opening-neutral');if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
  suppressClick=false;
  const railButton=e.target.closest('button');const compactButton=railButton&&railButton.getBoundingClientRect().width<=44;const closed=!pane.classList.contains('pinned')&&(opening||!pane.matches(':focus-within')||pane.getBoundingClientRect().width<100||compactButton&&railButton.matches('.accordion-toggle'));
  if(!closed)return;
  // Consume the complete opening gesture before focusing expands the rail.
  e.preventDefault();e.stopImmediatePropagation();openingPointer=e.pointerId;suppressClick=true;opening=false;pane.classList.add('palette-opening-neutral');pane.focus({preventScroll:true});pane.setPointerCapture(e.pointerId);
 },true);
 for(const type of ['pointerup','pointercancel'])pane.addEventListener(type,e=>{if(e.pointerId!==openingPointer)return;e.preventDefault();e.stopImmediatePropagation();openingPointer=null;if(pane.hasPointerCapture(e.pointerId))pane.releasePointerCapture(e.pointerId)},true);
 document.addEventListener('click',e=>{if(suppressClick&&e.isTrusted){suppressClick=false;e.preventDefault();e.stopImmediatePropagation()}},true);
 pane.addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();return}
  const button=e.target.closest('.accordion-toggle:not(.rail-toggle)');if(!button)return;
  const expandOnly=opening&&!pane.classList.contains('pinned');opening=false;if(!expandOnly)return;e.preventDefault();e.stopImmediatePropagation();button.focus({preventScroll:true});
 },true);
})();
