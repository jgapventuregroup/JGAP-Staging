# JGAP website → investing app integration

The public JGAP Venture Group marketing website and the authenticated JGAP investing application are separate products linked by navigation.

## First release

- Add a prominent **Launch JGAP App** link on the public website, pointing to the approved app URL.
- Current **staging/test-only** URL: https://jgapventuregroup.github.io/JGAP-Staging/ . Do not promote this as a public production launch.
- Use a normal HTTPS link (`<a href="...">Launch JGAP App</a>`), not an embedded iframe. The app manages its own login and workspace selection.
- Add a **Back to JGAP website** link in the app after the website's final URL is known; do not invent or hardcode a domain.
- Preserve existing customer sessions and company isolation. No website link should contain an API key, password, token, or company identifier.

## After the owner approves launch

- Publish the approved application at a stable app address, optionally `app.<verified-owner-domain>` if DNS and hosting support it.
- Update the website's Launch App link to that approved URL.
- Configure the approved app origin and redirect URLs in staging/production auth settings as appropriate, and test signup, verification, password recovery and logout on the final origin.
- Test mobile navigation and browser back/forward behavior between marketing website and app.
- Do not enable Stripe, change production infrastructure, or launch publicly without owner approval.

## Coordinated launch requirement (October 15, 2026)

The owners require the JGAP Venture Group website, Investor App and JGAP Book to go live **together**, not independently. The companion website release gate is tracked in `jgapventuregroup/JGAP-Website/THREE-PRODUCT-LAUNCH-GATES.md`.

The app's passing CI checks are evidence of code-level tests only. Before public release, obtain evidence for: (1) fresh real customer signup and verification, (2) deal creation, offer edits, save/reload, pipeline follow-up and cross-company access refusal, (3) Free five-lifetime-property enforcement, (4) secure test checkout, signed webhook activation, failed payment, cancellation and customer portal, (5) password recovery via actual email, (6) final production URL and allowed auth redirects, (7) mobile/browser QA, privacy/terms and support, and (8) explicit approval by Sean and Lesleigh.

Do not enable real charges or publicly link this staging app to meet a date. Confirm the book's finished ordering page and the website's approved public domain before updating either product's navigation. Never copy staging customer data into the marketing website.
