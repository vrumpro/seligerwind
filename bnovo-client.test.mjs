import test from 'node:test';
import assert from 'node:assert/strict';
import {createBnovoClient} from './bnovo-client.mjs';
test('No request without credentials',async()=>{let calls=0;const c=createBnovoClient({id:'',password:'',fetchImpl:()=>{calls++}});await assert.rejects(c.roomTypes(),/not configured/);assert.equal(calls,0)});
test('Auth is shared; one retry on expired token; no secret in GET query',async()=>{
 const calls=[];let auth=0,expired=false;
 const c=createBnovoClient({id:'123',password:'test-password',fetchImpl:async(url,options)=>{
  calls.push({url,options});if(url.endsWith('/auth')){auth++;return {ok:true,json:async()=>({data:{access_token:'test-token-'+auth,expires_in:86400}})}}
  if(expired){expired=false;return {ok:false,status:401}}
  return {ok:true,json:async()=>({data:{}})};
 }});
 await Promise.all([c.roomTypes(),c.tariffs()]);assert.equal(auth,1);
 expired=true;await c.availability('2026-11-23','2026-11-25');assert.equal(auth,2);
 assert.ok(calls.every(x=>!x.url.includes('test-password')));
 await c.prices(1,'2026-11-23','2026-11-25');assert.match(calls.at(-1).url,/tariffs\/prices\/1\?date_from=/);
 assert.throws(()=>c.prices('../x','x','x'),/Invalid tariff/);
});