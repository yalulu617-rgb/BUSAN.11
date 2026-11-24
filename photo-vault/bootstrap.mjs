// Deployment entrypoint. Defaults to a locked provisioning shell, even when
// secrets are present. Never expose a real photo API until live acceptance.
import {createServer} from 'node:http';
const required=['B2_KEY_ID','B2_APP_KEY','B2_BUCKET_ID','B2_BUCKET_NAME',
  'IMAGEKIT_PRIVATE_KEY','IMAGEKIT_ENDPOINT','FIREBASE_API_KEY','FIREBASE_MEMBER_UIDS'];
const configured=required.every(name=>Boolean(process.env[name]?.trim()));
if(process.env.VAULT_ENABLE_LIVE==='true' && configured){
  await import('./server.mjs');
} else {
  const server=createServer((req,res)=>{
    const health=req.method==='GET'&&(req.url==='/healthz'||req.url==='/');
    res.writeHead(health?200:503,{'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(JSON.stringify(health?{service:'busan11-photo-vault',status:'locked',
      configured,photoAccess:false,liveAcceptance:false}:{error:'VAULT_LOCKED'}));
  });
  server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Photo vault provisioning mode: locked'));
}
