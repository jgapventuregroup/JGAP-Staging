# Investor preview: how to test safely

This ZIP is an **artifact**, not a deployed website. It contains a full staging-app snapshot and two standalone fictional demos.

## Browser testing the demos

1. Download `investor-preview-site` from the successful GitHub Actions run and extract it.
2. From the extracted directory, start a local static web server. With Python installed, run `python -m http.server 8000` (Windows may require `py -m http.server 8000`).
3. Open `http://localhost:8000/previews/` to see the Investor preview home page.
4. Select **Property Passport — Operations** or **Income & Expense Tracker** to test the fictional screens.

The demos do not persist changes or touch Supabase. They are not a substitute for paid-entitlement and row-level security testing.

## Important staging app limitation

The bundle also includes `index.html`, but do **not** treat it as a production-ready local deployment. Its sign-in redirects and authentication settings are configured for the existing staging website. Paid Passport data and operations tables are not deployed or enabled. Testing paid workflows requires an isolated staging preview origin, correctly configured authentication redirects, reviewed database migrations and a fictional paid test company.

Do not merge this branch or deploy these schema drafts merely to enable the demo.
