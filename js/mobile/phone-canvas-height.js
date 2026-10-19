function phoneCanvasDisplayHeight(panel,zoom=boardDisplayZoom,reserved=230){
 const style=getComputedStyle(panel),pixels=value=>parseFloat(value)||0;
 const remaining=Math.max(0,panel.clientHeight-pixels(style.paddingTop)-pixels(style.paddingBottom)-pixels(style.rowGap)-reserved);
 const surface=document.querySelector('.phase-comparison-grid')||document.getElementById('stage');
 const desired=(surface.offsetHeight||640)*zoom/100+60;
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

function phoneReaderLayoutMetrics(panel,footerHeight,rowHeight,zoom=boardDisplayZoom){const controlsMinHeight=230+footerHeight;return {canvasHeight:phoneCanvasDisplayHeight(panel,zoom,controlsMinHeight),controlsMinHeight,closedControlsHeight:rowHeight+8+38+footerHeight}}
