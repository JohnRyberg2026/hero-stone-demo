# SAVE & LOCK — Shared-date server checkpoint

Approved by John on October 21, 2026. Preserve this reviewed baseline; subsequent changes belong in a new revision.

Status: backend review candidate, not deployed. Database permission/workflow tests passed in rollback-only transactions. Confirmed that the test schema and fictional accounts were absent afterward.

Preserved behavior: individual account responses; current invitation revision checks; unanimous confirmation; revised plans reset responses; withdrawal and stopping remain available; private tables deny browser access; adult eligibility requires trusted server records.

Open dependencies: verified-age provider integration; authenticated group UI; migration of the legacy one-active-HEART-STONE-per-user restriction; separate review before installing or deploying. No verification records are automatically created from browser confirmations.

Dependency: PR #47 (shared-date rehearsal), itself based on PR #45. Existing live pair invitations remain unchanged.

## Frozen file fingerprints

| File | SHA-256 |
| --- | --- |
| database/shared-date-server.sql | 5eec37976663cd91cb67e0d7254adbe59061751b613f7aee9e531596771e7109 |
| database/shared-date-server-test.sql | 42374355b6b6d59cd855e01d30f56a010e199926677fb21f76431dfc71bf879f |
| database/shared-date-server-rollback-test.sql | 1ec0feaac6014bb48cc3ea89e1584771f54b2eb259fd446e993c32e073118fae |
| docs/shared-date-server.md | 2efe1b02d3094d3702cb019f08e74ca6b3e191cb4545639d4f4976b692615ed1 |
