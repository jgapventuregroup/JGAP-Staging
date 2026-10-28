# Compact record lists

October 28, 2026 — Owner requested expandable records for the four supplied screenshots: Saved properties, Deal Pipeline, In-app alerts, Saved Deal Radar.

Each record uses native details/summary, closed by default, with a visible name and key price/stage/due/review summary. Expand a row to access actions and remaining details. Search, filters, counts and existing alert/Radar pagination remain outside the disclosures. Pipeline stage/date saves preserve expanded rows during workspace refresh; clearing or switching workspace removes the prior rows. Property actions and all server permission checks remain unchanged. Native summary controls support mouse, touch, Enter and Space.

Validation: existing property navigation, read-only roles, company boundaries, stage/date persistence, alert source routes and personal review, Radar filtering/pagination and safe-text checks are retained. Tests now verify native summary structure and initial collapsed state. No schema, billing, account or saved-property data changes.
