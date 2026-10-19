// Initialization stage: help-setup. Load order is owned by bolxiv.js.
const operationGuide=document.getElementById('operationGuideDialog'),aboutTool=document.getElementById('aboutToolDialog');

const changeLog=document.createElement('dialog');

changeLog.id='changeLogDialog';

changeLog.className='operation-guide';

changeLog.setAttribute('aria-labelledby','changeLogTitle');

changeLog.innerHTML='<div class="operation-guide-heading"><h2 id="changeLogTitle">更新履歴</h2><button type="button" class="btn" autofocus>閉じる</button></div><div class="operation-guide-body"><p><span class="change-log-version">2026/10/19　Ver.0.5.0</span><span class="change-log-description">コンテンツを履歴操作に追加、レイアウト少し見直し、その他修正</span></p><p><span class="change-log-version">2026/10/18　Ver.0.4.1</span><span class="change-log-description">ツールの内部構成変更、その他修正</span></p><p><span class="change-log-version">2026/10/18　Ver.0.4.0</span><span class="change-log-description">チュートリアル追加、フェーズグループ化機能追加、メモリ使用量削減、JSONファイルサイズ削減</span></p><p><span class="change-log-version">2026/10/17　Ver.0.3.0</span><span class="change-log-description">コンテンツ間フェーズコピー機能追加、右クリック・長押し操作メニュー各種追加、文字サイズ変更、処理負荷改善</span></p><p><span class="change-log-version">2026/10/15　Ver.0.2.0</span><span class="change-log-description">フェーズノート追加、構成見直し、その他修正&amp;見直し</span></p><p><span class="change-log-version">2026/10/14　Ver.0.1.1</span><span class="change-log-description">見た目見直し</span></p><p><span class="change-log-version">2026/10/12　Ver.0.1.0</span><span class="change-log-description">初版</span></p></div>';

document.body.append(changeLog);

changeLog.querySelector('button').onclick=()=>changeLog.close();

changeLog.addEventListener('close',()=>document.getElementById('operationGuideBtn').focus());

const helpMenu=document.createElement('div');

helpMenu.id='helpMenu';

helpMenu.className='png-export-menu';

helpMenu.setAttribute('role','menu');

helpMenu.hidden=true;

helpMenu.innerHTML='<button type="button" role="menuitem" data-help-action="guide">操作ガイド</button><button type="button" role="menuitem" data-help-action="history">更新履歴</button><button type="button" role="menuitem" data-help-action="about">ツールについて</button>';

document.body.appendChild(helpMenu);

document.getElementById('operationGuideBtn').onclick=()=>{if(!helpMenu.hidden){closeHelpMenu();return}closeJsonImportMenu();closeJsonExportMenu();const button=document.getElementById('operationGuideBtn'),rect=button.getBoundingClientRect();helpMenu.hidden=false;helpMenu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-helpMenu.offsetWidth-8))+'px';helpMenu.style.top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-helpMenu.offsetHeight-8))+'px';button.setAttribute('aria-expanded','true');helpMenu.querySelector('button').focus()};

document.addEventListener('click',e=>{if(!helpMenu.contains(e.target)&&!e.target.closest('#operationGuideBtn'))closeHelpMenu()});

window.addEventListener('resize',()=>closeHelpMenu());

helpMenu.addEventListener('keydown',e=>{const items=Array.from(helpMenu.querySelectorAll('button')),index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeHelpMenu(true)}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus()}else if(e.key==='Tab')closeHelpMenu()});

helpMenu.addEventListener('click',e=>{const item=e.target.closest('[data-help-action]');if(!item)return;closeHelpMenu(true);const dialog=item.dataset.helpAction==='guide'?operationGuide:item.dataset.helpAction==='history'?changeLog:aboutTool;dialog.querySelector('.operation-guide-body').scrollTop=0;dialog.showModal()});

document.getElementById('closeOperationGuide').onclick=()=>operationGuide.close();

document.getElementById('closeAboutTool').onclick=()=>aboutTool.close();

for(const dialog of [operationGuide,aboutTool])dialog.addEventListener('close',()=>document.getElementById('operationGuideBtn').focus());

document.addEventListener('keydown',e=>{const dialog=operationGuide.open?operationGuide:aboutTool.open?aboutTool:changeLog.open?changeLog:null;if(!dialog)return;if(e.key==='Escape'){e.preventDefault();dialog.close()}e.stopImmediatePropagation()},true);
