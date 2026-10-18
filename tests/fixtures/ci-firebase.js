    // CI-only ephemeral Firebase replacement injected into the runner's copy
    // before the actual config is evaluated. This code is NEVER included in main.
    const ciData = {
      busan_v36_shop: {
        'fixture-1': { text: 'Re4dy', owner: 'user2', checked: false, category: '保養', where: '測試用商店' },
        'fixture-2': { text: 'Imint無糖咖啡糖', owner: 'user2', checked: false, category: '食品', where: '測試用商店' }
      }
    };
    const ciCallbacks = new Map();
    let ciNextId = 100;
    const ciClone = value => value === undefined ? null : JSON.parse(JSON.stringify(value));
    const ciSegments = path => String(path || '').split('/').filter(Boolean);
    function ciGet(path) {
      let node = ciData;
      for (const key of ciSegments(path)) {
        if (!node || typeof node !== 'object') return null;
        node = node[key];
      }
      return node == null ? null : ciClone(node);
    }
    function ciPut(path, value) {
      const keys = ciSegments(path);
      if (!keys.length) throw new Error('CI fixture refuses root overwrite');
      let node = ciData;
      for (const key of keys.slice(0, -1)) {
        if (!node[key] || typeof node[key] !== 'object') node[key] = {};
        node = node[key];
      }
      const last = keys[keys.length - 1];
      if (value == null) delete node[last]; else node[last] = ciClone(value);
      for (const [listenerPath, callbacks] of ciCallbacks) {
        if (path === listenerPath || path.startsWith(listenerPath + '/') || listenerPath.startsWith(path + '/')) {
          for (const callback of callbacks) queueMicrotask(() => callback(ciSnapshot(listenerPath, ciGet(listenerPath))));
        }
      }
    }
    function ciSnapshot(key, value) {
      return {
        key, val: () => ciClone(value), exists: () => value !== null && value !== undefined,
        forEach(fn) {
          if (!value || typeof value !== 'object') return false;
          for (const [childKey, childValue] of Object.entries(value)) {
            if (fn(ciSnapshot(childKey, childValue)) === true) return true;
          }
          return false;
        },
        child(childPath) {
          const keys=ciSegments(childPath);
          let item=value;
          for (const k of keys) item=item && typeof item==='object' ? item[k] : null;
          return ciSnapshot(keys[keys.length-1] || '',item);
        }
      };
    }
    function ciRef(path='') {
      const route=ciSegments(path).join('/');
      const valueSnapshot=() => ciSnapshot(route.split('/').pop() || '', ciGet(route));
      return {
        key:route.split('/').pop() || null,
        toString:()=> 'https://ci.firebase.invalid/' + route,
        child(childPath){return ciRef([route, childPath].filter(Boolean).join('/'));},
        on(event, callback) {
          if(event!=='value') throw new Error('Unexpected CI Firebase subscription');
          if(!ciCallbacks.has(route))ciCallbacks.set(route,new Set());
          ciCallbacks.get(route).add(callback);
          queueMicrotask(()=>callback(valueSnapshot()));
          return callback;
        },
        off(event, callback) {
          if(!ciCallbacks.has(route))return;
          if(callback)ciCallbacks.get(route).delete(callback);
          else ciCallbacks.delete(route);
        },
        once:async event=>{
          if(event!=='value') throw new Error('Unexpected CI Firebase read');
          return valueSnapshot();
        },
        set:async value=>{ciPut(route,value);},
        update:async patch=>{ciPut(route,{...(ciGet(route)||{}),...ciClone(patch)});},
        remove:async ()=>{ciPut(route,null);},
        push:async value=>{
          const child=ciRef(route+'/fixture-new-'+ ++ciNextId);
          if(value!==undefined) await child.set(value);
          return child;
        }
      };
    }
    const ciDatabase=Object.freeze({__testOnly:true,ref:ciRef});
    const ciApp=Object.freeze({database:()=>ciDatabase});
    window.firebase = Object.freeze({
      apps:[],
      initializeApp:()=>ciApp,
      app:()=>ciApp,
      database:()=>ciDatabase,
      __ciOnly:true
    });
