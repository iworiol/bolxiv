// state-access: shared function declarations; initialized by bolxiv.js in the documented order.
function current(){return data.pages[data.page]}

function activeBoardShape(){return data.pageBoardShapes?.[data.page]||data.boardShape||'square'}

function activeFieldBackground(){return data.pageFieldBackgroundColors?.[data.page]||data.fieldBackgroundColor||'#17212c'}

function activePageColor(){return data.pageColors?.[data.page]||data.layoutColor||'#808080'}
