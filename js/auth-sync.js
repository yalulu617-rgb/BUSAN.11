/* BUSAN.11 Dual-User Firebase Authentication & Cross-Device Sync Engine
 * Purpose: Authenticate Wen (溫) & Duck (鴨) with real Firebase accounts.
 * Wen uses Email/Password authentication.
 * Duck uses Google Sign-In authentication.
 * Defers RTDB listeners until genuine UID authentication is confirmed.
 * Automatically synchronizes pending local outbox (restaurants and photos) upon login.
 */
(function (w, d) {
  'use strict';

  const ROLES = {
    wen: { owner: 'user1', label: '溫', authType: 'email' },
    duck: { owner: 'user2', label: '鴨', authType: 'google' }
  };

  let activeRoleKey = 'wen';
  let duckManualEmailMode = false;
  // Release guard: the visual Wen/Duck selector is NOT an authenticated identity.
  function matchesRole(user) {
    if (!user) return false;
    const viaGoogle = !!(user.providerData || []).some(p => p && p.providerId === 'google.com');
    return (w.deviceOwner === 'user2') ? viaGoogle : !viaGoogle;
  }
  function globalStatus(message) {
    const node = d.getElementById('globalSyncStatus');
    if (node) node.textContent = message;
  }
  let authVerificationEpoch = 0;


  const AuthSyncEngine = {
    currentUser: null,

    openModal() {
      const modal = d.getElementById('authModal');
      if (modal) {
        modal.style.display = 'flex';
        const err = d.getElementById('authErrorMsg');
        if (err) err.textContent = '';
        const currentSavedOwner = w.deviceOwner || 'user1';
        this.selectRole(currentSavedOwner === 'user2' ? 'duck' : 'wen');
      }
    },

    closeModal() {
      const modal = d.getElementById('authModal');
      if (modal) modal.style.display = 'none';
    },

    selectRole(role) {
      activeRoleKey = role === 'duck' ? 'duck' : 'wen';
      duckManualEmailMode = false;
      const roleConfig = ROLES[activeRoleKey];
      const emailInput = d.getElementById('authEmailInput');
      const passInput = d.getElementById('authPasswordInput');
      const googleSection = d.getElementById('authGoogleSection');
      const emailSection = d.getElementById('authEmailSection');
      const loginBtn = d.getElementById('authLoginBtn');
      const btnWen = d.getElementById('authSelectWen');
      const btnDuck = d.getElementById('authSelectDuck');

      if (passInput) passInput.value = '';

      // Button tabs styling
      if (btnWen && btnDuck) {
        if (activeRoleKey === 'wen') {
          btnWen.style.background = '#d35400';
          btnWen.style.color = '#fff';
          btnDuck.style.background = '#fff';
          btnDuck.style.color = '#1e824c';
        } else {
          btnDuck.style.background = '#27ae60';
          btnDuck.style.color = '#fff';
          btnWen.style.background = '#fff';
          btnWen.style.color = '#a8432a';
        }
      }

      // Display modes: Duck defaults to Google, Wen defaults to Email/Password
      if (activeRoleKey === 'duck') {
        if (googleSection) googleSection.style.display = 'block';
        if (emailSection) emailSection.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'none';
      } else {
        if (googleSection) googleSection.style.display = 'none';
        if (emailSection) emailSection.style.display = 'block';
        if (loginBtn) {
          loginBtn.style.display = 'block';
          loginBtn.style.background = '#d35400';
          loginBtn.textContent = '登入同步 (溫)';
        }
      }

      // Restore previously saved real email for this role, if any
      const savedEmail = (w.localStorage && localStorage.getItem('busan_v46_auth_email_' + activeRoleKey)) || '';
      if (emailInput) {
        emailInput.value = savedEmail;
        emailInput.placeholder = `輸入${roleConfig.label}的真實 Email (如 name@gmail.com)`;
      }

      // Sync UI owner selector
      const ownerSel = d.getElementById('deviceOwner');
      if (ownerSel && ownerSel.value !== roleConfig.owner) {
        ownerSel.value = roleConfig.owner;
        if (typeof w.updateOwner === 'function') w.updateOwner();
      }
      const signedIn = (w.firebase && typeof firebase.auth === 'function') ? firebase.auth().currentUser : null;
      if (signedIn && !matchesRole(signedIn)) {
        authVerificationEpoch++;
        void firebase.auth().signOut().catch(error => console.warn('[AuthSync] Role change sign-out:', error.code));
      }
      this.updateUI(signedIn && matchesRole(signedIn) ? signedIn : null);
    },

    toggleEmailInputs() {
      duckManualEmailMode = !duckManualEmailMode;
      const googleSection = d.getElementById('authGoogleSection');
      const emailSection = d.getElementById('authEmailSection');
      const loginBtn = d.getElementById('authLoginBtn');
      if (duckManualEmailMode) {
        if (googleSection) googleSection.style.display = 'none';
        if (emailSection) emailSection.style.display = 'block';
        if (loginBtn) {
          loginBtn.style.display = 'block';
          loginBtn.style.background = '#27ae60';
          loginBtn.textContent = '登入同步 (鴨)';
        }
      } else {
        if (googleSection) googleSection.style.display = 'block';
        if (emailSection) emailSection.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'none';
      }
    },

    async loginWithGoogle() {
      const errEl = d.getElementById('authErrorMsg');
      if (errEl) errEl.textContent = '正在啟動 Google 登入...';

      if (!w.firebase || typeof firebase.auth !== 'function') {
        if (errEl) errEl.textContent = 'Firebase Auth 模組尚未載入';
        return;
      }

      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        let userCred;
        try {
          userCred = await firebase.auth().signInWithPopup(provider);
        } catch (popupErr) {
          // Do not silently redirect from a third-party GitHub Pages PWA:
          // Chrome's cross-origin storage restrictions can break Firebase redirect auth.
          // Show an actionable error instead of looping back to an apparent logged-in state.
          throw popupErr;
        }
        const user = userCred.user;
        if (errEl) errEl.textContent = '';
        this.closeModal();
        if (typeof w.showToast === 'function') {
          w.showToast(`✅ Google 登入成功！已驗證 UID: ${user.uid.slice(0, 8)}...`, 'success');
        }
      } catch (error) {
        console.error('[AuthSync] Google login failed:', error);
        let msg = error.message;
        if (error.code === 'auth/popup-blocked') {
          msg = '瀏覽器阻擋了登入彈跳視窗，請點選網址列允許彈出視窗後重試';
        } else if (error.code === 'auth/cancelled-popup-request') {
          msg = 'Google 登入要求已被取消';
        } else if (error.code === 'auth/popup-closed-by-user') {
          msg = '已取消 Google 登入';
        } else if (error.code === 'auth/network-request-failed') {
          msg = '網路連線異常，請確認網路狀態';
        } else if (error.code === 'auth/unauthorized-domain') {
          msg = '此網域尚未在 Firebase Console 授權網域清單中 (Authorized Domains)';
        }
        if (error.code === 'auth/operation-not-allowed') msg = 'Firebase 尚未啟用 Google 登入提供者';
        if (error.code === 'auth/operation-not-supported-in-this-environment') msg = '目前瀏覽器不支援 Google 登入，請使用手機 Chrome 正式瀏覽器';
        if (error.code === 'auth/internal-error') msg = 'Google 登入發生內部錯誤，請確認 Firebase 授權網域';
        if (errEl) errEl.textContent = `${msg} [${error.code || 'unknown'}]`;
      }
    },

    async submitLogin() {
      const emailInput = d.getElementById('authEmailInput');
      const passInput = d.getElementById('authPasswordInput');
      const errEl = d.getElementById('authErrorMsg');
      const email = emailInput?.value?.trim();
      const pass = passInput?.value;

      if (!email || !pass) {
        if (errEl) errEl.textContent = '請輸入您持有的真實 Email 與同步密碼';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errEl) errEl.textContent = 'Email 格式不完整，請輸入有效信箱';
        return;
      }
      if (errEl) errEl.textContent = '連線驗證中，請稍候...';

      if (!w.firebase || typeof firebase.auth !== 'function') {
        if (errEl) errEl.textContent = 'Firebase Auth 模組尚未載入';
        return;
      }

      try {
        const userCred = await firebase.auth().signInWithEmailAndPassword(email, pass);
        const user = userCred.user;
        if (w.localStorage) {
          localStorage.setItem('busan_v46_auth_email_' + activeRoleKey, email);
        }
        if (errEl) errEl.textContent = '';
        this.closeModal();
        if (typeof w.showToast === 'function') {
          w.showToast(`✅ 登入成功！已驗證 UID: ${user.uid.slice(0, 8)}...`, 'success');
        }
      } catch (error) {
        console.error('[AuthSync] Login failed:', error);
        let msg = error.message;
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          msg = '密碼錯誤，請確認 Firebase Console 中設定的密碼';
        } else if (error.code === 'auth/user-not-found') {
          msg = '找不到此 Email 帳號，請先在 Firebase Console 建立';
        } else if (error.code === 'auth/invalid-email') {
          msg = 'Email 格式不正確';
        } else if (error.code === 'auth/network-request-failed') {
          msg = '網路連線失敗，請檢查網路連線';
        }
        if (errEl) errEl.textContent = msg;
      }
    },

    async logout() {
      if (!w.firebase || typeof firebase.auth !== 'function') return;
      try {
        await firebase.auth().signOut();
        this.closeModal();
        if (typeof w.showToast === 'function') {
          w.showToast('已登出此裝置同步帳號', 'info');
        }
      } catch (err) {
        console.error('[AuthSync] Logout error:', err);
      }
    },

    updateUI(user) {
      this.currentUser = user;
      const statusEl = d.getElementById('authSyncStatus');
      const btnEl = d.getElementById('openAuthModalBtn');
      const logoutWrap = d.getElementById('authLogoutWrap');

      if (user && !matchesRole(user)) {
        if (statusEl) { statusEl.textContent = '⚠️ 登入帳號和本機使用者不一致，請切換登入'; statusEl.style.color = '#b45309'; }
        globalStatus('⚠️ 帳號身分不一致');
        if (btnEl) btnEl.textContent = '切換帳號';
        if (logoutWrap) logoutWrap.style.display = 'block';
        return;
      }
      if (user) {
        const isGoogle = user.providerData && user.providerData.some(p => p && p.providerId === 'google.com');
        const providerName = isGoogle ? 'Google' : 'Email';
        const roleLabel = (w.deviceOwner === 'user2') ? '🦆 鴨' : '👩 溫';
        const displayAccount = user.email || user.displayName || (user.uid ? `UID: ${user.uid.slice(0, 8)}...` : '');
        if (statusEl) {
          statusEl.textContent = `🟠 帳號已登入、雲端權限待確認 (${roleLabel} / ${providerName}: ${displayAccount})`;
          globalStatus(`🟠 ${roleLabel}已登入｜雲端待確認`);
          statusEl.style.color = '#1e824c';
          statusEl.title = `真實 UID: ${user.uid}\n帳號: ${user.email || user.displayName || '未知'}`;
        }
        if (btnEl) btnEl.textContent = '帳號管理';
        if (logoutWrap) logoutWrap.style.display = 'block';
      } else {
        if (statusEl) {
          statusEl.textContent = '☁️ 雙人同步：未登入 (資料僅保存在此裝置)';
          globalStatus('☁️ 雙人同步：未登入');
          statusEl.style.color = '#a8432a';
          statusEl.title = '未登入真實 Firebase 帳號，資料保存在裝置本機';
        }
        if (btnEl) btnEl.textContent = '登入同步';
        if (logoutWrap) logoutWrap.style.display = 'none';
      }
    },

    init() {
      if (!w.firebase || typeof firebase.auth !== 'function' || w.firebase.__ciOnly) {
        this.updateUI(null);
        return;
      }

      // Check redirect sign-in result if returning from redirect
      if (typeof firebase.auth().getRedirectResult === 'function') {
        firebase.auth().getRedirectResult().then(result => {
          if (result && result.user) {
            console.log('[AuthSync] Redirect sign-in success:', result.user.uid);
            if (typeof w.showToast === 'function') {
              w.showToast(`✅ Google 登入成功！已驗證 UID: ${result.user.uid.slice(0, 8)}...`, 'success');
            }
          }
        }).catch(err => {
          if (err && err.code) {
            console.warn('[AuthSync] Redirect sign-in notice:', err.code, err.message);
          }
        });
      }

      firebase.auth().onAuthStateChanged(async user => {
        const epoch = ++authVerificationEpoch;
        this.updateUI(user);
        if (user && !matchesRole(user)) return;
        if (user) {
          try {
            if (!w.NetworkEngine?._db || !w.DB_GUIDE) throw new Error('Firebase Database 尚未初始化');
            await w.NetworkEngine._db.ref(w.DB_GUIDE).once('value');
            if (epoch !== authVerificationEpoch || firebase.auth().currentUser?.uid !== user.uid || !matchesRole(user)) return;
          } catch (e) {
            if (epoch !== authVerificationEpoch) return;
            const msg = '⚠️ 帳號已登入，Firebase 資料庫尚未授權（本機照片和餐廳保留）';
            globalStatus('⚠️ 已登入・雲端未授權');
            const line = d.getElementById('authSyncStatus');
            if (line) { line.textContent = msg; line.style.color = '#b45309'; }
            console.warn('[AuthSync] RTDB permission check failed:', e.code || e.message);
            return;
          }
          globalStatus('🟢 雲端可讀｜寫入待實測');
          const line = d.getElementById('authSyncStatus');
          if (line) { line.textContent = '🟢 已驗證雲端讀取；寫入和跨手機互見仍需實測'; line.style.color = '#24734a'; }

          console.log('[AuthSync] Authenticated genuine UID:', user.uid, user.email);
          // 1. Start or resume RTDB listeners
          if (typeof w.initFirebaseListeners === 'function') {
            w.initFirebaseListeners();
          }
          // 2. Start shared budget cloud listener
          if (w.OwnerBudgetSettings && typeof w.OwnerBudgetSettings.listenSharedBudget === 'function') {
            w.OwnerBudgetSettings.listenSharedBudget();
          }
          // 3. Trigger retry on pending queues
          if (typeof w.retryPendingGuideSync === 'function') {
            void w.retryPendingGuideSync();
          }
          if (typeof w.retryPendingPhotos === 'function') {
            void w.retryPendingPhotos();
          }
        } else {
          console.log('[AuthSync] User is signed out');
        }
      });
    }
  };

  w.AuthSyncEngine = AuthSyncEngine;

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', () => AuthSyncEngine.init(), { once: true });
  } else {
    AuthSyncEngine.init();
  }
})(window, document);
