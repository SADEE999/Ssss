const json=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(body)});
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,anon=process.env.SUPABASE_ANON_KEY;
 if(!base||!key||!anon)return json(503,{error:'Customer order service is not configured.'});
 const auth=event.headers?.authorization||event.headers?.Authorization||'';
 const token=auth.startsWith('Bearer ')?auth.slice(7):'';
 if(!token)return json(401,{error:'Please sign in to view your orders.'});
 const verified=await fetch(`${base}/auth/v1/user`,{headers:{apikey:anon,Authorization:`Bearer ${token}`}});
 if(!verified.ok)return json(401,{error:'Your login session expired. Sign in again.'});
 const user=await verified.json();if(!user?.id)return json(401,{error:'Customer account could not be verified.'});
 const url=`${base}/rest/v1/store_orders?select=order_code,product_name,plan_name,amount,status,created_at,customer_email&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=50`;
 const r=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
 if(!r.ok)return json(500,{error:'Could not load your account orders. Run the Google account SQL setup.'});
 return json(200,{orders:await r.json()});
}
