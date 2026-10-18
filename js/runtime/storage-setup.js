// Initialization stage: storage-setup. Load order is owned by bolxiv.js.
let boardSaveCheckpoint=null;

const boardSaveDelay=500,boardSaveMaxWait=3000,phaseSaveDelay=2000,phaseSaveMaxWait=10000;

const noteSaveDelay=2000,noteSaveMaxWait=3000;

let boardSaveNoteOnly=false,boardSaveCheckpointDirty=false,boardSavePropertyOnly=false;

let objectPropertyInputActive=false;

for(const type of ['input','change','keydown'])document.addEventListener(type,event=>{if(event.target instanceof Element&&event.target.closest('#inspector .coordinate-control,#layoutPropertiesPanel .coordinate-control,#inspector .color-picker,#layoutPropertiesPanel .color-picker')){objectPropertyInputActive=true;queueMicrotask(()=>{objectPropertyInputActive=false})}},true);

let boardSavePending=false,boardSaveNavigationOnly=false,boardSaveDelayTimer=null,boardSaveMaxTimer=null;

for(const type of ['pointerup','pointercancel','change','focusout'])document.addEventListener(type,event=>{
 if(boardSavePropertyOnly&&event.target instanceof Element&&(event.target.closest('#undo,#redo')||type!=='focusout'&&event.target.closest('#inspector .coordinate-control,#layoutPropertiesPanel .coordinate-control,#inspector .color-picker,#layoutPropertiesPanel .color-picker')))return;
 if(boardSaveNoteOnly&&(type==='pointerup'||type==='pointercancel')&&event.target instanceof Element&&event.target.closest('#phaseMemo textarea'))return;
 queueMicrotask(()=>{if(!boardSaveNavigationOnly)flushScheduledBoardSave()});
},true);

window.addEventListener('pagehide',flushScheduledBoardSave);

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushScheduledBoardSave()});
