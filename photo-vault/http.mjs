import { createServer } from 'node:http';
import { MAX_PHOTO_BYTES, VaultError } from './core.mjs';
const headers = { 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer' };
function json(res,status,value) {
  res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify(value));
}
export function createMemberAuthorizer({firebaseApiKey,allowedUids,fetcher=fetch}) {
  const members=new Set(allowedUids);
  if(!firebaseApiKey || members.size!==2 || [...members].some(x=>typeof x!=='string'||!x))
    throw new Error('The two actual Firebase member UIDs must be configured server-side');
  return async token=>{
    if(typeof token!=='string'||token.length<40||token.length>8192) return false;
    const response=await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(firebaseApiKey),{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),
      signal:AbortSignal.timeout(12000),redirect:'error'
    });
    if(!response.ok)return false;
    const body=await response.json();
    const user=body.users?.[0];
    return body.users?.length===1 && user?.disabled!==true && members.has(user?.localId);
  };
}
async function bodyBytes(req) {
  const declared=Number(req.headers['content-length']);
  if(!Number.isSafeInteger(declared)||declared<=0||declared>MAX_PHOTO_BYTES)
    throw new VaultError('PHOTO_SIZE_NOT_ALLOWED',413);
  let n=0;const chunks=[];
  for await(const chunk of req) {
    n+=chunk.length;
    if(n>declared||n>MAX_PHOTO_BYTES)throw new VaultError('PHOTO_SIZE_NOT_ALLOWED',413);
    chunks.push(chunk);
  }
  if(n!==declared)throw new VaultError('INCOMPLETE_BODY',400);
  return Buffer.concat(chunks,n);
}
export function createVaultServer({vault,authorize,origin='https://yalulu617-rgb.github.io'}) {
  let busy=0;
  return createServer({requestTimeout:120_000,headersTimeout:15_000},async(req,res)=>{
    if(req.headers.origin && req.headers.origin!==origin)return json(res,403,{error:'ORIGIN_NOT_ALLOWED'});
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Methods','GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
    res.setHeader('Access-Control-Expose-Headers','X-Photo-SHA256, X-Photo-Provider');
    if(req.method==='OPTIONS'){res.writeHead(204,headers);return res.end();}
    if(req.method==='GET'&&req.url==='/healthz')return json(res,200,{service:'busan11-photo-vault',status:'process-running'});
    const match=/^\/v1\/photos\/(original|legacy-hosted)\/([a-f0-9]{64})$/.exec(req.url||'');
    if(!match||!['GET','PUT'].includes(req.method))return json(res,404,{error:'NOT_FOUND'});
    if(busy>=2)return json(res,429,{error:'RETRY_LATER'});
    busy++;
    try {
      const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];
      if(!(await authorize(token)))return json(res,401,{error:'NOT_AUTHORIZED'});
      const [,kind,digest]=match;
      if(req.method==='PUT') {
        if(req.headers['content-type']!=='application/octet-stream')
          return json(res,415,{error:'BINARY_BODY_REQUIRED'});
        const bytes=await bodyBytes(req);
        const result=await vault.save({kind,digest,bytes});
        return json(res,200,result);
      }
      const result=await vault.read({kind,digest});
      res.writeHead(200,{...headers,'Content-Type':'application/octet-stream',
        'Content-Length':String(result.bytes.length),'X-Photo-SHA256':digest,'X-Photo-Provider':result.provider});
      res.end(result.bytes);
    } catch(error) {
      if(!res.headersSent)json(res,error instanceof VaultError?error.status:503,
        {error:error instanceof VaultError?error.code:'STORAGE_UNAVAILABLE'});
      else res.destroy();
    } finally {busy--;}
  });
}
