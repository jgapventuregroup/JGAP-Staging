# Investor property activity database acceptance cases

This is a **review-only test plan**. No SQL has been applied.

| Case | Expected result |
| --- | --- |
| Company A owner, active Investor, create A income | Allowed |
| Company A editor, active Pro, create A repair | Allowed |
| Company A viewer, active Investor, create A task | Denied |
| Company A Free member, create income | Denied |
| Company A expired subscription, update repair | Denied |
| Company A owner, active Investor, read B entries | Denied |
| Company A owner, active Investor, insert with B company | Denied |
| Company A owner, active Investor, insert A company + B deal | Denied by composite foreign key |
| Company A owner, active Investor, change entry company or deal | Denied by immutable identity trigger |
| Company A owner, active Investor, spoof created_by | Replaced with auth.uid() |
| Unauthenticated visitor, read any property activity | Denied |
| Company A member after paid-to-Free downgrade, read own historical activity | Allowed by SQL draft; verify product entitlement rules before activation |
| Company A member after paid-to-Free downgrade, create/update/delete | Denied |
| Subscription row hidden from authenticated policy subquery | Must be resolved; do not enable writes |

Run every case using actual authenticated sessions and REST calls, not only a privileged SQL editor. Record the HTTP status and verified persisted rows. Test against the **staging project only** after explicit migration approval. Never grant a real customer a paid subscription solely to simulate a test.
