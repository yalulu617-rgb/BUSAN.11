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
  constructor(rulesJson, uidWen, uidDuck) {
    // Substitute TEST FIXTURES into the template (not Firebase user IDs).
    const jsonStr = JSON.stringify(rulesJson)
      .replace(/<UID_WEN>/g, uidWen)
      .replace(/<UID_DUCK>/g, uidDuck);
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

  // Illustrative test fixture UIDs ONLY. These are NOT real Firebase Auth UIDs.
  // The production Rules publisher must retrieve the UID for the actual selected
  // Google identity from Firebase Authentication; allow only that one Duck UID.
  const FIXTURE_UID_WEN = 'test_wen_email_password';
  const FIXTURE_UID_DUCK_SELECTED = 'test_duck_chosen_google';
  const FIXTURE_UID_DUCK_OTHER = 'test_duck_other_google';
  const FIXTURE_UID_STRANGER = 'test_stranger_unauthorized';

  const engine = new RTDBSecurityEngine(rawRules, FIXTURE_UID_WEN, FIXTURE_UID_DUCK_SELECTED);
  const authWen = { uid: FIXTURE_UID_WEN, token: { email: 'wen@example.invalid' } };
  const authDuckSelected = { uid: FIXTURE_UID_DUCK_SELECTED, token: { email: 'duck-selected@example.invalid', firebase: { sign_in_provider: 'google.com' } } };
  const authDuckOther = { uid: FIXTURE_UID_DUCK_OTHER, token: { email: 'duck-other@example.invalid', firebase: { sign_in_provider: 'google.com' } } };
  const authStranger = { uid: FIXTURE_UID_STRANGER, token: { email: 'stranger@example.invalid' } };
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

  await t.test('1. Selected Wen UID can read and write all 14 trip nodes', () => {
    for (const node of appNodes) {
      assert.equal(engine.canAccess(node, 'read', authWen), true, `Wen should read ${node}`);
      assert.equal(engine.canAccess(node, 'write', authWen), true, `Wen should write ${node}`);
    }
  });

  await t.test('2. Only the selected Duck Google UID can read and write all 14 trip nodes', () => {
    for (const node of appNodes) {
      assert.equal(engine.canAccess(node, 'read', authDuckSelected), true, `Selected Duck should read ${node}`);
      assert.equal(engine.canAccess(node, 'write', authDuckSelected), true, `Selected Duck should write ${node}`);
    }
  });

  await t.test('3. Other Duck Google identity must be denied until explicitly selected', () => {
    for (const node of appNodes) {
      assert.equal(engine.canAccess(node, 'read', authDuckOther), false, `Other Duck read on ${node} must be blocked`);
      assert.equal(engine.canAccess(node, 'write', authDuckOther), false, `Other Duck write on ${node} must be blocked`);
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
