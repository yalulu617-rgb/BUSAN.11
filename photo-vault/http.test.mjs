import test from 'node:test';
import assert from 'node:assert/strict';
import {createVaultServer,createMemberAuthorizer} from './http.mjs';
import {hash,createVault} from './core.mjs';
const bytes=Buffer.from('synthetic exact binary bytes');
const digest=hash(bytes);
const adapter=provider=>{
  const data=new Map();return {provider,data,async get(k){return data.get(k)??null},
    async put(k,v){data.set(k,Buffer.from(v))},async usage(){return 0}};
};
test('only the two configured Firebase accounts are allowed',async()=>{
  const auth=createMemberAuthorizer({firebaseApiKey:'test-key',allowedUids:['a','b'],
    fetcher:async(_url,req)=>new Response(JSON.stringify({users:[{localId:JSON.parse(req.body).idToken.startsWith('member')?'a':'stranger'}]}))});
  assert.equal(await auth('member'+'x'.repeat(50)),true);
  assert.equal(await auth('other'+'x'.repeat(50)),false);
  assert.equal(await auth(undefined),false);
});
test('authenticated HTTP dual write and read preserve bytes; foreign origins and unauthenticated users cannot access storage',async()=>{
  const primary=adapter('b2'),secondary=adapter('imagekit');
  const server=createVaultServer({vault:createVault({primary,secondary}),authorize:async token=>token==='test-member'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const root='http://127.0.0.1:'+server.address().port+'/v1/photos/original/'+digest;
    const noAuth=await fetch(root);assert.equal(noAuth.status,401);
    const wrongOrigin=await fetch(root,{headers:{Origin:'https://evil.example',Authorization:'Bearer test-member'}});assert.equal(wrongOrigin.status,403);
    const saved=await fetch(root,{method:'PUT',headers:{Authorization:'Bearer test-member','Content-Type':'application/octet-stream'},body:bytes});
    assert.equal(saved.status,200);assert.equal((await saved.json()).verified,true);
    assert.equal(primary.data.size,1);assert.equal(secondary.data.size,1);
    const loaded=await fetch(root,{headers:{Authorization:'Bearer test-member'}});
    assert.equal(loaded.status,200);assert.deepEqual(Buffer.from(await loaded.arrayBuffer()),bytes);
    assert.equal(loaded.headers.get('Cache-Control'),'no-store');
    assert.equal(loaded.headers.get('X-Photo-SHA256'),digest);
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});
