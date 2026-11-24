import ImageKit from '@imagekit/nodejs';
import {createVault} from './core.mjs';
import {createB2,createImageKit} from './providers.mjs';
import {createVaultServer,createMemberAuthorizer} from './http.mjs';
const env=process.env;
const required=['B2_KEY_ID','B2_APP_KEY','B2_BUCKET_ID','B2_BUCKET_NAME',
  'IMAGEKIT_PRIVATE_KEY','IMAGEKIT_ENDPOINT','FIREBASE_API_KEY','FIREBASE_MEMBER_UIDS'];
if(required.some(k=>!env[k]))throw new Error('Photo vault is not configured: missing server environment');
const sdk=new ImageKit({privateKey:env.IMAGEKIT_PRIVATE_KEY});
const primary=createB2({keyId:env.B2_KEY_ID,key:env.B2_APP_KEY,bucketId:env.B2_BUCKET_ID,bucketName:env.B2_BUCKET_NAME});
const secondary=createImageKit({privateKey:env.IMAGEKIT_PRIVATE_KEY,urlEndpoint:env.IMAGEKIT_ENDPOINT,
  sign:src=>sdk.helper.buildSrc({src,urlEndpoint:env.IMAGEKIT_ENDPOINT,signed:true,expiresIn:120})});
const vault=createVault({primary,secondary});
const authorize=createMemberAuthorizer({firebaseApiKey:env.FIREBASE_API_KEY,allowedUids:env.FIREBASE_MEMBER_UIDS.split(',').map(v=>v.trim())});
const server=createVaultServer({vault,authorize});
server.listen(Number(env.PORT||8080),'0.0.0.0',()=>console.log('Photo vault process listening'));
