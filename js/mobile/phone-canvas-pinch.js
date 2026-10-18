(()=>{
 const mobile=matchMedia('(max-width:850px)'),space=document.getElementById('boardZoomSpace'),viewport=space.parentElement;
 let pinch=null,session=false,changed=false;const touchPointers=new Set();
 const enabled=()=>mobile.matches&&!document.querySelector('.layout').classList.contains('phone-content-open')&&!document.querySelector('.layout').classList.contains('phone-materials-open');
 const surface=()=>space.querySelector('.phase-group-overview:not([hidden]) .phase-group-artwork')||space.querySelector('.phase-comparison-grid')||document.getElementById('stage');
 function pair(touches){const a=Array.from(touches).find(touch=>touch.identifier===pinch.ids[0]),b=Array.from(touches).find(touch=>touch.identifier===pinch.ids[1]);return a&&b?{distance:Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY),x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}:null}
 function stop(event){if(event.cancelable)event.preventDefault();event.stopImmediatePropagation()}
 function stopObjectDrag(){
  if(tapPlacementGesture){const id=tapPlacementGesture.id;tapPlacementGesture=null;hideTouchPlacementPreview();if(stage.hasPointerCapture(id))stage.releasePointerCapture(id)}
  const previous=drag,hadSelection=selected!==null||selectedIds.length>0;
  drag=null;selected=null;selectedIds=[];
  previous?.box?.remove();clearAlignmentGuides();stage.classList.remove('ctrl-copy');
  if(previous?.beforeData)data=JSON.parse(previous.beforeData);
  if(previous)renderAndSave();else if(hadSelection)render();
 }
 const canvasTouch=touch=>viewport.contains(touch.target)||!!touch.target.closest?.('.obj,.controlbox,#boardZoomSpace');
 window.addEventListener('touchstart',event=>{
  if(!enabled()||event.touches.length<2||!Array.from(event.touches).every(canvasTouch))return;
  stop(event);session=true;
  if(pinch)return;
  stopObjectDrag();
  pinch={ids:[event.touches[0].identifier,event.touches[1].identifier],zoom:boardDisplayZoom};
  const point=pair(event.touches),rect=surface().getBoundingClientRect();
  if(!point?.distance||!rect.width||!rect.height){pinch=null;return}
  pinch.distance=point.distance;pinch.x=(point.x-rect.left)/rect.width;pinch.y=(point.y-rect.top)/rect.height;
 },{capture:true,passive:false});
 window.addEventListener('touchmove',event=>{
  if(!session)return;stop(event);
  if(!enabled()||!pinch)return;
  const point=pair(event.touches);if(!point)return;
  const before=boardDisplayZoom;
  setBoardDisplayZoom(pinch.zoom*point.distance/pinch.distance,false,false);
  changed=changed||boardDisplayZoom!==before;
  const rect=surface().getBoundingClientRect();
  viewport.scrollLeft+=rect.left+pinch.x*rect.width-point.x;
  viewport.scrollTop+=rect.top+pinch.y*rect.height-point.y;
 },{capture:true,passive:false});
 function finish(event){
  if(!session)return;
  if(event.touches.length<2)pinch=null;
  if(event.touches.length)return;
  session=false;
  if(changed)rememberViewSetting('boardDisplayZoom',boardDisplayZoom);
  changed=false;
 }
 for(const name of ['touchend','touchcancel'])window.addEventListener(name,finish,{capture:true,passive:true});
 window.addEventListener('pointermove',event=>{if(session&&event.pointerType==='touch')stop(event)},{capture:true,passive:false});
 window.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||!enabled()||!viewport.contains(event.target))return;
  touchPointers.add(event.pointerId);
  if(session||touchPointers.size>1){session=true;stopObjectDrag();stop(event)}
 },{capture:true,passive:false});
 for(const name of ['pointerup','pointercancel'])window.addEventListener(name,event=>touchPointers.delete(event.pointerId),true);
 window.addEventListener('click',event=>{if(session&&viewport.contains(event.target))stop(event)},true);
})();
