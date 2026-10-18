(function disablePhonePinchZoom(){
 const mobile=matchMedia('(max-width:850px)');
 function preventPinch(event){if(mobile.matches&&event.touches.length>1&&event.cancelable)event.preventDefault()}
 document.addEventListener('touchstart',preventPinch,{passive:false,capture:true});
 document.addEventListener('touchmove',preventPinch,{passive:false,capture:true});
 for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,event=>{if(mobile.matches&&event.cancelable)event.preventDefault()},{passive:false,capture:true});
})();
