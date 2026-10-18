(()=>{
 const desktop=matchMedia('(min-width:851px)'),header=document.querySelector('.app>.top'),layout=document.querySelector('.layout'),phasePane=layout.querySelector(':scope>.right>.layer-group');
 let frame=0;
 function update(){frame=0;if(!desktop.matches)return;const left=Math.max(0,phasePane.getBoundingClientRect().left-header.getBoundingClientRect().left+header.scrollLeft)+'px';if(header.style.getPropertyValue('--phase-pane-header-left')!==left)header.style.setProperty('--phase-pane-header-left',left);const right=Math.max(0,header.getBoundingClientRect().right-phasePane.getBoundingClientRect().right)+'px';if(header.style.getPropertyValue('--phase-pane-header-right')!==right)header.style.setProperty('--phase-pane-header-right',right);const menu=header.querySelector('.phone-menu-toggle');if(menu){const menuRight=header.getBoundingClientRect().right-menu.getBoundingClientRect().right+'px';if(header.style.getPropertyValue('--header-menu-right')!==menuRight)header.style.setProperty('--header-menu-right',menuRight)}}
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 const resize=new ResizeObserver(schedule);for(const node of [layout,phasePane,layout.querySelector(':scope>.battle'),layout.querySelector(':scope>.left')])if(node)resize.observe(node);
 new MutationObserver(schedule).observe(layout,{attributes:true,attributeFilter:['class','style']});
 window.addEventListener('resize',schedule);desktop.addEventListener('change',schedule);schedule();
})();
