import assert from 'node:assert/strict';
import {validate,bookingUrl,addDays} from './booking.js';
const now='2026-11-21',s={arrival:'2026-11-23',departure:'2026-11-25',adults:3,children:[0,5,17]};
assert.equal(validate(s,now),'');const u=new URL(bookingUrl(s,'484265',now));assert.equal(u.searchParams.get('onlyrooms'),'484265');assert.equal(u.searchParams.get('children'),'[0,5,17]');assert.equal(u.searchParams.get('adults'),'3');assert.equal(u.searchParams.get('dfrom'),'23-11-2026');assert.equal(u.searchParams.get('dto'),'25-11-2026');assert.equal(new URL(bookingUrl(s,'',now)).searchParams.has('onlyrooms'),false);
for(const bad of [{arrival:'2026-11-20'},{departure:s.arrival},{arrival:''},{arrival:'2026-02-30'},{children:[null]},{children:[18]},{adults:0}])assert.throws(()=>bookingUrl({...s,...bad},'',now));
assert.equal(addDays('2026-12-31',1),'2027-01-01');console.log('PASS: dates, adults, child ages, category and preserved search parameters');
const grouped=new URL(bookingUrl(s,'484272,484273',now));assert.equal(grouped.searchParams.get('onlyrooms'),'484272,484273');assert.equal(grouped.searchParams.get('children'),'[0,5,17]');assert.throws(()=>bookingUrl(s,'484272,wrong',now));
