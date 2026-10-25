# Property Passport private documents — staging implementation

Status: backend policies and browser module prepared; customer upload/list/download controls remain disabled by `JGAP_PASSPORT_DOCUMENTS_READY=false` until normal authenticated Storage API acceptance. A Documents tab explains that this release is unavailable. This is not a claim that full document handling is delivered.

## Access and storage
- Private `passport-documents` bucket on staging `qfszapteuxuogoselprp` only. No public URLs, new paid provider, production configuration or existing customer files changed.
- Objects use `company UUID/property UUID/document UUID--safe filename`. Policies verify the actual saved property/company pair, active Pro or separate verified owner preview, and company membership through existing backend helpers.
- Pro company members may read; owner/admin/editor roles may insert. Investor, Free, inactive, foreign-company and anonymous access is denied. Downgrade keeps objects; reactivation restores eligible access.
- No UPDATE/upsert or DELETE policy. Files are immutable in this first implementation. Removal/replacement needs a separately reviewed workflow; do not delete managed Storage rows with SQL. Supabase actively blocks direct Storage-table deletion.
- The bucket enforces 10 MB per file and PDF/JPEG/PNG MIME types. Browser checks add extension, declared MIME and header-signature validation, safe filenames and UUID object keys. These checks do not perform antivirus scanning or guarantee document safety. Office/SVG/HTML/archive uploads are excluded.
- Authenticated SDK `download()` returns an attachment Blob. The app does not render an inline preview or create public/signed bearer URLs. Downloaded copies cannot be revoked.

## Integration and error handling
`passport-documents.mjs` rechecks server `advanced_finance_access` on list, upload and download. It pins company/client/property and rejects stale results and foreign paths. Lists are paginated in groups of 100. Uploads never overwrite; exact post-upload listing verifies the expected object. A persisted-but-unverified upload is explicitly labeled and its submit control stays disabled to prevent blind duplicate retries. New uploads are not automatically deleted on failure.

The module is included in the existing public frontend allowlist and release-version graph. The existing Passport gains a Documents tab without changing the marketing site. Keep the release flag false until the remaining gate passes; toggling browser values cannot bypass database policies.

## Setup and verification
- Canonical empty-environment setup: `supabase/storage/passport-documents.sql`, applied after the existing app baseline and hosted Storage platform are present. Never rerun on staging.
- Actual staging migration sources: `20261025165449_private_passport_documents.sql` and `20261025165853_passport_document_flat_object_names.sql`.
- `tests/staging-document-security.sql`: three grouped SQL-role checks passed on staging with all companies, subscriptions and metadata fixtures rolled back. Tests cover both company directions, invalid/mismatched paths, Pro owner insertion, non-Pro/inactive denial, viewer read-only, reactivation retention, mutation/removal denial and anonymous denial. Zero document objects and zero rollback fixture companies were confirmed afterward.
- `tests/passport-document-security.mjs` runs the policies against the restored application schema with an explicit local Storage SQL contract. `tests/passport-documents.mjs` checks file validation, scoped immutable requests, capability denial, partial saves, bad responses, session changes and the disabled-control state. Both run in `npm test`.
- Advisors retained the existing six administrative deny-default table notices, three intentional authenticated helper warnings and disabled leaked-password protection warning. No new finding was introduced.

## Gate before enabling
Use two normally signed-in verified test users in distinct authorized Pro test companies. Verify own upload/list/download of fictional files, real byte persistence, foreign list/download/upload denial in both directions, inactive/viewer behavior, MIME/size rejection and the absence of public access. SQL impersonation and empty-bucket reads do not substitute for positive and negative Storage API checks. Get explicit owner approval before any permanent fixture/file/company cleanup; the prior cleanup approval covered only the named original-editor fixture. Do not alter existing memberships or paid plans merely to make the test pass.

Then test the actual upload/download forms, phone layout and printed filename-only output. Document any retained fictional objects. Virus scanning, safe previews, document replacement/removal and hosted recovery of file bytes remain separate work. No fixture files have been uploaded during this implementation step.
