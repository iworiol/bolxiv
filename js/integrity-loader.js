// Loaded with the hash pinned in index.html (except direct file startup).
// The generated manifest pins each application script/style before use.
(()=>{
 const entry=document.currentScript,base=new URL('../',entry.src),checked=location.protocol!=='file:';
 window.boardStorageStarting=true;
 window.BolxivIntegrityChecked=checked;
 function fail(error){
  if(window.Bolxiv?.showStartupError){window.Bolxiv.showStartupError(error);return}
  window.boardStorageStarting=false;window.Bolxiv={ready:false,startupError:String(error.message||error)};
  document.documentElement.classList.remove('app-restoring');
  document.body.style.removeProperty('display');
  const panel=document.createElement('main');panel.id='startupError';panel.setAttribute('role','alert');
  const title=document.createElement('h1');title.textContent='ファイルを確認できませんでした';
  const message=document.createElement('p');message.textContent=String(error.message||error);
  const help=document.createElement('p');help.textContent='再読み込みしてください。解消しない場合は、同じ配布物のファイル一式で更新してください。保存データは削除されません。';
  const button=document.createElement('button');button.textContent='再読み込み';button.onclick=()=>location.reload();
  panel.append(title,message,help,button);document.body.replaceChildren(panel);
 }
 function configure(node,file,hash,attempt){
  if(checked){if(!/^sha384-[A-Za-z0-9+/]+={0,2}$/.test(hash||''))throw new Error('照合表にありません: '+file);node.integrity=hash;node.crossOrigin='anonymous'}
  const url=new URL(file,base);if(attempt)url.searchParams.set('retry',String(attempt));
  if(node.tagName==='SCRIPT')node.src=url.href;else node.href=url.href;
 }
 function script(file,hash,attempt=0){return new Promise((resolve,reject)=>{
  const node=document.createElement('script');node.async=false;configure(node,file,hash,attempt);
  node.onload=resolve;node.onerror=()=>{node.remove();if(attempt<2)setTimeout(()=>script(file,hash,attempt+1).then(resolve,reject),300*(attempt+1));else reject(new Error('読み込みまたは整合性検査に失敗しました: '+file))};
  document.head.append(node);
 })}
 function style(original,file,hash,attempt=0){return new Promise((resolve,reject)=>{
  const node=document.createElement('link');node.rel='stylesheet';node.media=original.media||'all';
  configure(node,file,hash,attempt);
  node.onload=()=>{original.remove();resolve()};
  node.onerror=()=>{node.remove();if(attempt<2)setTimeout(()=>style(original,file,hash,attempt+1).then(resolve,reject),300*(attempt+1));else reject(new Error('読み込みまたは整合性検査に失敗しました: '+file))};
  document.head.append(node);
 })}
 const domReady=document.readyState==='loading'?new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true})):Promise.resolve();
 domReady.then(()=>script('js/integrity-manifest.js',entry.dataset.manifestIntegrity)).then(()=>{
  const manifest=window.BolxivIntegrity;
  if(manifest?.schema!==1||!manifest.files)throw new Error('照合表の形式が不正です');
  const styles=Array.from(document.querySelectorAll('link[rel="bolxiv-stylesheet"],link[data-startup-style]'));
  window.BolxivIntegrityStyles=Promise.all(styles.map(node=>{
   const file=new URL(node.href).pathname.slice(base.pathname.length);
   return style(node,file,manifest.files[file]);
  }));
  window.BolxivIntegrityStyles.catch(()=>{});
  if(!checked){const notice=document.createElement('div');notice.className='integrity-notice';notice.textContent='HTML直接起動：整合性検査なし';document.body.append(notice)}
  return script('bolxiv.js',manifest.files['bolxiv.js']);
 }).catch(fail);
})();
