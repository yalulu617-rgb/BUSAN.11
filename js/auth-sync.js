/* BUSAN.11 Dual-User Firebase Authentication & Cross-Device Sync Engine
 * Purpose: Authenticate Wen (溫) & Duck (鴨) with real Firebase accounts.
 * Wen uses Email/Password authentication.
 * Duck uses Google Sign-In authentication (Popup + Redirect option for S25).
 * Accurately reports error codes and displays genuine UID.
 * Defers RTDB listeners until genuine UID and cloud permission are confirmed.
 * Automatically synchronizes pending local outbox (restaurants and photos) upon cloud read.
 */
(function (w, d) {
  'use strict';

  const ROLES = {
    wen: { owner: 'user1', label: '溫', authType: 'email' },
    duck: { owner: 'user2', label: '鴨', authType: 'google' }
  };

  let activeRoleKey = 'wen';
  let duckManualEmailMode = false;
  let authVerificationEpoch = 0;

  function globalStatus(message) {
    const node = d.getElementById('globalSyncStatus');
    if (node) node.textContent = message;
  }

  const AuthSyncEngine = {
    currentUser: null,
    hasCloudPermission: false,

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

      this.updateUI(this.currentUser);
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
      if (errEl) errEl.textContent = '正在啟動 Google 登入視窗...';

      if (!w.firebase || typeof firebase.auth !== 'function') {
        if (errEl) errEl.textContent = 'Firebase Auth 模組尚未載入';
        return;
      }

      // If already signed in as someone else, sign out cleanly first
      if (firebase.auth().currentUser) {
        try { await firebase.auth().signOut(); } catch (_) {}
      }

      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const userCred = await firebase.auth().signInWithPopup(provider);
        const user = userCred.user;
        if (errEl) errEl.textContent = '';
        this.closeModal();
        if (typeof w.showToast === 'function') {
          w.showToast(`✅ Google 登入成功！已驗證 UID: ${user.uid.slice(0, 8)}...`, 'success');
        }
      } catch (error) {
        console.error('[AuthSync] Google login failed:', error);
        this.handleAuthError(error, errEl);
      }
    },

    async loginWithGoogleRedirect() {
      const errEl = d.getElementById('authErrorMsg');
      if (errEl) errEl.textContent = '正在跳轉至 Google 登入頁面...';

      if (!w.firebase || typeof firebase.auth !== 'function') {
        if (errEl) errEl.textContent = 'Firebase Auth 模組尚未載入';
        return;
      }

      // If already signed in as someone else, sign out cleanly first
      if (firebase.auth().currentUser) {
        try { await firebase.auth().signOut(); } catch (_) {}
      }

      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await firebase.auth().signInWithRedirect(provider);
      } catch (error) {
        console.error('[AuthSync] Google redirect login failed:', error);
        this.handleAuthError(error, errEl);
      }
    },

    handleAuthError(error, errEl) {
      let msg = error.message;
      if (error.code === 'auth/popup-blocked') {
        msg = '瀏覽器阻擋了彈跳視窗，請點選上方「手機轉跳登入」';
      } else if (error.code === 'auth/popup-closed-by-user') {
        msg = 'Google 登入視窗已被關閉';
      } else if (error.code === 'auth/cancelled-popup-request') {
        msg = 'Google 登入要求已被取消';
      } else if (error.code === 'auth/unauthorized-domain') {
        msg = '此網域尚未在 Firebase Console 授權網域清單 (Authorized Domains) 中，請加入 yalulu617-rgb.github.io';
      } else if (error.code === 'auth/operation-not-allowed') {
        msg = 'Firebase 尚未啟用 Google 登入提供者，請在 Firebase Console 啟用 Google Sign-in';
      } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
        msg = '目前瀏覽器環境不支援此登入模式，請使用手機 Chrome 瀏覽器';
      } else if (error.code === 'auth/credential-already-in-use') {
        msg = '此 Google 帳號已被其他登入憑證佔用，已為您清除舊工作階段，請重試';
      } else if (error.code === 'auth/network-request-failed') {
        msg = '網路連線異常，請檢查網路連線狀態';
      } else if (error.code === 'auth/internal-error') {
        msg = 'Google 登入內部錯誤，請確認 Firebase 授權網域與網路';
      }
      if (errEl) errEl.textContent = `${msg} [${error.code || 'unknown'}]`;
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

      // If already signed in as someone else, sign out cleanly first
      if (firebase.auth().currentUser) {
        try { await firebase.auth().signOut(); } catch (_) {}
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
          msg = '密碼錯誤，請確認在 Firebase 設定的密碼';
        } else if (error.code === 'auth/user-not-found') {
          msg = '找不到此 Email 帳號，請先在 Firebase Console 建立';
        } else if (error.code === 'auth/invalid-email') {
          msg = 'Email 格式不正確';
        } else if (error.code === 'auth/network-request-failed') {
          msg = '網路連線失敗，請檢查網路連線';
        }
        if (errEl) errEl.textContent = `${msg} [${error.code || 'unknown'}]`;
      }
    },

    async logout() {
      if (!w.firebase || typeof firebase.auth !== 'function') return;
      try {
        await firebase.auth().signOut();
        this.currentUser = null;
        this.hasCloudPermission = false;
        this.closeModal();
        this.updateUI(null);
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

      if (user) {
        const isGoogle = user.providerData && user.providerData.some(p => p && p.providerId === 'google.com');
        const roleLabel = isGoogle ? '🦆 鴨' : '👩 溫';
        const providerName = isGoogle ? 'Google' : 'Email';
        const displayAccount = user.email || user.displayName || `UID: ${user.uid.slice(0, 8)}...`;

        // Automatically sync the UI device owner selector to match the authentic logged in user
        const targetOwner = isGoogle ? 'user2' : 'user1';
        if (w.deviceOwner !== targetOwner) {
          w.deviceOwner = targetOwner;
          const ownerSel = d.getElementById('deviceOwner');
          if (ownerSel) ownerSel.value = targetOwner;
          if (typeof w.updateOwner === 'function') w.updateOwner();
        }

        if (this.hasCloudPermission) {
          if (statusEl) {
            statusEl.innerHTML = `🟢 雙人同步：已連線 (${roleLabel} / ${providerName}: ${displayAccount})<br><span style="font-size:0.7rem;color:#666;">真實 UID: ${user.uid}</span>`;
            statusEl.style.color = '#1e824c';
            statusEl.title = `真實 UID: ${user.uid}\n帳號: ${user.email || user.displayName || '未知'}`;
          }
          globalStatus(`🟢 ${roleLabel}已連線｜雙人同步中`);
        } else {
          if (statusEl) {
            statusEl.innerHTML = `⚠️ 帳號已驗證！<br>真實 UID: <code style="font-size:0.75rem;background:#eee;padding:2px 4px;border-radius:4px;">${user.uid}</code><br><span style="font-size:0.72rem;color:#b45309;">資料庫規則尚未開放存取，請在 Firebase Console 加入此 UID</span>`;
            statusEl.style.color = '#b45309';
            statusEl.title = `真實 UID: ${user.uid}\n帳號: ${user.email || user.displayName || '未知'}`;
          }
          globalStatus(`⚠️ ${roleLabel}已驗證・雲端未授權`);
        }
        if (btnEl) btnEl.textContent = '帳號管理';
        if (logoutWrap) logoutWrap.style.display = 'block';
      } else {
        if (statusEl) {
          statusEl.textContent = '☁️ 雙人同步：未登入 (資料僅保存在此裝置)';
          statusEl.style.color = '#a8432a';
          statusEl.title = '未登入真實 Firebase 帳號，資料保存在裝置本機';
        }
        globalStatus('☁️ 雙人同步：未登入');
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
            const errEl = d.getElementById('authErrorMsg');
            this.handleAuthError(err, errEl);
          }
        });
      }

      firebase.auth().onAuthStateChanged(async user => {
        const epoch = ++authVerificationEpoch;
        this.currentUser = user;
        this.hasCloudPermission = false;
        this.updateUI(user);

        if (user) {
          console.log('[AuthSync] Authenticated user:', user.uid, user.email);

          // Actively verify if Firebase RTDB allows reading with this genuine UID
          try {
            if (!w.NetworkEngine?._db || !w.DB_GUIDE) throw new Error('Firebase Database 尚未初始化');
            await w.NetworkEngine._db.ref(w.DB_GUIDE).once('value');
            if (epoch !== authVerificationEpoch || firebase.auth().currentUser?.uid !== user.uid) return;
            this.hasCloudPermission = true;
            this.updateUI(user);
            console.log('[AuthSync] Cloud read permission verified for UID:', user.uid);
          } catch (e) {
            if (epoch !== authVerificationEpoch) return;
            this.hasCloudPermission = false;
            this.updateUI(user);
            console.warn('[AuthSync] RTDB permission check declined for UID:', user.uid, e.code || e.message);
            return;
          }

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
