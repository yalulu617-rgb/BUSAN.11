// @ts-check
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/auth-sync.js', import.meta.url), 'utf8');

// Isolated stub: no Firebase network or real accounts.
function makeHarness(rejectPopup) {
  const events = [], notifications = [];
  const elements = {
    authErrorMsg: { textContent: '' },
    authModal: { style: { display: 'flex' } }
  };
  const wen = { uid: 'fake-wen-uid', email: 'wen@example.invalid' };
  const auth = {
    currentUser: wen,
    async signOut() {
      events.push('signOut');
      this.currentUser = null;
    },
    async signInWithPopup() {
      events.push('signInWithPopup');
      if (rejectPopup) {
        throw Object.assign(new Error('Popup cancelled'), { code: 'auth/popup-closed-by-user' });
      }
      const duck = { uid: 'fake-duck-uid', email: 'duck@example.invalid' };
      this.currentUser = duck;
      return { user: duck };
    }
  };
  const firebase = {
    auth: Object.assign(() => auth, {
      GoogleAuthProvider: class {
        setCustomParameters() {}
      }
    })
  };
  const window = { firebase, showToast: (message, type) => notifications.push({ message, type }) };
  const document = {
    readyState: 'loading',
    getElementById: id => elements[id] || null,
    addEventListener() {}
  };
  vm.runInNewContext(source, { window, document, firebase, console });
  return { events, notifications, elements, window, auth, wen };
}

test('existing Wen session is not destroyed if Duck cancels Google popup', async () => {
  const h = makeHarness(true);
  await h.window.AuthSyncEngine.loginWithGoogle();
  expect(h.events).toEqual(['signInWithPopup']);
  expect(h.auth.currentUser).toBe(h.wen);
  expect(h.elements.authErrorMsg.textContent).toContain('auth/popup-closed-by-user');
  expect(h.notifications.some(n => n.type === 'success')).toBe(false);
});

test('Google popup launches first and succeeds without prior asynchronous logout', async () => {
  const h = makeHarness(false);
  await h.window.AuthSyncEngine.loginWithGoogle();
  expect(h.events).toEqual(['signInWithPopup']);
  expect(h.auth.currentUser.uid).toBe('fake-duck-uid');
  expect(h.notifications.some(n => n.type === 'success')).toBe(true);
  expect(h.elements.authModal.style.display).toBe('none');
});
