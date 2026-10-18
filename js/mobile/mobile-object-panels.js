(function syncPhoneObjectPanels(){
 const mobile=matchMedia('(max-width:850px)'),layers=document.getElementById('toggleLayers'),objects=document.getElementById('toggleInspector');let syncing=false;
 function sync(source,target){if(!mobile.matches||syncing)return;if(source.getAttribute('aria-expanded')===target.getAttribute('aria-expanded'))return;syncing=true;try{target.click()}finally{syncing=false}}
 layers.addEventListener('click',()=>sync(layers,objects));objects.addEventListener('click',()=>sync(objects,layers));
 mobile.addEventListener('change',()=>sync(layers,objects));sync(layers,objects);
})();
