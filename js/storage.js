// storage: shared function declarations; initialized by bolxiv.js in the documented order.
function persistBoardSafely(value,navigationOnly=false){return window.boardStorage.save(value,{navigationOnly,imageAssets:boardImageLibrary.entries(contentBoards)})}

function renderAndSave(){contentBoards[activeContent]=data;render();save(false,true)}

function cloneBoardSaveState(value){if(!value||typeof value!=='object')return value;if(Array.isArray(value))return value.map(cloneBoardSaveState);const copy={};for(const key of Object.keys(value))copy[key]=cloneBoardSaveState(value[key]);return copy}

function sameBoardSaveState(left,right){
 if(Object.is(left,right))return true;
 if(!left||!right||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return false;
 const keys=Object.keys(left);if(keys.length!==Object.keys(right).length)return false;
 return keys.every(key=>Object.hasOwn(right,key)&&sameBoardSaveState(left[key],right[key]));
}

function boardSaveState(){contentBoards[activeContent]=data;return {version:4,activeContent,contents:contentBoards}}

function cancelScheduledBoardSave(){clearTimeout(boardSaveDelayTimer);clearTimeout(boardSaveMaxTimer);boardSaveDelayTimer=boardSaveMaxTimer=null;boardSavePending=false;boardSaveNavigationOnly=false;boardSaveNoteOnly=false;boardSavePropertyOnly=false;}

function flushScheduledBoardSave(){
 if(!boardSavePending)return;
 const navigationOnly=boardSaveNavigationOnly,noteOnly=boardSaveNoteOnly,propertyOnly=boardSavePropertyOnly;
 cancelScheduledBoardSave();
 try{
  const state=boardSaveState();
  if(boardSaveCheckpointDirty){boardSaveCheckpoint=cloneBoardSaveState(state);boardSaveCheckpointDirty=false}
  if(noteOnly||propertyOnly)updateHistoryButtons();
  persistBoardSafely(JSON.stringify(state),navigationOnly);
 }
 catch(error){boardSavePending=true;const status=document.getElementById('saved');if(status)status.textContent='未保存';console.warn('Board serialization failed',error);notify('自動保存できません：'+(error?.message||String(error)))}
}

function scheduleBoardSave(navigationOnly=false){
 if(phaseComparisonRendering)return;
 const state=boardSaveState();
 if(boardSaveCheckpoint===null){boardSaveCheckpoint=cloneBoardSaveState(state);return}
 if(!boardSavePending&&!boardSaveCheckpointDirty&&sameBoardSaveState(boardSaveCheckpoint,state))return;
 // The immutable checkpoint is refreshed once at flush, not for every drag event.
 boardSaveCheckpointDirty=true;
 // Navigation must not postpone an outstanding note edit.
 if(navigationOnly&&boardSavePending&&(boardSaveNoteOnly||boardSavePropertyOnly))return;
 boardSaveNoteOnly=false;boardSavePropertyOnly=false;
 boardSaveNavigationOnly=navigationOnly&&(!boardSavePending||boardSaveNavigationOnly);
 boardSavePending=true;
 const status=document.getElementById('saved');if(status&&!boardSaveNavigationOnly)status.textContent='未保存の変更あり';
 clearTimeout(boardSaveDelayTimer);boardSaveDelayTimer=setTimeout(flushScheduledBoardSave,boardSaveNavigationOnly?phaseSaveDelay:boardSaveDelay);
 if(boardSaveMaxTimer===null)boardSaveMaxTimer=setTimeout(flushScheduledBoardSave,boardSaveNavigationOnly?phaseSaveMaxWait:boardSaveMaxWait);
}

function scheduleObjectPropertySave(){
 if(phaseComparisonRendering)return;
 contentBoards[activeContent]=data;boardSaveCheckpointDirty=true;
 const propertyOnly=!boardSavePending||boardSaveNavigationOnly||boardSavePropertyOnly;
 if(boardSavePending&&boardSaveNavigationOnly){clearTimeout(boardSaveDelayTimer);clearTimeout(boardSaveMaxTimer);boardSaveDelayTimer=boardSaveMaxTimer=null}
 boardSavePending=true;boardSaveNavigationOnly=false;boardSaveNoteOnly=false;boardSavePropertyOnly=propertyOnly;
 const status=document.getElementById('saved');if(status&&status.textContent!=='未保存の変更あり')status.textContent='未保存の変更あり';
 clearTimeout(boardSaveDelayTimer);boardSaveDelayTimer=setTimeout(flushScheduledBoardSave,boardSaveDelay);
 if(boardSaveMaxTimer===null)boardSaveMaxTimer=setTimeout(flushScheduledBoardSave,boardSaveMaxWait);
}

function scheduleNoteSave(){
 if(phaseComparisonRendering)return;
 contentBoards[activeContent]=data;
 boardSavePropertyOnly=false;
 boardSaveCheckpointDirty=true;
 const noteOnly=!boardSavePending||boardSaveNavigationOnly||boardSaveNoteOnly;
 if(boardSavePending&&boardSaveNavigationOnly){clearTimeout(boardSaveDelayTimer);clearTimeout(boardSaveMaxTimer);boardSaveDelayTimer=boardSaveMaxTimer=null}
 boardSavePending=true;boardSaveNavigationOnly=false;boardSaveNoteOnly=noteOnly;
 const status=document.getElementById('saved');if(status&&status.textContent!=='未保存の変更あり')status.textContent='未保存の変更あり';
 if(!noteOnly)return;
 clearTimeout(boardSaveDelayTimer);boardSaveDelayTimer=setTimeout(flushScheduledBoardSave,noteSaveDelay);
 if(boardSaveMaxTimer===null)boardSaveMaxTimer=setTimeout(flushScheduledBoardSave,noteSaveMaxWait);
}

function save(navigationOnly=false,historyFresh=false){if(phaseComparisonRendering)return;if(objectPropertyInputActive&&!navigationOnly){scheduleObjectPropertySave();return}if(!historyFresh)updateHistoryButtons();for(let o of current()){if(o.type==='targetcircle'){let el=Array.from(layer.children).find(node=>node.dataset.id===o.id);if(el)refreshTargetCircleTriangle(o,el)}}contentBoards[activeContent]=data;updateContentSelector();scheduleBoardSave(navigationOnly)}

function rememberViewSetting(key,value){viewSettings[key]=value;try{localStorage.setItem(viewSettingsKey,JSON.stringify(viewSettings))}catch{}}
