// Wait for the phone panels to finish layout before fitting the initial canvas.
if(matchMedia('(max-width:850px)').matches&&!Number.isFinite(viewSettings.boardDisplayZoom)){
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(matchMedia('(max-width:850px)').matches&&!Number.isFinite(viewSettings.boardDisplayZoom))fitBoardDisplayZoom(false);
 }));
}
