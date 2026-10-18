// Initialization stage: state. Load order is owned by bolxiv.js.
const $=s=>document.querySelector(s), stage=$('#stage'), layer=$('#objects'), controls=$('#objectControls'), objectClip=$('#objectClip');

let tool='select',color='#c6f36b',selected=null,selectedIds=[],drag=null,toastTimer,clipboardObjects=[],clipboardSourcePage=null;

const boardImageLibrary=(()=>{
 const records=new Map(),bySource=new Map();
 function register(source,metadata={}){
  if(typeof source!=='string'||!source.startsWith('data:image/'))throw new Error('画像データの形式が不正です');
  if(bySource.has(source))return bySource.get(source);
  let a=2166136261,b=5381;
  for(let i=0;i<source.length;i++){const code=source.charCodeAt(i);a=Math.imul(a^code,16777619);b=Math.imul(b,33)^code}
  const base='img-'+(a>>>0).toString(16)+'-'+(b>>>0).toString(16)+'-'+source.length.toString(16);let id=base,n=0;
  while(records.has(id)&&records.get(id).source!==source)id=base+'-'+(++n);
  const record=Object.freeze({source,mime:source.slice(5,source.indexOf(';')>0?source.indexOf(';'):source.indexOf(',')),width:Number(metadata.width)||0,height:Number(metadata.height)||0});
  records.set(id,record);bySource.set(source,id);return id;
 }
 function get(id){return records.get(id)?.source||''}
 function requireImage(id){const source=get(id);if(!source)throw new Error('画像ライブラリの参照先が見つかりません：'+id);return source}
 function entries(boards){
  const ids=new Set();for(const board of boards){for(const id of board.pageFieldImageIds||[])if(id)ids.add(id);for(const page of board.pages||[])for(const object of page)if(object.imageId)ids.add(object.imageId)}
  return Array.from(ids,id=>{requireImage(id);return [id,records.get(id)]});
 }
 for(const [id,record] of window.boardInitialImages||[]){
  if(!record||typeof record.source!=='string'||!record.source.startsWith('data:image/'))throw new Error('保存済み画像の形式が不正です');
  records.set(id,Object.freeze(record));bySource.set(record.source,id);
 }
 window.boardInitialImages=null;
 return {register,get,requireImage,entries};
})();

let gridVisible=true,fieldVisible=true,fieldClipEnabled=false;

let data={title:'新規コンテンツ1',layout:'square',boardShape:'square',pageBoardShapes:['square'],layoutColor:'#ffffff',fieldBackgroundColor:'#17212c',pageFieldBackgroundColors:['#17212c'],pageFieldImageIds:[''],pageFieldImageTints:[{color:"#000000",strength:0}],pageFieldSizes:[{width:538,height:538}],pageColors:['#ffffff'],pages:[[]],pageNames:['新規フェーズ'],pageNotes:[''],page:0};

let history=[],future=[],deletePageIndex=null,deleteContentIndex=null;

const iconFiles={role:[['タンク1','00_ROLE','TankRole','1'],['タンク2','00_ROLE','TankRole','2'],['ヒーラー1','00_ROLE','HealerRole','1'],['ヒーラー2','00_ROLE','HealerRole','2'],...['DPS1','DPS2','DPS3','DPS4'].map((n,i)=>[n,'00_ROLE','DPSRole',String(i+1)]),['タンク','00_ROLE','TankRole',''],['ヒーラー','00_ROLE','HealerRole',''],['近接DPS','00_ROLE','MeleeDPS',''],['遠隔DPS','00_ROLE','RangedDPS','']],tank:[['Gladiator','01_TANK/Class','Gladiator'],['Marauder','01_TANK/Class','Marauder'],...['DarkKnight','Gunbreaker','Paladin','Warrior'].map(n=>[n,'01_TANK/Job',n])],healer:[['Conjurer','02_HEALER/Class','Conjurer'],...['Astrologian','Sage','Scholar','WhiteMage'].map(n=>[n,'02_HEALER/Job',n])],dps:[...['Arcanist','Archer','Lancer','Pugilist','Rogue','Thaumaturge'].map(n=>[n,'03_DPS/Class',n]),...['Bard','BlackMage','Dancer','Dragoon','Machinist','Monk','Ninja','Pictomancer','Reaper','RedMage','Samurai','Summoner','Viper'].map(n=>[n,'03_DPS/Job',n])],crafter:['Alchemist','Armorer','Blacksmith','Carpenter','Culinarian','Goldsmith','Leatherworker','Weaver'].map(n=>[n,'04_CRAFTER',n]),gatherer:['Botanist','Fisher','Miner'].map(n=>[n,'05_GATHERER',n]),limited:[['BlueMage','06_LIMITED','BlueMage']]};

let activeIcon=null;

iconFiles.targetMarker=Object.entries({attack1:'攻撃1',attack2:'攻撃2',attack3:'攻撃3',attack4:'攻撃4',attack5:'攻撃5',attack6:'攻撃6',attack7:'攻撃7',attack8:'攻撃8',bind1:'バインド1',bind2:'バインド2',bind3:'バインド3',circle:'円',cross:'×',ignore1:'無視1',ignore2:'無視2',square:'四角',triangle:'三角'}).map(([file,name])=>[name,'target-marker',file]);

iconFiles.fieldMarker=[['フィールド1','field-marker-transparent','1'],['フィールド2','field-marker-transparent','2'],['フィールド3','field-marker-transparent','3'],['フィールド4','field-marker-transparent','4'],...['A','B','C','D'].map(n=>[`フィールド${n}`,'field-marker-transparent',n.toLowerCase()])];

let boardDisplayZoom=100;

let selectedPhaseIndexes=[],phaseSelectionOwner=null,phaseComparisonRendering=false;

document.getElementById('exitPhaseComparison').onclick=()=>selectPhase(data.page);
