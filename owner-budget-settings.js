/* BUSAN.11 owner-editable budget — isolated plugin, 2026-11-09.
 * Scope: Supports local persistence for private ledgers and real-time bidirectional
 * cloud sync for the shared public budget (busan_v46_budget_shared).
 */
(function (w, d) {
  'use strict';
  const KEY = 'busan_v46_budget_preferences_v1';
  const LIMIT_MIN = 1;
  const LIMIT_MAX = 100000000;
  const DEFAULTS = Object.freeze({ shared: 50000, user1: 20000, user2: 20000 });
  const engine = w.BudgetEngine;
  if (!engine || typeof engine.calculateBudget !== 'function' || !w.StorageEngine) {
    console.error('[BudgetSettings] Engine or storage unavailable');
    return;
  }
  const previousCalculate = engine.calculateBudget.bind(engine);
  const finiteAmount = input => {
    const number = Number(input);
    return Number.isSafeInteger(number) && number >= LIMIT_MIN && number <= LIMIT_MAX ? number : null;
  };
  const read = () => {
    const response = w.StorageEngine.get(KEY, {});
    if (response?.success !== true) throw new Error('無法讀取本機預算');
    const prefs = response.data && typeof response.data === 'object' && !Array.isArray(response.data)
      ? response.data : {};
    return Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) => [
      key, finiteAmount(prefs[key]) ?? fallback
    ]));
  };
  const currentScope = () => w.currentBillTab === '私帳'
    ? (w.deviceOwner === 'user2' ? 'user2' : 'user1') : 'shared';
  const getLimit = scope => read()[scope || currentScope()];
  const update = (scope, amount) => {
    if (!Object.hasOwn(DEFAULTS, scope)) throw new Error('預算類型不正確');
    const valid = finiteAmount(amount);
    if (valid === null) throw new Error('預算須為 1～100,000,000 元的整數');
    const next = { ...read(), [scope]: valid };
    const saved = w.StorageEngine.set(KEY, next);
    if (saved?.success !== true) throw new Error('本機儲存失敗，請勿關閉頁面');
    return next;
  };
  const fmt = x => Math.round(x).toLocaleString('en-US');
  const recalculate = (result, tab, owner) => {
    const scope = tab === '私帳' ? (owner === 'user2' ? 'user2' : 'user1') : 'shared';
    const ceiling = getLimit(scope);
    const spent = tab === '私帳' ? Number(result.totalPrivateTWD) : Number(result.totalSharedTWD);
    const safeSpent = Number.isFinite(spent) && spent > 0 ? spent : 0;
    const percent = Math.max(0, Math.min(100, safeSpent / ceiling * 100));
    return {
      ...result,
      budgetBarPct: percent.toFixed(1),
      budgetText: `已花費 $${fmt(safeSpent)} / 設定預算 $${fmt(ceiling)}`,
      budgetLimit: ceiling,
      budgetScope: scope,
      budgetBarColor: percent >= 90
        ? 'linear-gradient(90deg,#E74C3C,#C0392B)'
        : 'linear-gradient(90deg,#F39C12,#E74C3C)',
      budgetBarShadow: percent >= 90
        ? '0 0 20px rgba(192,57,43,.48)'
        : '0 0 15px rgba(231,76,60,.24)'
    };
  };
  engine.calculateBudget = function (sharedBills, privateBills, krwToTwd, date, u1, u2, owner, tab) {
    const calculated = previousCalculate(sharedBills, privateBills, krwToTwd, date, u1, u2, owner, tab);
    return recalculate(calculated, tab, owner);
  };

  let budgetListenerAttached = false;
  function listenSharedBudget() {
    if (budgetListenerAttached) return;
    if (!w.NetworkEngine || !w.NetworkEngine._db || typeof w.NetworkEngine.firebaseOn !== 'function') return;
    if (w.firebase && typeof firebase.auth === 'function' && !w.firebase.__ciOnly) {
      if (!firebase.auth().currentUser) {
        console.log('[BudgetSettings] Auth-gated: Shared budget listener deferred until authentication');
        return;
      }
    }
    budgetListenerAttached = true;
    w.NetworkEngine.firebaseOn(w.DB_BUDGET || 'busan_v46_budget_shared', snap => {
      try {
        if (!snap || typeof snap.val !== 'function') return;
        const data = snap.val();
        if (data && Number.isSafeInteger(Number(data.shared))) {
          const cloudVal = Number(data.shared);
          const current = read();
          if (current.shared !== cloudVal) {
            const next = { ...current, shared: cloudVal };
            w.StorageEngine.set(KEY, next);
            if (typeof w.triggerContextUpdateImmediate === 'function') w.triggerContextUpdateImmediate();
            else if (typeof w.triggerContextUpdate === 'function') w.triggerContextUpdate();
          }
        }
      } catch (err) {
        console.warn('[BudgetSettings] Failed to process shared budget snapshot', err);
      }
    });
  }

  function initUI() {
    const scopeLabel = d.getElementById('budgetScopeLabel');
    const budgetText = d.getElementById('budgetText');
    if (!scopeLabel || !budgetText) return;
    if (d.getElementById('ownerBudgetEdit')) return;
    const edit = d.createElement('button');
    edit.id = 'ownerBudgetEdit';
    edit.type = 'button';
    edit.textContent = '✎ 修改預算';
    edit.setAttribute('aria-label', '修改目前帳本的預算上限');
    edit.style.cssText = 'background:#eaf4ec;color:#1d5c4d;border:1px solid #a9d4c0;border-radius:10px;padding:7px 10px;font-size:.78rem;font-weight:800;min-height:39px;cursor:pointer;margin-left:9px;';
    scopeLabel.parentElement?.appendChild(edit);

    const form = d.createElement('div');
    form.id = 'ownerBudgetEditor';
    form.hidden = true;
    form.style.cssText = 'background:#fff9ec;border:1px solid #e5cfaa;border-radius:13px;padding:12px;margin:10px 0 8px;';
    const title = d.createElement('label');
    title.id = 'ownerBudgetEditorLabel';
    title.htmlFor = 'ownerBudgetAmount';
    title.textContent = '設定目前帳本預算（台幣）';
    title.style.cssText = 'display:block;font-size:.87rem;font-weight:800;color:#324b5f;margin-bottom:7px;';
    const input = d.createElement('input');
    input.id = 'ownerBudgetAmount'; input.type = 'number'; input.inputMode = 'numeric';
    input.min = String(LIMIT_MIN); input.max = String(LIMIT_MAX); input.step = '1';
    input.style.cssText = 'width:100%;box-sizing:border-box;border:1px solid #b8c8cc;border-radius:10px;padding:12px;font-size:1rem;background:white;color:#173d54;';
    const note = d.createElement('p');
    note.textContent = '公費預算將自動同步至雙人手機；個人私帳預算僅在此裝置儲存。';
    note.style.cssText = 'font-size:.73rem;color:#63767c;margin:6px 0;line-height:1.4;';
    const message = d.createElement('p'); message.id = 'ownerBudgetError';
    message.setAttribute('role', 'alert');
    message.style.cssText = 'color:#ae3434;font-size:.76rem;min-height:1em;margin:4px 0;';
    const buttonRow = d.createElement('div');
    buttonRow.style.cssText = 'display:flex;gap:8px;';
    const cancel = d.createElement('button'); cancel.type='button'; cancel.textContent='取消';
    cancel.style.cssText='flex:1;padding:11px;border-radius:10px;border:1px solid #bbb;background:#fff;color:#48535d;font-weight:700;';
    const save = d.createElement('button'); save.type='button'; save.textContent='儲存預算';
    save.style.cssText='flex:1;padding:11px;border-radius:10px;border:0;background:#267e6a;color:white;font-weight:800;';
    buttonRow.append(cancel, save);
    form.append(title,input,note,message,buttonRow);
    budgetText.parentElement?.insertBefore(form,budgetText);

    edit.addEventListener('click',()=>{
      try {
        const scope=currentScope();
        title.textContent=scope==='shared'?'設定雙人公費預算（台幣）':`設定${scope==='user1'?'溫':'鴨'}的個人私帳預算（台幣）`;
        input.value=String(getLimit(scope));
        form.dataset.scope=scope;
        message.textContent='';
        form.hidden=false;
        input.focus(); input.select();
      } catch(e) { message.textContent=e.message;form.hidden=false; }
    });
    cancel.addEventListener('click',()=>{form.hidden=true;message.textContent='';});
    const commit = async () => {
      message.textContent='';
      try {
        const active = currentScope();
        if (form.dataset.scope !== active) throw new Error('帳本已切換，請重新開啟預算編輯');
        const nextVal = update(active, input.value);
        if (active === 'shared') {
          if (w.NetworkEngine?._db && navigator.onLine) {
            try {
              const res = await w.NetworkEngine.firebaseWrite(w.DB_BUDGET || 'busan_v46_budget_shared', {
                shared: nextVal.shared,
                updatedAt: Date.now(),
                updatedBy: w.deviceOwner || 'user'
              });
              if (res?.success === true || (res === undefined && !res?.error)) {
                if (typeof w.showToast === 'function') w.showToast('✅ 雙人公費預算已同步至雲端', 'success');
              } else {
                if (typeof w.showToast === 'function') w.showToast('預算已儲存在此裝置，雲端待同步: ' + (res?.error || ''), 'warning');
              }
            } catch (err) {
              if (typeof w.showToast === 'function') w.showToast('預算已儲存在此裝置，雲端待同步: ' + err.message, 'warning');
            }
          } else {
            if (typeof w.showToast === 'function') w.showToast('✅ 預算已保存在此裝置（離線）', 'info');
          }
        } else {
          if (typeof w.showToast === 'function') w.showToast('✅ 個人私帳預算已保存在此裝置', 'success');
        }
        form.hidden=true;
        if(typeof w.triggerContextUpdateImmediate==='function') w.triggerContextUpdateImmediate();
        else if(typeof w.triggerContextUpdate==='function') w.triggerContextUpdate();
      } catch(e) {message.textContent=e.message;}
    };
    save.addEventListener('click',commit);
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit();}});

    listenSharedBudget();
  }
  w.OwnerBudgetSettings = Object.freeze({read, update, getLimit, recalculate, initUI, listenSharedBudget});
  if(d.readyState==='loading') d.addEventListener('DOMContentLoaded',initUI,{once:true});
  else initUI();
})(window,document);
