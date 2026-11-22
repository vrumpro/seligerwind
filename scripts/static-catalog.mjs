import {catalog} from '../catalog.js';
import {snapshot} from '../booking-snapshot.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽';
export function staticCatalog(){
 return catalog.filter(r=>!r.name.includes('Safari')).map(room=>{
 const rate=snapshot.rates.find(r=>r.roomId===room.id&&r.planId==='612820');
 const details=[room.area+' м²',room.capacity?'До '+room.capacity+' гостей':''].filter(Boolean).join(' · ');
 const period=snapshot.arrival.split('-').reverse().join('.')+' — '+snapshot.departure.split('-').reverse().join('.');
 return '<article class="card booking-card"><div class="booking-gallery" data-gallery="'+room.id+'"><button class="gallery-main" data-detail="'+room.id+'" aria-label="Фотографии '+esc(room.name)+'"><img src="'+esc(room.photos[0])+'" alt="'+esc(room.name)+'" width="700" height="440" loading="lazy"></button></div><div class="booking-card-content"><div class="booking-card-heading"><h3>'+esc(room.name)+'</h3><div class="booking-facts">'+esc(details)+'</div></div><p>'+esc(room.summary||room.description.split('\n').slice(1).join(' ').split('. ')[0])+ '</p>'+(rate?'<div class="rate-bottom"><div class="rate-price"><strong>'+money(rate.prices.RUB)+'</strong><small>'+period+' · '+snapshot.adults+' взрослых · без питания</small></div><a class="button" href="#contacts">Связаться с администратором</a></div>':'<a class="button" href="#contacts">Уточнить стоимость</a>')+'</div></article>';
 }).join('');
}
export function withStaticCatalog(html){
 const pattern=/<div id="catalog"[^>]*>[\s\S]*?<\/section>/;
 if(!pattern.test(html))throw Error('Catalog section not found');
 return html.replace(pattern,()=>'<div id="catalog" class="catalog" aria-live="polite" aria-busy="false">'+staticCatalog()+'</div></section>');
}