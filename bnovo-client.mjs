// Server only. Documented at https://api.pms.bnovo.ru/swagger (21 November 2026).
// PMS inventory and base tariff prices are NOT a guest-specific bookable quote.
export function createBnovoClient({id=process.env.BNOVO_API_ID,password=process.env.BNOVO_API_PASSWORD,fetchImpl=fetch}={}){
 let token='',expires=0,authPromise;
 const base='https://api.pms.bnovo.ru';
 async function request(path,options={}){
  const response=await fetchImpl(base+path,{...options,signal:AbortSignal.timeout(10000)});
  if(!response.ok){const error=new Error('Bnovo request failed');error.status=response.status;throw error}
  return response.json();
 }
 async function authorize(){
  if(!id||!password)throw new Error('Bnovo API is not configured');
  if(token&&Date.now()<expires)return token;
  if(!authPromise)authPromise=request('/api/v1/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:Number(id),password})}).then(({data})=>{
   if(!data?.access_token||!Number.isFinite(data.expires_in))throw new Error('Invalid Bnovo authentication response');
   token=data.access_token;expires=Date.now()+Math.max(0,data.expires_in-60)*1000;return token;
  }).finally(()=>{authPromise=null});
  return authPromise;
 }
 async function get(path,query={}){
  const suffix=new URLSearchParams(query).toString();
  for(let attempt=0;attempt<2;attempt++){
   const accessToken=await authorize();
   try{return await request(path+(suffix?'?'+suffix:''),{headers:{Authorization:'Bearer '+accessToken}})}
   catch(error){if(error.status!==401||attempt===1)throw error;token='';expires=0}
  }
 }
 return {configured:Boolean(id&&password),roomTypes:()=>get('/api/v1/roomtypes'),tariffs:()=>get('/api/v1/tariffs'),availability:(from,to)=>get('/api/v1/availability/roomtypes',{date_from:from,date_to:to}),prices:(planId,from,to)=>{
  if(!/^\d+$/.test(String(planId)))throw new Error('Invalid tariff ID');
  return get('/api/v1/tariffs/prices/'+planId,{date_from:from,date_to:to});
 }};
}