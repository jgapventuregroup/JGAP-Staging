# Property Passport private documents — staging implementation

Status: the normal authenticated Storage API gate passed 58 fresh-request checks after the initial real uploads. Pro/verified-preview controls are enabled in staging after evidence review. Actual rendered upload/download and phone acceptance remain separate; removal/replacement, malware scanning and safe previews are not delivered.

## Access and storage
- Private `passport-documents` bucket on staging `qfszapteuxuogoselprp` only. No public URLs, new paid provider, production configuration or existing customer files changed.
- Objects use `company UUID/property UUID/document UUID--safe filename`. Policies verify the actual saved property/company pair, active Pro or separate verified owner preview, and company membership through existing backend helpers.
- Pro company members may read; owner/admin/editor roles may insert. Investor, Free, inactive, foreign-company and anonymous access is denied. Downgrade keeps objects; reactivation restores eligible access.
- No UPDATE/upsert or DELETE policy. Files are immutable in this first implementation. Removal/replacement needs a separately reviewed workflow; do not delete managed Storage rows with SQL. Supabase actively blocks direct Storage-table deletion.
- The bucket enforces 10 MB per file and PDF/JPEG/PNG MIME types. Browser checks add extension, declared MIME and header-signature validation, safe filenames and UUID object keys. These checks do not perform antivirus scanning or guarantee document safety. Office/SVG/HTML/archive uploads are excluded.
- Authenticated SDK `download()` returns an attachment Blob. The app does not render an inline preview or create public/signed bearer URLs. Downloaded copies cannot be revoked.

## Integration and error handling
`passport-documents.mjs` rechecks server `advanced_finance_access` on list, upload and download. It pins company/client/property and rejects stale results and foreign paths. Lists are paginated in groups of 100. Uploads never overwrite; exact post-upload listing verifies the expected object. A persisted-but-unverified upload is explicitly labeled and its submit control stays disabled to prevent blind duplicate retries. New uploads are not automatically deleted on failure.

The module is included in the existing public frontend allowlist and release-version graph. The existing Passport gains a Documents tab without changing the marketing site. The release flag was enabled only after the normal-session gate passed; toggling browser values cannot bypass database policies.

## Setup and verification
- Canonical empty-environment setup: `supabase/storage/passport-documents.sql`, applied after the existing app baseline and hosted Storage platform are present. Never rerun on staging.
- Actual staging migration sources: `20261025165449_private_passport_documents.sql` and `20261025165853_passport_document_flat_object_names.sql`.
- `tests/staging-document-security.sql`: three grouped SQL-role checks passed on staging with all companies, subscriptions and metadata fixtures rolled back. Tests cover both company directions, invalid/mismatched paths, Pro owner insertion, non-Pro/inactive denial, viewer read-only, reactivation retention, mutation/removal denial and anonymous denial. Zero document objects and zero rollback fixture companies were confirmed afterward.
- `tests/passport-document-security.mjs` runs the policies against the restored application schema with an explicit local Storage SQL contract. `tests/passport-documents.mjs` checks file validation, scoped immutable requests, capability denial, partial saves, bad responses, session changes and the disabled-control state. Both run in `npm test`.
- Advisors retained the existing six administrative deny-default table notices, three intentional authenticated helper warnings and disabled leaked-password protection warning. No new finding was introduced.

## Normal-session gate and remaining acceptance
Use two normally signed-in verified test users in distinct authorized Pro test companies. Verify own upload/list/download of fictional files, real byte persistence, foreign list/download/upload denial in both directions, inactive/viewer behavior, MIME/size rejection and the absence of public access. SQL impersonation and empty-bucket reads do not substitute for positive and negative Storage API checks. Get explicit owner approval before any permanent fixture/file/company cleanup; the prior cleanup approval covered only the named original-editor fixture. Do not alter existing memberships or paid plans merely to make the test pass.

Then test the actual upload/download forms, phone layout and printed filename-only output. Document any retained fictional objects. Virus scanning, safe previews, document replacement/removal and hosted recovery of file bytes remain separate work. Two fictional PDFs from the normal-session gate remain; no customer files were used.

### Completed API gate — October 25, 2026
Evidence: `evidence/document-storage-live-2026-10-25.json`, runner `02cb79c`. The initial owner stage in `document-storage-owner-2026-10-25-incomplete.json` performed two genuine successful uploads. Its inactive stage failed; browser no-store alone also failed in `document-storage-no-store-2026-10-25-incomplete.json`. These results were retained rather than relabeled as passes.

A unique SDK `cacheNonce` per download, plus browser `cache: no-store`, made the fresh inactive requests fail as required. The final run reused exactly those two PDFs, created zero additional positive objects and passed 58 checks using 35 observed Storage requests. Nonce presence was recorded without recording nonce values or object paths. Pro read/write, foreign list/download/upload denial in both directions, wrong-property denial, overwrite rejection with unchanged bytes, unavailable public URLs, anonymous denial, MIME/size rejection, inactive denial with an active-company control, viewer read-only and reactivation retention passed. HTTP 400 rejection responses also required the expected logical Storage error status; generic malformed/server failures did not count.

The two disposable companies and properties named `V1 document gate 2026-10-25 - e4a2 A/B` and their two fictional PDFs remain. Only these disposable rows had temporary status/role changes; Company A was restored to active Pro/owner after testing. Existing companies/memberships/subscriptions were not changed. No delete operation was performed.

All app downloads now request a unique cache nonce and no-store. New app uploads request cacheControl 0. Already downloaded or cached copies cannot be revoked; do not claim retroactive removal of copies. Review hosted CDN behavior as part of production setup.
