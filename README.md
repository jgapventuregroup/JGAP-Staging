# The Key Ahead Investor App

Existing staging application owned by JGAP Venture Group LLC. Continue on `main`; do not create a replacement app or alter the separate marketing website.

Start with [handoff readiness](docs/launch-handoff-readiness.md), the [developer runbook](docs/developer-handoff.md), the [approved membership matrix](docs/membership-feature-matrix.md), and the [Passport release gate](docs/property-passport-browser-test.md).

```sh
npm ci
npm test
npm run check:edge
python3 -m http.server 8000 --bind 127.0.0.1
```

Staging preview: https://jgapventuregroup.github.io/JGAP-Staging/

Billing and live advertising remain disconnected. Original Passport editors remain gated pending real-session security evidence. Full approved Pro functionality and a reproducible database bootstrap are outstanding; passing CI alone is not production or full-product handoff approval.

Database handoff: see [schema baseline and restore verification](supabase/baseline/README.md). Run `npm run check:database-baseline`; never apply the baseline over an existing environment.

Current release gates: [Version 1 acceptance status](docs/v1-acceptance-status.md).
