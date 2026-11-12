/* Seasonal images share one manifest; originals remain available as fallbacks. */
(()=>{
 'use strict';
 const base=new URL('.',document.currentScript.src);
 let manifest={},season=document.documentElement.dataset.season||'autumn',scheduled=false;
 const reverse=new Map(),pending=new Set(),failed=new Set();
 const path=url=>{try{const parsed=new URL(url,document.baseURI);return parsed.origin===base.origin&&parsed.pathname.startsWith(base.pathname)?parsed.pathname.slice(base.pathname.length):'';}catch{return '';}};
 function refreshImage(img){
  const current=path(img.getAttribute('src')||'');
  // The Telegram gift previews the actual published sticker pack.
  if(img.closest('.gift-fan')){
   const source=img.dataset.seasonSource||reverse.get(current);
   if(source&&current!==source)img.setAttribute('src',new URL(source,base).href);
   delete img.dataset.seasonSource;img.classList.remove('season-mirrored');return;
  }
  let key=manifest[current]?current:reverse.has(current)?(img.dataset.seasonSource||reverse.get(current)):null;
  if(!key||!manifest[key]){delete img.dataset.seasonSource;img.classList.remove('season-mirrored');return;}
  const entry=manifest[key];img.dataset.seasonSource=key;
  const desired=entry.seasons[season]||key;
  const wanted=failed.has(desired)?key:desired;
  img.classList.toggle('season-mirrored',Boolean(entry.mirror&&wanted!==key));
  if(current!==wanted)img.setAttribute('src',new URL(wanted,base).href);
  // The dancing fox uses a second layer masked by the same image.
  if(img.closest('.fox-stage')){
   const mask=img.closest('.fox-stage').querySelector('.fox-stage-rainbow');
   if(mask){const url='url("'+new URL(wanted,base).href+'")';mask.style.maskImage=mask.style.webkitMaskImage=url;}
  }
 }
 function queue(node){
  if(node.nodeType!==1)return;
  if(node.tagName==='IMG')pending.add(node);
  node.querySelectorAll('img').forEach(img=>pending.add(img));
  if(scheduled)return;scheduled=true;
  setTimeout(()=>{scheduled=false;const images=[...pending];pending.clear();images.forEach(refreshImage);},0);
 }
 function apply(next){season=next;queue(document.body);}
 window.CRH_SEASON_ASSETS={apply};
 new MutationObserver(records=>{
  for(const r of records){if(r.type==='attributes')queue(r.target);else r.addedNodes.forEach(queue);}
 }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 document.addEventListener('error',e=>{
  const img=e.target;if(img.tagName!=='IMG'||!img.dataset.seasonSource)return;
  const source=img.dataset.seasonSource,current=path(img.getAttribute('src')||'');
  if(current===source)return;failed.add(current);img.setAttribute('src',new URL(source,base).href);img.classList.remove('season-mirrored');
 },true);
 fetch(new URL('season-assets.json',base)).then(r=>{if(!r.ok)throw Error('Missing seasonal image manifest');return r.json();}).then(data=>{
  manifest=data.images;
  Object.entries(manifest).forEach(([source,entry])=>Object.values(entry.seasons).forEach(file=>{if(!reverse.has(file))reverse.set(file,source);}));
  apply(document.documentElement.dataset.season||season);
 }).catch(()=>{/* Original catalog images stay visible when the pack is unavailable. */});
})();
