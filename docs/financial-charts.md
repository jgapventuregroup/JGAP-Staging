# Recorded financial charts and wider workspace

October 28, 2026 — Owner approved the desktop-width recommendation and income/expense and monthly-cash-flow charts after reviewing competitor layouts.

The desktop content limit increases from 1,180px to 1,600px; existing 220px sidebar and narrow-screen breakpoints are retained. Page introductions stay within 78 characters of typical text width. Login retains its existing 500px limit.

Financial Reports displays two charts immediately below the selected-month metrics: income versus expenses for that month and recorded net cash flow for the six months ending in it. The existing authorized report RPC supplies the selected month plus five historical monthly reads, with identical property/reconciliation/tax filters. No new service, dependency, schema, paid feed, or spending is introduced.

Amounts and scale calculations retain exact integer cents; only bounded bar-width percentages use Number. Text labels expose every amount without relying on color or hover. Negative net extends left of the zero axis, positive right. Empty months display No recorded entries, not a fabricated zero-profit observation. Explanations disclose partial months and potentially incomplete books. Estimates remain in the separate existing comparison section and never enter chart totals.

Every history response passes existing workspace/filter/date/entry/total validation. A history failure retains the current report and shows an unavailable message. Filter changes, clearing, session changes, or workspace switches discard late history. No chart-specific persistent state is stored.

The fictional finance-charts-demo.html imports the production chart renderer and loads production styles, includes positive/negative and missing-month examples, and connects to no account. Automated tests cover year boundaries, large exact amounts, history scope/filters, negative/missing results, invalid response rejection, and late responses.
