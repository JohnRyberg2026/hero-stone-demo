import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DATE_QUEST_TERMS, foundingCapacity, reviewFoundingAdmission, membershipTerms, guestMay } from '../date-quest-membership.mjs';

const couples = Array.from({ length: 10 }, (_, i) => ({ kind: 'couple', accountIds: [`a${i}`, `b${i}`] }));
const individuals = Array.from({ length: 5 }, (_, i) => ({ kind: 'individual', accountIds: [`i${i}`] }));
test('approved pilot fits exactly 10 couples and 5 individuals, without counting guest invitees', () => {
  assert.deepEqual(foundingCapacity([...couples, ...individuals]), { couples: 10, individuals: 5, registeredMembers: 25, remainingCouples: 0, remainingIndividuals: 0 });
  assert.equal(DATE_QUEST_TERMS.foundingRegisteredMembers, 25);
});
test('unused individual places cannot substitute for an eleventh couple or vice versa', () => {
  assert.throws(() => reviewFoundingAdmission(couples, { kind: 'couple', accountIds: ['x', 'y'] }));
  assert.throws(() => reviewFoundingAdmission(individuals, { kind: 'individual', accountIds: ['x'] }));
});
test('duplicate accounts and incomplete couples cannot consume founding places', () => {
  assert.throws(() => foundingCapacity([{ kind: 'couple', accountIds: ['x', 'x'] }]));
  assert.throws(() => reviewFoundingAdmission(couples, { kind: 'individual', accountIds: ['a0'] }));
  assert.throws(() => foundingCapacity([{ kind: 'couple', accountIds: ['x'] }]));
  assert.throws(() => foundingCapacity([{ kind: 'guest', accountIds: ['x'] }]));
});
test('founding year ends on its anniversary, preserving recognition and the lifetime annual rate', () => {
  const input = { tier: 'founding', activatedOn: '2026-11-07', newMemberAnnualPriceCents: 2400 };
  assert.equal(membershipTerms({ ...input, asOf: '2027-11-06' }).inFreePeriod, true);
  const renewal = membershipTerms({ ...input, asOf: '2027-11-07' });
  assert.equal(renewal.inFreePeriod, false);
  assert.equal(renewal.annualPriceCents, 1200);
  assert.equal(renewal.foundingRecognition, true);
  assert.equal(renewal.lifetimeAnnualRate, true);
  assert.equal(membershipTerms({ ...input, asOf: '2036-11-07' }).annualPriceCents, 1200);
});
test('public membership has one free calendar month and annual billing, not monthly charges', () => {
  const input = { tier: 'public', activatedOn: '2026-11-07' };
  assert.equal(membershipTerms({ ...input, asOf: '2026-12-06' }).inFreePeriod, true);
  const terms = membershipTerms({ ...input, asOf: '2026-12-07' });
  assert.equal(terms.inFreePeriod, false); assert.equal(terms.annualPriceCents, 1200);
  assert.equal(terms.billingInterval, 'year'); assert.equal(terms.lifetimeAnnualRate, false);
  assert.equal(terms.worldQuestIncluded, false); assert.equal(terms.amountDueNowCents, null);
});
test('month-end and leap-day anniversaries clamp without device timezone drift', () => {
  assert.equal(membershipTerms({ tier: 'public', activatedOn: '2027-01-31', asOf: '2027-02-28' }).freeUntil, '2027-02-28');
  assert.equal(membershipTerms({ tier: 'founding', activatedOn: '2028-02-29', asOf: '2029-02-28' }).freeUntil, '2029-02-28');
});
test('revisiting does not restart the free period, and invalid terms fail closed', () => {
  assert.equal(membershipTerms({ tier: 'public', activatedOn: '2026-11-07', asOf: '2027-02-01' }).inFreePeriod, false);
  for (const patch of [{ tier: 'guest' }, { activatedOn: '2026-02-30' }, { asOf: '2026-01-01' }, { newMemberAnnualPriceCents: NaN }])
    assert.throws(() => membershipTerms({ tier: 'public', activatedOn: '2026-11-07', asOf: '2026-11-08', ...patch }));
});
test('guest permissions are explicitly limited to the three approved reply actions', () => {
  for (const action of ['accept', 'decline', 'suggest_another_time']) assert.equal(guestMay(action), true);
  for (const action of ['read_calendar', 'read_memory', 'create_invitation', 'cancel', 'begin', 'finish', 'admin', '', undefined]) assert.equal(guestMay(action), false);
});
