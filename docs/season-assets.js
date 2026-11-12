/* Responsive seasonal images; the published Telegram pack keeps its originals. */
(()=>{
 'use strict';
 const base=new URL('.',document.currentScript.src);
 let manifest={},season=document.documentElement.dataset.season||'autumn',scheduled=false;
 const reverse=new Map(),pending=new Set(),failed=new Set(),observed=new WeakSet();
 const path=url=>{try{const parsed=new URL(url,document.baseURI);return parsed.origin===base.origin&&parsed.pathname.startsWith(base.pathname)?parsed.pathname.slice(base.pathname.length):'';}catch{return '';}};
 function updateSize(img){
  const width=Math.ceil(img.getBoundingClientRect().width);
  if(width>0&&img.sizes!==width+'px')img.sizes=width+'px';
 }
 const resizeObserver=new ResizeObserver(entries=>entries.forEach(({target:img})=>{
  if(!img.isConnected){resizeObserver.unobserve(img);observed.delete(img);return;}
  if(img.dataset.seasonResponsive)updateSize(img);
 }));
 function clearResponsive(img){
  if(!img.dataset.seasonResponsive)return;
  img.removeAttribute('srcset');img.removeAttribute('sizes');delete img.dataset.seasonResponsive;
  resizeObserver.unobserve(img);observed.delete(img);
 }
 function updateMask(img){
  if(!img.closest('.fox-stage')||!img.complete||!img.naturalWidth)return;
  const mask=img.closest('.fox-stage').querySelector('.fox-stage-rainbow');
  if(mask){const url='url("'+(img.currentSrc||img.src)+'")';mask.style.maskImage=mask.style.webkitMaskImage=url;}
 }
 function refreshImage(img){
  const current=path(img.getAttribute('src')||'');
  if(img.closest('.gift-fan')){
   const source=img.dataset.seasonSource||reverse.get(current);
   clearResponsive(img);
   if(source&&current!==source)img.setAttribute('src',new URL(source,base).href);
   delete img.dataset.seasonSource;img.classList.remove('season-mirrored');return;
  }
  const key=manifest[current]?current:reverse.has(current)?(img.dataset.seasonSource||reverse.get(current)):null;
  if(!key||!manifest[key]){clearResponsive(img);delete img.dataset.seasonSource;img.classList.remove('season-mirrored');return;}
  const entry=manifest[key];img.dataset.seasonSource=key;img.decoding='async';
  if(!img.hasAttribute('loading')){const rect=img.getBoundingClientRect();img.loading=!rect.width||rect.top>innerHeight+160?'lazy':'eager';}
  const desired=entry.seasons[season]||key,wanted=failed.has(desired)?key:desired;
  img.classList.toggle('season-mirrored',Boolean(entry.mirror&&wanted!==key));
  const variants=entry.responsive?.[season];
  if(wanted!==key&&variants?.length){
   img.dataset.seasonResponsive='true';updateSize(img);
   const srcset=variants.map(v=>new URL(v.src,base).href+' '+v.width+'w').join(', ');
   if(img.getAttribute('srcset')!==srcset)img.setAttribute('srcset',srcset);
   if(!observed.has(img)){observed.add(img);resizeObserver.observe(img);}
  }else clearResponsive(img);
  if(current!==wanted)img.setAttribute('src',new URL(wanted,base).href);
  updateMask(img);
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
 document.addEventListener('load',e=>{if(e.target.tagName==='IMG'&&e.target.dataset.seasonSource)updateMask(e.target);},true);
 document.addEventListener('error',e=>{
  const img=e.target;if(img.tagName!=='IMG'||!img.dataset.seasonSource)return;
  const source=img.dataset.seasonSource,current=path(img.getAttribute('src')||'');
  if(current===source)return;failed.add(current);clearResponsive(img);
  img.setAttribute('src',new URL(source,base).href);img.classList.remove('season-mirrored');
 },true);
 fetch(new URL('season-assets.json?v=responsive-20261112',base)).then(r=>{if(!r.ok)throw Error('Missing seasonal image manifest');return r.json();}).then(data=>{
  manifest=data.images;
  Object.entries(manifest).forEach(([source,entry])=>{
   const names=[...Object.values(entry.seasons),...Object.values(entry.legacySeasons||{}),...Object.values(entry.responsive||{}).flat().map(v=>v.src)];
   names.forEach(file=>{if(!reverse.has(file))reverse.set(file,source);});
  });
  apply(document.documentElement.dataset.season||season);
 }).catch(()=>{/* Original images remain available if the manifest is unavailable. */});
})();
