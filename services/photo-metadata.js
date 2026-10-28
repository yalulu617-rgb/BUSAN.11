// BUSAN.11 / V46 optional original-photo metadata (read BEFORE image resize).
// Metadata stays local until the owner chooses to save a photo record.
// JPEG EXIF only; other formats return "unknown" instead of inventing time or GPS.
(function(target) {
  'use strict';
  const UNKNOWN = () => ({capturedAt:null, offsetTime:null, latitude:null, longitude:null});
  function parseExif(bytes) {
    const result = UNKNOWN();
    if (!(bytes instanceof ArrayBuffer) || bytes.byteLength < 12) return result;
    const view = new DataView(bytes);
    const safeU16 = (pos,little) => pos>=0 && pos+2<=view.byteLength?view.getUint16(pos,little):null;
    const safeU32 = (pos,little) => pos>=0 && pos+4<=view.byteLength?view.getUint32(pos,little):null;
    if(view.getUint16(0) !== 0xffd8) return result;
    let start=2;
    while(start+4<=view.byteLength){
      if(view.getUint8(start)!==0xff) break;
      const marker=view.getUint8(start+1);
      if(marker===0xda||marker===0xd9) break;
      if(marker===0xff||marker===0x00){start++;continue;}
      const segmentLength=safeU16(start+2,false);
      if(segmentLength===null||segmentLength<2||start+2+segmentLength>view.byteLength)break;
      const appStart=start+4;
      if(marker===0xe1 && segmentLength>=8 &&
         view.getUint32(appStart)===0x45786966 && view.getUint16(appStart+4)===0) {
        const tiff=appStart+6;
        const little=view.getUint16(tiff)===0x4949;
        if(!little && view.getUint16(tiff)!==0x4d4d)break;
        if(safeU16(tiff+2,little)!==42)break;
        const initial=safeU32(tiff+4,little);
        if(initial===null)break;
        function findTag(ifdOffset,tag){
          const base=tiff+ifdOffset;
          const count=safeU16(base,little);
          if(count===null||count>4096||base+2+count*12+4>view.byteLength)return null;
          for(let n=0;n<count;n++){
            const entry=base+2+12*n;
            if(safeU16(entry,little)!==tag)continue;
            const type=safeU16(entry+2,little),length=safeU32(entry+4,little);
            const unit={1:1,2:1,3:2,4:4,5:8}[type];
            if(!unit||length===null||length>500000)return null;
            const size=length*unit;
            const offset=size<=4?entry+8:tiff+safeU32(entry+8,little);
            if(!Number.isFinite(offset)||offset<tiff||offset+size>view.byteLength)return null;
            return {type,length,offset};
          }
          return null;
        }
        const textTag = (ifd,tag) => {
          const v=findTag(ifd,tag);
          if(!v||v.type!==2||v.length>128)return null;
          const text=Array.from(new Uint8Array(bytes,v.offset,v.length))
            .map(x=>String.fromCharCode(x)).join('').replace(/\0.*$/,'').trim();
          return text||null;
        };
        const pointer = (ifd,tag) => {
          const entry=findTag(ifd,tag);
          return entry?.type===4 && entry.length===1?safeU32(entry.offset,little):null;
        };
        const exifIFD=pointer(initial,0x8769);
        const dateText=exifIFD===null?null:textTag(exifIFD,0x9003);
        const m=dateText?.match(/^(20\d\d):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)$/);
        if(m){
          const [y,mo,d,h,mi,s]=m.slice(1).map(Number);
          const v=new Date(Date.UTC(y,mo-1,d,h,mi,s));
          if(v.getUTCFullYear()===y&&v.getUTCMonth()===mo-1&&v.getUTCDate()===d &&
             v.getUTCHours()===h&&v.getUTCMinutes()===mi&&v.getUTCSeconds()===s)
            result.capturedAt=`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
        }
        const tz=exifIFD===null?null:textTag(exifIFD,0x9011);
        if(tz && /^[+-](?:0\d|1\d|2[0-3]):[0-5]\d$/.test(tz))result.offsetTime=tz;
        const gpsIFD=pointer(initial,0x8825);
        if(gpsIFD!==null){
          const gpsStr=t=>textTag(gpsIFD,t);
          const rationalTriplet=t=>{
            const v=findTag(gpsIFD,t);
            if(!v||v.type!==5||v.length!==3)return null;
            const nums=[];
            for(let i=0;i<3;i++){
              const a=safeU32(v.offset+8*i,little),b=safeU32(v.offset+8*i+4,little);
              if(a===null||!b)return null;
              nums.push(a/b);
            }
            return nums[0]+nums[1]/60+nums[2]/3600;
          };
          const north=gpsStr(1),east=gpsStr(3),lat=rationalTriplet(2),lon=rationalTriplet(4);
          if((north==='N'||north==='S')&&(east==='E'||east==='W')&&
             Number.isFinite(lat)&&Number.isFinite(lon)&&lat<=90&&lon<=180){
            result.latitude=Number((north==='S'?-lat:lat).toFixed(7));
            result.longitude=Number((east==='W'?-lon:lon).toFixed(7));
          }
        }
        break;
      }
      start += 2+segmentLength;
    }
    return result;
  }
  async function readOriginal(file) {
    if(!file || typeof file.slice!=='function' || file.size>128*1024*1024) return UNKNOWN();
    if(!/jpe?g/i.test(file.type||'') && !/\.jpe?g$/i.test(file.name||'')) return UNKNOWN();
    try{
      const bytes=await file.slice(0,Math.min(file.size,1024*1024)).arrayBuffer();
      return parseExif(bytes);
    }catch{return UNKNOWN();}
  }
  target.PhotoMetadataEngine=Object.freeze({parseExif,readOriginal});
})(typeof window!=='undefined'?window:globalThis);
