export const UID='09933d2c-1e67-47d3-8504-4df8e34ac353';
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
export function addDays(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
export function validate(s,now=today()){
 if(!validDate(s.arrival)||!validDate(s.departure))return 'Укажите даты заезда и выезда.';
 if(s.arrival<now)return 'Дата заезда уже прошла. Выберите новую дату.';
 if(s.departure<=s.arrival)return 'Дата выезда должна быть позже даты заезда.';
 if(!Number.isInteger(s.adults)||s.adults<1||s.adults>16)return 'Выберите количество взрослых.';
 if(!Array.isArray(s.children)||s.children.length>6||s.children.some(a=>!Number.isInteger(a)||a<0||a>17))return 'Укажите возраст каждого ребёнка на дату заезда.';
 return '';
}
export function bookingUrl(s,room='',now=today()){
 const error=validate(s,now);if(error)throw new Error(error);
 if(room&&!/^\d+(,\d+)*$/.test(room))throw new Error('Некорректный вариант проживания.');
 const date=v=>v.split('-').reverse().join('-');
 const url=new URL('https://reservationsteps.ru/rooms/index/'+UID);
 url.search=new URLSearchParams({lang:'ru',dfrom:date(s.arrival),dto:date(s.departure),adults:String(s.adults),children:JSON.stringify(s.children)});
 if(room)url.searchParams.set('onlyrooms',room);
 return url.href;
}
