# Page help and guided walkthroughs

October 28, 2026 — Owner approved a top-right Help button on every page, plain-language page explanations, save behavior, definitions and optional walkthroughs.

`page-help.mjs` provides static guidance for all 16 workspace pages and sign-in/password recovery. A Help entry is inserted after each page’s existing ad slot (or at the top if it has no slot), keeping ads as the first child of their actual page. The native dialog opens page-specific content with a Close control and Escape support. Closing returns focus to the initiating Help button.

“Walk me through this page” closes the dialog and opens an accessible step coach with Back, Next, Finish and Close. Steps highlight and scroll to existing controls or areas. A separate focus action lets keyboard users move to the highlighted area. The tour never clicks product controls, submits forms, enters credentials, changes permissions, or writes data. Missing or currently collapsed controls are explained rather than automatically opened. Page changes and sign-out close the tour and remove its highlight. Help stores no personal state and uses no network service or paid dependency.

Guidance distinguishes automatic layout/pipeline saves from manual Analyzer/Passport/bookkeeping saves. It explains estimates versus recorded results, incomplete financial histories, approximate map pins, personal alert review, workspace ownership, plan-preview limitations, optional JSON inputs, and friend versus workspace invitations.

`page-help.css` provides light/dark styles, a right-side dialog, responsive step coach, visible highlights and phone-sized controls. Both deployment allowlists include the module and stylesheet. Automated checks cover all page keys and static target IDs, important save/access distinctions, and missing-module packaging. Browser acceptance uses the full-app fictional fixture; it does not authenticate a real account.
