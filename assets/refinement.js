// Complete galleries stay available; expand/collapse never discards a video.
document.querySelectorAll('[data-media-toggle]').forEach(button=>{
 const grid=document.getElementById(button.dataset.mediaToggle);if(!grid)return;
 const cards=[...grid.querySelectorAll('.video-card')],count=cards.length;
 const label=grid.id==='peopleGallery'?'factory stories':'films';
 const setLabel=expanded=>{button.replaceChildren(document.createTextNode(expanded?'Show selected '+label:'View all '+count+' '+label));const sign=document.createElement('span');sign.setAttribute('aria-hidden','true');sign.textContent=expanded?'−':'+';button.append(sign);};setLabel(false);
 button.addEventListener('click',()=>{
  const expanded=button.getAttribute('aria-expanded')!=='true';grid.classList.toggle('is-expanded',expanded);button.setAttribute('aria-expanded',String(expanded));setLabel(expanded);
  if(!expanded){cards.slice(3).forEach(card=>{const video=card.querySelector('video');video.pause();video.muted=true;video.removeAttribute('controls');card.classList.remove('is-playing');});}
 });
});
// Original card click behaviour remains the single path into product details.
document.querySelectorAll('.product-card').forEach(card=>card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();card.click();}}));
