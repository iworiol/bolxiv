(function setupEditMode(){
 const button=document.getElementById('editModeToggle'),disabledForView=new Set();
 function syncControls(){
  if(!boardReadOnly){for(const node of disabledForView)node.disabled=false;disabledForView.clear();return}
  for(const node of document.querySelectorAll(readOnlyEditTargets+',#objectList button,#inspector input,#inspector select,#inspector button')){
   if(!node.matches('button,input,select,textarea')||node.disabled)continue;
   node.disabled=true;disabledForView.add(node);
  }
  for(const node of disabledForView)if(!node.isConnected)disabledForView.delete(node);
 }
 const observer=new MutationObserver(syncControls);observer.observe(document.querySelector('.app'),{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});
 function update(){document.body.classList.toggle('board-read-only',boardReadOnly);updateModeStatus();syncControls()}
 document.addEventListener('board-view-mode-changed',update);
 button.onclick=()=>{
  document.activeElement?.blur();if(phaseComparisonActive()){selectedPhaseIndexes=[];boardReadOnly=false}else boardReadOnly=!boardReadOnly;
  try{localStorage.setItem('bolxiv-read-only',String(boardReadOnly))}catch{}
  selected=null;selectedIds=[];drag=null;tapPlacementArmed=false;selectPlacementTool('select');hideTouchPlacementPreview();clearAlignmentGuides();closeObjectContextMenu();closeColorPopovers();closeJsonImportMenu();
  update();render();
 };
 update();
})();
