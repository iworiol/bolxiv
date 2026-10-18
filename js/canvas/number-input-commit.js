(()=>{
 const states=new WeakMap();let applying=false;
 const isSpin=node=>node?.matches?.('.coordinate-control input[type="number"]');
 function state(spin){if(!states.has(spin))states.set(spin,{saved:spin.value,dirty:false,stepping:false});return states.get(spin)}
 function restore(spin){const current=state(spin);spin.value=current.saved;current.dirty=false}
 function commit(spin){
  const current=state(spin);if(!current.dirty)return;
  if(!spin.value.trim()||!Number.isFinite(Number(spin.value))){restore(spin);return}
  let value=Number(spin.value);
  if(spin.min!=='')value=Math.max(Number(spin.min),value);
  if(spin.max!=='')value=Math.min(Number(spin.max),value);
  spin.value=String(value);current.dirty=false;
  if(spin.closest('#inspector')&&spin.value!==current.saved&&!spin.dataset.historyPushed){recordHistory();spin.dataset.historyPushed='true'}
  applying=true;
  try{spin.dispatchEvent(new Event('input',{bubbles:true}));spin.dispatchEvent(new Event('change',{bubbles:true}))}
  finally{applying=false;current.saved=spin.value}
 }
 document.addEventListener('focusin',event=>{if(isSpin(event.target)){const current=state(event.target);current.saved=event.target.value;current.dirty=false}},true);
 document.addEventListener('pointerdown',event=>{
  if(!isSpin(event.target))return;
  const spin=event.target,current=state(spin),rect=spin.getBoundingClientRect();
  current.stepping=event.clientX>=rect.right-20;
 },true);
 document.addEventListener('pointerup',()=>{document.querySelectorAll('.coordinate-control input[type="number"]').forEach(spin=>state(spin).stepping=false)},true);
 document.addEventListener('input',event=>{
  if(applying||!isSpin(event.target))return;
  const current=state(event.target);current.dirty=true;
  event.stopImmediatePropagation();
  if(current.stepping)commit(event.target);
 },true);
 document.addEventListener('change',event=>{
  if(applying||!isSpin(event.target))return;
  event.stopImmediatePropagation();commit(event.target);
 },true);
 document.addEventListener('blur',event=>{if(isSpin(event.target)&&!applying)commit(event.target)},true);
 document.addEventListener('keydown',event=>{
  if(!isSpin(event.target)||!['Enter','Escape','ArrowUp','ArrowDown'].includes(event.key))return;
  const spin=event.target,current=state(spin);
  event.preventDefault();event.stopImmediatePropagation();
  if(event.key==='Escape'){restore(spin);return}
  if(event.key==='Enter'){commit(spin);return}
  if(!spin.value.trim()||!Number.isFinite(Number(spin.value)))restore(spin);
  if(event.key==='ArrowUp')spin.stepUp();else spin.stepDown();
  current.dirty=true;commit(spin);
 },true);
})();
