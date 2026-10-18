(()=>{
 const panel=document.getElementById('layoutPropertiesPanel'),field=document.createElement('div');field.className='field';field.id='phaseNameField';
 const label=document.createElement('label');label.htmlFor='phaseNameInput';label.textContent='フェーズ名';
 const input=document.createElement('input');input.id='phaseNameInput';input.type='text';input.autocomplete='off';field.append(label,input);panel.prepend(field);
 let owner=null;
 input.addEventListener('focus',()=>{owner={board:data,page:data.pages[data.page]}});
 function sync(){input.disabled=boardReadOnly||phaseComparisonActive();if(document.activeElement!==input)input.value=data.pageNames[data.page]||''}
 function commit(){
  if(boardReadOnly||phaseComparisonActive()||!owner||owner.board!==data)return;
  const index=data.pages.indexOf(owner.page);if(index<0)return;
  const value=input.value.replace(/[\r\n]+/g,' ').trim();
  if(!value){input.value=data.pageNames[index]||'';notify('フェーズ名を入力してください');return}
  if(value===data.pageNames[index])return;
  recordHistory();data.pageNames[index]=value;input.value=value;renderAndSave();
 }
 input.addEventListener('change',commit);input.addEventListener('blur',()=>{commit();owner=null;sync()});
 input.addEventListener('keydown',event=>{if(event.isComposing||event.keyCode===229)return;if(event.key==='Enter'){event.preventDefault();commit()}else if(event.key==='Escape'){event.preventDefault();input.value=data.pageNames[data.page]||''}});
 const beforePages=renderPages;renderPages=function(...args){const result=beforePages(...args);sync();return result};
 const beforeRender=render;render=function(...args){const result=beforeRender(...args);sync();return result};sync();
})();
