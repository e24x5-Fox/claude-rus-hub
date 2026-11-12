(()=>{
 'use strict';
 const key='fox-season-beta-v1', root=document.documentElement;
 const icons={spring:'<path d="M12 10C3-2 0 12 9 13 0 19 12 27 13 16 20 25 28 12 16 12 25 3 11-1 12 10Z"/><circle cx="12" cy="13" r="2"/>',summer:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',autumn:'<path d="M20 3C9 1 1 8 5 16c8 5 15-2 15-13Z M3 21 16 8m-7 7V9m0 6h6"/>',winter:'<path d="M12 1v22M2.5 6.5l19 11M2.5 17.5l19-11M8 3l4 4 4-4M8 21l4-4 4 4M3 11l5-1-1-5m14 8-5 1 1 5M3 13l5 1-1 5m14-8-5-1 1-5"/>'};
 const names={spring:'Весна',summer:'Лето',autumn:'Осень',winter:'Зима'};
 const copy={spring:['Мастерская расцветает','Свежая зелень, цветущие ветки и лепестки в воздухе.'],summer:['Долгие вечера в мастерской','Солнечное золото, тёплый вечер и светлячки после заката.'],autumn:['Время уютных историй','Медные листья, тёплый свет и игры для дождливого вечера.'],winter:['Тихий свет зимней мастерской','Морозное серебро, синий сумрак и неспешный снег.']};
 function svg(s){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[s]+'</svg>';}
 let saved={};try{saved=JSON.parse(localStorage.getItem(key))||{};}catch{}
 const requested=new URLSearchParams(location.search).get('season');
 let state={season:names[requested]?requested:(names[saved.season]?saved.season:'autumn'),auto:names[requested]?false:saved.auto!==false,motion:saved.motion!==false};
 const panel=document.createElement('section');panel.className='season-studio';panel.setAttribute('aria-label','Сезонное оформление');
 panel.innerHTML='<div class="season-topline"><span>Сезоны мастерской</span><span class="season-beta">Тестовый каталог</span></div><h2 id="season-title"></h2><p class="season-description" id="season-description"></p><div class="season-art" aria-hidden="true"></div><div class="season-controls"><div class="season-tabs" role="group" aria-label="Выбрать сезон">'+Object.keys(names).map(s=>'<button type="button" data-season-choice="'+s+'" aria-pressed="false">'+svg(s)+names[s]+'</button>').join('')+'</div><div class="season-prefs"><label><input type="checkbox" id="season-auto">По календарю</label><label><input type="checkbox" id="season-motion">Атмосфера</label></div></div>';
 const banks=document.createElement('div');banks.className='season-banks';banks.setAttribute('aria-hidden','true');banks.innerHTML='<i></i><i></i>';
 const atmosphere=document.createElement('div');atmosphere.className='season-atmosphere';atmosphere.setAttribute('aria-hidden','true');
 function calendar(){const m=new Date().getMonth();return m===11||m<2?'winter':m<5?'spring':m<8?'summer':'autumn';}
 function store(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
 function apply(){
  const s=state.auto?calendar():state.season;root.dataset.season=s;root.dataset.seasonMotion=state.motion?'on':'off';
  window.CRH_SEASON_ASSETS?.apply(s);
  panel.querySelector('#season-title').textContent=copy[s][0];panel.querySelector('#season-description').textContent=copy[s][1];
  panel.querySelector('.season-art').innerHTML='<svg viewBox="0 0 160 160" fill="none" aria-hidden="true"><circle cx="80" cy="80" r="61" stroke="currentColor" stroke-opacity=".12"/><circle cx="80" cy="80" r="48" stroke="currentColor" stroke-opacity=".16" stroke-dasharray="2 8"/><g transform="translate(48 48) scale(2.65)" stroke="currentColor" stroke-width=".65" stroke-linecap="round" stroke-linejoin="round">'+icons[s]+'</g><path d="M22 123Q80 144 139 120" stroke="currentColor" stroke-opacity=".25"/></svg>';
  panel.querySelectorAll('[data-season-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.seasonChoice===s)));
  panel.querySelector('#season-auto').checked=state.auto;panel.querySelector('#season-motion').checked=state.motion;
  atmosphere.replaceChildren();
  if(state.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){for(let i=0;i<42;i++){const p=document.createElement('i');p.className='season-particle';p.dataset.depth=String(.18+(i%5)*.13);p.style.cssText='--x:'+((i*37+11)%100)+'%;--size:'+(s==='summer'?3:s==='winter'?4+i%6:9+i%10)+'px;--duration:'+(15+i%7*2)+'s;--delay:-'+(i*2.7)+'s';atmosphere.append(p);}}
  updateParallax();store();
 }
 let parallaxFrame=0;
 function updateParallax(){
  parallaxFrame=0;
  const active=state.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const offset=active?scrollY:0;
  const height=Math.max(document.body.offsetHeight,innerHeight);
  atmosphere.style.height=height+'px';atmosphere.style.setProperty('--season-fall-distance',(height+60)+'px');
  atmosphere.querySelectorAll('.season-particle').forEach(p=>{p.style.translate='0 '+(offset*(1-Number(p.dataset.depth||.3)))+'px';});
 }
 new ResizeObserver(()=>{if(!parallaxFrame)parallaxFrame=requestAnimationFrame(updateParallax);}).observe(document.body);
 addEventListener('scroll',()=>{if(!parallaxFrame)parallaxFrame=requestAnimationFrame(updateParallax);},{passive:true});
 function mount(){if(!document.querySelector('.season-studio')){const nav=document.querySelector('.nav');if(nav)nav.after(panel);else document.body.prepend(panel);}if(!atmosphere.isConnected)document.body.prepend(atmosphere);if(!banks.isConnected)document.body.prepend(banks);}
 panel.addEventListener('click',e=>{const b=e.target.closest('[data-season-choice]');if(!b)return;state.season=b.dataset.seasonChoice;state.auto=false;apply();});
 panel.querySelector('#season-auto').addEventListener('change',e=>{state.auto=e.target.checked;apply();});
 panel.querySelector('#season-motion').addEventListener('change',e=>{state.motion=e.target.checked;apply();});
 mount();apply();
 // The beta uses navigation without a page reload; keep the theme toolbar alive.
 new MutationObserver(()=>{if(!panel.isConnected||!atmosphere.isConnected||!banks.isConnected)mount();}).observe(document.body,{childList:true});
 addEventListener('pageshow',mount);
 setInterval(()=>{if(state.auto&&root.dataset.season!==calendar())apply();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.auto&&root.dataset.season!==calendar())apply();});
})();
