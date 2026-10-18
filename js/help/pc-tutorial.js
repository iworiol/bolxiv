(()=>{
 const desktop=matchMedia('(min-width:851px)');
 const menuButton=document.createElement('button');menuButton.type='button';menuButton.setAttribute('role','menuitem');menuButton.dataset.helpAction='tutorial';menuButton.textContent='チュートリアル';helpMenu.querySelector('[data-help-action="guide"]').after(menuButton);
 const intro=document.createElement('dialog');intro.id='tutorialIntro';intro.setAttribute('aria-labelledby','tutorialIntroTitle');
 intro.innerHTML='<h2 id="tutorialIntroTitle">小さな攻略図を作ってみよう</h2><p>配置・サイズ調整・移動・フェーズコピー・ノート・元に戻すを、約3分で試せます。</p><p>練習専用のコンテンツを追加します。終了すると練習データを削除し、練習を始める前の画面に戻ります。</p><div class="tutorial-intro-actions"><button type="button" id="tutorialCancel">キャンセル</button><button type="button" id="tutorialStart" class="tutorial-primary">練習を始める</button></div>';document.body.append(intro);
 const panel=document.createElement('section');panel.id='pcTutorial';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','PCチュートリアル');
 panel.innerHTML='<div class="tutorial-progress" id="tutorialProgress"></div><h2 id="tutorialTitle"></h2><p id="tutorialInstruction"></p><p id="tutorialStatus" role="status" aria-live="polite"></p><div class="tutorial-footer"><button type="button" id="tutorialExit">途中で終了</button><button type="button" id="tutorialNext" class="tutorial-primary">次へ</button></div>';document.body.append(panel);
 const highlight=document.createElement('div');highlight.id='tutorialHighlight';highlight.hidden=true;highlight.setAttribute('aria-hidden','true');document.body.append(highlight);
 const get=id=>document.getElementById(id);let session=null,timer=null;
 const practice=()=>session&&data.tutorialPracticeId===session.id;
 const circle=()=>practice()?current().find(item=>item.type==='circle'):null;
 const steps=[
  {title:'円範囲を配置する',text:'左の「AoE」で円範囲をクリックし、キャンバスをクリックして配置してください。',target:()=>document.querySelector('.left .tool[data-tool="circle"] .glyph'),done:()=>!!circle()},
  {title:'サイズを変える',text:'円範囲をクリックして選び、右側のプロパティで「サイズ」を150px以上にしてください。スライダーでも数値入力でも変更できます。',target:()=>get('widthSpin')||document.querySelector('#objects .obj'),done:()=>!!circle()&&circle().width>=150},
  {title:'矢印キーで移動する',text:'キャンバス上の円範囲をクリックして選び、上下左右キーで動かしてください。数値欄を入力中なら、先に円範囲をクリックします。',target:()=>document.querySelector('#objects .obj'),enter:()=>{const item=circle();session.position=item?{x:item.x,y:item.y}:null},done:()=>{const item=circle();return !!item&&!!session.position&&(Math.abs(item.x-session.position.x)>.001||Math.abs(item.y-session.position.y)>.001)}},
  {title:'フェーズをコピーする',text:'フェーズリスト見出し右側のコピーを押し、「このコンテンツにコピー」を選んでください。配置と設定を引き継いだ次のフェーズを作れます。',target:()=>get('copyPage'),enter:()=>{session.sourcePage=data.page;session.sourceId=circle()?.id},done:()=>data.pages.length>=2&&data.page!==session.sourcePage&&!!circle()&&circle().id!==session.sourceId},
  {title:'ノートを残す',text:'右側の「フェーズノート」を開き、「ここで集合」など短いメモを入力してください。ノートはフェーズごとに保存されます。',target:()=>get('phaseMemo').open?get('phaseMemo').querySelector('textarea'):get('phaseMemo').querySelector('summary'),done:()=>!!data.pageNotes?.[data.page]?.trim()},
  {title:'元に戻す・やり直す',text:'ノート欄の外をクリックし、左上の「元に戻す」、続けて「やり直す」を押してください。入力したノートが戻れば完了です。',target:()=>get(session.sawUndo?'redo':'undo'),enter:()=>{session.note=data.pageNotes[data.page];session.notePage=data.page;session.sawUndo=false},done:()=>{const note=data.pageNotes?.[session.notePage]||'';if(note!==session.note)session.sawUndo=true;return session.sawUndo&&note===session.note}}
 ];
 const mobileSteps=[
  {...steps[0],text:'「マテリアル」を開き、「AoE」の円範囲をタップします。一覧の外をタップして閉じ、キャンバスの空いている場所をタップして配置してください。',target:()=>document.querySelector('.layout').classList.contains('phone-materials-open')?document.querySelector('.left .tool[data-tool="circle"]'):document.querySelector('.phone-material-pin')},
  {...steps[1],enter:()=>{const item=circle();if(item){selected=item.id;selectedIds=[item.id];renderSelectionOnly()}const host=get('objectLayerPanel');if(host.dataset.objectTab!=='properties')get('toggleLayers').parentElement.querySelector('.phone-object-tabs button').click();if(get('toggleInspector').getAttribute('aria-expanded')!=='true')get('toggleInspector').click()},text:'円範囲をタップして選び、画面下の「プロパティ」でサイズのスライダーを右へ動かし、150px以上にします。「リスト」が表示中なら切り替えボタン、「＋」ならそれを押して欄を開いてください。',target:()=>get('widthInput')?.getClientRects().length?get('widthInput'):document.querySelector('.phone-object-tabs button')},
  {...steps[2],title:'指で移動する',text:'円範囲を指でドラッグして、別の場所へ動かしてください。',target:()=>document.querySelector('#objects .obj')},
  {...steps[3],text:'キャンバス左側の矢印からコンテンツを開き、フェーズリスト見出しのコピーから「このコンテンツにコピー」をタップしてください。',target:()=>document.querySelector('.layout').classList.contains('phone-content-open')?get('copyPage'):document.querySelector('.phone-content-icon')},
  {...steps[4],text:'コンテンツ内の「プロパティ／ノート」を切り替えてノートを開き、「ここで集合」など短いメモを入力してください。「＋」で欄を開けます。',target:()=>get('phaseMemo').getClientRects().length?get('phaseMemo').querySelector('textarea'):get('phonePhaseSwitch-toggle')},
  {...steps[5],text:'キーボードとコンテンツを閉じ、「元に戻す」、続けて「やり直す」をタップしてください。ノートが元どおりになれば完了です。',target:()=>document.querySelector('.layout').classList.contains('phone-content-open')?document.querySelector('.phone-content-close'):get(session.sawUndo?'redo':'undo')}
 ];
 let activeSteps=steps;
 function animateHighlight(){
  if(!session)return;
  tick();timer=requestAnimationFrame(animateHighlight);
 }
 function focusStep(){get('tutorialTitle').focus({preventScroll:true})}
 function showStep(){
  if(!session)return;const step=activeSteps[session.step];highlight.hidden=true;
  document.body.classList.toggle('tutorial-content-step',!desktop.matches&&(session.step===3||session.step===4));
  get('tutorialTitle').tabIndex=-1;
  get('tutorialProgress').textContent=step?'ステップ '+(session.step+1)+' / '+activeSteps.length:'練習完了';
  get('tutorialTitle').textContent=step?step.title:'ひと通り操作できました';
  get('tutorialInstruction').textContent=step?step.text:'編集データはブラウザー内に自動保存されます。大切な作戦はメニューの「エクスポート」からJSONでも保存してください。終了すると練習データを削除し、元の作戦へ戻ります。';
  get('tutorialNext').textContent=step?'次へ':'終了して元の作戦へ';get('tutorialNext').disabled=!!step;get('tutorialExit').hidden=!step;get('tutorialStatus').textContent='';
  if(step?.enter)step.enter();focusStep();tick();
 }
 function tick(){
  if(!session)return;const step=activeSteps[session.step];
  if(!practice()){get('tutorialStatus').textContent='練習用コンテンツ以外を表示中です。終了すると元の作戦へ戻ります。';get('tutorialNext').disabled=true;highlight.hidden=true;return}
  if(!step){get('tutorialStatus').textContent='ヘルプから何度でも練習できます。';return}
  const done=!!step.done();get('tutorialNext').disabled=!done;
  const status=done?'できました。「次へ」で進めます。':'オレンジの枠が操作する場所の目印です。';if(get('tutorialStatus').textContent!==status)get('tutorialStatus').textContent=status;
  const target=step.target(),rect=target?.getBoundingClientRect();highlight.hidden=!rect||!rect.width||!rect.height;
  if(!highlight.hidden)Object.assign(highlight.style,{left:(rect.left-3)+'px',top:(rect.top-3)+'px',width:(rect.width+6)+'px',height:(rect.height+6)+'px'});
 }
 function start(){
  if(session)return;activeSteps=desktop.matches?steps:mobileSteps;panel.setAttribute('aria-label',desktop.matches?'PCチュートリアル':'スマホチュートリアル');intro.close();document.querySelector('.top').classList.remove('phone-menu-open');flushScheduledBoardSave();storeContentHistory();
  const id='tutorial-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  session={id,home:data,homeIndex:activeContent,selected,selectedIds:selectedIds.slice(),phases:selectedPhaseIndexes.slice(),wasReadOnly:boardReadOnly,pinned:document.querySelector('.left').classList.contains('pinned'),collapsed:document.querySelector('.layout').classList.contains('content-collapsed'),step:0};
  if(boardReadOnly)get('editModeToggle').click();
  if(desktop.matches&&!session.pinned)get('leftRailToggle').click();
  if(desktop.matches&&session.collapsed)get('contentObjectPin').click();
  session.sections=['toggleBattlePages','toggleInspector'].map(id=>({id,open:get(id).getAttribute('aria-expanded')==='true'}));for(const section of session.sections)if(!section.open)get(section.id).click();
  const board=parseImportedBoards(JSON.stringify({title:'練習用：はじめの攻略図',pages:[[]],pageNames:['フェーズ1'],pageNotes:['']}))[0];board.tutorialPracticeId=id;
  contentBoards[activeContent]=data;contentBoards.push(board);activeContent=contentBoards.length-1;data=board;restoreContentHistory();selected=null;selectedIds=[];selectedPhaseIndexes=[];phaseSelectionOwner=data;drag=null;selectPlacementTool('select');
  renderAndSave();const aoeToggle=document.querySelector('[aria-controls="aoePanel"]');if(aoeToggle.getAttribute('aria-expanded')!=='true')aoeToggle.click();document.body.classList.add('tutorial-active');fitBoardDisplayZoom();panel.hidden=false;showStep();timer=requestAnimationFrame(animateHighlight);
 }
 function finish(){
  if(!session)return;const previous=session;cancelAnimationFrame(timer);timer=null;session=null;panel.hidden=true;highlight.hidden=true;document.body.classList.remove('tutorial-active','tutorial-content-step');if(!desktop.matches){if(document.querySelector('.layout').classList.contains('phone-materials-open'))document.querySelector('.phone-content-icon').click();if(document.querySelector('.layout').classList.contains('phone-content-open'))document.querySelector('.phone-content-close').click()}
  flushScheduledBoardSave();contentBoards[activeContent]=data;storeContentHistory();contentBoards=contentBoards.filter(board=>board.tutorialPracticeId!==previous.id);
  const at=contentBoards.indexOf(previous.home);activeContent=at>=0?at:Math.max(0,Math.min(previous.homeIndex,contentBoards.length-1));data=contentBoards[activeContent];restoreContentHistory();
  selected=previous.selected;selectedIds=previous.selectedIds.filter(id=>current().some(item=>item.id===id));selectedPhaseIndexes=previous.phases.filter(i=>i<data.pages.length);phaseSelectionOwner=data;drag=null;selectPlacementTool('select');
  const layout=document.querySelector('.layout');if(document.querySelector('.left').classList.contains('pinned')!==previous.pinned)get('leftRailToggle').click();if(layout.classList.contains('content-collapsed')!==previous.collapsed)get('contentObjectPin').click();if(boardReadOnly!==previous.wasReadOnly)get('editModeToggle').click();
  renderAndSave();flushScheduledBoardSave();get('operationGuideBtn').focus({preventScroll:true});
  for(const section of previous.sections)if((get(section.id).getAttribute('aria-expanded')==='true')!==section.open)get(section.id).click();
 }
 helpMenu.addEventListener('click',event=>{if(!event.target.closest('[data-help-action="tutorial"]'))return;event.preventDefault();event.stopImmediatePropagation();closeHelpMenu();if(!session)intro.showModal()},true);
 get('tutorialStart').onclick=start;get('tutorialCancel').onclick=()=>intro.close();get('tutorialExit').onclick=finish;
 get('tutorialNext').onclick=()=>{if(!session||get('tutorialNext').disabled)return;if(session.step>=activeSteps.length){finish();return}session.step++;showStep()};
 desktop.addEventListener('change',()=>{if(intro.open)intro.close();finish()});
})();
