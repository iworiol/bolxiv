(function clearPhoneButtonHover(){
 const mobile=matchMedia('(max-width:850px)');
 function update(){document.documentElement.classList.toggle('phone-touch-mode',mobile.matches)}
 mobile.addEventListener('change',update);update();
 document.addEventListener('click',event=>{
  if(!mobile.matches)return;const button=event.target.closest('button');
  if(button)requestAnimationFrame(()=>{if(document.activeElement===button)button.blur()});
 });
})();
