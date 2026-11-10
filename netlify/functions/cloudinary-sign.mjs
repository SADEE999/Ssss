import crypto from 'node:crypto';
const json=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(body)});
function authorized(event,secret){const supplied=Buffer.from(String(event.headers['x-admin-secret']||'')),expected=Buffer.from(secret||'');return expected.length>0&&supplied.length===expected.length&&crypto.timingSafeEqual(supplied,expected);}
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 const secret=process.env.STORE_ADMIN_SECRET,cloudName=process.env.CLOUDINARY_CLOUD_NAME,apiKey=process.env.CLOUDINARY_API_KEY,apiSecret=process.env.CLOUDINARY_API_SECRET;
 if(!secret||!cloudName||!apiKey||!apiSecret)return json(503,{error:'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Netlify environment variables.'});
 if(!authorized(event,secret))return json(401,{error:'Admin authorization failed.'});
 let data;try{data=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid request.'})}
 const resourceType=data.resource_type==='video'?'video':data.resource_type==='image'?'image':'';
 if(!resourceType)return json(400,{error:'Invalid media type.'});
 const timestamp=Math.floor(Date.now()/1000),folder='sadee-pro-store/hero';
 const params=`folder=${folder}&timestamp=${timestamp}`;
 const signature=crypto.createHash('sha1').update(params+apiSecret).digest('hex');
 return json(200,{cloud_name:cloudName,api_key:apiKey,timestamp,signature,resource_type:resourceType});
}
