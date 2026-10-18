(()=>{
 const layout=document.querySelector('.layout'),heading=document.getElementById('toggleBattlePages'),actions=document.querySelector('.phase-heading-actions'),exit=document.getElementById('exitPhaseComparison');
 const count=document.createElement('span');count.className='phase-mode-count';count.setAttribute('aria-live','polite');
 actions.append(exit);exit.title='複数選択モードを解除';exit.setAttribute('aria-label',exit.title);
 function sync(){const selectedCount=selectedPhaseIndexes.length,active=selectedCount>0;layout.classList.toggle('phase-multi-select-mode',active);heading.textContent=active?'フェーズ複数選択モード':'フェーズリスト';if(active){count.textContent=selectedCount+'件';heading.append(count);for(const id of ['phaseItemMenu','phaseGroupMenu','phaseContentCopyMenu']){const menu=document.getElementById(id);if(menu)menu.hidden=true}}exit.hidden=!active}
 const before=render;render=function(){before();sync()};
 window.addEventListener('contextmenu',event=>{if(selectedPhaseIndexes.length&&event.target.closest('#pages')){event.preventDefault();event.stopImmediatePropagation()}},true);
 window.addEventListener('click',event=>{if(selectedPhaseIndexes.length&&event.target.closest('#pages .phone-row-actions,#pages .phase-group-menu-trigger')){event.preventDefault();event.stopImmediatePropagation()}},true);
 sync();
})();
