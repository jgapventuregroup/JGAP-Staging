# Advanced Pro recovery — October 26, 2026

The existing staging app and approved membership matrix remain authoritative. This inventory is not a declaration that the full Pro offering is complete. No marketing website, production, ads or payments changed.

## Original source audit

| Source in JGAP-Venture-Group | Reviewed blob | Dependency / recovery boundary |
| --- | --- | --- |
| market-map.js | bd7ab8fd5826c3af1627e1f416425904e5767d9e | Leaflet/CDN tiles, external Nominatim geocoding, legacy market_history, browser-local research and hard-coded Tennessee searches. Some queries lack explicit selected-company filtering. Do not copy wholesale or send saved addresses to external geocoders automatically. |
| radar-filters.js | c2519924791b80659b5c5169b9e32d7b19a6d334 | Legacy radar/distress tables, global cached rows, hard-coded distress targets and Analyzer handoff RPCs. Not an ingestion pipeline. |
| alerts.js | 55e613b2245325b37d995e387c3d0bbf6a77733d | Legacy radar_opportunities and market_history; saved-deal rules and partially unscoped queries. Not working push/email notification delivery. |
| lead-generation.js | e56314f5c1e3b1135ad6eeaa66f81ffb4bf56cc4 | Manual CRM on lead_prospects with owner/contact/verification fields, first-membership lookup and legacy Analyzer handoff. Does not itself generate researched leads. |

Read-only staging inventory confirmed only `deals` exists among `deals`, `market_history`, `radar_opportunities`, `distress_opportunities`, and `lead_prospects`. Original features require adapted models, selected-company authorization and separately tested workflows. Do not import old customer rows or make a placeholder feed look live.

## Delivered saved-deal review foundation

The new **Saved Deal Radar · Pro** page reviews current company saved properties using `get_saved_deal_radar(uuid,date)`, a STABLE SECURITY INVOKER RPC guarded by the existing active Pro/verified-preview helper. Pro viewers may read; Free/Investor/inactive, foreign-company and anonymous requests are denied. No new tables, mutation grants or personal-contact data are exposed. The source selects only the requested company's saved properties and fails instead of truncating beyond 10,000 rows.

It reports saved asking price minus saved target offer in exact cents, follow-up dates due through the displayed local review date, and fields requiring verification (missing, zero or invalid asking/target/rent/operating expenses/unit count). A zero cost or rent may be intentional; the label asks for verification rather than treating it as proven missing. A price gap is not a negotiated discount, projected profit or seller-motivation score. No cash-flow estimate is fabricated from incomplete financing inputs. All pipeline stages are initially included; users can filter stage, search, review flags, follow-up due or asking above target. Cards paginate 50 at a time and show filtered counts. The My properties shortcut opens the existing portfolio.

New module `saved-deal-radar.mjs` uses safe text nodes, validates company/date/duplicate IDs/exact amounts/known flags, discards changed-workspace responses and clears on sign-out/company changes. Its page and module are included in both frontend packaging allowlists and shared release versioning. Existing Free Analyzer/Pipeline/Intelligence behavior is unchanged. No provider, external geocoder, tiles, scraping, email or push delivery is connected.

## Verification and setup

- Local restore test applies the application baseline plus `supabase/features/saved-deal-radar.sql`; checks exact-cent gaps, missing values, follow-up boundaries, company/Pro/viewer/inactive/anonymous access.
- Four UI/module tests cover validation, filtering, pagination, safe text, empty states and discarded stale company responses.
- `tests/staging-saved-deal-radar.sql` passed four SQL-role rollback groups in staging. All synthetic company/property/plan changes rolled back; zero retained fixture companies confirmed. These are not normal-session browser tests.
- Staging migration: `pro_saved_deal_radar`, remote version `20261026110332`. Canonical add-on: `supabase/features/saved-deal-radar.sql`, applied once after the application baseline for a separately approved empty environment. Do not replay all historical migrations or rerun on staging.
- Security advisors retained six administrative deny-default table notices, three prior intentional helper warnings, and the prior leaked-password setting; no finding involved this invoker RPC.
- Signed-in desktop/phone/viewer acceptance of this new page remains open.

Rollback: remove the new page/navigation caller first, then an administrator can revoke execute access to the new read-only RPC if needed. No saved properties or other RPCs need deleting.

## Still unfinished

Full geographic Market Map (coordinate provenance, chosen tile/geocoding terms, accurate markers, company-scoped research/history); external Deal Radar feeds (source/provider agreement, provenance, timestamps, deduplication, ingestion); alerts (saved rules, change history, secure delivery and subscription lifecycle); and lead generation/CRM (company-scoped storage, contact permissions, safe import/validation, verification and handoff). The full Money-Making System and advanced customization/team workflows also remain incomplete. The saved-deal review is one recoverable component, not completion of those products.
