# Hosted recovery rehearsal — vendor handoff

Prepared October 27, 2026. **Procedure prepared; hosted rehearsal not performed.** Local restored-schema checks do not prove recovery of hosted Auth, customer rows or file bytes. This runbook authorizes no new project, spending, export of real data, overwrite or deletion. Obtain approval for the exact target and data scope before execution. Keep the existing staging project and marketing website unchanged.

## Choose the recovery path

| Scenario | Input | Procedure |
| --- | --- | --- |
| Empty environment installation | Reviewed repository commit, no customer data | Follow `../supabase/baseline/README.md` and canonical add-ons below. This installs schema, not recovered accounts/data. |
| Recovery of an existing environment | Approved, dated database backup plus separately protected file bytes and configuration inventory | Use the provider-supported restore process appropriate to that backup and target. Do not apply the empty-schema baseline over restored objects or replay historical migrations. |

Supabase database backups contain Storage metadata, not the stored file bytes. Restoring database metadata alone cannot recover missing Passport documents. Review current provider instructions before choosing backup/restore tooling; do not assume backup retention or recovery features are enabled on this project.

## Before an approved rehearsal

Record the operator, reviewer, approved target project, source snapshot time, source app commit, database version, chosen restore method and isolated frontend origin. Agree on acceptable data loss (RPO) and time to recover (RTO); both are currently undecided. Identify who can approve rollback and who handles incidents.

Use fictional records and test identities for a rehearsal unless a separate data scope is approved. Prepare two unrelated companies, a viewer, an editing member, one active Pro workspace with sufficient named seats, an expired/inactive entitlement case, a property with known notes/activity/map coordinates, and a small non-sensitive PDF/image. Record expected counts and file SHA-256 checksums privately. Preserve record and identity relationships; do not create replacement user IDs and assume old memberships will match.

Inventory Auth redirects, email/recovery configuration, API origins, private bucket settings/policies, Edge function deployments and secret references. Transfer secrets through the vendor’s secure process, never this repository or Notion. Keep billing, outbound jobs and live ads disconnected in the rehearsal. Select a source snapshot and file inventory that can be reconciled to the same recovery checkpoint.

## Empty installation order only

Apply the baseline once to a confirmed empty approved target, then these canonical files once in this order. Reconcile each step with `../supabase/baseline/manifest.json`; do not replay historical migrations afterward.

1. `supabase/features/seller-financing.sql`
2. `supabase/features/saved-deal-radar.sql`
3. `supabase/features/money-making-overview.sql`
4. `supabase/features/dashboard-customization.sql`
5. `supabase/features/in-app-alerts.sql`
6. `supabase/features/team-controls.sql`
7. `supabase/features/team-seats.sql` (requires team controls)
8. `supabase/features/market-map.sql`
9. `supabase/features/property-identity-preview.sql` (uses the existing preview helper; new baselines keep it disabled)
10. `supabase/features/property-geocoding.sql` (service-only lookup cache and shared throttle)
11. `supabase/storage/passport-documents.sql` (requires hosted Storage)

Paths above are repository-relative. The Storage setup is an empty-target integration, not a file restore or idempotent repair script. It creates a private 10 MiB PDF/JPEG/PNG bucket with scoped read/insert policies; client replacement/deletion is not enabled. Install approved configuration separately, then create fictional test identities through normal verified signup. New baseline owner preview is disabled; company ownership alone does not confer Pro access.

## Recovery acceptance and stop conditions

The vendor records pass/fail and sanitized evidence for each row; all are pending hosted rehearsal.

| Check | Required observation |
| --- | --- |
| Schema and scope | Expected tables, constraints, RLS, grants and feature RPCs; no unexpected public access or target mismatch |
| Data integrity | Expected fictional company/property/activity counts, exact values and valid identity/foreign-key relationships |
| Accounts | Normal signup, verification, sign-in and recovery links return to the isolated approved origin |
| Isolation | Two actual signed-in identities cannot read/write each other’s company; anonymous access denied |
| Roles and seats | Viewer reads but cannot edit; editor writes only its company; expired seats deny protected records without deleting memberships |
| Entitlements | Free lifetime limit, paid-only financing, inactive Pro denial and Pro ad-free behavior remain enforced |
| Private documents | Restored object path, size and checksum match; authorized download succeeds; foreign/inactive access fails; private bucket remains private |
| Feature persistence | Dashboard preferences, alert review state, saved coordinates and team access match the chosen checkpoint |
| Operations | Actual recovery time and snapshot age measured against agreed RTO/RPO; operator and reviewer sign off |

Stop on any missing file, integrity mismatch, failed isolation check or unexpected external action. Preserve evidence, keep the restored frontend isolated and prepare a reviewed forward correction; do not weaken policies or overwrite staging. Frontend Git rollback does not roll back database data. Do not delete either recovery source or rehearsal fixture without specific cleanup approval. Production cutover requires separate approval after these checks and final candidate CI pass.

## Evidence to retain

Record date, source/target identifiers, backup timestamp and method, exact app commit, configuration checklist, aggregate row checks, file checksums, individual acceptance results, measured recovery duration, discrepancies and reviewer decision. Keep secrets and customer files out of public Git evidence. A completed runbook is not a passed rehearsal.

## Owner-operated backup procedure

The November 23 hosted drill in the separate recovery project restored fictional property notes and the complete linked task from a logical checkpoint. It also restored a backed-up PNG at a fresh private object path and verified exact bytes and account isolation. A full provider backup restore and a restore at the original file path remain open. The recovery project is a destination for drills or incidents.

Proposed starting schedule for owner approval:

- Capture a daily database backup and a daily independent private-file copy. Capture both again before a schema migration, credential cutover, or bulk data operation. Record the UTC capture time, application release, project identity and completion status of each copy.
- Use the approved PostgreSQL backup procedure for application data and schema, including the supported Auth export path where identity continuity is required. Export actual Storage object bytes through the supported Storage API, with an inventory of bucket, exact object key, size and SHA-256. Keep encrypted copies in an access-controlled destination separate from the running project. Verify the backup can be read and that the object count and checksums match before recording a successful job.
- Propose seven daily recovery points and a monthly isolated restore drill. Confirm retention, allowable data loss, recovery time, backup destination, cost and the operator before scheduling anything.
- During recovery, select a consistent checkpoint, create or use an authorized empty restore target, restore database state, and separately upload files at their recorded keys. Verify database relationships, Auth identity mapping, bucket privacy, owner access, anonymous and other-account denial, and file checksums. Record actual recovery time before proposing a cutover.
- Cancel the separate $25/month Pro rehearsal organization before renewal if there is no scheduled drill or standby requirement. Retaining it requires an assigned operator and a reason for keeping a warm restore destination. Independent backup copies remain necessary in either case. No backup schedule or cancellation is configured by this procedure.

## Provider references

Reviewed October 27, 2026: [database backups](https://supabase.com/docs/guides/platform/backups), [backup/restore using CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), and [changelog](https://supabase.com/changelog). Recheck applicable provider changes and installed CLI help before executing commands.


## Combined local installation evidence — October 27, 2026

`tests/complete-database-install.mjs` installs the baseline, all ten canonical feature add-ons in the order above and the private-document SQL integration into one clean local database. It verifies the private bucket and disabled owner preview, runs all 13 existing team/seat/map security groups against the combined stack, and checks that those rollback suites retain no fixture companies, memberships, properties or feature rows. The standard test command includes this check. Local Auth/Storage tables are explicit test contracts, not hosted services or recovered file bytes. Hosted recovery and normal-session acceptance remain required.

The automatic property map also requires deployment of `supabase/functions/property-geocode/` with its standard platform environment and approved origin/provider configuration. Rehearse authenticated lookup, service-only cache denial, rate limiting, address-change invalidation and safe provider failure; a schema restore alone does not prove live lookup or tile delivery.
