import test from 'node:test';
import assert from 'node:assert/strict';
import { createVault, hash } from './core.mjs';
const payload = Buffer.from('synthetic original bytes, no real photos');
const digest = hash(payload);
function store(provider) {
  const data = new Map();
  return {
    provider, data, writes: 0, failRead:false, failWrite:false,
    async get(key) { if(this.failRead) throw Error('offline'); return data.has(key) ? Buffer.from(data.get(key)) : null; },
    async put(key,bytes) { this.writes++; if(this.failWrite) throw Error('offline'); data.set(key,Buffer.from(bytes)); },
    async usage() { return [...data.values()].reduce((n,b)=>n+b.length,0); }
  };
}
function setup(opts={}) {
  const primary=store('b2'),secondary=store('imagekit');
  return {primary,secondary,v:createVault({primary,secondary,...opts})};
}
test('exact bytes read back from two independent providers; retry never duplicates writes',async()=>{
  const {v,primary,secondary}=setup();
  const result=await v.save({bytes:payload,digest});
  assert.equal(result.verified,true);
  assert.deepEqual(result.copies,['b2','imagekit']);
  assert.deepEqual([...primary.data.values()][0],payload);
  assert.deepEqual([...secondary.data.values()][0],payload);
  await v.save({bytes:payload,digest});
  assert.equal(primary.writes,1);assert.equal(secondary.writes,1);
});
test('secondary outage does not claim success; retry completes remaining copy',async()=>{
  const {v,primary,secondary}=setup();secondary.failWrite=true;
  await assert.rejects(v.save({bytes:payload,digest}));
  assert.equal(primary.writes,1);
  secondary.failWrite=false;const result=await v.save({bytes:payload,digest});
  assert.equal(result.verified,true);assert.equal(primary.writes,1);
});
test('quota failure blocks both writes, not just the secondary',async()=>{
  const {v,primary,secondary}=setup({secondaryLimit:payload.length-1});
  await assert.rejects(v.save({bytes:payload,digest}),e=>e.code==='FREE_CAPACITY_EXCEEDED');
  assert.equal(primary.writes+secondary.writes,0);
});
test('automatic failover on outage and byte corruption; fail closed if both invalid',async()=>{
  const {v,primary,secondary}=setup();await v.save({bytes:payload,digest});
  primary.failRead=true;assert.equal((await v.read({digest})).provider,'imagekit');
  primary.failRead=false;const k=[...primary.data.keys()][0];primary.data.set(k,Buffer.from('corrupt'));
  assert.deepEqual((await v.read({digest})).bytes,payload);
  secondary.failRead=true;await assert.rejects(v.read({digest}),e=>e.code==='NO_VERIFIED_COPY');
});
test('legacy copies never masquerade as originals',async()=>{
  const {v}=setup();const saved=await v.save({bytes:payload,digest,kind:'legacy-hosted'});
  assert.equal(saved.kind,'legacy-hosted');
  await assert.rejects(v.read({digest,kind:'original'}));
  assert.deepEqual((await v.read({digest,kind:'legacy-hosted'})).bytes,payload);
});
test('reject invalid digest, unsafe path and single-provider configuration',async()=>{
  const {v}=setup();
  await assert.rejects(v.save({bytes:payload,digest:'0'.repeat(64)}));
  await assert.rejects(v.read({digest:'../secret'}));
  assert.throws(()=>createVault({primary:store('b2'),secondary:store('b2')}));
});
