// Do not download/compile Three.js or allocate the glass renderer on the homepage.
const section=document.getElementById('engineering');
if(section){
 let started=false;
 const start=()=>{if(started)return;started=true;import('./engineering.js?v=loadfix1').catch(()=>{const stage=document.getElementById('glassStage');stage.classList.add('failed');});};
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();start();}},{rootMargin:'150px 0px'});observer.observe(section);}
 else document.getElementById('glassPause')?.addEventListener('click',start,{once:true});
}
