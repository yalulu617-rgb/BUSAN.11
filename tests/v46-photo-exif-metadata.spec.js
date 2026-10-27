// Synthetic-only JPEG EXIF metadata and cloud-save boundaries.
import {test, expect} from '@playwright/test';
import fs from 'node:fs';
import vm from 'node:vm';
import {bootApp} from './helpers/boot.js';

function jpegWithExif(){
  const t=Buffer.alloc(280);
  t.writeUInt16LE(0x4949,0);t.writeUInt16LE(42,2);t.writeUInt32LE(8,4);
  function entry(base,n,tag,type,count,value,inline=null){
    const p=base+2+n*12;
    t.writeUInt16LE(tag,p);t.writeUInt16LE(type,p+2);t.writeUInt32LE(count,p+4);
    if(inline){inline.copy(t,p+8,0,Math.min(4,inline.length));}
    else t.writeUInt32LE(value,p+8);
  }
  // TIFF IFD0 -> EXIF and GPS pointers.
  t.writeUInt16LE(2,8);
  entry(8,0,0x8769,4,1,38);
  entry(8,1,0x8825,4,1,80);
  t.writeUInt16LE(2,38);
  entry(38,0,0x9003,2,20,200);
  entry(38,1,0x9011,2,7,240);
  t.writeUInt16LE(4,80);
  entry(80,0,1,2,2,0,Buffer.from([78,0]));
  entry(80,1,2,5,3,144);
  entry(80,2,3,2,2,0,Buffer.from([69,0]));
  entry(80,3,4,5,3,168);
  const lat=[[35,1],[10,1],[30,1]];
  const lon=[[129,1],[8,1],[20,1]];
  for(const [pos,rows] of [[144,lat],[168,lon]])rows.forEach(([a,b],i)=>{
    t.writeUInt32LE(a,pos+i*8);t.writeUInt32LE(b,pos+i*8+4);
  });
  t.write('2026:11:15 13:42:06\0',200,'ascii');
  t.write('+09:00\0',240,'ascii');
  const len=t.length+8;
  const head=Buffer.from([0xff,0xd8,0xff,0xe1,len>>8,len&255,69,120,105,102,0,0]);
  return Buffer.concat([head,t,Buffer.from([0xff,0xd9])]);
}
test('V46 EXIF: original JPEG timestamp and optional GPS parsed; no fabricated PNG timestamp',async()=>{
 const src=fs.readFileSync('services/photo-metadata.js','utf8');
 const sandbox={ArrayBuffer,DataView,Uint8Array,Date,Number,console};
 vm.createContext(sandbox);vm.runInContext(src,sandbox);
 const file=jpegWithExif();
 const result=sandbox.PhotoMetadataEngine.parseExif(file.buffer.slice(file.byteOffset,file.byteOffset+file.length));
 expect(result.capturedAt).toBe('2026-11-15T13:42:06');
 expect(result.offsetTime).toBe('+09:00');
 expect(result.latitude).toBeCloseTo(35.175,5);
 expect(result.longitude).toBeCloseTo(129.1388889,5);
 const empty=sandbox.PhotoMetadataEngine.parseExif(new Uint8Array([1,2,3]).buffer);
 expect(empty.capturedAt).toBe(null);
 expect(empty.latitude).toBe(null);
});
test('V46 memory: EXIF time survives compression; private GPS requires opt-in; metadata editor preserves cloud row',async({page})=>{
 await bootApp(page);
 expect(await page.evaluate(()=>window.NetworkEngine?._db?.__testOnly && window.firebase?.__ciOnly)).toBe(true);
 const data=Array.from(jpegWithExif());
 await page.evaluate(async bytes=>{
   window.__qaUploadOriginal=window.NetworkEngine.uploadImage;
   window.__qaCompressOriginal=window.compressImage;
   window.compressImage=async f=>f;
   let seq=0;
   window.NetworkEngine.uploadImage=async()=>({success:true,data:{url:'https://example.org/exif-' + (++seq) + '.jpg'}});
   const file=new File([new Uint8Array(bytes)],'shot.jpg',{type:'image/jpeg'});
   document.getElementById('photoGPSConsent').checked=false;
   await window.uploadMultipleToImgBB([file],'photo');
   document.getElementById('photoGPSConsent').checked=true;
   await window.uploadMultipleToImgBB([file],'photo');
   window.compressImage=window.__qaCompressOriginal;
   window.NetworkEngine.uploadImage=window.__qaUploadOriginal;
 },data);
 const records=await page.evaluate(async()=>{
   const rows=(await window.NetworkEngine._db.ref(window.DB_PHOTOS).once('value')).val()||{};
   return Object.values(rows).sort((a,b)=>a.url.localeCompare(b.url));
 });
 expect(records).toHaveLength(2);
 expect(records[0].capturedAt).toBe('2026-11-15T13:42:06');
 expect(records[0].date).toBe('11/15');
 expect(records[0].captureUtcOffset).toBe('+09:00');
 expect(records[0].latitude).toBeUndefined();
 expect(records[1].latitude).toBeCloseTo(35.175,5);
 expect(records[1].longitude).toBeCloseTo(129.1388889,5);
 await page.waitForFunction(()=>window.photoList?.length===2);
 await page.evaluate(()=>window.showV37Tab('photo'));
 await expect(page.locator('.memory-meta-edit')).toHaveCount(2);
 await page.locator('.memory-meta-edit').first().click();
 await expect(page.locator('#photoMetadataDialog')).toBeVisible();
 await page.locator('#photoCapturedAt').fill('2026-11-15T14:55:00');
 await page.locator('#photoLocationLabel').fill('慶州皇理團路');
 await page.locator('#photoMetadataSaveBtn').click();
 await expect(page.locator('#photoMetadataDialog')).not.toBeVisible();
 const updated=await page.evaluate(async()=>{
   const rows=(await window.NetworkEngine._db.ref(window.DB_PHOTOS).once('value')).val()||{};
   return Object.values(rows).find(x=>x.locationLabel==='慶州皇理團路');
 });
 expect(updated).toMatchObject({capturedAt:'2026-11-15T14:55:00',captureTimeSource:'manual',locationLabel:'慶州皇理團路'});
 expect(updated.url).toMatch(/^https:\/\/example.org\/exif-/);
});
