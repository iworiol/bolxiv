// Initialization stage: history-setup. Load order is owned by bolxiv.js.
let pendingHistoryState=null,pendingHistoryOwner=null;

const historySnapshotCache=new Map();

let numericHistoryGesture=null;

document.addEventListener('pointerdown',event=>{
 const spin=event.target.closest?.('.coordinate-control input[type="number"]');
 if(spin)startNumericHistoryGesture(spin,'pointer',event.pointerId);else finishNumericHistoryGesture();
},true);

for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{if(numericHistoryGesture?.kind==='pointer'&&numericHistoryGesture.id===event.pointerId)queueMicrotask(finishNumericHistoryGesture)},true);

document.addEventListener('keydown',event=>{
 const spin=event.target.closest?.('.coordinate-control input[type="number"]');
 if(!spin||!['ArrowUp','ArrowDown'].includes(event.key))return;
 if(!event.repeat)finishNumericHistoryGesture();startNumericHistoryGesture(spin,'key',event.key);
},true);

document.addEventListener('keyup',event=>{if(numericHistoryGesture?.kind==='key'&&event.key===numericHistoryGesture.id)finishNumericHistoryGesture()},true);

window.addEventListener('blur',finishNumericHistoryGesture);

const historyLabelCache=[];
