(function setupPhoneMenu(){
 const mobile=matchMedia('(max-width:850px)'),header=document.querySelector('.top'),actions=header.querySelector('.actions');
 actions.id='headerActions';const button=document.createElement('button');button.type='button';button.className='phone-menu-toggle';button.title='操作メニューを開閉';button.setAttribute('aria-label','操作メニュー');button.setAttribute('aria-controls',actions.id);button.setAttribute('aria-expanded','false');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span class="header-menu-label">メニュー</span>';header.insertBefore(button,actions);
 function close(){header.classList.remove('phone-menu-open');button.setAttribute('aria-expanded','false')}
 button.onclick=()=>{const open=header.classList.toggle('phone-menu-open');button.setAttribute('aria-expanded',String(open))};
 actions.addEventListener('click',event=>{const action=event.target.closest('button');if(action&&action.id!=='exportBtn'&&action.id!=='importBtn'&&action.id!=='operationGuideBtn')close()});for(const id of ['jsonExportMenu','jsonImportMenu','helpMenu'])document.getElementById(id).addEventListener('click',event=>{if(event.target.closest('button'))close()});
 document.addEventListener('pointerdown',event=>{if(!header.contains(event.target)&&!event.target.closest('#jsonExportMenu,#jsonImportMenu,#helpMenu'))close()},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&header.classList.contains('phone-menu-open')){close();button.focus()}});
 mobile.addEventListener('change',close);
})();
