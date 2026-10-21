# Multiple separate dating connections — review candidate

## Outcome

The candidate removes the one-active-HEART-STONE-per-user restriction and changes connection creation, acceptance and bootstrap selection together. Existing relationship IDs and memberships are preserved. Each new connection remains a separate two-person HEART STONE; a shared date across multiple connections uses the participant API from PR #49 rather than merging those relationships.

The new SQL and real authenticated-role workflows passed in one rollback-only transaction against the demo database. A follow-up read confirmed the original unique index was present again, the new private schema was absent, and all four fictional accounts were absent. Nothing is installed or deployed.

## Changes

- The unique index `one_active_heart_stone_per_user` is replaced with a nonunique user/connection lookup index. The unique `(heart_stone_id,user_id)` constraint remains.
- Creating an invitation produces a new relationship and pending membership without changing any existing connection. It requires the sender’s current trusted adult verification record from PR #49.
- Accepting checks the signed-in account’s email, both participants’ verified adult eligibility, token status/expiry and the original pending relationship. Other active memberships do not prevent acceptance. Repeated acceptance by the same recipient returns the same relationship without adding members or duplicating consent events.
- The old zero-argument alpha bootstrap remains compatible for one connection and explicitly rejects ambiguous multi-connection state. `get_alpha_bootstrap_for` validates a requested connection before loading it.
- Current main-app entry lists the signed-in account’s connections, labeled with connected people’s names, and requires an explicit choice when more than one exists. A supplied URL identity is used only if it matches the account’s active memberships. The old globally remembered relationship ID is no longer trusted at entry.
- Switching uses a full page navigation, clearing the former page’s handlers, active adventure IDs, poller and rendered shared state. Creating a pending invitation does not replace the current selection; accepting navigates to the accepted connection.
- The First Journey sharing preview receives the selected connection in its link. With multiple connections and no explicit valid choice it continues privately without loading one partner’s sharing state. This preserves the preview’s existing two-person sharing behavior.

## Audit scope

The connected database’s 15 public/invitation functions directly referencing memberships and six additional functions with relationship references plus `LIMIT 1` or connection-state guards were inspected. This is a focused compatibility review, not a full security audit of every function or archived build.

| Area | Finding / action |
| --- | --- |
| Connection create / accept | Global existing-state rejection removed in the candidate; pair-specific safeguards and token/account validation retained |
| Alpha bootstrap | Silent newest-membership choice replaced by explicit selection / ambiguity error |
| Main app | Silent latest membership and browser-global cached identity removed |
| First Journey | Silent first membership replaced by explicit selected connection; private answers stay account-scoped |
| Moment invitations | PR #45 already requires connection selection and revalidation before sending/displaying |
| Pair readiness / onboarding | Remain scoped to a supplied HEART STONE and exactly two members; appropriate for independent pair relationships |
| Partner personalization | Scoped to a supplied pair connection; separate shared dates do not add members to that pair |
| Recommendations / history / quest state | Reviewed paths use a supplied connection or derive it from the authorized recommendation/adventure/session |
| Shared memories / private fit | No new copying or migration of private data; private-fit code unchanged |
| Shared-date roster | PR #49 can check invitees across the organizer’s independently active pair connections |

Old `build*-preview.html` artifacts and `Index.html` are historical and are not upgraded by this change. Do not serve them as multi-connection entry points after enabling the migration. Production rollout needs to retire or redirect unsupported entry points.

## Testing

`node test-connection-selection.cjs` exercises explicit multi-connection choice, safe one-connection fallback, invalid/outsider identities, no memberships, connected-person labels, scoped First Journey links, pending-invitation preservation and full-navigation switching. All nine current Node suites passed. Browser visual/device testing has not been performed.

`multiple-dating-connections-rollback-test.sql` installs PR #49’s server candidate and this candidate inside one rollback-only transaction. The test creates four fictional profiles, creates two separate connections for one account, accepts them from the intended accounts, adds a second connection for another account, checks one-connection compatibility and multi-connection ambiguity, blocks cross-relationship reads, and confirms a three-person shared date across two pair relationships with separate responses. Anonymous create calls are denied.

## Deployment dependencies and limits

Requires reviewed PRs #45, #47 and #49 and a trusted age-verification integration. No verification records are populated from browser confirmation, existing profile flags or user metadata. These are installation scripts, not applied migrations; package them through the project’s normal migration workflow after review.

Deploy current entry-point selection before enabling concurrent memberships. Retire/redirect the archived builds. Install the server dependency and migration in one reviewed transaction. Test separate accounts/devices and run security advisors after installation. Do not recreate the old unique index as a rollback if users already have several active memberships; preserve their data and use a forward fix or an explicitly reviewed reconciliation plan.

Connection creation still uses the legacy token API: a failed/uncertain create should be checked before retrying, as create does not yet have a request-id deduplication contract. No invitation emails/texts are sent by these functions. Cancellation/disconnection UI, per-connection pronoun-sharing controls and broader multi-device release testing are separate work. No real accounts, invitations, messages or relationship records were changed by this test.
