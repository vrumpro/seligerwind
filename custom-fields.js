import {icon} from './icons.js';
import {addDays,today} from './booking.js';
const controls=new Map();let active=null;
export function setFieldExpanded(button,open){
 if(!button)return;
 button.setAttribute('aria-expanded',String(open));
 if(!button.closest('.search-row'))return;
 const name=open?'x':button.id==='arrival-control'?'calendar-days':'chevron-down';
 const current=button.querySelector('.icon');
 if(current)current.outerHTML=icon(name);
}
export function closePicker(focus=false){if(!active)return;const {panel,button}=active;panel.remove();setFieldExpanded(button,false);active=null;if(focus)button.focus({preventScroll:true})}
export function positionPopover(panel,button){
 const gap=9,margin=12;
 const field=button.closest('.search-row > label,.search-row > .children-field');
 const search=field?.closest('#search');
 const anchor=(field||button).getBoundingClientRect();
 const bounds=(search||button).getBoundingClientRect();
 const headerBottom=document.querySelector('header')?.getBoundingClientRect().bottom||0;
 const ceiling=Math.max(margin,headerBottom+margin);
 panel.style.maxHeight='none';panel.style.width='';
 panel.style.margin='0';panel.style.transform='none';
 const desired=field&&!panel.classList.contains('calendar-popover')?anchor.width:panel.offsetWidth;
 const w=innerWidth<=760?innerWidth-margin*2:Math.min(desired,innerWidth-margin*2);
 panel.style.width=w+'px';
 const above=Math.max(0,bounds.top-gap-ceiling),below=Math.max(0,innerHeight-bounds.bottom-gap-margin-(innerWidth<=760?76:0));
 // Use one clearance for the whole search, not a different direction for each panel.
 const required=search?(innerWidth<=600?720:460):panel.scrollHeight+2;
 const up=above>=required;
 panel.dataset.placement=up?'top':'bottom';
 panel.style.maxHeight=(up?above:below)+'px';
 panel.style.left=(innerWidth<=760?margin:Math.max(margin,Math.min(anchor.left,innerWidth-w-margin)))+'px';
 panel.style.top=(up?bounds.top-gap-panel.offsetHeight:bounds.bottom+gap)+'px';
}
function place(){if(active)positionPopover(active.panel,active.button)}
function panelFor(button,kind){closePicker();prepareMobileSearch(button);const panel=document.createElement('div');panel.className='choice-popover '+kind;panel.id=button.id+'-panel';button.setAttribute('aria-controls',panel.id);setFieldExpanded(button,true);document.body.append(panel);active={panel,button};return panel}
function buildButton(field,calendar=false){if(controls.has(field))return controls.get(field);if(!field.id)field.id='field-'+Math.random().toString(36).slice(2);const button=document.createElement('button');button.type='button';button.id=field.id+'-control';button.className='field-control';button.setAttribute('aria-haspopup',calendar?'dialog':'listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',field.getAttribute('aria-label')||field.closest('label')?.firstChild?.textContent?.trim()||'Выберите значение');field.after(button);field.hidden=true;field.tabIndex=-1;field.focus=options=>button.focus(options);controls.set(field,button);return button}
export function syncFields(){for(const [field,button] of controls){if(!field.isConnected){controls.delete(field);continue}const calendar=field.type==='date';const end=document.querySelector('#departure');const text=field.id==='arrival'&&field.value&&end.value?shortDate(field.value)+' — '+shortDate(end.value):calendar?(field.value?field.value.split('-').reverse().join('.'):'Выберите дату'):field.selectedOptions[0]?.textContent||'Выберите';button.innerHTML='<span>'+text+'</span>'+icon(button.closest('.search-row')&&button.getAttribute('aria-expanded')==='true'?'x':calendar?'calendar-days':'chevron-down');button.disabled=field.disabled}}
function openSelect(field,button=controls.get(field)){if(active?.button===button){closePicker();return}const numeric=field.id==='adults'||field.closest('#ages');const panel=panelFor(button,numeric?'number-options':'text-options');panel.setAttribute('role','listbox');panel.setAttribute('aria-label',button.getAttribute('aria-label'));[...field.options].filter(o=>o.value!==''&&!o.disabled).forEach(o=>{const item=document.createElement('button');item.type='button';item.className='choice-option';item.setAttribute('role','option');item.setAttribute('aria-selected',String(field.value===o.value));item.dataset.value=o.value;item.innerHTML='<span>'+o.textContent+'</span>'+(field.value===o.value?icon('check'):'');item.onclick=()=>{field.value=o.value;field.dispatchEvent(new Event('change',{bubbles:true}));syncFields();closePicker(true)};panel.append(item)});positionPopover(panel,button);(panel.querySelector('[aria-selected=true]')||panel.querySelector('button'))?.focus({preventScroll:true})}
function monthStart(value){return new Date((value||today()).slice(0,7)+'-01T12:00:00Z')}
function iso(d){return d.toISOString().slice(0,10)}
function shortDate(value){return new Intl.DateTimeFormat('ru',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'))}
function openCalendar(field,button=controls.get(field)){
 if(active?.button===button){closePicker();return}
 const panel=panelFor(button,'calendar-popover range-calendar');panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Выбор дат заезда и выезда');
 const departure=document.querySelector('#departure');let month=monthStart(field.value>=field.min?field.value:field.min||today()),draftFrom='',hoverTo='';
 function paint(){const from=draftFrom||field.value,to=draftFrom?hoverTo:departure.value;for(const b of panel.querySelectorAll('[data-date]')){b.setAttribute('aria-pressed',String(b.dataset.date===from||b.dataset.date===to));b.classList.toggle('in-range',Boolean(from&&to&&b.dataset.date>from&&b.dataset.date<to))}}
 function draw(focusDay=false){
  panel.replaceChildren();const months=document.createElement('div');months.className='range-months';
  const visibleMonths=innerWidth<=760?1:2;for(let offset=0;offset<visibleMonths;offset++){
   const current=new Date(month);current.setUTCMonth(current.getUTCMonth()+offset);const section=document.createElement('section');
   const heading=document.createElement('div');heading.className='calendar-heading';const prev=document.createElement('button'),next=document.createElement('button'),title=document.createElement('strong');prev.type=next.type='button';prev.innerHTML=icon('chevron-left');next.innerHTML=icon('chevron-right');prev.setAttribute('aria-label','Предыдущий месяц');next.setAttribute('aria-label','Следующий месяц');prev.style.visibility=offset===0?'visible':'hidden';next.style.visibility=offset===visibleMonths-1?'visible':'hidden';prev.disabled=iso(month)<=iso(monthStart(field.min||today()));prev.tabIndex=offset===0?0:-1;next.tabIndex=offset===visibleMonths-1?0:-1;title.textContent=new Intl.DateTimeFormat('ru',{month:'long',year:'numeric',timeZone:'UTC'}).format(current);prev.onclick=()=>{month.setUTCMonth(month.getUTCMonth()-1);draw()};next.onclick=()=>{month.setUTCMonth(month.getUTCMonth()+1);draw()};heading.append(prev,title,next);section.append(heading);
   const week=document.createElement('div');week.className='calendar-week';for(const day of ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']){const span=document.createElement('span');span.textContent=day;week.append(span)}section.append(week);
   const grid=document.createElement('div');grid.className='calendar-grid';for(let n=0;n<(current.getUTCDay()+6)%7;n++)grid.append(document.createElement('span'));const end=new Date(current);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);
   for(let day=1;day<=end.getUTCDate();day++){const date=new Date(current);date.setUTCDate(day);const value=iso(date),b=document.createElement('button');b.type='button';b.textContent=day;b.dataset.date=value;b.disabled=value<(field.min||today());b.setAttribute('aria-label',new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date));b.onmouseenter=()=>{hoverTo=draftFrom&&value>draftFrom?value:'';paint()};b.onclick=()=>{if(!draftFrom||value<=draftFrom){draftFrom=value;hoverTo='';draw(true);return}field.value=draftFrom;departure.value=value;field.dispatchEvent(new Event('change',{bubbles:true}));departure.dispatchEvent(new Event('change',{bubbles:true}));syncFields();closePicker(true)};grid.append(b)}section.append(grid);months.append(section)
  }
  panel.append(months);const note=document.createElement('p');note.className='calendar-note';note.setAttribute('aria-live','polite');note.textContent=draftFrom?'Выберите дату выезда':'Выберите дату заезда';panel.append(note);paint();place();if(focusDay)(panel.querySelector('.calendar-grid [aria-pressed=true]:not(:disabled)')||panel.querySelector('.calendar-grid button:not(:disabled)'))?.focus({preventScroll:true})
 }
 draw(true);positionPopover(panel,button)
}
export function enhanceFields(root=document){root.querySelectorAll('select,input[type=date]').forEach(field=>{if(field.id==='departure'){field.hidden=true;field.tabIndex=-1;field.focus=options=>document.querySelector('#arrival-control')?.focus(options);return}if(controls.has(field))return;const calendar=field.type==='date',button=buildButton(field,calendar);button.onclick=()=>{if(!field.closest('.children-field,#children-panel')){const children=document.querySelector('#children-panel');if(children)children.hidden=true;setFieldExpanded(document.querySelector('#children-toggle'),false)}calendar?openCalendar(field):openSelect(field)};button.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();calendar?openCalendar(field):openSelect(field)}};field.addEventListener('change',syncFields)});syncFields()}
document.addEventListener('pointerdown',e=>{if(active&&!active.panel.contains(e.target)&&!(active.button.closest('.search-row > label,.search-row > .children-field')||active.button).contains(e.target))closePicker()},true);
document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closePicker(true);return}if(e.key==='Tab'){closePicker();return}const keys=['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'];if(!active.panel.contains(e.target)||!keys.includes(e.key))return;e.preventDefault();const options=[...active.panel.querySelectorAll('.choice-option,.calendar-grid button')].filter(b=>!b.disabled);const pos=options.indexOf(document.activeElement);let n=pos;const cols=active.panel.classList.contains('calendar-popover')?7:active.panel.classList.contains('number-options')?4:1;if(e.key==='ArrowDown')n+=cols;if(e.key==='ArrowUp')n-=cols;if(e.key==='ArrowLeft')n--;if(e.key==='ArrowRight')n++;if(e.key==='Home')n=0;if(e.key==='End')n=options.length-1;options[Math.max(0,Math.min(n,options.length-1))]?.focus({preventScroll:true})},true);
let placementFrame=0;function schedulePlace(){if(!active||placementFrame)return;placementFrame=requestAnimationFrame(()=>{placementFrame=0;place()})}window.addEventListener('resize',schedulePlace);document.addEventListener('scroll',schedulePlace,{capture:true,passive:true});

export function openField(field,button){field.type==='date'?openCalendar(field,button):openSelect(field,button)}

// Extend the button hit area to its label and field padding without a second native label click.
document.addEventListener('click',e=>{
 const field=e.target.closest('.search-row > label,.search-row > .children-field');
 if(!field||e.target.closest('button,input,select,a'))return;
 const button=field.querySelector('.field-control,#children-toggle');
 if(button&&!button.disabled){e.preventDefault();button.click()}
});
export function prepareMobileSearch(button){
 if(innerWidth>760||!button.closest('#search'))return;
 const search=document.querySelector('#search'),header=document.querySelector('header');
 const target=window.scrollY+search.getBoundingClientRect().top-header.getBoundingClientRect().height-12;
 window.scrollTo({top:Math.max(0,target),behavior:'instant'});
}