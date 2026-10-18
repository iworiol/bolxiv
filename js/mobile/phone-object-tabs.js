(()=>{
 const mobile=matchMedia('(max-width:850px)'),panel=document.getElementById('objectLayerPanel');
 const listButton=document.getElementById('toggleLayers'),propertyButton=document.getElementById('toggleInspector');
 let selected=viewSettings.phoneObjectTab==='properties'?'properties':'list';
 const entries=[['list',listButton],['properties',propertyButton]].map(([key,heading])=>{
  const group=heading.parentElement,bar=document.createElement('div');bar.className='phone-object-tabs';
  const title=document.createElement('span');title.className='phone-object-tabs-title';bar.append(title);
  const change=document.createElement('button');change.type='button';change.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-4-4M20 16H4l4 4"/></svg>';change.setAttribute('aria-label',key==='list'?'オブジェクトプロパティを表示':'オブジェクトリストに戻る');bar.append(change);
  const collapse=document.createElement('button');collapse.type='button';collapse.className='phone-object-collapse';collapse.setAttribute('aria-controls',heading.getAttribute('aria-controls'));bar.append(collapse);group.prepend(bar);
  change.onclick=()=>{selected=key==='list'?'properties':'list';rememberViewSetting('phoneObjectTab',selected);const target=selected==='list'?listButton:propertyButton;if(target.getAttribute('aria-expanded')!=='true')target.click();sync()};
  collapse.onclick=()=>{heading.click();sync()};
  bar.addEventListener('click',event=>{if(event.target.closest('button'))return;collapse.click()});
  title.setAttribute('role','button');title.tabIndex=0;title.setAttribute('aria-controls',heading.getAttribute('aria-controls'));
  title.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();collapse.click()}});

  return {key,heading,title,collapse};
 });
 function sync(){
  const enabled=mobile.matches&&!boardReadOnly;panel.classList.toggle('phone-object-tabbed',enabled);panel.dataset.objectTab=selected;panel.dataset.objectExpanded=(selected==='list'?listButton:propertyButton).getAttribute('aria-expanded');
  for(const entry of entries){entry.title.innerHTML=entry.key==='list'?'<strong>オブジェクト リスト</strong> / プロパティ':'<strong>オブジェクト</strong> リスト / <strong>プロパティ</strong>';entry.title.title=entry.key==='properties'?entry.heading.textContent.trim():'オブジェクトリスト';const open=entry.heading.getAttribute('aria-expanded')==='true';entry.title.setAttribute('aria-expanded',String(open));entry.collapse.textContent=open?'−':'＋';entry.collapse.setAttribute('aria-expanded',String(open));entry.collapse.setAttribute('aria-label',(entry.key==='list'?'オブジェクトリスト':'オブジェクトプロパティ')+(open?'を閉じる':'を開く'))}
 }
 for(const heading of [listButton,propertyButton])new MutationObserver(sync).observe(heading,{attributes:true,attributeFilter:['aria-expanded'],childList:true,subtree:true,characterData:true});
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
 const before=render;render=function(){before();sync()};mobile.addEventListener('change',sync);sync();
})();
