# Saved-property Market Map — October 27, 2026

## Current default — automatic selected-property map, October 27, 2026

The owner approved restoring the original app’s automatic address workflow. The proposed standalone-map removal was never published and has been canceled. View on Market Map · Pro opens the exact saved property, looks up its street address, loads OpenStreetMap street tiles and centers its pin automatically. The main map selects the first property with a saved address; changing the selector locates that property. The normal interface has no coordinate inputs, verification checkbox, manual-pick button or advanced-pin detour. Google Maps remains an optional address-link fallback; no Google Cloud account/key or paid map subscription is configured.

Lookup is limited to the selected saved property, not a background portfolio/bulk geocoding pass. `property-geocode` verifies the caller with Supabase Auth and forwards that identity to `get_market_map` before reading the exact company/property address. It rechecks authorization/address before returning or caching. It accepts company/property IDs, never arbitrary caller-supplied addresses. The service-only cache and app-wide lease prevent client access and overlapping upstream lookups; a 1.1-second cooldown after completion keeps requests below one per second. A 30-second failed-worker lease and bounded client retries fail closed. Positive results cache for 30 days; not-found/ambiguous results for one day. Address/provider changes use a new fingerprint. No customer deal, manually verified coordinate or membership is overwritten.

The selected address is disclosed to OpenStreetMap’s public Nominatim service, identified with the app website in User-Agent. Apartment/unit markers are omitted only for building lookup; saved addresses remain unchanged. Matching requires a house number, matching road text, building-level place rank and valid coordinates. City/street-only results, wrong houses/roads and conflicting matches show a truthful unavailable/ambiguous result. Building location is approximate and never advertised as a verified parcel or apartment location. Missing addresses lead to Passport guidance. A late account, workspace or property selection cannot replace the current map.

### Service policy and operational setup

Read [Nominatim’s usage policy](https://operations.osmfoundation.org/policies/nominatim/) before operation. This custom selected-property lookup uses an identifying proxy, caching and a shared throttle; it does not implement autocomplete, periodic scans or a generic public geocoding endpoint. The public service has limited donated capacity and can withdraw access. Beta usage must remain moderate. A commercial provider or self-hosted replacement may be needed as usage grows; no paid upgrade is authorized or promised by this implementation. Set `PROPERTY_GEOCODER_URL` on the Edge Function to a compatible replacement without a frontend update; changes in response format require a reviewed adapter. Attribution remains on the map. Public policy also prohibits sending personal/confidential data; send only property addresses the workspace is authorized to use for this mapping purpose, never notes, contact names or account/session values.

Apply `supabase/features/property-geocoding.sql` once after the application baseline in an approved empty environment, then deploy `supabase/functions/property-geocode/` with standard platform Supabase URL/anon/service credentials. `verify_jwt=false` is deliberate because the handler itself validates the bearer token through Auth and enforces the caller’s map RPC permissions. Missing/invalid tokens are denied; service credentials never reach the browser or upstream provider. Default CORS origin is the staging GitHub Pages origin; set `PROPERTY_MAP_ORIGINS` for separately approved deployment origins. Local source migration `20261027181632` corresponds to hosted `20261027182154_automatic_property_geocoding`.

Local UI/handler/SQL tests cover selected-address flow, no manual controls, access denial, cache reuse, automatic busy retries, match validation, unit handling, identity/address races and service-only lease ownership/cooldown. Two hosted security groups passed with rollback, and the live unauthenticated Edge endpoint returned 401. A single public Census Bureau address lookup returned a building match in the provider probe; that is not a real-user session or full live map acceptance. No new security warnings appeared; two informational RLS-without-policy findings are intentional for service-only tables. Actual signed-in rendering and phone acceptance remain open.

**All later map/Google/manual/default sections below are superseded history.**


## Current default — direct Google Maps links, owner decision October 27, 2026

The owner declined Google Cloud billing after reviewing trial and account requirements and explicitly chose the no-billing Google Maps URL option. This supersedes the Embed decision and setup instructions preserved below as history. **No Embed API key, Google Cloud billing account or trial is required by the current app.** Embed iframe code and its key configuration were removed; no background Google map/address request occurs on page opening.

My properties and Property Passport now offer View in Google Maps · Pro. For authorized Pro readers with a saved street address, this is a direct address-encoded link opening a new tab or the installed Maps app. It uses the saved street address, not the property’s display label, company ID, session or notes. A missing address opens the property-map page with guidance to add one. Free/Investor actions open plan information. Stale workspace/account actions prevent link navigation. The main map page provides address links and a property selector; the prior manual portfolio map remains an advanced option.

Google processes the address only when its link is opened, and its search result may be ambiguous; no parcel/unit accuracy is guaranteed. Google Maps URLs require no API key: https://developers.google.com/maps/documentation/urls/get-started . This implementation makes no Google Maps Platform API calls and requires no paid mapping service setup. The app’s existing Pro entitlement is separate from Google billing.

Local coverage verifies address encoding, safe new-tab attributes, exact property links, no iframe creation, missing addresses, role/plan gating, stale-link prevention and workspace clearing. Rendered browser/phone acceptance remains pending.


## Superseded Google Maps Embed setup — not the current implementation

Property shortcuts and the main map screen now use the selected saved street address for Google Maps Embed. No latitude/longitude entry or separate geocoding API is needed. The exact property ID controls selection; users can switch properties with a selector. The prior local portfolio pin map remains available through Portfolio pins · advanced; its preserved behavior/evidence below is not the default property experience.

**Activation pending:** `window.JGAP_GOOGLE_MAPS_EMBED_KEY` in `config.js` is intentionally empty. No Google Cloud account, billing account or key was created by this change. Without a configured key, the app provides an address-based Open in Google Maps link and a clear preview-unavailable message. It does not generate a fake/no-key embedded map. A configured Embed key creates the iframe automatically when the user opens the property map. Google receives that selected address and connection information; property names/notes/company IDs/session values are not included in the URL. An ambiguous address can return an ambiguous result; the app never claims Google has verified parcel or unit boundaries.

### Required owner Google setup

1. In an owner-controlled Google Cloud project, enable billing and **Maps Embed API**. Google currently documents Embed requests as no-charge/unlimited; unrelated APIs have separate billing. Setup instructions: https://developers.google.com/maps/documentation/embed/quickstart .
2. Create a browser API key restricted to **Maps Embed API**. Apply website/referrer restrictions for the staging origin `https://jgapventuregroup.github.io/*`; add only the separately approved production origin at deployment. The iframe uses `strict-origin-when-cross-origin`, so restrictions must accept the origin-level referrer, not depend on a full property URL path. Google key guidance: https://developers.google.com/maps/api-security-best-practices .
3. Set that restricted browser key in `config.js`, deploy, and test a fictional known address from the approved origin. Do not enable paid geocoding, Places or JavaScript Maps APIs for this implementation. No server/service-account credential belongs in public configuration.
4. Check missing/ambiguous addresses, changed-address refresh, iframe denial/network failure, Google Maps app/browser fallback, keyboard navigation and a phone. Cross-origin iframe load does not prove geocoding accuracy or a working key; inspect the actual rendered map. This activation/live acceptance is still pending.

Official references checked October 27: https://developers.google.com/maps/documentation/embed/usage-and-billing , https://developers.google.com/maps/documentation/embed/get-started , https://developers.google.com/maps/documentation/urls/get-started . The no-charge finding is specific to Embed, not a permanent guarantee for all Google services.

Local regression coverage includes encoded address URLs, exact-ID selection with duplicate names, no-coordinate usage, empty key/address/missing property, Pro/viewer access, Free denial, stale responses and navigation fallback. No property coordinates, records, subscriptions or live billing were changed.


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


## Street-tile failure handling — October 27, 2026

A failed tile request now shows a visible status explaining that saved pins and the property list remain available and that toggling streets off/on retries loading. This status is separate from location-save messages. Errors from hidden, removed or destroyed tile layers cannot replace the current view’s status. Local UI/adapter regression coverage verifies the fallback, retained property navigation and stale-error suppression. Actual rendered network-failure acceptance remains pending.


## Saved-property shortcut — owner-approved October 27, 2026

Saved-property actions and Property Passport include View on Market Map · Pro. Current server-authorized Pro readers, including licensed viewers, open the exact selected property by ID, even when property names match. The map focuses the single pin and opens its popup; Show all saved properties restores the full workspace view. If coordinates are missing, editing roles receive location-entry guidance and viewers are directed to a workspace editor. A missing/deleted property shows an unavailable notice. Free/Investor shortcuts open plan information without loading map records. Stale workspace/account actions are ignored; the existing map API still independently authorizes every read. No saved coordinates, membership entitlements or real property records are modified by navigation. Controlled tests cover exact ID selection, missing locations/records, all-properties return, Pro viewer/Free behavior and stale actions; live browser acceptance remains pending.
