(()=>{
 const desktop=matchMedia('(min-width:851px)');
 function update(){
  if(!desktop.matches)return;
  for(const panel of document.querySelectorAll('.battle #pages,.right #objectList,.battle #layoutPropertiesPanel,.right #inspector')){
   const probe=document.createElement('div');
   probe.style.cssText='position:fixed;left:-10000px;width:100px;height:100px;overflow:scroll;visibility:hidden;border:0;padding:0;box-sizing:border-box';
   probe.style.scrollbarWidth=getComputedStyle(panel).scrollbarWidth;
   document.body.append(probe);const width=probe.offsetWidth-probe.clientWidth;probe.remove();
   panel.style.setProperty('--desktop-scroll-clearance',width>0?'8px':'16px');
  }
  const properties=document.getElementById('layoutPropertiesPanel'),layout=document.querySelector('.layout');
  // The memo body is created later; inherit the same clearance from its layout.
  if(properties&&layout)layout.style.setProperty('--desktop-scroll-clearance',getComputedStyle(properties).getPropertyValue('--desktop-scroll-clearance'));
 }
 desktop.addEventListener('change',update);window.addEventListener('resize',update);update();
})();
