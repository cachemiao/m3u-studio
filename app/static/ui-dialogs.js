/* Modal presentation only: callers retain their validation and mutation paths. */
(() => {
 'use strict';
 const dialog=document.querySelector('#interactionDialog'),form=document.querySelector('#interactionForm');
 const input=document.querySelector('#interactionInput'),error=document.querySelector('#interactionError');
 const confirmButton=document.querySelector('#interactionConfirm'),cancelButton=document.querySelector('#interactionCancel');
 let queue=Promise.resolve();
 const text=(id,value)=>M3UI18n.setText(document.querySelector(id),value);
 function show(options){return new Promise(resolve=>{
  const prompt=options.mode==='text',notice=options.mode==='notice',origin=document.activeElement;
  let result=prompt?null:false;
  text('#interactionTitle',options.title||t(options.danger?'uiConfirmDelete':'uiConfirmAction'));
  text('#interactionMessage',options.message||'');document.querySelector('#interactionMessage').hidden=!options.message;
  document.querySelector('#interactionField').hidden=!prompt;input.disabled=!prompt;
  text('#interactionLabel',options.label||t('uiGroupName'));input.value=options.value||'';
  error.hidden=true;text('#interactionError','');input.removeAttribute('aria-invalid');
  M3UI18n.setText(confirmButton,options.confirmLabel||t(options.danger?'m22':'uiConfirm'));
  confirmButton.className=options.danger?'danger-fill':'primary';cancelButton.hidden=notice;
  const finish=()=>{form.removeEventListener('submit',submit);input.removeEventListener('input',clearError);if(origin?.isConnected)origin.focus({preventScroll:true});resolve(result)};
  const clearError=()=>{error.hidden=true;input.removeAttribute('aria-invalid')};
  const submit=event=>{event.preventDefault();if(prompt){const value=options.trim===false?input.value:input.value.trim(),message=options.validate?.(value);if(message){text('#interactionError',message);error.hidden=false;input.setAttribute('aria-invalid','true');input.focus({preventScroll:true});return}result=value}else result=true;dialog.close()};
  form.addEventListener('submit',submit);input.addEventListener('input',clearError);dialog.addEventListener('close',finish,{once:true});
  dialog.showModal();(prompt?input:confirmButton).focus({preventScroll:true});if(prompt)input.select();
 })}
 function request(options){const next=queue.then(()=>show(options));queue=next.catch(()=>{});return next}
 cancelButton.addEventListener('click',()=>dialog.close());
 window.M3UDialogs={requestText:options=>request({...options,mode:'text'}),requestConfirm:options=>request({danger:true,...options,mode:'confirm'}),notify:options=>request({...options,mode:'notice'})};
})();
