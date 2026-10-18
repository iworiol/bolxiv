let pendingPhoneLayerDeletion=null;
const phoneLayerDeleteDialog=document.createElement('dialog');
phoneLayerDeleteDialog.className='confirm-dialog';phoneLayerDeleteDialog.id='phoneLayerDeleteDialog';phoneLayerDeleteDialog.setAttribute('aria-labelledby','phoneLayerDeleteMessage');
phoneLayerDeleteDialog.innerHTML='<p id="phoneLayerDeleteMessage"></p><div class="confirm-actions"><button type="button" class="btn" id="phoneLayerDeleteCancel" autofocus>キャンセル</button><button type="button" class="btn primary" id="phoneLayerDeleteConfirm">削除</button></div>';
document.body.append(phoneLayerDeleteDialog);
function confirmPhoneLayerDeletion(id){
 const object=current().find(item=>item.id===id);if(!object||object.locked)return;
 pendingPhoneLayerDeletion={id,board:data,page:current()};
 phoneLayerDeleteDialog.querySelector('p').textContent='「'+objectTitle(object)+'」を削除しますか？';
 if(!phoneLayerDeleteDialog.open)phoneLayerDeleteDialog.showModal();
}
document.getElementById('phoneLayerDeleteCancel').onclick=()=>{pendingPhoneLayerDeletion=null;phoneLayerDeleteDialog.close()};
document.getElementById('phoneLayerDeleteConfirm').onclick=()=>{
 const pending=pendingPhoneLayerDeletion;pendingPhoneLayerDeletion=null;phoneLayerDeleteDialog.close();
 if(pending&&data===pending.board&&current()===pending.page)removeObject(pending.id);
};
phoneLayerDeleteDialog.addEventListener('close',()=>{pendingPhoneLayerDeletion=null});
