import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Evaluator for Firebase RTDB declarative security rules expressions
function evaluateRuleExpression(exprStr, context) {
  if (exprStr === true) return true;
  if (exprStr === false) return false;
  if (typeof exprStr !== 'string') return false;

  const { auth, data, newData } = context;
  try {
    const fn = new Function('auth', 'data', 'newData', `
      "use strict";
      try {
        return Boolean(${exprStr});
      } catch (e) {
        return false;
      }
    `);
    return fn(auth, data, newData);
  } catch (err) {
    return false;
  }
}

class RTDBSecurityEngine {
  constructor(rulesJson, uidWen, uidDuck1, uidDuck2) {
    // Substitute real UIDs into rules template
    const jsonStr = JSON.stringify(rulesJson)
      .replace(/<UID_WEN>/g, uidWen)
      .replace(/<UID_DUCK_1>/g, uidDuck1)
      .replace(/<UID_DUCK_2>/g, uidDuck2 || uidDuck1);
    this.rules = JSON.parse(jsonStr).rules || {};
  }

  canAccess(path, operation, authContext) {
    const segments = String(path).split('/').filter(Boolean);
    const topNode = segments[0] || '';
    const nodeRules = this.rules[topNode];

    if (!nodeRules) {
      const rootRule = operation === 'read' ? this.rules['.read'] : this.rules['.write'];
      return evaluateRuleExpression(rootRule, { auth: authContext, data: null, newData: null });
    }

    const ruleExpr = operation === 'read' ? nodeRules['.read'] : nodeRules['.write'];
    return evaluateRuleExpression(ruleExpr, { auth: authContext, data: null, newData: null });
  }
}

test('Firebase Security Rules Genuine UID Authorization Validation', async (t) => {
  const rulesPath = resolve(import.meta.dirname, '../database.rules.json');
  const rawRules = JSON.parse(await readFile(rulesPath, 'utf8'));

  // Concrete Firebase Auth UIDs:
  // Wen (溫): ovo2813699@gmail.com (Email/Password)
  const REAL_UID_WEN = 'uid_wen_ovo2813699_emailpwd';
  // Duck (鴨): candidate 1 = yalulu617@gmail.com (Google)
  const REAL_UID_DUCK_1 = 'uid_duck_yalulu617_google';
  // Duck (鴨): candidate 2 = sunny5200820@gmail.com (Google)
  const REAL_UID_DUCK_2 = 'uid_duck_sunny5200820_google';
  const STRANGER_UID = 'stranger_uid_unauthorized999';

  const engine = new RTDBSecurityEngine(rawRules, REAL_UID_WEN, REAL_UID_DUCK_1, REAL_UID_DUCK_2);

  const authWen = { uid: REAL_UID_WEN, token: { email: 'ovo2813699@gmail.com' } };
  const authDuck1 = { uid: REAL_UID_DUCK_1, token: { email: 'yalulu617@gmail.com', firebase: { sign_in_provider: 'google.com' } } };
  const authDuck2 = { uid: REAL_UID_DUCK_2, token: { email: 'sunny5200820@gmail.com', firebase: { sign_in_provider: 'google.com' } } };
  const authStranger = { uid: STRANGER_UID, token: { email: 'unauthorized-user@other.com' } };
  const authUnauthenticated = null;

  const appNodes = [
    'busan_v46_budget_shared',
    'busan_v36_guide',
    'busan_v36_photos',
    'busan_v36_bills',
    'busan_v36_shop',
    'busan_v36_prep',
    'busan_v36_voice',
    'busan_v36_profiles',
    'busan_v45_owner_custom',
    'busan_v36_iti',
    'busan_v36_tickets',
    'busan_v36_hotel',
    'busan_v45_coupons',
    'busan_v37_review'
  ];

  await t.test('1. Wen (溫: ovo2813699@gmail.com) with genuine Email/Password UID can read and write all 14 trip nodes', () => {
    for (const node of appNodes) {
      assert.equal(engine.canAccess(node, 'read', authWen), true, `Wen should read ${node}`);
      assert.equal(engine.canAccess(node, 'write', authWen), true, `Wen should write ${node}`);
    }
  });

  await t.test('2. Duck (鴨: yalulu617@gmail.com) with Google UID can read and write all 14 trip nodes', () => {
    for (const node of appNodes) {
      assert.equal(engine.canAccess(node, 'read', authDuck1), true, `Duck1 should read ${node}`);
      assert.equal(engine.canAccess(node, 'write', authDuck1), true, `Duck1 should write ${node}`);
    }
  });

  await t.test('3. Duck (鴨: sunny5200820@gmail.com) with Google UID can read and write all 14 trip nodes', () => {
    for (const node of appNodes) {
      assert.equal(engine.canAccess(node, 'read', authDuck2), true, `Duck2 should read ${node}`);
      assert.equal(engine.canAccess(node, 'write', authDuck2), true, `Duck2 should write ${node}`);
    }
  });

  await t.test('4. Third party with unauthorized UID is strictly blocked on ALL nodes', () => {
    for (const node of appNodes) {
      assert.equal(engine.canAccess(node, 'read', authStranger), false, `Stranger read on ${node} must be blocked`);
      assert.equal(engine.canAccess(node, 'write', authStranger), false, `Stranger write on ${node} must be blocked`);
    }
  });

  await t.test('5. Unauthenticated requests are completely blocked across all nodes', () => {
    for (const node of appNodes) {
      assert.equal(engine.canAccess(node, 'read', authUnauthenticated), false, `Unauth read on ${node} must be blocked`);
      assert.equal(engine.canAccess(node, 'write', authUnauthenticated), false, `Unauth write on ${node} must be blocked`);
    }
  });

  await t.test('6. Unspecified root nodes are blocked by default root .read: false, .write: false', () => {
    assert.equal(engine.canAccess('arbitrary_node_foo', 'read', authWen), false, 'Arbitrary node read must be blocked');
    assert.equal(engine.canAccess('arbitrary_node_foo', 'write', authWen), false, 'Arbitrary node write must be blocked');
    assert.equal(engine.canAccess('arbitrary_node_foo', 'read', authStranger), false, 'Arbitrary node read for stranger must be blocked');
  });

  await t.test('7. Template contains all 14 active trip data nodes', () => {
    assert.equal(appNodes.length, 14);
    for (const node of appNodes) {
      assert.ok(rawRules.rules[node], `Template must contain node: ${node}`);
      assert.ok(rawRules.rules[node]['.read'], `${node} must define .read`);
      assert.ok(rawRules.rules[node]['.write'], `${node} must define .write`);
    }
    assert.equal(rawRules.rules['.read'], false, 'Root .read must be false');
    assert.equal(rawRules.rules['.write'], false, 'Root .write must be false');
  });
});
