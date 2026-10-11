/* Native popovers provide outside-click dismissal and Escape handling. */
document.addEventListener('DOMContentLoaded',()=>{
 for(const menu of document.querySelectorAll('.preference-menu')){
  const trigger=document.querySelector(`[popovertarget="${menu.id}"]`);
  function position(){
   const box=trigger.getBoundingClientRect(),width=168;
   menu.style.left=Math.max(8,Math.min(box.right-width,innerWidth-width-8))+'px';
   menu.style.top=(box.bottom+8)+'px';
  }
  menu.addEventListener('beforetoggle',event=>{if(event.newState==='open')position()});
  menu.addEventListener('toggle',event=>{
   trigger.setAttribute('aria-expanded',String(event.newState==='open'));
   if(event.newState==='open')(menu.querySelector('[aria-checked="true"]')||menu.querySelector('button')).focus();
  });
  menu.addEventListener('click',event=>{
   if(!event.target.closest('button'))return;
   menu.hidePopover();trigger.focus();
  });
  menu.addEventListener('keydown',event=>{
   const items=[...menu.querySelectorAll('button')],index=items.indexOf(document.activeElement);
   let next;
   if(event.key==='ArrowDown')next=(index+1)%items.length;
   if(event.key==='ArrowUp')next=(index+items.length-1)%items.length;
   if(event.key==='Home')next=0;
   if(event.key==='End')next=items.length-1;
   if(next!==undefined){event.preventDefault();items[next].focus()}
  });
  trigger.setAttribute('aria-expanded','false');
  addEventListener('resize',()=>{if(menu.matches(':popover-open'))position()});
 }
});
