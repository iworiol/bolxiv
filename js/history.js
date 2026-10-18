// history: shared function declarations; initialized by bolxiv.js in the documented order.
function storeContentHistory(){commitPendingHistory();pendingHistoryState=null;pendingHistoryOwner=null;contentHistoryStore.set(data,{history,future});}

function restoreContentHistory(){pendingHistoryState=null;pendingHistoryOwner=null;const saved=contentHistoryStore.get(data);history=saved?saved.history:[];future=saved?saved.future:[];}

function snapshot(){recordHistory();render()}

function historySnapshot(state){
 if(typeof state!=='string')return state;
 if(historySnapshotCache.has(state))return historySnapshotCache.get(state);
 const parsed=JSON.parse(state);historySnapshotCache.set(state,parsed);
 if(historySnapshotCache.size>8)historySnapshotCache.delete(historySnapshotCache.keys().next().value);
 return parsed;
}

function sameHistoryState(a,b){if(a===b)return true;const left=historySnapshot(a),right=historySnapshot(b),keys=Object.keys(left).filter(key=>key!=='page'),other=Object.keys(right).filter(key=>key!=='page');return keys.length===other.length&&keys.every(key=>Object.hasOwn(right,key)&&sameBoardSaveState(left[key],right[key]))}

function finishNumericHistoryGesture(){const gesture=numericHistoryGesture;numericHistoryGesture=null;if(!gesture)return;delete gesture.spin.dataset.historyPushed;if(gesture.board===data&&gesture.recorded)updateHistoryButtons()}

function startNumericHistoryGesture(spin,kind,id){
 if(numericHistoryGesture?.spin===spin&&numericHistoryGesture.board===data&&numericHistoryGesture.kind===kind&&numericHistoryGesture.id===id)return;
 finishNumericHistoryGesture();numericHistoryGesture={spin,kind,id,board:data,recorded:false};
}

function recordHistory(state){
 const gesture=numericHistoryGesture;
 if(gesture?.board===data&&gesture.recorded)return;
 state??=JSON.stringify(data);if(gesture?.board===data)gesture.recorded=true;
 commitPendingHistory(state);pendingHistoryState=state;pendingHistoryOwner=data;updateHistoryButtons(state);
}

function commitPendingHistory(currentState){if(phaseComparisonRendering||pendingHistoryState===null)return;if(pendingHistoryOwner!==data){pendingHistoryState=null;pendingHistoryOwner=null;return}if(sameHistoryState(pendingHistoryState,currentState??JSON.stringify(data)))return;if(!history.length||!sameHistoryState(history[history.length-1],pendingHistoryState))history.push(pendingHistoryState);if(history.length>100)history.shift();future=[];pendingHistoryState=null;pendingHistoryOwner=null;}

function historyActionLabel(beforeState,afterState){
 const cacheable=typeof beforeState==='string'&&typeof afterState==='string';
 if(cacheable){const cached=historyLabelCache.find(entry=>entry.before===beforeState&&entry.after===afterState);if(cached)return cached.label;}
 const before=historySnapshot(beforeState),after=historySnapshot(afterState),labels=[];
 const changed=(a,b)=>!sameBoardSaveState(a,b);
 if(before.title!==after.title)labels.push('コンテンツ名の変更');
 if(before.pages.length!==after.pages.length)labels.push(after.pages.length>before.pages.length?'フェーズの追加':'フェーズの削除');
 else{
 const fields=[['pageNotes','フェーズノートの変更'],['pageNames','フェーズ名の変更'],['pageBoardShapes','フィールド形状の変更'],['pageFieldSizes','フィールドサイズの変更'],['pageFieldBackgroundColors','フィールド背景色の変更'],['pageColors','キャンバス背景色の変更'],['pageFieldImageIds','フィールド画像の変更'],['pageFieldImageTints','フィールド画像の色調補正']];
 for(const [key,label] of fields)if(changed(before[key],after[key]))labels.push(label);
 const oldObjects=new Map(before.pages.flat().map(o=>[o.id,o])),newObjects=new Map(after.pages.flat().map(o=>[o.id,o]));
 if([...newObjects.keys()].some(id=>!oldObjects.has(id)))labels.push('オブジェクトの追加');
 if([...oldObjects.keys()].some(id=>!newObjects.has(id)))labels.push('オブジェクトの削除');
 const groups=[['オブジェクトの移動',['x','y']],['オブジェクトのサイズ変更',['width','height','innerSize','fontSize']],['オブジェクトの回転',['rotation']],['オブジェクトの色変更',['color','strokeColor']],['オブジェクトの透明度変更',['opacity']],['オブジェクトの表示切替',['visible']],['オブジェクトの固定切替',['locked']],['オブジェクトの文字変更',['label']]];
 for(const [label,keys] of groups)if([...newObjects].some(([id,o])=>oldObjects.has(id)&&keys.some(k=>changed(oldObjects.get(id)[k],o[k]))))labels.push(label);
 if(!labels.length&&changed(before.pages.map(p=>p.map(o=>o.id)),after.pages.map(p=>p.map(o=>o.id))))labels.push('フェーズ・レイヤーの並べ替え');
 }
 const label=labels.length===1?labels[0]:labels.length>1?'複数の変更':'設定の変更';
 if(cacheable){historyLabelCache.push({before:beforeState,after:afterState,label});if(historyLabelCache.length>8)historyLabelCache.shift()}
 return label;
}

function historyResultMessage(beforeState,afterState,action){
 const before=historySnapshot(beforeState),after=historySnapshot(afterState);
 const shortName=(value,limit)=>{const chars=Array.from(String(value||'').replace(/\s+/g,' ').trim());return chars.length>limit?chars.slice(0,limit).join('')+'…':chars.join('')};
 const phaseName=index=>'フェーズ'+String(index+1).padStart(2,'0')+'「'+shortName(after.pageNames?.[index]||before.pageNames?.[index]||'名称未設定',16)+'」';
 let scope='コンテンツ「'+shortName(after.title||before.title||'名称未設定',20)+'」';
 if(before.title===after.title&&before.pages.length===after.pages.length){
  const keys=['pages','pageNames','pageNotes','pageBoardShapes','pageFieldSizes','pageFieldBackgroundColors','pageColors','pageFieldImageIds','pageFieldImageTints'];
  const indexes=before.pages.map((_,i)=>i).filter(i=>keys.some(key=>!sameBoardSaveState(before[key]?.[i],after[key]?.[i])));
  if(indexes.length===1)scope=phaseName(indexes[0]);
  else if(indexes.length>1)scope=indexes.length<=2?indexes.map(phaseName).join('・'):'複数フェーズ（'+indexes.length+'件）';
 }
 return scope+'：'+historyActionLabel(beforeState,afterState)+'を'+action;
}

function updateHistoryButtons(state=JSON.stringify(data)){commitPendingHistory(state);let undoButton=document.getElementById('undo'),redoButton=document.getElementById('redo');if(!undoButton||!redoButton)return;undoButton.disabled=phaseComparisonActive()||history.length===0;redoButton.disabled=phaseComparisonActive()||future.length===0;undoButton.setAttribute('aria-disabled',String(undoButton.disabled));redoButton.setAttribute('aria-disabled',String(redoButton.disabled));let undoState;for(let i=history.length-1;i>=0;i--){if(!sameHistoryState(history[i],state)){undoState=history[i];break}}const redoState=future[future.length-1];const comparison=phaseComparisonActive();undoButton.title=comparison?'並列表示中は元に戻せません':undoState?'このコンテンツの操作を元に戻す (Ctrl+Z)\n対象：'+historyActionLabel(undoState,state):'このコンテンツに元に戻せる操作はありません';redoButton.title=comparison?'並列表示中はやり直せません':redoState?'このコンテンツの操作をやり直す (Ctrl+Y)\n対象：'+historyActionLabel(state,redoState):'このコンテンツにやり直せる操作はありません';undoButton.setAttribute('aria-label',undoButton.title);redoButton.setAttribute('aria-label',redoButton.title)}

function undo(){if(boardReadOnly)return;if(phaseComparisonActive())return;commitPendingHistory();pendingHistoryState=null;pendingHistoryOwner=null;let page=data.page,currentState=JSON.stringify(data);while(history.length&&history[history.length-1]===currentState)history.pop();if(!history.length)return;future.push(currentState);const restoredState=history.pop(),message=historyResultMessage(restoredState,currentState,'元に戻しました');data=cloneBoardSaveState(historySnapshot(restoredState));data.page=Math.max(0,Math.min(page,data.pages.length-1));selected=null;selectedIds=[];contentBoards[activeContent]=data;render();scheduleObjectPropertySave();notify(message)}

function redo(){if(boardReadOnly)return;if(phaseComparisonActive())return;commitPendingHistory();pendingHistoryState=null;pendingHistoryOwner=null;if(!future.length)return;let page=data.page;const previousState=JSON.stringify(data),restoredState=future.pop(),message=historyResultMessage(previousState,restoredState,'やり直しました');history.push(previousState);data=cloneBoardSaveState(historySnapshot(restoredState));data.page=Math.max(0,Math.min(page,data.pages.length-1));selected=null;selectedIds=[];contentBoards[activeContent]=data;render();scheduleObjectPropertySave();notify(message)}
