(()=>{
 const pane=document.querySelector('.left');
 function clear(){pane.querySelectorAll('.palette-dragging').forEach(button=>button.classList.remove('palette-dragging'))}
 pane.addEventListener('dragstart',e=>{
 clear();const button=e.target.closest('.tool[data-tool],.icon-choice');if(!button)return;button.classList.add('palette-dragging');
 const artwork=button.querySelector('img,.glyph');if(!artwork||!e.dataTransfer)return;
 const preview=document.createElement('div');preview.style.cssText='position:fixed;left:-10000px;top:0;width:48px;height:48px;display:grid;place-items:center;background:transparent;border:0;box-shadow:none;pointer-events:none;';
 const clone=artwork.cloneNode(true);clone.style.cssText='display:grid;place-items:center;width:48px;height:48px;max-width:none;max-height:none;background:transparent;border:0;box-shadow:none;color:#f39c12;font-size:32px;';
 const svg=clone.querySelector('svg');if(svg){svg.style.width='48px';svg.style.height='48px'}preview.append(clone);document.body.append(preview);e.dataTransfer.setDragImage(preview,24,24);setTimeout(()=>preview.remove(),0);
});
 document.addEventListener('dragend',clear);document.addEventListener('drop',clear);window.addEventListener('blur',clear);
})();
