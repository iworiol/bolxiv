(()=>{
 const trigger=document.getElementById('resetBoardZoom'),menu=document.createElement('div');menu.id='boardZoomMenu';menu.className='board-zoom-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','表示倍率');document.body.append(menu);
 trigger.title='表示倍率を選択';trigger.setAttribute('aria-label','表示倍率を選択');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-controls',menu.id);trigger.setAttribute('aria-expanded','false');
 const items=[200,150,100,75,50,25].map(value=>{const item=document.createElement('button');item.type='button';item.setAttribute('role','menuitemradio');item.dataset.zoom=String(value);item.textContent=value+'%';item.onclick=()=>{setBoardDisplayZoom(value);close(true)};menu.append(item);return item});
 function mark(){for(const item of items)item.setAttribute('aria-checked',String(Number(item.dataset.zoom)===boardDisplayZoom))}
 function close(focus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true})}
 function open(){closeColorPopovers();closeJsonExportMenu();closeJsonImportMenu();closeHelpMenu();mark();menu.hidden=false;trigger.setAttribute('aria-expanded','true');const rect=trigger.getBoundingClientRect(),height=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(rect.right-menu.offsetWidth,window.innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-height-8))+'px';menu.style.maxHeight=Math.max(36,window.innerHeight-16)+'px';(items.find(item=>item.getAttribute('aria-checked')==='true')||items[0]).focus({preventScroll:true})}
 trigger.onclick=()=>{if(menu.hidden)open();else close()};
 trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open();if(event.key==='ArrowUp')items.at(-1).focus()}});
 menu.addEventListener('keydown',event=>{const index=items.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();close(true)}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();items[(index+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(event.key==='Home'||event.key==='End'){event.preventDefault();items[event.key==='Home'?0:items.length-1].focus()}else if(event.key==='Tab')close()});
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!trigger.contains(event.target))close()},true);
 window.addEventListener('resize',()=>close());
 new MutationObserver(mark).observe(document.getElementById('boardZoomValue'),{childList:true,subtree:true,characterData:true});
})();
