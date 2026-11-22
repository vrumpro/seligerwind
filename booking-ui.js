import {today,addDays,validDate} from './booking.js';
import {catalog as fullCatalog} from './catalog.js';
// Winter selection: safari tents temporarily excluded; source records retained.
const catalog=fullCatalog.filter(room=>!room.name.includes('Safari'));
import {snapshot} from './booking-snapshot.js';
import {icon} from './icons.js';
import {bookingIcon} from './booking-icons.js';
import {enhanceFields,syncFields} from './custom-fields.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uiIcon=name=>bookingIcon(name)||icon(name);
let currency='RUB',chosen=new Set(catalog.map(r=>r.id)),context,ready=false;
const photos=new Map(),order=new Map(),selectedRates=new Map();
const money=value=>new Intl.NumberFormat('ru-RU',{style:'currency',currency,maximumFractionDigits:currency==='RUB'?0:2}).format(value);
const currencySymbol=code=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:code,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(p=>p.type==='currency')?.value||code;
const matchSnapshot=s=>s.arrival===snapshot.arrival&&s.departure===snapshot.departure&&s.adults===snapshot.adults&&s.children.length===0;
// Owner-approved fictional availability for the local demo, not Bnovo data.
const demoBusyRooms=new Set(['484265','484268']);
const demoChosenDates=new Map(),demoDatePages=new Map();
const dateText=value=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')).replace(/\.$/,'');
function demoSelection(id){const selected=demoChosenDates.get(id);return selected&&selected.arrival===context.state.arrival&&selected.departure===context.state.departure?selected:null}
function demoUnavailable(room){return demoBusyRooms.has(room.id)&&!demoSelection(room.id)&&(!room.capacity||context.state.adults+context.state.children.length<=room.capacity)}
function cardDatesHtml(room){
 if(!validDate(context.state.arrival)||!validDate(context.state.departure))return '<div class="card-dates">'+icon('calendar-days')+'<span>Выберите даты проживания</span></div>';
 const range=esc(dateText(context.state.arrival)+' — '+dateText(context.state.departure));
 const tooSmall=room.capacity&&context.state.adults+context.state.children.length>room.capacity;
 const busy=demoUnavailable(room);
 const text=tooSmall?range+' · недостаточно мест для гостей':busy?'На '+range+' мест нет':'Свободно на '+range;
 return '<div class="card-dates '+(busy||tooSmall?'is-unavailable':'is-available')+'">'+icon('calendar-days')+'<span>'+text+'</span></div>';
}
function cardAvailabilityRank(room){
 if(room.capacity&&context.state.adults+context.state.children.length>room.capacity)return 2;
 return demoUnavailable(room)?1:0;
}
function demoAlternatives(room){
 const start=validDate(context.state.arrival)?context.state.arrival:today();
 const nights=validDate(context.state.departure)?Math.max(1,Math.round((Date.parse(context.state.departure)-Date.parse(start))/86400000)):2;
 const base=snapshot.rates.find(r=>r.roomId===room.id&&r.planId==='612820')||snapshot.rates.find(r=>r.roomId===room.id);
 return [1,2,4,7,9,14].map((offset,i)=>{
  const arrival=addDays(start,offset),departure=addDays(arrival,nights),prices={};
  for(const code of snapshot.currencies.map(c=>c.code)){const value=base?.prices[code];if(Number.isFinite(value))prices[code]=Math.round(value/2*nights*[1,.92,1.04,.96,1.08,.9][i])}
  return {arrival,departure,nights,prices};
 });
}
function alternativeDatesHtml(room){
 const options=demoAlternatives(room),page=Math.min(demoDatePages.get(room.id)||0,2);
 const nightsText=n=>n+' '+(n%10===1&&n%100!==11?'ночь':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'ночи':'ночей');
 const range=validDate(context.state.arrival)&&validDate(context.state.departure)?dateText(context.state.arrival)+' — '+dateText(context.state.departure):'выбранные даты';
 return '<div class="alternative-stays"><div class="alternative-heading"><strong>Есть другие даты</strong><div class="alternative-nav"><button type="button" data-alternative-page="'+room.id+'" data-step="-1" '+(page===0?'disabled':'')+' aria-label="Предыдущие варианты">'+icon('chevron-left')+'</button><button type="button" data-alternative-page="'+room.id+'" data-step="1" '+(page===2?'disabled':'')+' aria-label="Следующие варианты">'+icon('chevron-right')+'</button></div></div><div class="alternative-options">'+options.slice(page*2,page*2+2).map((offer,i)=>'<button type="button" class="alternative-option" data-alternative-room="'+room.id+'" data-alternative-index="'+(page*2+i)+'" aria-label="Выбрать '+esc(dateText(offer.arrival)+' — '+dateText(offer.departure))+'"><span class="alternative-range"><span>'+esc(dateText(offer.arrival))+'</span>'+icon('arrow-right')+'<span>'+esc(dateText(offer.departure))+'</span></span><span class="alternative-cost"><small>'+nightsText(offer.nights)+'</small><strong>'+(Number.isFinite(offer.prices[currency])?money(offer.prices[currency]):'Уточнить цену')+'</strong></span><span class="alternative-select">Выбрать даты '+icon('arrow-right')+'</span></button>').join('')+'</div></div>';
}
function selectedNights(){
 const {arrival,departure}=context.state;
 if(!validDate(arrival)||!validDate(departure)||departure<=arrival)return null;
 return Math.round((Date.parse(departure)-Date.parse(arrival))/86400000);
}
function ratesFor(id){
 const demo=demoSelection(id),nights=selectedNights();
 const baseNights=Math.round((Date.parse(snapshot.departure)-Date.parse(snapshot.arrival))/86400000);
 return snapshot.rates.filter(r=>r.roomId===id).map(rate=>{
  const prices={};
  if(demo){for(const [code,value] of Object.entries(demo.prices))prices[code]=Math.round(value*(rate.planId==='615963'?1.2:1))}
  else if(nights){for(const [code,value] of Object.entries(rate.prices))prices[code]=Math.round(value/baseNights*nights)}
  return {...rate,prices};
 }).sort((a,b)=>Number(b.planId==='612820')-Number(a.planId==='612820'));
}
function amount(rate){return matchSnapshot(context.state)?rate?.prices[currency]:undefined}
function modal(title,body,footer=''){
 const d=document.querySelector('#booking-ui-dialog');d.innerHTML=`<div class="ui-dialog-head"><h2 id="ui-dialog-title">${esc(title)}</h2><button class="ui-icon-button" data-close aria-label="Закрыть">${icon('x')}</button></div><div class="ui-dialog-body">${body}</div>${footer?`<div class="ui-dialog-foot">${footer}</div>`:''}`;d.showModal();d.querySelector('[data-close]').onclick=()=>d.close();return d;
}
function init(){
 if(ready)return;ready=true;
 const tools=document.createElement('div');tools.className='booking-tools';tools.hidden=true;tools.innerHTML=`<label class="currency-field"><span class="sr-only">Валюта</span><select id="booking-currency" aria-label="Валюта">${snapshot.currencies.map(c=>`<option value="${c.code}" ${c.code===currency?'selected':''}>${esc(c.code+' '+currencySymbol(c.code))}</option>`).join('')}</select></label><button id="share-search" class="ui-tool">${uiIcon('share-2')}<span>Поделиться</span></button>`;
 document.querySelector('#catalog').before(tools);
 const d=document.createElement('dialog');d.id='booking-ui-dialog';d.setAttribute('aria-labelledby','ui-dialog-title');document.body.append(d);
 const cart=document.createElement('aside');cart.id='booking-order';cart.className='booking-order';cart.setAttribute('aria-label','Выбранное проживание');cart.hidden=true;document.body.append(cart);
 document.querySelector('#booking-currency').onchange=e=>{currency=e.target.value;context.refresh()};
 document.querySelector('#share-search').onclick=openShare;
 enhanceFields(tools);
 const currencyButton=document.querySelector('#booking-currency-control');currencyButton.onclick=openCurrency;currencyButton.setAttribute('aria-haspopup','dialog');currencyButton.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();openCurrency()}};
 document.querySelector('#catalog').addEventListener('change',e=>{
  const radio=e.target.closest('[data-rate-choice]');if(!radio)return;
  selectedRates.set(radio.dataset.room,radio.value);
  if(order.has(radio.dataset.room))order.set(radio.dataset.room,snapshot.rates.find(r=>r.roomId===radio.dataset.room&&r.planId===radio.value));
  const room=catalog.find(r=>r.id===radio.dataset.room),card=radio.closest('.booking-card');
  card.querySelectorAll('.meal-switch-option').forEach(label=>label.classList.toggle('is-selected',label.querySelector('input').checked));
  const updated=document.createElement('div');updated.innerHTML=rateHtml(room,ratesFor(room.id));
  card.querySelector('.rate-bottom').replaceWith(updated.querySelector('.rate-bottom'));
  paintOrder();
 });
 document.querySelector('#catalog').addEventListener('click',e=>{
  const page=e.target.closest('[data-alternative-page]');if(page){const id=page.dataset.alternativePage;demoDatePages.set(id,Math.max(0,Math.min(2,(demoDatePages.get(id)||0)+Number(page.dataset.step))));context.refresh();document.querySelector('[data-alternative-page="'+id+'"]:not(:disabled)')?.focus({preventScroll:true});return}
 const alternative=e.target.closest('[data-alternative-room]');if(alternative){const room=catalog.find(r=>r.id===alternative.dataset.alternativeRoom),offer=demoAlternatives(room)[Number(alternative.dataset.alternativeIndex)];demoChosenDates.set(room.id,offer);demoDatePages.clear();document.dispatchEvent(new CustomEvent('select-alternative-dates',{detail:{arrival:offer.arrival,departure:offer.departure}}));document.querySelector('[data-reserve^="'+room.id+':"]')?.focus({preventScroll:true});return}
 const photo=e.target.closest('[data-photo-step]');if(photo){const room=catalog.find(r=>r.id===photo.dataset.room);photos.set(room.id,((photos.get(room.id)||0)+Number(photo.dataset.photoStep)+room.photos.length)%room.photos.length);paintGallery(room);return}
  const policy=e.target.closest('[data-policy]');if(policy){showPolicy(policy.dataset.policy);return}
  const add=e.target.closest('[data-add]');if(add){const rate=snapshot.rates.find(r=>r.roomId+':'+r.planId===add.dataset.add);if(order.get(rate.roomId)?.planId===rate.planId)order.delete(rate.roomId);else order.set(rate.roomId,rate);context.refresh();return}
  const reset=e.target.closest('[data-reset-catalog]');if(reset){document.querySelector('#clear-search').click();return}const book=e.target.closest('[data-reserve]');if(book){const [room,plan]=book.dataset.reserve.split(':');handoff(room,plan);return}
 });
}
function paintGallery(room){const figure=document.querySelector(`[data-gallery="${room.id}"]`);if(!figure)return;const n=photos.get(room.id)||0;figure.querySelector('img').src=room.photos[n];watchGallery(figure);figure.querySelector('.photo-count').textContent=(n+1)+' / '+room.photos.length}
function watchGallery(figure){
 const img=figure.querySelector('img');
 figure.querySelector('.photo-error')?.remove();
 const finish=()=>{figure.classList.remove('is-loading');figure.removeAttribute('aria-busy');if(!img.naturalWidth){const message=document.createElement('span');message.className='photo-error';message.textContent='Фото не загрузилось';figure.append(message)}};
 img.onload=finish;img.onerror=finish;
 if(img.complete){finish();return}
 figure.classList.add('is-loading');figure.setAttribute('aria-busy','true');
}
function showPolicy(type){
 const texts={cancel:['Условия отмены','В опубликованных условиях Bnovo: отмена без штрафа за 14 дней до заезда. При отмене позднее — штраф 100% общей стоимости. Применимость условий на выбранные даты подтвердите при бронировании.'],payment:['Частичная предоплата','В Bnovo для этого тарифа указана частичная предоплата. Размер и срок оплаты будут показаны при оформлении бронирования.'],breakfast:['Стандартный с завтраком','Проживание с завтраком. Состав размещения и окончательную стоимость подтвердите на следующем шаге.'],standard:['Стандартный','Проживание без питания. Условия оплаты и отмены уточняются при оформлении.']};
 const [title,text]=texts[type]||texts.standard;modal(title,`<p class="policy-copy">${text}</p>`);
}
// Amenity copy for the demo. Bedroom counts for BarnHouse 1–5 use local descriptions;
// missing bed/bath/kitchen details are presentation fixtures, not verified Bnovo fields.
const demoAmenities={
 '484264':['2 спальни','2 двуспальные + 1 двухъярусная','Кухня','1 санузел'],
 '484265':['1 спальня','2 двуспальные кровати','Кухня','1 санузел'],
 '484266':['2 спальни','2 двуспальные кровати','Кухня-гостиная','1 санузел'],
 '484267':['2 спальни','2 двуспальные кровати','Кухня-гостиная','1 санузел'],
 '484268':['2 спальни','2 двуспальные кровати','Кухня-гостиная','1 санузел'],
 '484269':['2 спальни','2 двуспальные кровати','Кухня-гостиная','1 санузел'],
 '484270':['1 спальня и мансарда','1 двуспальная + 2 односпальные','Кухня','1 санузел'],
 '484271':['2 спальни','2 двуспальные кровати','Кухня','1 санузел'],
 '616551':['1 спальня','1 двуспальная кровать','Мини-кухня','1 санузел'],
 '616759':['1 спальня','1 двуспальная кровать','Мини-кухня','1 санузел']
};
export function roomBedrooms(room){return Number.parseInt(demoAmenities[room.id]?.[0],10)||0}
function roomAmenitiesHtml(room){
 const features=demoAmenities[room.id];if(!features)return '';
 const icons=['door-closed','bed-double','utensils','bath'];
 return '<ul class="room-amenities" aria-label="Устройство дома">'+features.map((text,i)=>'<li>'+uiIcon(icons[i])+'<span>'+esc(text)+'</span></li>').join('')+'</ul>';
}
function rateHtml(room,rates){
 const selected=rates.find(r=>r.planId===selectedRates.get(room.id))||rates.find(r=>r.planId==='612820')||rates[0];
 selectedRates.set(room.id,selected.planId);
 const value=selected.prices[currency],tooSmall=room.capacity&&context.state.adults+context.state.children.length>room.capacity;
 return `<div class="room-rate-picker"><fieldset class="meal-switch"><legend class="sr-only">Питание</legend>${rates.map(rate=>`<label class="meal-switch-option ${rate.planId===selected.planId?'is-selected':''}"><input type="radio" name="tariff-${room.id}" value="${rate.planId}" data-rate-choice data-room="${room.id}" ${rate.planId===selected.planId?'checked':''}><span>${rate.planId==='615963'?'Завтрак включён':'Без питания'}</span><small class="meal-switch-price">${Number.isFinite(rate.prices[currency])?money(rate.prices[currency]):'Уточнить цену'}</small></label>`).join('')}</fieldset><div class="rate-bottom"><div class="rate-price">${Number.isFinite(value)?`<strong>${money(value)}</strong><small>За весь период</small>`:'<span>Стоимость уточняется</span><small>на выбранные даты</small>'}</div><div class="rate-booking-action"><button class="button" data-reserve="${room.id}:${selected.planId}" ${tooSmall?'disabled':''}>${tooSmall?'Недостаточно мест':'Забронировать'}</button>${Number.isFinite(value)?`<small class="rate-prepayment">Предоплата ${money(value*(selected.prepaymentPercent??50)/100)}</small>`:''}</div></div></div>`;
}export function renderBookingCards(rooms,options){
 context=options;init();const filtered=rooms.filter(r=>chosen.has(r.id));
 // Available houses first, alternate-date houses next, insufficient capacity last.
 filtered.sort((a,b)=>cardAvailabilityRank(a)-cardAvailabilityRank(b)||Number(ratesFor(b.id).length>0)-Number(ratesFor(a.id).length>0));
 document.querySelector('#catalog').innerHTML=filtered.slice(0,options.expanded?filtered.length:6).map(room=>{
  const n=photos.get(room.id)||0,rates=ratesFor(room.id);return `<article class="card booking-card"><div class="booking-gallery" data-gallery="${room.id}"><button class="gallery-main" data-detail="${room.id}" aria-label="Фотографии ${esc(room.name)}"><img src="${esc(room.photos[n])}" alt="${esc(room.name)}" width="700" height="440" loading="lazy"></button><button class="photo-nav photo-prev" data-room="${room.id}" data-photo-step="-1" aria-label="Предыдущее фото">${icon('chevron-left')}</button><button class="photo-nav photo-next" data-room="${room.id}" data-photo-step="1" aria-label="Следующее фото">${icon('chevron-right')}</button><span class="photo-count">${n+1} / ${room.photos.length}</span></div><div class="booking-card-content"><div class="booking-card-heading"><h3>${esc(room.name)}</h3><div class="booking-facts"><span>${uiIcon('ruler')}${esc(room.area)} м²</span><span>${uiIcon('users')}${room.capacity?'До '+room.capacity+' гостей':'Вместимость уточняется'}</span></div></div>${cardDatesHtml(room)}${roomAmenitiesHtml(room)}${demoUnavailable(room)?alternativeDatesHtml(room):rates.length?rateHtml(room,rates):`<div class="rate-unavailable"><p>Проверьте доступные тарифы на ваши даты.</p><button class="button" data-reserve="${room.id}:">Проверить стоимость</button></div>`}</div></article>`;
 }).join('')||'<div class="catalog-empty"><p>По выбранным параметрам домов не найдено.</p><button class="outline" data-reset-catalog>Сбросить фильтры</button></div>';
 document.querySelector('#catalog').setAttribute('aria-busy','false');document.querySelectorAll('#catalog .booking-gallery').forEach(watchGallery);
 paintOrder();return filtered.length;
}
function openFilter(){
 const draft=new Set(chosen);const d=modal('Выберите категории',`<label class="category-search">${icon('search')}<input id="category-query" type="search" placeholder="Найти дом" autocomplete="off"></label><label class="category-all"><input type="checkbox" id="all-categories" ${draft.size===catalog.length?'checked':''}>Все категории</label><div class="category-options">${catalog.map(r=>`<label class="category-option" data-name="${esc(r.name.toLowerCase())}"><input type="checkbox" value="${r.id}" ${draft.has(r.id)?'checked':''}><img src="${esc(r.photos[0])}" alt="" width="64" height="48"><span>${esc(r.name)}<small>${r.area} м²</small></span></label>`).join('')}</div>`,`<button class="outline" id="filter-reset">Выбрать все</button><button class="button" id="filter-apply">Применить</button>`);
 const all=d.querySelector('#all-categories');function sync(){d.querySelector('#filter-apply').disabled=draft.size===0;all.checked=draft.size===catalog.length;all.indeterminate=draft.size>0&&draft.size<catalog.length;d.querySelectorAll('.category-option input').forEach(i=>i.checked=draft.has(i.value))}
 all.onchange=()=>{draft.clear();if(all.checked)catalog.forEach(r=>draft.add(r.id));sync()};
 d.querySelectorAll('.category-option input').forEach(input=>input.onchange=()=>{input.checked?draft.add(input.value):draft.delete(input.value);sync()});
 d.querySelector('#category-query').oninput=e=>d.querySelectorAll('.category-option').forEach(row=>row.hidden=!row.dataset.name.includes(e.target.value.trim().toLowerCase()));
 d.querySelector('#filter-reset').onclick=()=>{catalog.forEach(r=>draft.add(r.id));sync()};d.querySelector('#filter-apply').onclick=()=>{chosen=draft;d.close();context.refresh()};sync();
}
function openShare(){
 const url=new URL(location.href);url.hash='houses';url.searchParams.set('arrival',context.state.arrival);url.searchParams.set('departure',context.state.departure);url.searchParams.set('adults',context.state.adults);url.searchParams.set('children',JSON.stringify(context.state.children));url.searchParams.set('currency',currency);url.searchParams.set('type',document.querySelector('#type').value);url.searchParams.set('categories',[...chosen].join(','));
 const d=modal('Поделиться подборкой',`<p>Ссылка сохранит даты, гостей, валюту и выбранные категории.</p><input class="share-link" aria-label="Ссылка на подборку" readonly value="${esc(url.href)}"><p id="copy-status" role="status"></p>`,`<button id="copy-search" class="button">Скопировать ссылку</button>`);
 d.querySelector('#copy-search').onclick=async()=>{try{await navigator.clipboard.writeText(url.href);d.querySelector('#copy-status').textContent='Ссылка скопирована'}catch{d.querySelector('.share-link').select();d.querySelector('#copy-status').textContent='Нажмите Ctrl+C, чтобы скопировать ссылку'}};
}
function handoff(room,plan){context.book(room,currency)}
function paintOrder(){
 const cart=document.querySelector('#booking-order');cart.hidden=order.size===0;document.body.classList.toggle('has-booking-order',order.size>0);if(!order.size)return;
 const values=[...order.values()].map(amount),total=values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0):null;
 cart.innerHTML=`<div class="order-info">${uiIcon('shopping-bag')}<div><strong>В подборке: ${order.size}</strong><small>${total!==null?money(total)+' · по сохранённым ценам':'Стоимость подтвердится при бронировании'}</small></div></div><div class="order-actions"><button id="order-view" class="outline">Посмотреть</button><button id="order-next" class="button">Продолжить ${icon('arrow-right')}</button></div>`;
 cart.querySelector('#order-next').onclick=()=>handoff([...order.keys()].join(','),'');
 cart.querySelector('#order-view').onclick=()=>{
  const d=modal('Ваша подборка',[...order.values()].map(rate=>`<div class="order-item"><div><strong>${esc(catalog.find(r=>r.id===rate.roomId).name)}</strong><small>${esc(rate.name)}</small></div><button class="ui-icon-button" data-remove-order="${rate.roomId}" aria-label="Убрать из подборки">${icon('x')}</button></div>`).join('')+'<p>Подборка не резервирует дома. Подтверждение выбранных домов и тарифов — в Bnovo. Для нескольких домов распределите гостей при оформлении.</p>');
  d.querySelectorAll('[data-remove-order]').forEach(b=>b.onclick=()=>{order.delete(b.dataset.removeOrder);d.close();context.refresh()});
 };
}
export function resetBookingSelection(){order.clear()}
export function selectedCurrency(){return currency}
export function restoreBookingUi(query){
 const value=query.get('currency');if(snapshot.currencies.some(c=>c.code===value))currency=value;
 if(query.has('categories'))chosen=new Set(query.get('categories').split(',').filter(id=>catalog.some(r=>r.id===id)));
}
export function clearBookingFilters(){chosen=new Set(catalog.map(r=>r.id));order.clear()}

function openCurrency(){
 const popular=['RUB','EUR','USD','GBP'];
 const list=[...snapshot.currencies].sort((a,b)=>(popular.includes(a.code)?popular.indexOf(a.code):99)-(popular.includes(b.code)?popular.indexOf(b.code):99));
 const d=modal('Валюта',`<label class="category-search">${icon('search')}<input id="currency-query" type="search" placeholder="Название или код валюты" autocomplete="off"></label><div class="currency-options">${list.map(c=>`<button class="currency-option" data-currency="${c.code}" aria-pressed="${c.code===currency}" data-name="${esc((c.code+' '+c.label).toLowerCase())}"><span><strong>${esc(c.code)}</strong><small>${esc(currencySymbol(c.code))}</small></span>${c.code===currency?icon('check'):''}</button>`).join('')}</div><p id="currency-empty" hidden>Валюта не найдена. Попробуйте другое название.</p>`);
 d.querySelector('#currency-query').oninput=e=>{const value=e.target.value.trim().toLowerCase();let visible=0;d.querySelectorAll('[data-currency]').forEach(b=>{b.hidden=!b.dataset.name.includes(value);if(!b.hidden)visible++});d.querySelector('#currency-empty').hidden=visible>0};
 d.querySelectorAll('[data-currency]').forEach(b=>b.onclick=()=>{currency=b.dataset.currency;document.querySelector('#booking-currency').value=currency;syncFields();d.close();context.refresh();document.querySelector('#booking-currency-control').focus({preventScroll:true})});
}