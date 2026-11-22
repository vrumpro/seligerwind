import {roomBedrooms,renderBookingCards,resetBookingSelection,selectedCurrency,restoreBookingUi,clearBookingFilters} from './booking-ui.js';
import {icon} from './icons.js';
import {enhanceFields,syncFields,closePicker,positionPopover,setFieldExpanded} from './custom-fields.js';
import {catalog as fullCatalog} from './catalog.js';
// Winter selection: safari tents temporarily excluded; source records retained.
const catalog=fullCatalog.filter(room=>!room.name.includes('Safari'));
import {today,addDays,validate,bookingUrl} from './booking.js';
const $=s=>document.querySelector(s);const arrival=$('#arrival'),departure=$('#departure'),adults=$('#adults'),count=$('#children-count'),ages=$('#ages');
const option=(value,label)=>new Option(label,value);
for(let i=1;i<=16;i++)adults.add(option(i,i));
let saved={};try{saved=JSON.parse(sessionStorage.getItem('seliger-search')||'{}')}catch{}
const shared=new URLSearchParams(location.search);restoreBookingUi(shared);if(['all','house'].includes(shared.get('type')))document.querySelector('#type').value=shared.get('type');
if(shared.has('arrival')){try{const proposal={arrival:shared.get('arrival'),departure:shared.get('departure'),adults:Number(shared.get('adults')),children:JSON.parse(shared.get('children')||'[]')};if(!validate(proposal))saved=proposal}catch{}}
const bedrooms=document.querySelector('#bedrooms');bedrooms.value=['1','2','3'].includes(shared.get('bedrooms')||saved.bedrooms)?(shared.get('bedrooms')||saved.bedrooms):'any';
const base=today();arrival.min=base;arrival.value=saved.arrival>=base?saved.arrival:base;departure.value=saved.departure>arrival.value?saved.departure:addDays(arrival.value,2);departure.min=addDays(arrival.value,1);adults.value=String(saved.adults||2);if(!adults.value)adults.value='2';count.value=String(Array.isArray(saved.children)?Math.min(saved.children.length,6):0);
function ageLabel(n){return n===0?'До 1 года':n+' '+(n%10===1&&n!==11?'год':n%10>=2&&n%10<=4&&(n<12||n>14)?'года':'лет')}
function updateChildrenSummary(){const n=Number(count.value);$('#children-summary').textContent=n?n+' '+(n===1?'ребёнок':n<5?'ребёнка':'детей'):'Без детей';$('#add-child').disabled=n>=6;$('#children-error').textContent=''}
function makeAges(previous=[]){ages.replaceChildren();for(let i=0;i<Number(count.value);i++){const row=document.createElement('div');row.className='child-row';const label=document.createElement('label');label.textContent='Ребёнок '+(i+1);const select=document.createElement('select');select.required=true;select.add(option('','Возраст'));for(let n=0;n<18;n++)select.add(option(n,ageLabel(n)));select.value=previous[i]==null?'':String(previous[i]);label.append(select);const remove=document.createElement('button');remove.type='button';remove.className='remove-child';remove.innerHTML=icon('minus');remove.setAttribute('aria-label','Убрать ребёнка '+(i+1));remove.onclick=()=>{const current=state().children;current.splice(i,1);count.value=String(current.length);makeAges(current);invalidate();($('#ages select')||$('#add-child')).focus()};row.append(label,remove);ages.append(row)}updateChildrenSummary();enhanceFields(ages)}
const childrenPanel=document.querySelector('#children-panel');document.body.append(childrenPanel);
function placeChildren(){if(!childrenPanel.hidden)positionPopover(childrenPanel,document.querySelector('#children-toggle'))}
new ResizeObserver(placeChildren).observe(childrenPanel);window.addEventListener('resize',placeChildren);window.addEventListener('scroll',placeChildren,{passive:true});
function childrenOpen(open,focus=false){closePicker();$('#children-panel').hidden=!open;setFieldExpanded(document.querySelector('#children-toggle'),open);if(open)positionPopover(childrenPanel,document.querySelector('#children-toggle'));if(focus)(open?($('#ages select')||$('#add-child')):$('#children-toggle')).focus({preventScroll:true})}
$('#children-toggle').onclick=()=>childrenOpen($('#children-panel').hidden,true);
$('#children-close').onclick=()=>childrenOpen(false,true);
$('#add-child').onclick=()=>{if(Number(count.value)>=6)return;const current=state().children;count.value=String(current.length+1);makeAges([...current,null]);invalidate();[...ages.querySelectorAll('select')].at(-1).focus()};
$('#children-done').onclick=()=>{const missing=ages.querySelector('select:invalid');if(missing){$('#children-error').textContent='Выберите возраст каждого ребёнка.';missing.focus();return}childrenOpen(false,true)};
document.addEventListener('pointerdown',e=>{if(!childrenPanel.hidden&&!e.target.closest('.children-field,#children-panel,.choice-popover'))childrenOpen(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#children-panel').hidden){e.preventDefault();childrenOpen(false,true)}});
makeAges(saved.children);
function state(){return {bedrooms:bedrooms.value,arrival:arrival.value,departure:departure.value,adults:Number(adults.value),children:[...ages.querySelectorAll('select')].map(s=>s.value===''?null:Number(s.value))}}
let expanded=false;let selected='';let searched=false;
function remember(){try{sessionStorage.setItem('seliger-search',JSON.stringify(state()))}catch{}}
let resultsScrollTimer;
function scrollToFilteredHomes(){
 clearTimeout(resultsScrollTimer);
 resultsScrollTimer=setTimeout(()=>{
  const catalogBlock=document.querySelector('#catalog');
  const headerBottom=document.querySelector('header').getBoundingClientRect().bottom;
  const searchHeight=document.querySelector('#search').offsetHeight;
  const top=window.scrollY+catalogBlock.getBoundingClientRect().top-headerBottom-searchHeight-24;
  window.scrollTo({top:Math.max(0,top),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 },140);
}
function invalidate(){resetBookingSelection();resetSearch();syncFields();remember();$('#form-error').textContent='';if(!$('#booking').hidden){$('#booking').hidden=true;$('#booking-frame').removeAttribute('src');$('#external-booking').removeAttribute('href')}render();scrollToFilteredHomes()}
arrival.addEventListener('change',()=>{if(arrival.value){departure.min=addDays(arrival.value,1);if(departure.value<=arrival.value)departure.value=addDays(arrival.value,2)}invalidate()});departure.addEventListener('change',invalidate);bedrooms.addEventListener('change',()=>{expanded=false;invalidate()});adults.addEventListener('change',invalidate);ages.addEventListener('change',()=>{updateChildrenSummary();invalidate()});count.addEventListener('change',()=>{const prev=state().children;makeAges(prev);invalidate()});
document.addEventListener('select-alternative-dates',e=>{
 arrival.value=e.detail.arrival;departure.value=e.detail.departure;departure.min=addDays(arrival.value,1);
 childrenOpen(false);invalidate();
});
function openBooking(room='',currency=selectedCurrency()){
 const s=state(),error=validate(s);if(error){$('#form-error').textContent=error;$('#search').scrollIntoView();const missing=ages.querySelector('select:invalid');if(missing)childrenOpen(true);(missing||arrival).focus({preventScroll:true});return}
 const item=catalog.find(r=>r.id===room);if(item?.capacity&&s.adults+s.children.length>item.capacity){$('#form-error').textContent=`В ${item.name} указано до ${item.capacity} гостей. Уменьшите состав гостей или найдите другое проживание.`;$('#search').scrollIntoView();adults.focus({preventScroll:true});return}
 childrenOpen(false);const kind=$('#type').value;const group=kind==='all'?'':catalog.filter(r=>(r.name.includes('Safari')?'tent':'house')===kind).map(r=>r.id).join(',');const target=new URL(bookingUrl(s,room||group));target.searchParams.set('currency',currency);const url=target.href;remember();$('#booking-title').textContent=item?item.name:kind==='house'?'Дома и виллы':kind==='tent'?'Глэмпинг':'Свободное проживание';const date=v=>v.split('-').reverse().join('.');$('#booking-summary').textContent=`${date(s.arrival)} — ${date(s.departure)} · взрослых: ${s.adults} · детей: ${s.children.length}`;$('#external-booking').href=url;$('#booking-frame').src=url;$('#booking').hidden=false;$('#booking-title').focus({preventScroll:true});$('#booking').scrollIntoView();
}
$('#booking-form').addEventListener('submit',e=>{e.preventDefault();searchHouses()});$('#close-booking').onclick=()=>{$('#booking').hidden=true;$('#booking-frame').removeAttribute('src');arrival.focus();$('#search').scrollIntoView()};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function meta(r){return `${r.area} м² · ${r.capacity?'до '+r.capacity+' гостей':'вместимость уточняется при поиске'}`}
function render(){
 const total=state().adults+Number(count.value),kind=$('#type').value;
 const rooms=catalog.filter(r=>(kind==='all'||(r.name.includes('Safari')?'tent':'house')===kind)&&(!r.capacity||r.capacity>=total)&&(bedrooms.value==='any'||(bedrooms.value==='3'?roomBedrooms(r)>=3:roomBedrooms(r)===Number(bedrooms.value))));
 renderBookingCards(rooms,{state:state(),expanded:true,refresh:render,book:openBooking});
}function syncType(){resetSearch();syncFields();document.querySelectorAll('[data-search-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.searchType===$('#type').value)));expanded=false;if(!$('#booking').hidden){$('#booking').hidden=true;$('#booking-frame').removeAttribute('src')}render()}
$('#type').onchange=syncType;document.querySelectorAll('[data-search-type]').forEach(b=>b.onclick=()=>{$('#type').value=b.dataset.searchType;syncType()});
const dialog=$('#details');dialog.setAttribute('aria-labelledby','detail-title');
function details(id){const r=catalog.find(r=>r.id===id);if(!r)return;selected=id;$('#detail-title').textContent=r.name;$('#detail-meta').textContent=meta(r);$('#detail-photos').innerHTML=r.photos.map((p,i)=>`<a href="${esc(p)}" target="_blank" rel="noopener" aria-label="Открыть фото ${i+1} ${esc(r.name)}"><img src="${esc(p)}" alt="${esc(r.name)}, фото ${i+1}" width="700" height="440"></a>`).join('');$('#detail-description').replaceChildren();for(const text of r.description.split('\n').filter(Boolean)){const p=document.createElement('p');p.textContent=text;$('#detail-description').append(p)}dialog.showModal();dialog.scrollTop=0}
$('.dialog-close').onclick=()=>dialog.close();$('#detail-book').onclick=()=>{dialog.close();openBooking(selected)};document.addEventListener('click',e=>{const d=e.target.closest('[data-detail]'),b=e.target.closest('[data-book]');if(d)details(d.dataset.detail);else if(b)openBooking(b.dataset.book)});syncType();enhanceFields();
// Refresh only when served page sources change; ignore documentation and temporary files.
if(location.hostname==='127.0.0.1'||location.hostname==='localhost'){
 const previewFiles=['index.html','styles.css','app.js','booking.js','catalog.js','custom-fields.js','icons.js','booking-ui.js','booking-icons.js','booking-snapshot.js'];
 const fingerprint=async()=>Promise.all(previewFiles.map(async file=>{const r=await fetch('/'+file,{cache:'no-store'});if(!r.ok)throw Error('Preview unavailable');const hash=await crypto.subtle.digest('SHA-256',await r.arrayBuffer());return Array.from(new Uint8Array(hash)).join(',')})).then(parts=>parts.join('|'));
 let previewVersion,previewSignature,previewBusy=false;
 async function checkPreview(){if(previewBusy)return;previewBusy=true;try{const r=await fetch('/__version',{cache:'no-store'});if(!r.ok)return;const version=await r.text();if(version!==previewVersion){const signature=await fingerprint();if(previewSignature&&signature!==previewSignature){location.reload();return}previewVersion=version;previewSignature=signature}}catch{}finally{previewBusy=false}}
 checkPreview();setInterval(checkPreview,2500);
}
const slideshow=document.querySelector('.hero-slideshow');const slides=[...slideshow.querySelectorAll('.hero-slide')];const motion=matchMedia('(prefers-reduced-motion: reduce)');let slideIndex=0,slideTimer=null,heroInView=true;
function nextSlide(){if(slideshow.classList.contains('is-scrolling'))return;const nextIndex=(slideIndex+1)%slides.length,next=slides[nextIndex];if(!next.complete||!next.naturalWidth)return;const previous=slides[slideIndex];next.classList.remove('is-moving');void next.offsetWidth;next.classList.add('is-moving','is-visible');previous.classList.remove('is-visible');setTimeout(()=>{if(!previous.classList.contains('is-visible'))previous.classList.remove('is-moving')},1400);slideIndex=nextIndex}
function syncSlideshow(){clearInterval(slideTimer);slideTimer=null;const paused=motion.matches||!heroInView||document.hidden;slideshow.classList.toggle('is-paused',paused);if(!paused)slideTimer=setInterval(nextSlide,5000)}
new IntersectionObserver(entries=>{heroInView=entries[0].isIntersecting;syncSlideshow()},{threshold:.05}).observe(document.querySelector('.hero'));document.addEventListener('visibilitychange',syncSlideshow);motion.addEventListener('change',syncSlideshow);syncSlideshow();
const siteHeader=document.querySelector('header');let headerScrolled;function syncHeaderScroll(){const next=window.scrollY>32;if(next!==headerScrolled){siteHeader.classList.toggle('is-scrolled',next);headerScrolled=next}}
let scrollFrame=0,scrollEnd;window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;syncHeaderScroll()});if(!slideshow.classList.contains('is-scrolling'))slideshow.classList.add('is-scrolling');clearTimeout(scrollEnd);scrollEnd=setTimeout(()=>slideshow.classList.remove('is-scrolling'),180)},{passive:true});syncHeaderScroll();
$('#clear-search').onclick=()=>{bedrooms.value='any';clearBookingFilters();childrenOpen(false);closePicker();arrival.value='';departure.value='';departure.min=addDays(today(),1);adults.value='2';count.value='0';makeAges([]);$('#type').value='all';selected='';syncType();invalidate();$('#external-booking').removeAttribute('href')};
function resetSearch(){searched=false}
function searchHouses(){
 const s=state(),error=validate(s);
 if(error){$('#form-error').textContent=error;const missing=ages.querySelector('select:invalid');if(missing)childrenOpen(true);(missing||arrival).focus({preventScroll:true});return}
 childrenOpen(false);remember();$('#form-error').textContent='';searched=true;expanded=false;
 $('#booking').hidden=true;$('#booking-frame').removeAttribute('src');$('#external-booking').removeAttribute('href');
 render();
 $('#houses').scrollIntoView({behavior:'smooth',block:'start'});
}
const searchTabs=document.querySelector('.search-tabs');
function updateTabIndicator(){
 const active=searchTabs.querySelector('[aria-pressed="true"]');if(!active)return;
 searchTabs.style.setProperty('--tab-x',active.offsetLeft+'px');
 searchTabs.style.setProperty('--tab-width',active.offsetWidth+'px');
}
new MutationObserver(updateTabIndicator).observe(searchTabs,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
const tabResize=new ResizeObserver(updateTabIndicator);
tabResize.observe(searchTabs);searchTabs.querySelectorAll('button').forEach(button=>tabResize.observe(button));
updateTabIndicator();requestAnimationFrame(()=>requestAnimationFrame(()=>searchTabs.classList.add('indicator-ready')));
// Original map: photo on hover/focus, details on activation.
const mapPlaces=[
 {id:'house1',name:'BarnHouse №1',x:60.6,y:64,room:'484264',photo:'1680395030224'},
 {id:'house2',name:'BarnHouse №2',x:69.7,y:23,room:'484265',photo:'1680395188540'},
 {id:'house3',name:'BarnHouse №3',x:42.7,y:71,room:'484266',photo:'1680395263650'},
 {id:'house4',name:'BarnHouse №4',x:40.1,y:40,room:'484267',photo:'1680395334581'},
 {id:'house5',name:'BarnHouse №5',x:35.4,y:17,room:'484268',photo:'1680395375668'},
 {id:'house6',name:'BarnHouse №6',x:18.8,y:65,room:'484269',photo:'1680395482045'},
 {id:'house7',name:'BarnHouse №7',x:13.6,y:38,room:'484270',photo:'1680395514694'},
 {id:'bath',name:'Баня с сибирским чаном',x:58.9,y:24,href:'https://seligerwind.com/banya',photo:'1680395749439'},
 {id:'playground',name:'Детская площадка',x:49.3,y:15.5,href:'https://seligerwind.com/fun',photo:'1728217642325'},
 {id:'lake',name:'Озеро и отдых у воды',x:10.4,y:58,href:'https://seligerwind.com/fun',photo:'1680395601213'},
 {id:'parking',name:'Парковка на территории',x:91,y:62,photo:'1680395647120'},
 {id:'rental',name:'Прокат спортивного инвентаря',x:11.5,y:89,href:'https://seligerwind.com/fun',photo:'1680395601213'}
];
const mapRoot=document.querySelector('#territory-map'),mapPreview=document.querySelector('#map-preview'),mapLegend=document.querySelector('#map-legend');
let activeMapPlace=null,mapHideTimer;
document.querySelector('#map-points').innerHTML=mapPlaces.map(p=>'<button type="button" class="map-point" data-map-place="'+p.id+'" style="left:'+p.x+'%;top:'+p.y+'%" aria-label="'+p.name+'" aria-expanded="false" aria-controls="map-preview"></button>').join('');
mapLegend.innerHTML=mapPlaces.map(p=>'<button type="button" data-map-place="'+p.id+'" aria-expanded="false" aria-controls="map-preview">'+p.name+'</button>').join('');
function closeMapPreview(){clearTimeout(mapHideTimer);mapPreview.hidden=true;activeMapPlace=null;document.querySelectorAll('[data-map-place]').forEach(b=>{b.classList.remove('is-active');b.setAttribute('aria-expanded','false')})}
function placeMapPreview(){if(!activeMapPlace)return;const w=mapRoot.clientWidth,h=mapRoot.clientHeight;const x=activeMapPlace.x/100*w,y=activeMapPlace.y/100*h;const pw=mapPreview.offsetWidth,ph=mapPreview.offsetHeight;mapPreview.style.left=Math.max(8,Math.min(w-pw-8,x-pw/2))+'px';mapPreview.style.top=Math.max(8,Math.min(h-ph-8,y>ph+24?y-ph-24:y+24))+'px'}
function openMapPreview(p){clearTimeout(mapHideTimer);if(activeMapPlace?.id!==p.id){activeMapPlace=p;mapPreview.innerHTML='<img src="'+(p.room?catalog.find(room=>room.id===p.room).photos[0]:'assets/map-preview-'+p.photo+'.jpg')+'" alt="'+p.name+'" width="280" height="160"><div class="map-preview-copy"><strong>'+p.name+'</strong>'+(p.room?'<button type="button" class="text-button" data-detail="'+p.room+'">Посмотреть дом '+icon('arrow-right')+'</button>':p.href?'<a class="text-button" href="'+p.href+'" target="_blank" rel="noopener">Подробнее '+icon('arrow-right')+'</a>':'<span>На территории комплекса</span>')+'</div>';mapPreview.querySelector('[data-detail]')?.addEventListener('click',()=>closeMapPreview());mapPreview.querySelector('img').onload=placeMapPreview}
 mapPreview.hidden=false;document.querySelectorAll('[data-map-place]').forEach(b=>{const active=b.dataset.mapPlace===p.id;b.classList.toggle('is-active',active);b.setAttribute('aria-expanded',String(active))});placeMapPreview()}
for(const button of document.querySelectorAll('[data-map-place]')){
 const p=mapPlaces.find(p=>p.id===button.dataset.mapPlace);let touch=false;
 button.addEventListener('pointerdown',e=>touch=e.pointerType==='touch');
 button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')openMapPreview(p)});
 button.addEventListener('focus',()=>openMapPreview(p));
 button.addEventListener('pointerleave',()=>{mapHideTimer=setTimeout(closeMapPreview,220)});
 button.addEventListener('click',()=>{openMapPreview(p);if(!touch&&button.classList.contains('map-point')){if(p.room){details(p.room);closeMapPreview()}else if(p.href)window.open(p.href,'_blank','noopener')}});
}
mapPreview.addEventListener('pointerenter',()=>clearTimeout(mapHideTimer));mapPreview.addEventListener('pointerleave',()=>{mapHideTimer=setTimeout(closeMapPreview,220)});
document.addEventListener('pointerdown',e=>{if(!mapRoot.contains(e.target)&&!mapLegend.contains(e.target))closeMapPreview()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeMapPlace){const trigger=document.querySelector('.map-point[data-map-place="'+activeMapPlace.id+'"]');trigger?.focus({preventScroll:true});closeMapPreview()}});
window.addEventListener('resize',placeMapPreview);
const searchSurface=document.querySelector('#search');
// Native sticky positioning is constrained by the houses section.
let searchDockFrame=0;
function syncSearchDock(){
 searchDockFrame=0;
 const header=document.querySelector('header');
 const headerBottom=Math.max(0,header.getBoundingClientRect().bottom);
 searchSurface.style.setProperty('--search-header-bottom',headerBottom+'px');
 const bounds=searchSurface.getBoundingClientRect();
 searchSurface.classList.toggle('is-docked',bounds.top<=headerBottom+1);
}
function scheduleSearchDock(){if(!searchDockFrame)searchDockFrame=requestAnimationFrame(syncSearchDock)}
window.addEventListener('scroll',scheduleSearchDock,{passive:true});
window.addEventListener('resize',scheduleSearchDock);
new ResizeObserver(scheduleSearchDock).observe(document.querySelector('header'));
new ResizeObserver(scheduleSearchDock).observe(searchSurface);
scheduleSearchDock();
new ResizeObserver(()=>{document.querySelector('#houses').style.setProperty('--search-height',searchSurface.offsetHeight+'px')}).observe(searchSurface);
document.querySelectorAll('[data-leisure-icon]').forEach(el=>el.innerHTML=icon(el.dataset.leisureIcon));
const experiencePhotos={
 sauna:Array.from({length:12},(_,i)=>'assets/sauna-slide-'+(i+1)+'.jpg'),
 playground:Array.from({length:8},(_,i)=>'assets/playground-slide-'+(i+1)+'.jpg')
};
document.querySelectorAll('[data-leisure-gallery]').forEach(gallery=>{
 const sources=experiencePhotos[gallery.dataset.leisureGallery],stage=gallery.querySelector('.experience-stage'),previews=gallery.querySelector('.experience-previews');
 const visible=stage.querySelector('img'),link=stage.querySelector('a'),counter=gallery.querySelector('[data-gallery-counter]');
 let current=0,request=0,swipe=null,suppressClick=false;
 gallery.querySelector('[data-gallery-prev]').innerHTML=icon('chevron-left');
 gallery.querySelector('[data-gallery-next]').innerHTML=icon('chevron-right');
 previews.innerHTML=sources.map((src,i)=>'<button type="button" data-experience-slide="'+i+'" aria-label="Фото '+(i+1)+' из '+sources.length+'" aria-pressed="'+(i===0)+'"><img src="'+src+'" width="120" height="82" alt="" loading="lazy"></button>').join('');
 async function show(index){
  const next=(index+sources.length)%sources.length,token=++request;current=next;
  const image=new Image();image.src=sources[next];stage.setAttribute('aria-busy','true');
  try{await image.decode()}catch{if(token===request)stage.removeAttribute('aria-busy');return}
  if(token!==request)return;
  visible.src=image.src;visible.alt=(gallery.dataset.leisureGallery==='sauna'?'Баня':'Детская площадка')+' Seliger Wind — фото '+(next+1);
  link.href=image.src;counter.textContent=(next+1)+' / '+sources.length;
  previews.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===next)));
  const thumb=previews.children[next],following=previews.children[next+1]||thumb;
  const bounds=previews.getBoundingClientRect(),selected=thumb.getBoundingClientRect(),after=following.getBoundingClientRect();
  let target=previews.scrollLeft;
  if(selected.left<bounds.left+4)target-=bounds.left+4-selected.left;
  else if(after.right>bounds.right-4)target+=after.right-bounds.right+4;
  previews.scrollTo({left:Math.max(0,target),behavior:motion.matches?'instant':'smooth'});
  stage.removeAttribute('aria-busy');
  if(!motion.matches)visible.animate([{opacity:.55},{opacity:1}],{duration:180});
 }
 gallery.querySelector('[data-gallery-prev]').onclick=()=>show(current-1);
 gallery.querySelector('[data-gallery-next]').onclick=()=>show(current+1);
 previews.addEventListener('click',e=>{const button=e.target.closest('[data-experience-slide]');if(button)show(Number(button.dataset.experienceSlide))});
 gallery.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();show(current+(e.key==='ArrowRight'?1:-1))}});
 stage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!e.target.closest('button')){swipe={x:e.clientX,y:e.clientY};suppressClick=false}});
 stage.addEventListener('pointerup',e=>{if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){suppressClick=true;show(current+(dx<0?1:-1))}});
 stage.addEventListener('pointercancel',()=>swipe=null);
 link.addEventListener('click',e=>{if(suppressClick){e.preventDefault();suppressClick=false}});
});
const leisureStack=document.querySelector('.leisure-stack');
function sizeLeisureStack(){
 const headerHeight=document.querySelector('header').getBoundingClientRect().bottom;
 leisureStack.style.setProperty('--leisure-top',(headerHeight+16)+'px');
 const tallest=Math.max(...[...leisureStack.children].map(section=>section.offsetHeight-parseFloat(getComputedStyle(section).paddingTop)));
 leisureStack.classList.toggle('can-stack',innerWidth>760&&innerHeight>tallest+headerHeight+60);
}
new ResizeObserver(sizeLeisureStack).observe(leisureStack);
window.addEventListener('resize',sizeLeisureStack);
document.fonts.ready.then(sizeLeisureStack);
sizeLeisureStack();
const complexFilm=document.querySelector('#complex-film');
const complexPanel=complexFilm.closest('.complex-panel');
const complexPlayer=document.querySelector('#complex-player'),complexFullFilm=document.querySelector('#complex-full-film'),complexPlayerClose=document.querySelector('#complex-player-close');
complexPlayerClose.innerHTML=icon('x');
let complexInView=false,complexNativeFullscreen=false,complexVideoIndex=0,complexUserPaused=false,complexManualPlay=false;
const complexVideos=[
 {src:'assets/complex-video-sound.mp4',poster:'assets/complex-overview-poster.jpg',title:'Дома в сосновом лесу у озера Волго',description:'Seliger Wind — комплекс на южном берегу озера Волго в Тверской области. Дома и виллы стоят среди сосен: можно приехать вдвоём, с детьми или компанией. На территории есть баня с горячим чаном и детская площадка. Для проживания доступны барнхаусы и Tropical Villa с панорамными окнами и собственными террасами, а в тёплый сезон — сафари-тенты.'},
 {src:'assets/complex-tropical.mp4',poster:'assets/complex-tropical-poster.jpg',title:'Tropical Villa — виллы в тропическом стиле',description:'Tropical Villa — отдельные виллы с панорамным остеклением, просторными террасами и собственными зонами отдыха. В интерьерах использованы дерево и натуральные фактуры ротанга, тика и бамбука. Большие окна открывают вид на сосны, а терраса продолжает жилое пространство на улице. В видео можно рассмотреть обстановку внутри и территорию рядом с виллами.'},
 {src:'assets/complex-playground.mp4',poster:'assets/complex-playground-poster.jpg',title:'Детская площадка на территории комплекса',description:'Качели, горки и песочница среди сосен. В ролике — игровая площадка и занятия для детей на свежем воздухе.'}
];
const complexVideoCards=[...document.querySelectorAll('[data-complex-video]')];
function selectComplexVideo(index){
 if(index===complexVideoIndex)return;
 complexVideoIndex=index;const video=complexVideos[index];
 complexFilm.pause();complexFilm.poster=video.poster;complexFilm.src=video.src;complexFilm.load();
 document.querySelector('#complex-title').textContent=video.title;document.querySelector('#complex-description').textContent=video.description;

 complexVideoCards.forEach((card,i)=>{card.closest('.complex-video-card').classList.toggle('is-active',i===index);card.setAttribute('aria-pressed',String(i===index));card.closest('.complex-video-card').style.setProperty('--video-progress','0%')});
 syncComplexBackground();
}
complexVideoCards.forEach((card,i)=>card.addEventListener('click',()=>selectComplexVideo(i)));

complexFilm.addEventListener('ended',()=>selectComplexVideo((complexVideoIndex+1)%complexVideos.length));
function syncComplexBackground(){
 if(complexInView&&!document.hidden&&(!motion.matches||complexManualPlay)&&!complexPlayer.open&&!complexUserPaused)complexFilm.play().catch(()=>{});
 else complexFilm.pause();
}
new IntersectionObserver(entries=>{complexInView=entries[0].isIntersecting&&entries[0].intersectionRatio>=.5;syncComplexBackground()},{threshold:[0,.5]}).observe(complexPanel);
document.addEventListener('visibilitychange',syncComplexBackground);
motion.addEventListener('change',syncComplexBackground);
let complexReturnFocus=null;
function openComplexPlayer(index,trigger){
 complexReturnFocus=trigger;selectComplexVideo(index);
 complexFilm.pause();const selectedVideo=complexVideos[complexVideoIndex];if(!complexFullFilm.currentSrc.endsWith(selectedVideo.src)){complexFullFilm.src=selectedVideo.src;complexFullFilm.load()}complexPlayer.showModal();complexFullFilm.currentTime=0;complexFullFilm.muted=false;complexFullFilm.volume=1;
 // Request fullscreen within the click gesture; the viewport-sized dialog is the fallback.
 if(complexFullFilm.requestFullscreen)complexFullFilm.requestFullscreen().catch(()=>{});
 else if(complexFullFilm.webkitEnterFullscreen){try{complexFullFilm.webkitEnterFullscreen()}catch{}}
 complexFullFilm.play().catch(()=>{});
}
async function closeComplexPlayer(){
 complexFullFilm.pause();
 if((document.fullscreenElement===complexPlayer||document.fullscreenElement===complexFullFilm)){try{await document.exitFullscreen()}catch{}}
 if(complexPlayer.open)complexPlayer.close();
}
complexPlayerClose.addEventListener('click',closeComplexPlayer);
complexPlayer.addEventListener('close',()=>{complexFullFilm.pause();complexNativeFullscreen=false;syncComplexBackground();complexReturnFocus?.focus({preventScroll:true})});
complexFullFilm.addEventListener('ended',()=>{
 selectComplexVideo((complexVideoIndex+1)%complexVideos.length);
 complexFullFilm.src=complexVideos[complexVideoIndex].src;complexFullFilm.load();complexFullFilm.play().catch(()=>{});
});

complexFullFilm.addEventListener('webkitendfullscreen',closeComplexPlayer);
document.addEventListener('fullscreenchange',()=>{
 if((document.fullscreenElement===complexPlayer||document.fullscreenElement===complexFullFilm))complexNativeFullscreen=true;
 else if(complexNativeFullscreen&&complexPlayer.open)complexPlayer.close();
});
const complexToggle=document.querySelector('#complex-toggle'),complexSound=document.querySelector('#complex-sound'),complexExpand=document.querySelector('#complex-expand');
function updateComplexPlayback(){
 const muted=complexFilm.muted||complexFilm.volume===0;
 complexToggle.innerHTML=icon(complexFilm.paused?'play':'pause');complexToggle.setAttribute('aria-label',complexFilm.paused?'Воспроизвести':'Пауза');
 complexSound.innerHTML=icon(muted?'volume-x':'volume-2');complexSound.setAttribute('aria-label',muted?'Включить звук':'Выключить звук');complexSound.setAttribute('aria-pressed',String(!muted));
}
complexExpand.innerHTML=icon('maximize');
complexToggle.addEventListener('click',()=>{complexUserPaused=!complexFilm.paused;if(complexUserPaused)complexFilm.pause();else{complexManualPlay=true;complexFilm.play().catch(()=>{})}});
complexSound.addEventListener('click',()=>{complexFilm.muted=!complexFilm.muted;if(!complexFilm.muted){complexFilm.volume=1;complexUserPaused=false;complexManualPlay=true;complexFilm.play().catch(()=>{})}});
complexExpand.addEventListener('click',()=>openComplexPlayer(complexVideoIndex,complexExpand));
for(const event of ['play','pause','volumechange'])complexFilm.addEventListener(event,updateComplexPlayback);
updateComplexPlayback();
function updateComplexProgress(){
 const film=complexPlayer.open?complexFullFilm:complexFilm;
 const progress=Number.isFinite(film.duration)&&film.duration>0?Math.min(100,film.currentTime/film.duration*100):0;
 const card=complexVideoCards[complexVideoIndex].closest('.complex-video-card');
 card.style.setProperty('--video-progress',progress+'%');
}
for(const film of [complexFilm,complexFullFilm])for(const event of ['timeupdate','loadedmetadata','seeking','emptied'])film.addEventListener(event,updateComplexProgress);
complexPlayer.addEventListener('close',updateComplexProgress);
document.querySelectorAll('[data-bottom-icon]').forEach(el=>el.innerHTML=icon(el.dataset.bottomIcon));
const reviewsStars=document.querySelector('.reviews-stars');
if(reviewsStars)reviewsStars.innerHTML=document.querySelector('.rating-stars')?.innerHTML||'';
// Full public review snapshot, sorted by date; no text truncation or rating filter.
(async function initGuestReviews(){
 const tabs=document.querySelector('.guest-review-tabs'),grid=document.querySelector('.guest-review-grid'),panel=document.querySelector('#guest-review-panel');
 if(!tabs||!grid)return;
 const topics=['Все','Дома','Территория','Сервис'];
 const patterns=[null,/дом|вилл|коттедж|котедж|барн/i,/территор|площадк|дорожк|парковк|лес|озер|озёр|сосн/i,/сервис|персонал|администратор|обслуж|сотрудник|повар|татьян/i];
 try{
 const response=await fetch('assets/reviews.json');if(!response.ok)throw Error('Reviews unavailable');
 const data=await response.json(),seen=new Set();
 const dateValue=s=>{const [d,m,y]=s.split('.');return new Date(Number(y),Number(m)-1,Number(d)).getTime()};
 const reviews=data.reviews.filter(r=>r.text?.trim()).sort((a,b)=>dateValue(b.date)-dateValue(a.date)).filter(r=>{const key=r.name.trim().toLowerCase()+'|'+r.text.replace(/\s+/g,' ').trim().toLowerCase();if(seen.has(key))return false;seen.add(key);return true});
 const sources={1:'Яндекс',15:'Яндекс.Бизнес',6:'Myreviews',3:'2ГИС',2:'Google'};
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 tabs.innerHTML=topics.map((name,i)=>'<button type="button" role="tab" id="review-tab-'+i+'" aria-controls="guest-review-panel" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'" data-review-topic="'+i+'">'+name+'</button>').join('');
 function select(index){
 tabs.querySelectorAll('button').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1});
 panel.setAttribute('aria-labelledby','review-tab-'+index);
 const selected=reviews.filter(r=>!patterns[index]||patterns[index].test(r.text+' '+r.topics.join(' ')));
 grid.innerHTML=selected.map((r,i)=>{
 const initials=r.name.split(/\s+/).slice(0,2).map(x=>x[0]).join('');
 const rating=Math.max(0,Math.min(5,Number(r.rating)));
 const stars=Array.from({length:5},(_,n)=>'<span class="'+(n<rating?'filled':'empty')+'">'+icon('star')+'</span>').join('');
 const url=/^https:\/\//.test(r.url)?r.url:'https://seligerwind.com/#reviews';
 const date=new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',year:'numeric'}).format(dateValue(r.date));
 return '<article class="guest-review-card"><div class="guest-review-author"><span class="guest-review-avatar tone-'+i%4+'" aria-hidden="true">'+safe(initials)+'</span><div><h3>'+safe(r.name)+'</h3><div class="guest-review-meta"><span>'+date+'</span><a href="'+safe(url)+'" target="_blank" rel="noopener">'+safe(sources[r.service]||'Источник')+'</a></div></div></div><div class="guest-review-stars" aria-label="'+rating+' из 5">'+stars+'</div><p>'+safe(r.text)+'</p></article>';
 }).join('')||'<p>По этой теме пока нет отзывов.</p>';
 }
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-review-topic]');if(b)select(Number(b.dataset.reviewTopic))});
 tabs.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const current=Number(document.activeElement.dataset.reviewTopic)||0;const next=e.key==='Home'?0:e.key==='End'?topics.length-1:(current+(e.key==='ArrowRight'?1:-1)+topics.length)%topics.length;select(next);tabs.children[next].focus()});
 select(0);
 }catch{grid.innerHTML='<p>Не удалось загрузить отзывы. <a href="https://yandex.ru/maps/org/seliger_wind/49058104768/reviews/" target="_blank" rel="noopener">Открыть отзывы в Яндексе</a></p>'}
})();
document.querySelectorAll('[data-faq-icon]').forEach(el=>el.innerHTML=icon('chevron-down'));
// Equal-height review carousel; full text opens in an accessible native dialog.
(function reviewCarousel(){
 const track=document.querySelector('.guest-review-grid');
 if(!track)return;
 track.setAttribute('aria-label','Отзывы гостей, горизонтальный слайдер');
 track.tabIndex=0;
 const controls=document.createElement('div');controls.className='review-slider-controls';
 controls.innerHTML='<button type="button" aria-label="Предыдущие отзывы">'+icon('chevron-left')+'</button><span aria-live="polite"></span><button type="button" aria-label="Следующие отзывы">'+icon('chevron-right')+'</button>';
 document.querySelector('#guest-review-panel').append(controls);
 const [prev,next]=controls.querySelectorAll('button'),counter=controls.querySelector('span');
 const modal=document.createElement('dialog');modal.className='review-full-dialog';modal.setAttribute('aria-label','Полный отзыв гостя');
 modal.innerHTML='<button type="button" class="review-full-close" aria-label="Закрыть отзыв">'+icon('plus')+'</button><div class="review-full-content"></div>';document.body.append(modal);
 modal.querySelector('button').onclick=()=>modal.close();
 modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close()}});
 function update(){
 const cards=[...track.querySelectorAll('.guest-review-card')],step=(cards[0]?.getBoundingClientRect().width||0)+20;
 const visible=Math.max(1,Math.round((track.clientWidth+20)/step)),first=Math.round(track.scrollLeft/step)+1;
 prev.disabled=track.scrollLeft<2;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;prev.hidden=prev.disabled;next.hidden=next.disabled;
 counter.textContent=cards.length?first+'–'+Math.min(cards.length,first+visible-1)+' из '+cards.length:'';
 }
 function move(direction){track.scrollBy({left:direction*(track.clientWidth+20),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
 prev.onclick=()=>move(-1);next.onclick=()=>move(1);
 track.addEventListener('scroll',update,{passive:true});
 track.addEventListener('keydown',e=>{if(e.target!==track)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1)}});
 function truncate(){
 track.querySelectorAll('.guest-review-card').forEach(card=>{
 const text=card.querySelector('p');let more=card.querySelector('.review-read-more');
 if(!more){more=document.createElement('button');more.type='button';more.className='review-read-more';more.textContent='Читать далее';card.append(more);more.onclick=()=>{const copy=card.cloneNode(true);copy.querySelector('.review-read-more')?.remove();modal.querySelector('.review-full-content').replaceChildren(copy);modal.showModal();modal.scrollTop=0}};
 more.hidden=text.scrollHeight<=text.clientHeight+1;
 });update();
 }
 new MutationObserver(()=>{track.scrollLeft=0;requestAnimationFrame(truncate)}).observe(track,{childList:true});
 new ResizeObserver(truncate).observe(track);
 document.fonts.ready.then(truncate);
 truncate();
})();
// Return to the existing search while preserving dates, guests and room filters.
document.querySelectorAll('[data-booking-cta]').forEach(link=>link.addEventListener('click',event=>{
 event.preventDefault();
 const houses=document.querySelector('#houses'),header=document.querySelector('header');
 const top=houses.getBoundingClientRect().top+window.scrollY-header.getBoundingClientRect().height-document.querySelector('#search').offsetHeight/2-16;
 window.scrollTo({top:Math.max(0,top),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 document.querySelector('#arrival-control')?.focus({preventScroll:true});
}));
// Mobile navigation follows the compact header / bottom destinations pattern.
(function mobileNavigation(){
 const header=document.querySelector('header');
 const menuButton=document.createElement('button');menuButton.type='button';menuButton.className='mobile-menu-toggle';menuButton.setAttribute('aria-label','Открыть меню');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-controls','mobile-site-menu');
 menuButton.innerHTML='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';header.append(menuButton);
 const menu=document.createElement('dialog');menu.id='mobile-site-menu';menu.className='mobile-site-menu';menu.setAttribute('aria-labelledby','mobile-menu-title');
 menu.innerHTML='<div class="mobile-menu-heading"><h2 id="mobile-menu-title">Меню</h2><button type="button" aria-label="Закрыть меню">'+icon('plus')+'</button></div><div class="mobile-menu-links"><a href="#home">Главная</a><a href="#houses">Наши дома</a><a href="#territory">Карта территории</a><a href="#sauna">Баня с чаном</a><a href="#playground">Детская площадка</a><a href="#pets">С питомцами</a><a href="#reviews">Отзывы</a><a href="#contacts">Контакты и маршрут</a><a href="#faq">Частые вопросы</a><a href="https://seligerwind.com/rules_of_accommodation" target="_blank" rel="noopener">Правила проживания</a></div><a class="mobile-menu-phone" href="tel:+79672258372">+7 (967) 225-83-72<small>Администратор · Татьяна</small></a>';document.body.append(menu);
 menu.querySelector('.mobile-menu-links').innerHTML=header.querySelector('nav').innerHTML;
 menu.querySelector('.mobile-menu-phone').remove();
 const menuContact=document.createElement('div');menuContact.className='mobile-menu-contact';
 menuContact.append(document.querySelector('.faq-contact-options').cloneNode(true));menu.append(menuContact);
 menuButton.onclick=()=>{closePicker();childrenOpen(false);menu.showModal();menuButton.setAttribute('aria-expanded','true');document.body.classList.add('mobile-menu-open')};
 menu.querySelector('button').onclick=()=>menu.close();
 menu.addEventListener('close',()=>{menuButton.setAttribute('aria-expanded','false');document.body.classList.remove('mobile-menu-open')});
 menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientY>r.bottom||e.clientY<r.top)menu.close()}if(e.target.closest('a'))menu.close()});
 const nav=document.createElement('div');nav.className='mobile-bottom-nav';nav.setAttribute('role','navigation');nav.setAttribute('aria-label','Основные разделы');
 const items=[['home','Главная','house'],['houses','Дома','calendar-days'],['directions','Карта','map-pin'],['reviews','Отзывы','star'],['quick-contacts','Контакты','phone']];
 const phone=document.querySelector('.faq-admin-phone .icon')?.outerHTML||icon('map-pin');
 nav.innerHTML=items.map(([id,label,name])=>'<a href="#'+id+'" data-mobile-destination="'+id+'">'+(name==='phone'?phone:icon(name))+'<span>'+label+'</span></a>').join('');document.body.append(nav);
 const contactLink=nav.querySelector('[data-mobile-destination="quick-contacts"]');
 const contactButton=document.createElement('button');
 contactButton.type='button';contactButton.innerHTML=contactLink.innerHTML;
 contactButton.dataset.mobileDestination='quick-contacts';
 contactButton.setAttribute('aria-haspopup','dialog');contactButton.setAttribute('aria-controls','mobile-quick-contacts');contactButton.setAttribute('aria-expanded','false');
 contactLink.replaceWith(contactButton);
 const sheet=document.createElement('dialog');sheet.id='mobile-quick-contacts';sheet.className='mobile-contacts-sheet';sheet.setAttribute('aria-labelledby','quick-contacts-title');
 sheet.innerHTML='<div class="mobile-sheet-handle"></div><div class="mobile-menu-heading"><h2 id="quick-contacts-title">Быстрые контакты</h2><button type="button" aria-label="Закрыть контакты">'+icon('plus')+'</button></div>';
 sheet.append(document.querySelector('.faq-contact-options').cloneNode(true));
 const address=document.createElement('div');address.className='mobile-sheet-address';address.innerHTML=icon('map-pin')+'<span>Тверская область, Селижаровский район, деревня Ланино, ул. Береговая, 23</span>';sheet.append(address);
 const route=document.createElement('a');route.className='mobile-route-button';route.target='_blank';route.rel='noopener';route.href='https://yandex.ru/maps/?rtext=~'+encodeURIComponent('Seliger Wind, Тверская область, деревня Ланино, Береговая улица, 23')+'&rtt=auto';
 route.innerHTML='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="17" r="3"/><path d="M9 17h8a4 4 0 0 0 0-8H7a4 4 0 0 1 0-8h8"/><circle cx="18" cy="3" r="3"/></svg><span>Построить маршрут<small>Через Яндекс Карты</small></span>';
 sheet.append(route);document.body.append(sheet);
 contactButton.onclick=()=>{closePicker();childrenOpen(false);sheet.showModal();document.body.classList.add('mobile-menu-open');contactButton.setAttribute('aria-expanded','true');contactButton.classList.add('is-active')};
 sheet.querySelector('.mobile-menu-heading button').onclick=()=>sheet.close();
 sheet.addEventListener('close',()=>{document.body.classList.remove('mobile-menu-open');contactButton.setAttribute('aria-expanded','false');contactButton.classList.remove('is-active')});
 sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom)sheet.close()}if(e.target.closest('.mobile-sheet-address'))sheet.close()});
 window.addEventListener('resize',()=>{if(innerWidth>760&&sheet.open)sheet.close()});
 let pending=false;
 function update(){pending=false;if(innerWidth>760)return;let current='home';for(const [id] of items){if(document.getElementById(id)?.getBoundingClientRect().top<innerHeight*.42)current=id}nav.querySelectorAll('a').forEach(a=>{const on=a.dataset.mobileDestination===current;a.classList.toggle('is-active',on);if(on)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')})}
 window.addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(update)}},{passive:true});
 window.addEventListener('resize',()=>{if(innerWidth>760&&menu.open)menu.close();update()});
 update();
})();