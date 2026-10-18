function phoneCanvasDisplayHeight(panel){
 const style=getComputedStyle(panel),pixels=value=>parseFloat(value)||0;
 const remaining=Math.max(0,panel.clientHeight-pixels(style.paddingTop)-pixels(style.paddingBottom)-pixels(style.rowGap)-230);
 const surface=document.querySelector('.phase-comparison-grid')||document.getElementById('stage');
 const desired=(surface.offsetHeight||640)*boardDisplayZoom/100+60;
 return Math.min(remaining,desired);
}
(()=>{
 const panel=document.getElementById('objectLayerPanel'),mobile=matchMedia('(max-width:850px)');
 function update(){
  if(!mobile.matches)return;
  const height=phoneCanvasDisplayHeight(panel)+'px';
  if(panel.style.getPropertyValue('--phone-canvas-height')!==height)panel.style.setProperty('--phone-canvas-height',height);
 }
 new ResizeObserver(update).observe(panel);
 new MutationObserver(update).observe(document.getElementById('boardZoomSpace'),{childList:true,attributes:true,attributeFilter:['style']});
 mobile.addEventListener('change',update);
 update();
})();
