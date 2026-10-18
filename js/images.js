// images: shared function declarations; initialized by bolxiv.js in the documented order.
function linearKnockbackSvg(color,id){const paths=Array.from({length:4},(_,row)=>Array.from({length:3},(_,col)=>{const x=28+col*32,y=20+row*22;return '<path d="M'+(x-11)+' '+(y+6)+'L'+x+' '+y+'L'+(x+11)+' '+(y+6)+'"/>'}).join('')).join('');return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" aria-hidden="true"><defs><filter id="'+id+'" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter></defs><g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="'+color+'" stroke-width="13" filter="url(#'+id+')" opacity=".9">'+paths+'</g><g stroke="'+color+'" stroke-width="8">'+paths+'</g><g stroke="#fff4bf" stroke-width="3">'+paths+'</g></g></svg>'}

function knockbackSvg(color,id){const rays=Array.from({length:10},(_,i)=>'<g transform="rotate('+i*36+' 100 100)">'+[[28,3.5,4,1.7],[36,4.8,5,2],[48,7,7,2.7],[65,10,9,4],[80,12,10,4.6]].map(([r,w,h,t])=>'<path d="M'+(100-w)+' '+(100-r+h)+'L100 '+(100-r)+'L'+(100+w)+' '+(100-r+h)+'" stroke-width="'+t+'"/>').join('')+'</g>').join('');return '<svg viewBox="0 0 200 200" aria-hidden="true"><defs><filter id="'+id+'" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4"/></filter></defs><g fill="none" stroke-linecap="square" stroke-linejoin="miter"><g stroke="'+color+'" filter="url(#'+id+')" opacity=".95">'+rays.replace(/stroke-width="([\d.]+)"/g,(_,w)=>'stroke-width="'+(Number(w)+13)+'"')+'</g><g stroke="'+color+'" opacity=".9">'+rays.replace(/stroke-width="([\d.]+)"/g,(_,w)=>'stroke-width="'+(Number(w)+5)+'"')+'</g><g stroke="#fff3c4">'+rays+'</g></g></svg>'}

function fieldImageSource(board=data,index=board.page){return boardImageLibrary.get(board.pageFieldImageIds?.[index])}

function objectImageSource(object){return object.imageId?boardImageLibrary.get(object.imageId):embeddedPngs[object.src]||object.src}

function migrateBoardImages(board,externalLibrary){
 const resolve=id=>{
  if(!id)return '';
  if(externalLibrary){const record=Object.hasOwn(externalLibrary,id)?externalLibrary[id]:null;if(!record||typeof record.source!=='string')throw new Error('画像ライブラリの参照先が見つかりません：'+id);return boardImageLibrary.register(record.source,record)}
  boardImageLibrary.requireImage(id);return id;
 };
 board.pageFieldImageIds=board.pages.map((_,i)=>{
  const image=board.pageFieldImageIds?.[i]??board.pageFieldImages?.[i]??'';
  return typeof image==='string'&&image.startsWith('data:image/')?boardImageLibrary.register(image):resolve(image);
 });
 delete board.pageFieldImages;
 let changedPages=false;const pages=board.pages.map(page=>{let changed=false;const objects=page.map(object=>{
  if(object.imageId){const id=resolve(object.imageId);if(id===object.imageId)return object;changed=true;return {...object,imageId:id}};
  if(typeof object.src==='string'&&object.src.startsWith('data:image/')){changed=true;const {src,...rest}=object;return {...rest,imageId:boardImageLibrary.register(src)}}
  return object;
 });if(changed){changedPages=true;return objects}return page;});
 if(changedPages)board.pages=pages;
 return board;
}

function iconPath(name,folder){if(folder==='00_ROLE'&&name==='MeleeDPS')return 'assets/job-icons/00_ROLE/MeleeDPS.svg';if(folder==='00_ROLE'&&name==='RangedDPS')return 'assets/job-icons/00_ROLE/RangedDPS.svg';if(folder==='field-marker-transparent'&&['1','2','3','4'].includes(name))return 'assets/field-marker-transparent/'+name+'.svg';if(folder==='field-marker-transparent'&&['b','c','d'].includes(name))return 'assets/field-marker-transparent/'+name+'.svg';if(folder==='field-marker-transparent'&&name==='a')return 'assets/field-marker-transparent/a.svg';if(folder==='field-marker-transparent'&&name==='1')return 'assets/field-marker-transparent/1.svg';let root=folder==='target-marker'||folder.startsWith('field-marker')?'assets':'assets/job-icons';return `${root}/${folder}/${name}.png`}

function isBossObject(o){return o.type==='icon'&&['大ボス','中ボス','小ボス'].includes(o.iconName)}

function bossDefaultColor(name){return {'大ボス':'#6b247d','中ボス':'#235b9c','小ボス':'#c8202d'}[name]||'#6b247d'}

function bossIconSource(o){const template=bossIconTemplates[o.iconName];if(!template)return isTowerObject(o)?towerIconSource(o):objectImageSource(o);const base=/^#[0-9a-f]{6}$/i.test(o.color)?o.color:bossDefaultColor(o.iconName);let svg=template;if(base.toLowerCase()!==bossDefaultColor(o.iconName)){const tint=amount=>'#'+[1,3,5].map(i=>Math.round(parseInt(base.slice(i,i+2),16)*(1-amount)+255*amount).toString(16).padStart(2,'0')).join('');const palette={'大ボス':['#6b247d','#e5a4ff','#f2c8ff'],'中ボス':['#235b9c','#8bc8ff','#d8efff'],'小ボス':['#c8202d','#ff7b83','#ffd9dc']}[o.iconName];const colors=[base,tint(.55),tint(.8)];svg=svg.replace(/#[0-9a-f]{6}/gi,color=>{const index=palette.indexOf(color.toLowerCase());return index<0?color:colors[index]})}return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}

function isTowerObject(o){return o.type==='icon'&&/^(塔踏み[1-4]|塔ふみ1)$/.test(o.iconName||'')}

function towerIconSource(o){const base=/^#[0-9a-f]{6}$/i.test(o.color)?o.color:'#f39c12';const tint=(amount,toward=255)=>'#'+[1,3,5].map(i=>Math.round(parseInt(base.slice(i,i+2),16)*(1-amount)+toward*amount).toString(16).padStart(2,'0')).join('');const colors={'#f39c12':base,'#fad59b':tint(.58),'#b6750e':tint(.25,0)};const count=Math.max(1,Math.min(4,Number(String(o.iconName||'').slice(-1))||1));const svg=towerIconTemplates[count].replace(/#[0-9a-f]{6}/gi,color=>colors[color.toLowerCase()]||color);return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
