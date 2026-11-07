// Product rules only. This module neither grants access nor starts a charge.
// Enrollment must supply server-verified records; never trust browser metadata.
export const DATE_QUEST_TERMS = Object.freeze({
  version: '2026-11-07', currency: 'USD', annualPriceCents: 1200,
  foundingCouplePlaces: 10, foundingIndividualPlaces: 5,
  foundingRegisteredMembers: 25,
  foundingFreeMonths: 12, publicFreeMonths: 1,
  billingInterval: 'year', worldQuestIncluded: false
});

const guestActions = new Set(['accept', 'decline', 'suggest_another_time']);
export function guestMay(action) { return guestActions.has(action); }

function fail(message) { throw new TypeError(message); }
function accountIds(place) {
  if (!place || !['couple', 'individual'].includes(place.kind)) fail('Unknown founding place type');
  if (!Array.isArray(place.accountIds) || place.accountIds.length !== (place.kind === 'couple' ? 2 : 1))
    fail('A couple needs two registered accounts; an individual needs one');
  for (const id of place.accountIds) if (typeof id !== 'string' || !id.trim() || id !== id.trim()) fail('Registered account ID required');
  return place.accountIds;
}

// Pure admission validation. The eventual server enrollment transaction must lock
// and write the roster atomically; this check alone cannot prevent concurrent fills.
export function foundingCapacity(places) {
  if (!Array.isArray(places)) fail('Founding roster required');
  const seen = new Set(); let couples = 0, individuals = 0;
  for (const place of places) {
    for (const id of accountIds(place)) {
      if (seen.has(id)) fail('An account cannot occupy two founding places');
      seen.add(id);
    }
    if (place.kind === 'couple') couples++; else individuals++;
  }
  if (couples > DATE_QUEST_TERMS.foundingCouplePlaces || individuals > DATE_QUEST_TERMS.foundingIndividualPlaces)
    fail('Founding roster exceeds the approved pilot');
  return Object.freeze({ couples, individuals, registeredMembers: seen.size,
    remainingCouples: DATE_QUEST_TERMS.foundingCouplePlaces - couples,
    remainingIndividuals: DATE_QUEST_TERMS.foundingIndividualPlaces - individuals });
}

export function reviewFoundingAdmission(places, candidate) {
  foundingCapacity(places);
  return foundingCapacity([...places, candidate]);
}

function readDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) fail('Use an ISO calendar day');
  const date = new Date(day + 'T00:00:00.000Z');
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== day) fail('Invalid calendar day');
  return date;
}

// Calendar anniversaries, clamped to month end, independent of device timezone.
function addMonths(day, months) {
  const date = readDay(day), target = new Date(date.valueOf());
  target.setUTCDate(1); target.setUTCMonth(target.getUTCMonth() + months);
  const last = new Date(target.valueOf()); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
  target.setUTCDate(Math.min(date.getUTCDate(), last.getUTCDate()));
  return target.toISOString().slice(0, 10);
}

// A preview of locked terms, not a subscription or authorization decision.
// Supply the original activation day. Revisiting/signing in must never reset it.
export function membershipTerms({ tier, activatedOn, asOf, newMemberAnnualPriceCents = DATE_QUEST_TERMS.annualPriceCents }) {
  if (!['founding', 'public'].includes(tier)) fail('Unknown Date Quest tier');
  readDay(activatedOn); readDay(asOf);
  if (asOf < activatedOn) fail('Membership has not started');
  if (!Number.isSafeInteger(newMemberAnnualPriceCents) || newMemberAnnualPriceCents < 1) fail('Invalid annual price');
  const founding = tier === 'founding';
  const freeUntil = addMonths(activatedOn, founding ? DATE_QUEST_TERMS.foundingFreeMonths : DATE_QUEST_TERMS.publicFreeMonths);
  const annualPriceCents = founding ? DATE_QUEST_TERMS.annualPriceCents : newMemberAnnualPriceCents;
  return Object.freeze({ termsVersion: DATE_QUEST_TERMS.version, tier,
    foundingRecognition: founding, lifetimeAnnualRate: founding,
    currency: 'USD', annualPriceCents, billingInterval: 'year',
    freeUntil, inFreePeriod: asOf < freeUntil,
    amountDueNowCents: null, // No payment processor or subscription is connected.
    worldQuestIncluded: false, guestAccountRequired: false, guestRealNameRequired: false });
}
