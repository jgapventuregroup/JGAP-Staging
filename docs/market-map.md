# Saved-property Market Map — October 27, 2026

## Delivered scope

Pro users can view/search saved properties and mapped pins, open their existing property record, and choose whether to load street tiles. Owners/admins/editors can enter or click-to-select a location, confirm it is verified, and save/reopen it. Viewers have the equivalent property list and read-only pins. Unlocated properties are explicit; addresses are never guessed or sent to an automatic geocoder. Coordinates support latitude -85 to 85 and longitude -180 to 180 (the displayed map projection); real 0,0 is retained. This is a saved-property map, not a market-price/history feed or external listing service.

## Data and authorization

Canonical add-on `supabase/features/market-map.sql`, remote version `20261027102201`. Table identity is company/property scoped with a composite foreign key, no client identity updates or deletes, and an attribution/timestamp trigger. Load/save RPCs are security invokers. Pro eligibility includes the current seat gate; viewers cannot write, and inactive/Free/Investor/foreign/anonymous access is denied. Plan reactivation retains locations. Clear-pin support in the backend sets both coordinates null without deleting the property; the first UI exposes correction, not a destructive delete action. No real coordinate records were changed during acceptance.

## Map privacy and dependency provenance

Leaflet 1.9.4 is pinned in package.json/package-lock.json and bundled locally as leaflet.js/leaflet.css with its BSD license in leaflet-LICENSE.txt. JS SHA256/base64: `20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=` (matches the official download integrity value). Packaging verifies installed-package byte equality; styles/scripts share the release token. No runtime CDN is used for this map library.

Pins-only mode makes no tile/geocoder request. Load street map is an explicit action, preceded by disclosure: OpenStreetMap receives map-area tile requests and the user's IP; property names and record content are not sent. Consent resets when the map view is recreated or the workspace changes; prior requests cannot be recalled. Tile errors preserve pins/property list. No prefetch, offline bulk download or address search is implemented. Attribution remains visible whenever tiles are enabled.

Official references consulted: https://leafletjs.com/download and https://operations.osmfoundation.org/policies/tiles/ . Before production the handoff company must confirm an appropriate tile provider and expected traffic, preserve attribution/cache/referrer behavior, and review provider privacy/availability terms. Public standard tiles are not a promised paid-service SLA. No provider purchase or credentials are configured here.

## Verification and remaining acceptance

Local tests cover real zero/missing/invalid coordinates, exact workspace/property writes, verified input requirement, viewer/Pro gates, delayed-workspace response rejection, search/marker updates, click-to-select without automatic saving, local library packaging and CSS release versions. Restored-schema tests include the existing team-seat add-on and the exact staging SQL script.

All four hosted `tests/staging-market-map.sql` groups passed: coordinate/identity/foreign integrity; viewer and expired-seat controls; Free/Investor/inactive restrictions and retained reactivation; anonymous denial. Every fixture rolled back; retained fixture-company count was zero. No new advisor findings were introduced.

Normal authenticated screen acceptance, actual Leaflet rendering/network inspection, street opt-in/error behavior, populated multi-pin/overlap/long-name cases and physical phone checks remain open. No physical-device or real-session map acceptance is claimed from controlled DOM/SQL tests. The completed marketing website, live ads and live payments remain unchanged.


## Owner desktop acceptance — October 27, 2026

Normal browser sign-in loaded the disposable Pro workspace on `1b34036`. Observed empty-location state, exact search, no rendered tile images by default, verification-checkbox enforcement, synthetic-pin save/reload/reopen, opt-in real street rendering/attribution, hide/reset behavior, exact Property Passport navigation, Free denial and Pro return. Screenshot and boundaries are in `evidence/four-feature-owner-desktop-2026-10-27.json`. Only one synthetic pin was used and retained; multi-pin, viewer, physical-phone, browser click-to-select and tile-error acceptance remain open. Earlier normal-session-pending status is superseded only for these observed owner cases. No real address was geocoded or property location disclosed.


## Follow-up owner interaction check — October 27, 2026

Live map click-to-select populated provisional coordinates and left verification unchecked. Navigating away/reopening restored the original retained QA pin, proving no automatic save from selection. Five traced successive navigation targets matched their requested pages; the earlier unexplained mismatch did not recur and no speculative code change was made. Evidence is appended to the existing owner-desktop JSON. This closes the selected owner click-to-select/cancel case, not viewer/multi-pin/phone or general navigation acceptance. Available browser controls did not produce a narrower CSS viewport; phone testing is still unverified.


## Coordinate readback verification — October 27, 2026

After a successful save response, the app now verifies that the exact property is present in the reloaded workspace and both coordinates match the submitted position within the database’s six-decimal rounding precision. Missing or different coordinates produce a saved-but-unverified warning and retain the draft instead of reporting verified success. Regression tests cover missing rows, either coordinate mismatching, absent coordinates, zero and rounding. This is local regression evidence; live browser acceptance of this correction remains open.

Manual edits to either coordinate now clear the verification checkbox. Regression coverage confirms that saving is blocked until the changed values are explicitly confirmed again; click-to-select already clears confirmation. No coordinates are changed automatically.


## Date-line map bounds — October 27, 2026

The map fits pins using the shortest longitude arc, avoiding an almost-worldwide view when saved properties straddle ±180 degrees. Marker display positions and bounds use the same wrapped coordinates; saved values and property navigation stay unchanged. Local regression checks cover date-line pins, normal local pins, empty/single maps, equivalent ±180 positions, property order and unchanged source values. Rendered multi-pin/date-line acceptance remains pending.
