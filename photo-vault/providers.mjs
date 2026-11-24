// Server only. Credentials never appear in GitHub Pages or Firebase metadata.
import { createHash } from 'node:crypto';
import { MAX_PHOTO_BYTES, VaultError } from './core.mjs';

const timeout = () => AbortSignal.timeout(45_000);
const basic = (a,b) => 'Basic '+Buffer.from(a+':'+b).toString('base64');
const safeKey = /^busan11-vault\/(?:original|legacy-hosted)\/[0-9a-f]{64}\.bin$/;
const checkKey = key => { if (!safeKey.test(key)) throw new VaultError('INVALID_OBJECT',400); };
function trustedB2(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || !u.hostname.endsWith('.backblazeb2.com') ||
      u.username || u.password || u.port) throw new Error('Untrusted B2 endpoint');
  return u.toString().replace(/\/$/,'');
}
async function json(response, code) {
  if (!response.ok) throw new VaultError(code);
  return response.json();
}
async function readBounded(response) {
  if (!response.ok) throw new VaultError('PROVIDER_READ_FAILED');
  const reader=response.body?.getReader();
  if (!reader) throw new VaultError('PROVIDER_READ_EMPTY');
  const chunks=[];let size=0;
  try {
    while (true) {
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.length;
      if(size>MAX_PHOTO_BYTES) throw new VaultError('PROVIDER_FILE_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks,size);
  } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
export function createB2({ keyId, key, bucketId, bucketName, fetcher=fetch }) {
  if (![keyId,key,bucketId,bucketName].every(Boolean)) throw new Error('B2 configuration missing');
  let cached=null;
  async function auth() {
    if(cached && cached.expires>Date.now())return cached;
    const response=await fetcher('https://api.backblazeb2.com/b2api/v4/b2_authorize_account',{
      headers:{Authorization:basic(keyId,key)},signal:timeout(),redirect:'error'
    });
    const v=await json(response,'B2_AUTH_FAILED');
    const a=v.apiInfo?.storageApi;
    if(!a?.allowed?.buckets?.some(b=>b.id===bucketId && b.name===bucketName))
      throw new VaultError('B2_BUCKET_KEY_NOT_RESTRICTED');
    if(a.allowed.buckets.length!==1 || !a.allowed.capabilities?.every(c=>!['deleteFiles','deleteBuckets','writeBuckets','writeKeys'].includes(c)))
      throw new VaultError('B2_KEY_TOO_PRIVILEGED');
    const next={api:trustedB2(a.apiUrl),download:trustedB2(a.downloadUrl),
      token:v.authorizationToken,accountId:v.accountId,expires:Date.now()+600_000};
    const buckets=await api(next,'b2_list_buckets',{accountId:next.accountId,bucketId});
    if(!buckets.buckets?.some(b=>b.bucketId===bucketId && b.bucketName===bucketName && b.bucketType==='allPrivate'))
      throw new VaultError('B2_BUCKET_NOT_PRIVATE');
    cached=next;return next;
  }
  async function api(a,action,body) {
    const r=await fetcher(a.api+'/b2api/v4/'+action,{
      method:'POST',headers:{Authorization:a.token,'Content-Type':'application/json'},
      body:JSON.stringify(body),signal:timeout(),redirect:'error'
    });
    if(r.status===401)cached=null;
    return json(r,'B2_'+action.toUpperCase()+'_FAILED');
  }
  return {
    provider:'backblaze-b2',
    async get(keyName) {
      checkKey(keyName);const a=await auth();
      const url=a.download+'/file/'+encodeURIComponent(bucketName)+'/'+keyName;
      const r=await fetcher(url,{headers:{Authorization:a.token},signal:timeout(),redirect:'error',cache:'no-store'});
      if(r.status===404){ await r.body?.cancel();return null; }
      if(r.status===401)cached=null;
      return readBounded(r);
    },
    async put(keyName,bytes) {
      checkKey(keyName);const a=await auth();
      const u=await api(a,'b2_get_upload_url',{bucketId});
      const r=await fetcher(trustedB2(u.uploadUrl),{
        method:'POST',headers:{Authorization:u.authorizationToken,'X-Bz-File-Name':encodeURIComponent(keyName),
          'Content-Type':'application/octet-stream','Content-Length':String(bytes.length),
          'X-Bz-Content-Sha1':createHash('sha1').update(bytes).digest('hex')},
        body:bytes,signal:timeout(),redirect:'error'
      });
      const result=await json(r,'B2_UPLOAD_FAILED');
      if(result.fileName!==keyName||result.contentLength!==bytes.length)throw new VaultError('B2_UPLOAD_UNCONFIRMED');
    },
    async usage() {
      const a=await auth();let used=0,startFileName,startFileId;
      // Include retained historical versions, not just visible current files.
      for(let page=0;page<1000;page++){
        const p=await api(a,'b2_list_file_versions',{bucketId,maxFileCount:1000,startFileName,startFileId});
        if(!Array.isArray(p.files))throw new VaultError('B2_CAPACITY_UNKNOWN');
        for(const row of p.files) {
          if(!Number.isSafeInteger(row.contentLength)||row.contentLength<0)throw new VaultError('B2_CAPACITY_UNKNOWN');
          used+=row.contentLength;
        }
        if(!p.nextFileName)return used;
        startFileName=p.nextFileName;startFileId=p.nextFileId;
      }
      throw new VaultError('B2_CAPACITY_UNKNOWN');
    }
  };
}

// The signer must be supplied by the official server-side ImageKit SDK.
// Files are stored as private .bin assets, not resized images, so no processing
// or automatic image quality transformation is needed.
export function createImageKit({ privateKey,urlEndpoint,sign,fetcher=fetch }) {
  if(!privateKey||typeof sign!=='function')throw new Error('ImageKit configuration missing');
  const endpoint=new URL(urlEndpoint);
  if(endpoint.origin!=='https://ik.imagekit.io'||!/^\/[A-Za-z0-9_-]+\/?$/.test(endpoint.pathname))
    throw new Error('Invalid ImageKit endpoint');
  const base=endpoint.href.replace(/\/$/,'');
  const authorization=basic(privateKey,'');
  async function list(path) {
    const all=[];
    for(let skip=0;skip<100_000;skip+=1000) {
      const q=new URLSearchParams({path,type:'file',limit:'1000',skip:String(skip)});
      const r=await fetcher('https://api.imagekit.io/v1/files?'+q,{
        headers:{Authorization:authorization},signal:timeout(),redirect:'error'
      });
      const v=await json(r,'IMAGEKIT_LIST_FAILED');
      if(!Array.isArray(v))throw new VaultError('IMAGEKIT_CAPACITY_UNKNOWN');
      all.push(...v);
      if(v.length<1000)return all;
    }
    throw new VaultError('IMAGEKIT_CAPACITY_UNKNOWN');
  }
  async function find(key) {
    const folder='/'+key.slice(0,key.lastIndexOf('/'))+'/';
    return (await list(folder)).find(x=>x.filePath==='/'+key)||null;
  }
  async function get(key) {
    checkKey(key);
    const asset=await find(key);
    if(!asset)return null;
    if(asset.isPrivateFile!==true)throw new VaultError('IMAGEKIT_ASSET_NOT_PRIVATE');
    // Verify that anonymous reads are blocked. No signed URL is returned to users.
    const unsigned=await fetcher(base+'/'+key,{method:'GET',signal:timeout(),redirect:'error'});
    const blocked=[401,403,404].includes(unsigned.status);
    await unsigned.body?.cancel();
    if(!blocked)throw new VaultError('IMAGEKIT_PUBLIC_ACCESS_NOT_BLOCKED');
    const url=new URL(sign('/'+key));
    if(url.origin!==endpoint.origin || url.pathname!==endpoint.pathname.replace(/\/$/,'')+'/'+key ||
       !url.searchParams.get('ik-s'))throw new VaultError('IMAGEKIT_SIGNATURE_INVALID');
    return readBounded(await fetcher(url,{signal:timeout(),redirect:'error',cache:'no-store'}));
  }
  return {
    provider:'imagekit',
    get,
    async put(key,bytes) {
      checkKey(key);
      const i=key.lastIndexOf('/');
      const form=new FormData();
      form.append('file',new Blob([bytes],{type:'application/octet-stream'}),key.slice(i+1));
      form.set('fileName',key.slice(i+1));form.set('folder','/'+key.slice(0,i));
      form.set('useUniqueFileName','false');form.set('overwriteFile','false');
      form.set('isPrivateFile','true');form.set('responseFields','isPrivateFile');
      const response=await fetcher('https://upload.imagekit.io/api/v1/files/upload',{
        method:'POST',headers:{Authorization:authorization},body:form,signal:timeout(),redirect:'error'
      });
      const result=await json(response,'IMAGEKIT_UPLOAD_FAILED');
      if(result.filePath!=='/'+key || result.size!==bytes.length || result.isPrivateFile!==true)
        throw new VaultError('IMAGEKIT_UPLOAD_UNCONFIRMED');
    },
    async usage() {
      let used=0;
      for(const kind of ['original','legacy-hosted']){
        for(const item of await list('/busan11-vault/'+kind+'/')){
          if(!Number.isSafeInteger(item.size)||item.size<0)throw new VaultError('IMAGEKIT_CAPACITY_UNKNOWN');
          used+=item.size;
        }
      }
      return used;
    }
  };
}
