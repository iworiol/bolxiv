(()=>{
 document.getElementById('addPage').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
 document.getElementById('copyPage').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="1"/><path d="M15 9V4H4v11h5"/></svg>';
 const heading=document.querySelector('.phase-heading-row'),actions=document.createElement('div');actions.className='phase-heading-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label','フェーズの追加とコピー');for(const id of ['addPage','copyPage','copyPageToContent']){const button=document.getElementById(id);if(button)actions.append(button)}heading.append(actions);actions.addEventListener('click',event=>event.stopPropagation())})();
