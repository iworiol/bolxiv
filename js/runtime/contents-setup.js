// Initialization stage: contents-setup. Load order is owned by bolxiv.js.
const donutMinRingWidth=4;

let contentBoards=[data],activeContent=0;

const contentHistoryStore=new WeakMap();

let editingContentIndex=-1,contentEditDraft='',pendingContentAddition=null;

let contentSelectorCache=null;

document.addEventListener('contextmenu',event=>{if(!(event.target instanceof Element)||allowNativeContextMenu(event.target))return;if(event.target.closest('.object-layout-rect,.phone-content-preview,.left .tool[data-tool],.left .icon-choice,#objectList .object-row,#pages .page-tab,#objectContextMenu,#layerContextMenu'))event.preventDefault()},true);
