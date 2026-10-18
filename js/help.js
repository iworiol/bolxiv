// help: shared function declarations; initialized by bolxiv.js in the documented order.
function closeHelpMenu(restoreFocus=false){helpMenu.hidden=true;document.getElementById('operationGuideBtn').setAttribute('aria-expanded','false');if(restoreFocus)document.getElementById('operationGuideBtn').focus()}

function showDeletionDialog(id,message){const dialog=document.getElementById(id);dialog.querySelector('p').textContent=message;dialog.showModal()}

function positionToast(){
 const toast=$('#toast'),viewport=stage.closest('.object-layout-rect');
 if(!toast?.classList.contains('show')||!viewport)return;
 const rect=viewport.getBoundingClientRect(),left=Math.max(0,rect.left),right=Math.min(window.innerWidth,rect.right),top=Math.max(0,rect.top),bottom=Math.min(window.innerHeight,rect.bottom);
 if(right<=left||bottom<=top)return;
 const width=Math.max(0,right-left-24);
 toast.style.maxWidth=width+'px';
 toast.style.left=(left+right)/2+'px';
 toast.style.bottom='auto';
 toast.style.top=(top+12)+'px';
}

function notify(s,names=[]){
 let t=$('#toast');document.body.appendChild(t);const message=String(s).trimEnd().replace(/。*$/,'。'),ranges=[];
 for(const match of message.matchAll(/「([^」]+)」/g))ranges.push([match.index+1,match.index+1+match[1].length]);
 for(const name of names){if(!name)continue;let from=0,at;while((at=message.indexOf(name,from))>=0){ranges.push([at,at+name.length]);from=at+name.length}}
 t.replaceChildren();let from=0;for(const [start,end] of ranges.sort((a,b)=>a[0]-b[0]||b[1]-a[1])){if(start<from)continue;t.append(document.createTextNode(message.slice(from,start)));const span=document.createElement('span');span.className='toast-name';span.textContent=message.slice(start,end);t.append(span);from=end}t.append(document.createTextNode(message.slice(from)));t.classList.add('show');positionToast();
 if(!positionToast.watching){
  positionToast.watching=true;
  let frame=0;const schedule=()=>{if(!frame&&t.classList.contains('show'))frame=requestAnimationFrame(()=>{frame=0;positionToast()})};
  const resize=new ResizeObserver(schedule);resize.observe(t);const viewport=stage.closest('.object-layout-rect');if(viewport)resize.observe(viewport);resize.observe(document.querySelector('.layout'));
  new MutationObserver(schedule).observe(document.querySelector('.layout'),{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','data-phone-pane']});
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);window.visualViewport?.addEventListener('resize',schedule);
 }
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4000);
}
