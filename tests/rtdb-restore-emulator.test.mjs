import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execAsync = promisify(execFile);
const script=resolve(import.meta.dirname,'../scripts/verify-firebase-emulator-restore.mjs');
const magic=Buffer.from('BUSAN11_RTDB_AES256GCM_V1\n','ascii');
const passphrase='synthetic-fixture-passphrase-ONLY';
const fixture={
  busan_v36_tickets:{ sampleA:{title:'Synthetic mock ticket',status:'saved'} },
  busan_v36_shop:{mock1:{bought:true},mock2:{bought:false}},
  busan_v45_coupons:{A:{note:'Test coupon'}}
};
let tmp,archive;
async function createArchive(obj=fixture){
  tmp ||= await mkdtemp(join(tmpdir(),'busan-rtdb-emulator-'));
  const path=join(tmp,`synthetic-${randomBytes(4).toString('hex')}.rtdb.enc`);
  const salt=randomBytes(16),iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',scryptSync(passphrase,salt,32),iv);
  const plain=Buffer.from(JSON.stringify(obj));
  await writeFile(path,Buffer.concat([magic,salt,iv,cipher.update(plain),cipher.final(),cipher.getAuthTag()]),{mode:0o600});
  return path;
}
async function run(port,path,extra=[],env={}){
  return execAsync(process.execPath,[script,'--emulator-restore','--file',path,'--port',String(port),...extra],{
    env:{...process.env,BUSAN11_BACKUP_PASSPHRASE:passphrase,...env},timeout:30000
  });
}
async function withServer(fn,{mutate=false}={}){
  const requests=[];let stored={};
  const server=createServer(async(req,res)=>{
    requests.push({method:req.method,url:req.url});
    if(req.url!=='/.json?ns=demo-busan11-v46-restore'){res.writeHead(404).end();return;}
    if(req.method==='PUT'){
      const body=[];for await(const part of req)body.push(part);
      stored=JSON.parse(Buffer.concat(body).toString());
      res.writeHead(200,{'content-type':'application/json'}).end('null');return;
    }
    if(req.method==='GET'){
      const result=mutate?{...stored,busan_v36_shop:{wrong:true}}:Object.fromEntries(Object.entries(stored).reverse());
      res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(result));return;
    }
    res.writeHead(405).end();
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{return await fn(server.address().port,requests);}
  finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
}

test('synthetic encrypted backup restores exact data only under demo namespace',async()=>{
  archive ||= await createArchive();
  await withServer(async(port,requests)=>{
    const {stdout}=await run(port,archive);
    const result=JSON.parse(stdout);
    assert.equal(result.result,'isolated_emulator_restore_verified');
    assert.equal(result.topLevelCount,3);
    assert.equal(result.productionRead,false);
    assert.equal(result.productionWrite,false);
    assert.equal(result.canonicalDataSha256.length,64);
    assert.deepEqual(requests,[
      {method:'PUT',url:'/.json?ns=demo-busan11-v46-restore'},
      {method:'GET',url:'/.json?ns=demo-busan11-v46-restore'}]);
    assert.equal(stdout.includes('Synthetic mock ticket'),false);
  });
});
test('wrong passphrase aborts before writes',async()=>{
  await withServer(async(port,requests)=>{
    await assert.rejects(run(port,archive,[],{BUSAN11_BACKUP_PASSPHRASE:'WRONG-PASSPHRASE-OVER-16'}));
    assert.equal(requests.length,0);
  });
});
test('tampered archive aborts before writes',async()=>{
  const bad=await createArchive();const data=await readFile(bad);
  data[data.length-35]^=0x43;await writeFile(bad,data);
  await withServer(async(port,requests)=>{
    await assert.rejects(run(port,bad));assert.equal(requests.length,0);
  });
});
test('remote production endpoint arguments rejected without network access',async()=>{
  await withServer(async(port,requests)=>{
    await assert.rejects(run(port,archive,['--url','https://firebasedatabase.app']));
    assert.equal(requests.length,0);
  });
});
test('changed emulator readback is detected and fails',async()=>{
  await withServer(async(port,requests)=>{
    await assert.rejects(run(port,archive),/restore comparison FAILED/);
    assert.equal(requests.length,2);
  },{mutate:true});
});
test('genuine isolated RTDB emulator roundtrip (only when explicitly configured)',{skip:process.env.BUSAN11_TEST_REAL_EMULATOR!=='1'},async()=>{
  archive ||= await createArchive();
  const {stdout}=await run(9000,archive);
  const result=JSON.parse(stdout);
  assert.equal(result.result,'isolated_emulator_restore_verified');
  assert.equal(result.namespace,'demo-busan11-v46-restore');
  assert.equal(result.topLevelCount,3);
});
