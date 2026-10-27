// V46 train controls: device-local only. No Firebase, location tracking or API.
(function(target){
  'use strict';
  const MOTION='busan11.v46.train.motion.v1';
  const PROGRESS='busan11.v46.train.progress.v1.';
  const memory={};
  const get=key=>{try{return target.localStorage.getItem(key);}catch{return memory[key]??null;}};
  const put=(key,value)=>{
    memory[key]=value;
    try{target.localStorage.setItem(key,value);}catch{/* in-memory fallback */}
  };
  const refresh=()=>{if(typeof target.triggerContextUpdateImmediate==='function')target.triggerContextUpdateImmediate();};
  const validDay=iso=>Boolean(target.V46TripCompanion?.dayFromIso(iso));
  const stateFor=iso=>{
    if(!validDay(iso))return {manualIndex:null};
    const raw=get(PROGRESS+iso);
    const value=raw===null?null:Number(raw);
    return {manualIndex:Number.isInteger(value)&&value>=0&&value<=200?value:null};
  };
  const prefersReduced=()=>target.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  const motionEnabled=()=>{
    // Honor OS accessibility preferences even if an older toggle says "on".
    if(prefersReduced())return false;
    const stored=get(MOTION);
    if(stored==='off')return false;
    if(stored==='on')return true;
    return target.navigator?.connection?.saveData!==true;
  };
  target.V46TrainControls=Object.freeze({stateFor,motionEnabled});
  target.setV46TrainStop=function(iso,next){
    if(!validDay(iso))return false;
    const current=target.getTripContext?.()?.v46Home?.nextStop;
    if(!current||current.iso!==iso)return false;
    const value=next==='auto'?null:next==='prev'?
      Math.max(0,current.index-1):next==='next'?
      Math.min(current.count,current.index+1):null;
    if(value===null&&next!=='auto')return false;
    if(value===null){
      memory[PROGRESS+iso]=null;
      try{target.localStorage.removeItem(PROGRESS+iso);}catch{/* no storage */}
    }else put(PROGRESS+iso,String(value));
    refresh();
    return true;
  };
  target.toggleV46TrainMotion=function(){
    if(prefersReduced())return false;
    put(MOTION,motionEnabled()?'off':'on');
    refresh();
    return true;
  };
  // CSS animations pause when the browser is in the background.
  const syncVisibility=()=>target.document?.body?.classList.toggle('v46-page-hidden',target.document.hidden);
  target.document?.addEventListener('visibilitychange',syncVisibility);
  target.addEventListener('pagehide',()=>target.document?.body?.classList.add('v46-page-hidden'));
  target.addEventListener('pageshow',syncVisibility);
  syncVisibility();
  target.greetV46TrainMascot=function(button){
    if(!button)return;
    const caption=button.querySelector('.v46-mascot-message');
    if(caption)caption.textContent='叮噹！旅途愉快 ♡';
    if(!motionEnabled())return;
    const icon=button.querySelector('.v46-mascot-image');
    if(!icon)return;
    icon.classList.remove('is-greeting');
    // Restart only on a real tap. No continual JS animation timer.
    void icon.offsetWidth;
    icon.classList.add('is-greeting');
    icon.addEventListener('animationend',()=>icon.classList.remove('is-greeting'),{once:true});
  };
})(window);
