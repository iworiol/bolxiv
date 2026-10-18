(()=>{
 const trigger=document.getElementById('copyPage'),directCopy=trigger.onclick;
 const caret=document.createElement('span');caret.className='phase-copy-caret';caret.textContent='▾';caret.setAttribute('aria-hidden','true');trigger.append(caret);
 trigger.title='フェーズのコピー';trigger.setAttribute('aria-label','フェーズのコピー');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','phaseCopyMenu');
 const menu=document.createElement('div');menu.id='phaseCopyMenu';menu.className='object-context-menu phase-copy-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','フェーズのコピー');document.body.append(menu);
 let owner=null,index=null,selectedGroup=null;
 function close(focus=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true})}
 function action(label,callback){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('role','menuitem');button.onclick=()=>{close();if(boardReadOnly||phaseComparisonActive()||trigger.disabled||data!==owner||data.page!==index||(data.activePhaseGroup||null)!==selectedGroup)return;callback()};menu.append(button)}
 action('このコンテンツにコピー',()=>directCopy.call(trigger));
 action('別のコンテンツへコピー ▸',()=>document.dispatchEvent(new CustomEvent('open-phase-copy-targets',{detail:{index,anchor:trigger,groupId:selectedGroup}})));
 trigger.onclick=()=>{if(!menu.hidden){close();return}if(trigger.disabled||boardReadOnly||phaseComparisonActive())return;closeHelpMenu();closeJsonExportMenu();closeJsonImportMenu();document.getElementById('phaseContentCopyMenu').hidden=true;owner=data;index=data.page;selectedGroup=data.activePhaseGroup||null;menu.firstElementChild.hidden=!!selectedGroup;menu.setAttribute('aria-label',selectedGroup?'フェーズグループのコピー':'フェーズのコピー');menu.hidden=false;trigger.setAttribute('aria-expanded','true');const rect=trigger.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,rect.bottom+4+menu.offsetHeight<=innerHeight?rect.bottom+4:rect.top-menu.offsetHeight-4)+'px'};
 trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();event.stopImmediatePropagation();if(menu.hidden)trigger.click();menu.querySelector('button:not([hidden])')?.focus()}});
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close(true);return}if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...menu.querySelectorAll('button:not([hidden])')],at=buttons.indexOf(document.activeElement);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(at+(event.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus()});
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target)&&!trigger.contains(event.target))close()},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden)close(true)});
 window.addEventListener('resize',()=>close());window.addEventListener('scroll',event=>{if(!menu.contains(event.target))close()},true);
})();
