// OWNER-only disposable VISUAL / interaction preview build. NEVER use for production.
import { mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const source=process.cwd(),target=resolve('public');
const assets=['index.html','style.css','sw.js','manifest.json','icon.png','icon-192.png','icon-512.png','13972.png','assets','components','data','js','services','ute'];
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
for(const name of assets)await cp(join(source,name),join(target,name),{recursive:true});
let html=await readFile(join(target,'index.html'),'utf8');
let firebase=await readFile(join(target,'js/firebase.js'),'utf8');
const fixture=await readFile(join(source,'tests/fixtures/ci-firebase.js'),'utf8');
const sdkPattern=/\s*<script\s+src="https:\/\/www\.gstatic\.com\/firebasejs\/9\.22\.1\/firebase-(?:app|database)-compat\.js"><\/script>/g;
const count=(html.match(sdkPattern)||[]).length;
if(count!==2)throw Error('STOP: unexpected Firebase SDK tags; refuse unsafe preview');
html=html.replace(sdkPattern,'');
const configRegex=/    const firebaseConfig = \{[\s\S]*?\n    \};/;
if(!configRegex.test(firebase)||!fixture.includes('__ciOnly:true'))throw Error('STOP: unknown Firebase bootstrap or fixture');
firebase=firebase.replace(configRegex,'    const firebaseConfig = Object.freeze({previewOnly:true});');
firebase=firebase.replace('    const firebaseConfig = ',fixture.replace('apps:[],','apps:[ciApp],')+'\n    const firebaseConfig = ');
if(/busan-trip-2026-4148f|AIzaSy/.test(firebase))throw Error('STOP: preview output still has live Firebase config');
await writeFile(join(target,'js/firebase.js'),firebase);
const csp='<meta http-equiv="Content-Security-Policy" content="connect-src \'self\'; form-action \'self\';">';
html=html.replace('<meta charset="UTF-8">','<meta charset="UTF-8">\n    '+csp);
html=html.replace('<title>釜山慶州秋之旅 V46 旗艦版</title>','<title>BUSAN.11 V46｜操作預覽（隔離資料）</title>');
html=html.replace('V45 旗艦真我版','V46 視覺操作預覽');
html=html.replace('BUSAN.11 V45・2026 秋季雙城旅行版','此為隔離資料試用站，並非正式 APP');
html=html.replace('<body>','<body>\n<!-- V46 sandbox only: NO live Firebase; changes reset on page reload. -->');
await writeFile(join(target,'index.html'),html);
let sw=await readFile(join(target,'sw.js'),'utf8');
sw=sw.replace(/const CACHE_NAME = '[^']+';/,"const CACHE_NAME = 'busan-v46-owner-sandbox-20261019';");
await writeFile(join(target,'sw.js'),sw);
let manifest=JSON.parse(await readFile(join(target,'manifest.json'),'utf8'));
manifest.name='BUSAN.11 V46｜操作預覽';
manifest.short_name='釜山V46 試用';
manifest.id='./?owner-visual-preview-20261019';
await writeFile(join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const assertions={
  firebaseSdkScriptsGone:!html.includes('firebase-app-compat.js')&&!html.includes('firebase-database-compat.js'),
  networkConnectionsLimited:html.includes("connect-src 'self'"),
  firebaseInMemory:firebase.includes('__ciOnly:true')&&firebase.includes('__testOnly:true'),
  liveFirebaseSecretsAbsent:!firebase.includes('busan-trip-2026-4148f'),
  previewCssIncluded:html.includes('v46-owner-visual-preview.css'),
};
if(Object.values(assertions).some(v=>!v))throw Error('STOP unsafe sandbox build '+JSON.stringify(assertions));
console.log('[OWNER_SANDBOX_BUILD]',JSON.stringify(assertions));
