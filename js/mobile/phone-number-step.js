(()=>{
 const selector='.coordinate-control input[type="number"]';
 function sync(){
  document.querySelectorAll(selector).forEach(spin=>{
   let group=spin.parentElement.querySelector('.phone-number-step-buttons');
   if(!group){
    group=document.createElement('span');group.className='phone-number-step-buttons';
    const label=spin.getAttribute('aria-label')||'数値';
    for(const [symbol,key,description] of [['−','ArrowDown','減らす'],['＋','ArrowUp','増やす']]){
     const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=symbol;
     button.setAttribute('aria-label',label+'を'+description);button.title=label+'を'+description;
     button.onpointerdown=event=>event.preventDefault();
     button.onclick=()=>{if(spin.disabled)return;spin.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}))};
     group.appendChild(button);
    }
    spin.after(group);
   }
   group.querySelectorAll('button').forEach(button=>{if(button.disabled!==spin.disabled)button.disabled=spin.disabled});
  });
 }
 sync();
 const originalRenderInspector=renderInspector;
 const selectionKey=()=>JSON.stringify([activeContent,data.page,selectedIds]);
 let previousSelection=selectionKey();
 renderInspector=function(){
  const key=selectionKey(),preserve=matchMedia('(max-width:850px)').matches&&key===previousSelection,positions=[];
  if(preserve){for(let node=document.getElementById('inspector');node;node=node.parentElement)positions.push({node,top:node.scrollTop,left:node.scrollLeft})}
  const result=originalRenderInspector.apply(this,arguments);
  sync();
  for(const position of positions){position.node.scrollTop=position.top;position.node.scrollLeft=position.left}
  previousSelection=key;
  return result;
 };
 new MutationObserver(records=>{
  if(records.some(record=>record.type==='childList'||record.target.matches?.(selector)))sync();
 }).observe(document.querySelector('.layout'),{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
})();
