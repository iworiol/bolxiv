(()=>{
 for(const id of ['operationGuideDialog','aboutToolDialog']){
  const dialog=document.getElementById(id),body=dialog.querySelector('.operation-guide-body'),headings=[...body.querySelectorAll('h3')];
  const contents=document.createElement('nav');contents.className='help-contents';contents.id=id+'-contents';contents.tabIndex=-1;
  const title=document.createElement('p');title.className='help-contents-title';title.id=contents.id+'-title';title.textContent='目次';contents.setAttribute('aria-labelledby',title.id);contents.append(title);
  const list=document.createElement('ul');contents.append(list);body.prepend(contents);
  function goTo(target){body.scrollTop=Math.max(0,body.scrollTop+target.getBoundingClientRect().top-body.getBoundingClientRect().top-12);target.focus({preventScroll:true})}
  headings.forEach((heading,index)=>{
   const label=heading.textContent;heading.id=id+'-section-'+(index+1);heading.tabIndex=-1;heading.classList.add('help-section-heading');
   const text=document.createElement('span');text.textContent=label;heading.replaceChildren(text);
   const back=document.createElement('button');back.type='button';back.className='help-back-to-contents';back.textContent='目次へ';back.setAttribute('aria-label',label+'から目次へ戻る');back.onclick=()=>goTo(contents);heading.append(back);
   const item=document.createElement('li');for(const name of ['guide-pc-only','guide-mobile-only'])if(heading.classList.contains(name))item.classList.add(name);
   const link=document.createElement('a');link.href='#'+heading.id;link.textContent=label;link.onclick=event=>{event.preventDefault();goTo(heading)};item.append(link);list.append(item);
  });
  headings.forEach((heading,index)=>{
   const separator=document.createElement('hr');separator.className='help-section-separator';
   for(const name of ['guide-pc-only','guide-mobile-only'])if(heading.classList.contains(name))separator.classList.add(name);
   if(headings[index+1])headings[index+1].before(separator);else body.append(separator);
  });
 }
})();
