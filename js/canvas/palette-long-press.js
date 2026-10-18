(()=>{
 const pane=document.querySelector('.left');let gesture=null,suppressButton=null,lastTouch=0;
 function finish(){if(!gesture)return;clearTimeout(gesture.timer);const g=gesture;gesture=null;hideTouchPlacementPreview();if(g.button.hasPointerCapture(g.id))g.button.releasePointerCapture(g.id);g.button.draggable=g.draggable;return g}
 pane.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch')return;const button=e.target.closest('.tool[data-tool],.icon-choice');if(!button)return;
  finish();lastTouch=Date.now();const g={id:e.pointerId,x:e.clientX,y:e.clientY,button,draggable:button.draggable,wasSelected:button.classList.contains('active'),active:false,moved:false};gesture=g;button.draggable=false;
  g.timer=setTimeout(()=>{if(gesture!==g||!button.isConnected)return;g.active=true;button.focus({preventScroll:true});button.click();suppressButton=button;tapPlacementArmed=true;g.payload=tool==='icon'&&activeIcon?{type:'icon',...activeIcon}:{type:tool};showTouchPlacementPreview(g.payload,g.x,g.y);button.setPointerCapture(g.id);button.classList.add('palette-dragging')},450);
 });
 document.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y);if(!gesture.active){if(distance>10)finish();return}gesture.moved=distance>10;moveTouchPlacementPreview(e.clientX,e.clientY);e.preventDefault();e.stopImmediatePropagation()},true);
 document.addEventListener('pointerup',e=>{
  if(gesture?.id!==e.pointerId)return;const g=finish();g.button.classList.remove('palette-dragging');if(!g.active)return;e.preventDefault();e.stopImmediatePropagation();
  if(g.wasSelected&&!g.moved){tapPlacementArmed=false;selectPlacementTool('select');return}const r=stage.getBoundingClientRect(),point=touchPlacementPoint(e.clientX,e.clientY);if(g.moved&&point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom&&!phaseComparisonActive()){placeObject(g.payload,point.x,point.y);tapPlacementArmed=false;selectPlacementTool('select');closePaletteAfterPlacement()}
 },true);
 document.addEventListener('pointercancel',e=>{if(gesture?.id===e.pointerId){const g=finish();g.button.classList.remove('palette-dragging');suppressButton=null}},true);
 pane.addEventListener('click',e=>{if(e.isTrusted&&suppressButton){const same=e.target.closest('.tool[data-tool],.icon-choice')===suppressButton;suppressButton=null;if(same){e.preventDefault();e.stopImmediatePropagation()}}},true);
 pane.addEventListener('click',e=>{const button=e.target.closest('.tool[data-tool],.icon-choice');if(!e.isTrusted||!button?.classList.contains('active'))return;e.preventDefault();e.stopImmediatePropagation();tapPlacementArmed=false;selectPlacementTool('select');hideTouchPlacementPreview()},true);
 pane.addEventListener('contextmenu',e=>{if(Date.now()-lastTouch<2500&&e.target.closest('.tool[data-tool],.icon-choice'))e.preventDefault()});
 window.addEventListener('blur',()=>{suppressButton=null;const g=finish();g?.button.classList.remove('palette-dragging')});
})();
