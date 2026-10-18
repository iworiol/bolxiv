(()=>{
 const desktop=matchMedia('(min-width:851px)'),host=document.getElementById('contentPanel'),properties=document.getElementById('toggleLayoutProperties');
 const memo=document.createElement('details');memo.className='phase-memo';memo.id='phaseMemo';
 memo.innerHTML='<summary><span class="phase-memo-caption">フェーズノート</span><span class="phase-memo-preview"></span></summary><div class="phase-memo-body"><div class="phase-memo-phase"></div><textarea aria-label="フェーズノート" placeholder="対象者・移動先・注意点などを自由に記入"></textarea></div>';
 host.append(memo);
 const input=memo.querySelector('textarea'),preview=memo.querySelector('.phase-memo-preview'),phase=memo.querySelector('.phase-memo-phase');
 const reading=document.createElement('div');reading.className='phase-memo-reading';reading.hidden=true;input.after(reading);
 let session=null,restorePropertiesAfterMemo=false,phoneReading=false,phoneNoteOpen=false;
 let lastNoteContent=activeContent,lastNotePage=data.page,lastNoteGroup=data.activePhaseGroup,groupMemoState=null;
 function sync(){
  const phaseChanged=lastNoteContent!==activeContent||lastNotePage!==data.page||lastNoteGroup!==data.activePhaseGroup;
  lastNoteContent=activeContent;lastNotePage=data.page;lastNoteGroup=data.activePhaseGroup;
  const groupSelected=!!data.activePhaseGroup,enteringGroup=groupSelected&&groupMemoState===null;
  memo.querySelector('.phase-memo-caption').textContent=groupSelected?'グループノート':'フェーズノート';
  if(enteringGroup)groupMemoState={open:memo.open,phoneNoteOpen};
  const value=groupSelected?'そう、証明よ。':data.pageNotes?.[data.page]||'';
  const phone=!desktop.matches;
  const nextPhoneReading=phone&&boardReadOnly;
  if(nextPhoneReading!==phoneReading){
   if(phoneReading)phoneNoteOpen=memo.open;
   phoneReading=nextPhoneReading;
   if(phoneReading)memo.open=phoneNoteOpen;
  }

  memo.hidden=false;
  const readingOnly=groupSelected||boardReadOnly||(desktop.matches&&phaseComparisonActive());
  input.hidden=readingOnly;reading.hidden=!readingOnly;
  const compareMemos=desktop.matches&&phaseComparisonActive();
  const memoKey=JSON.stringify(compareMemos?selectedPhaseIndexes.map(index=>[index,data.pageNames[index],data.pageNotes?.[index]||'']):[value]);
  if(reading.dataset.memoKey!==memoKey){
   const scroll=reading.scrollTop;reading.replaceChildren();reading.classList.toggle('memo-empty',!compareMemos&&!value.trim());
   if(compareMemos){
    for(const index of selectedPhaseIndexes){
     const section=document.createElement('section'),heading=document.createElement('div'),text=document.createElement('div');
     section.className='phase-memo-entry';heading.className='phase-memo-entry-title';text.className='phase-memo-entry-text';
     heading.textContent=String(index+1).padStart(2,'0')+' '+(data.pageNames[index]||'');
     const note=data.pageNotes?.[index]||'';text.textContent=note.trim()?note:'ノートはありません';text.classList.toggle('memo-empty',!note.trim());
     section.append(heading,text);reading.append(section);
    }
   }else reading.textContent=value.trim()?value:'ノートはありません';
   reading.dataset.memoKey=memoKey;reading.scrollTop=scroll;
  }
  if(input.value!==value)input.value=value;
  if(phaseChanged){reading.scrollTop=0;input.scrollTop=0}
  input.readOnly=groupSelected||boardReadOnly||phaseComparisonActive();
  input.setAttribute('aria-label','フェーズ'+String(data.page+1).padStart(2,'0')+'のノート');
  phase.textContent=groupSelected?'グループ：'+(data.phaseGroups?.find(group=>group.id===data.activePhaseGroup)?.name||''):String(data.page+1).padStart(2,'0')+' '+(data.pageNames[data.page]||'');phase.title=phase.textContent;
  preview.textContent=value.trim().replace(/\s+/g,' ')||'未記入';const summary=memo.querySelector('summary');summary.title=phase.textContent+'\nフェーズノートを開閉'+(value?'\n'+value:'\nノートは未記入です');preview.title=summary.title;
  if(enteringGroup)memo.open=true;
  else if(!groupSelected&&groupMemoState!==null){memo.open=groupMemoState.open;phoneNoteOpen=groupMemoState.phoneNoteOpen;groupMemoState=null}
  if(session&&(session.board!==data||session.page!==data.page))session=null;
 }
 function closeProperties(){if(memo.dataset.sidebarManaged==='true')return;if(desktop.matches&&memo.open&&properties.getAttribute('aria-expanded')==='true'){restorePropertiesAfterMemo=true;properties.onclick({currentTarget:properties})}}
 memo.open=desktop.matches&&viewSettings.phaseMemoExpanded===true;
 memo.addEventListener('toggle',()=>{
  if(phoneReading){phoneNoteOpen=memo.open;return}
  if(!desktop.matches)return;
  if(memo.dataset.sidebarManaged==='true')return;
  if(memo.open)closeProperties();
  else{
   if(restorePropertiesAfterMemo&&properties.getAttribute('aria-expanded')!=='true')properties.onclick({currentTarget:properties});
   restorePropertiesAfterMemo=false;
  }
  rememberViewSetting('phaseMemoExpanded',memo.open);
 });
 properties.addEventListener('click',()=>{if(desktop.matches&&properties.getAttribute('aria-expanded')==='true')memo.open=false});
 input.addEventListener('focus',()=>{session={board:data,page:data.page,before:JSON.stringify(data),started:false}});
 input.addEventListener('blur',()=>{session=null;sync()});
 input.addEventListener('input',()=>{
  if(data.activePhaseGroup||boardReadOnly||phaseComparisonActive()){sync();return}
  if(input.value===(data.pageNotes?.[data.page]||''))return;
  if(!session||session.board!==data||session.page!==data.page)session={board:data,page:data.page,before:JSON.stringify(data),started:false};
  const startsHistory=!session.started;
  if(startsHistory){recordHistory(session.before);session.started=true}
  data.pageNotes??=data.pages.map(()=>'');data.pageNotes[data.page]=input.value;
  if(startsHistory)updateHistoryButtons();
  scheduleNoteSave();
 });
 const renderBeforeMemo=render;render=function(){renderBeforeMemo();sync()};
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 desktop.addEventListener('change',()=>{
  if(memo.dataset.sidebarManaged==='true'){sync();return}
  if(desktop.matches)closeProperties();
  else if(memo.open&&properties.getAttribute('aria-expanded')!=='true')properties.onclick({currentTarget:properties});
  sync();
 });
 closeProperties();sync();
})();
