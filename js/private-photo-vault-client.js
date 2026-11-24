// Browser transport for the private original-photo vault.
// No provider credentials, no thumbnails, no image transformation.
(function(root){
  'use strict';
  const MAX_BYTES=24_000_000;
  const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  const digest=async bytes=>hex(await root.crypto.subtle.digest('SHA-256',bytes));
  function createClient({endpoint,getToken,fetcher=root.fetch.bind(root)}){
    const u=new URL(endpoint);
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')
      throw new Error('照片儲存服務網址設定不正確');
    const base=u.origin;
    async function request(kind,sha,options={}){
      if(!['original','legacy-hosted'].includes(kind)||!(/^[a-f0-9]{64}$/).test(sha))
        throw new Error('照片備份識別碼不正確');
      const token=await getToken();
      if(!token)throw new Error('請先登入雙人同步帳號');
      const result=await fetcher(base+'/v1/photos/'+kind+'/'+sha,{
        ...options,headers:{...options.headers,Authorization:'Bearer '+token},
        credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(180000)
      });
      if(!result.ok){
        let reason='STORAGE_UNAVAILABLE';
        try{reason=(await result.json()).error||reason;}catch(_){}
        const error=new Error(reason==='FREE_CAPACITY_EXCEEDED'?'免費備援容量不足，原圖仍保留，未標記上傳完成':reason);
        error.code=reason;throw error;
      }
      return result;
    }
    async function save(blob,kind='original'){
      if(!(blob instanceof Blob)||!blob.size||blob.size>MAX_BYTES)throw new Error('原始檔超過單張安全容量；不會自動壓縮');
      const bytes=await blob.arrayBuffer(),sha=await digest(bytes);
      const response=await request(kind,sha,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:bytes});
      const result=await response.json();
      if(result.version!==1||result.verified!==true||result.sha256!==sha||
        result.kind!==kind||result.bytes!==blob.size||
        !Array.isArray(result.copies)||result.copies.length!==2||
        !result.copies.includes('backblaze-b2')||!result.copies.includes('imagekit'))
        throw new Error('兩份雲端原圖尚未完整驗證');
      return {version:1,kind,sha256:sha,bytes:blob.size,copies:result.copies.slice(),
        mime:blob.type||'application/octet-stream',verified:true};
    }
    async function read(ref){
      const response=await request(ref.kind,ref.sha256);
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength!==ref.bytes||bytes.byteLength>MAX_BYTES||await digest(bytes)!==ref.sha256)
        throw new Error('備援圖片完整性校驗未通過');
      return new Blob([bytes],{type:ref.mime||'application/octet-stream'});
    }
    return Object.freeze({saveOriginal:blob=>save(blob,'original'),
      saveLegacyCopy:blob=>save(blob,'legacy-hosted'),read});
  }
  root.createPrivatePhotoVaultClient=createClient;
})(window);
