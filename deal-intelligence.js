(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const money = value => value == null ? 'Not supplied' : value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const safeAmount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e12;
  const showReview=()=>{const status=el('intelligence-status');status.setAttribute('tabindex','-1');status.focus?.({preventScroll:true});status.scrollIntoView?.({block:'start',behavior:'auto'});};
  let previewCompany = null;
  let reviewVersion = 0;
  const manualFields=['address','price','rent','expenses','type','units'];
  function clear() { reviewVersion++; for(const field of manualFields){const input=el('intelligence-'+field);input.value='';input.removeAttribute('aria-invalid');}el('intelligence-advanced').open=false;previewCompany = null; el('intelligence-json').value = ''; el('intelligence-source').value = ''; el('intelligence-results').replaceChildren(); el('intelligence-status').textContent = ''; }
  window.JGAPDealIntelligence = { clear };
  el('clear-intelligence').onclick = () => {
    const hasEntries = [...manualFields, 'source', 'json'].some(field => el('intelligence-'+field).value.trim())
      || el('intelligence-results').children.length;
    if (hasEntries && !window.confirm('Clear all entries and the current review? Saved properties will stay in My Properties.')) return;
    clear();
    el('intelligence-address').focus();
  };
  const editDetails = () => el('intelligence-address').focus();
  function reviewGroup(title, entries) {
    const group = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const list = document.createElement('dl');
    for (const [label, value] of entries) {
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value ?? 'Not supplied';
      list.append(term, detail);
    }
    group.append(heading, list);
    return group;
  }
  function review(manualRow=null) {
    const version = ++reviewVersion;
    el('intelligence-results').replaceChildren();
    const scope = window.JGAPIntelligenceContext?.scope();
    if (!scope) { el('intelligence-status').textContent = 'Choose a company workspace before reviewing listings.'; showReview(); return; }
    previewCompany = scope.companyId;
    try {
      const raw = el('intelligence-json').value.trim();
      if (!manualRow && (!raw || raw.length > 250000)) throw Error('Paste listing JSON up to 250,000 characters.');
      let payload = manualRow;
      if (!manualRow) {
        try { payload = JSON.parse(raw); }
        catch { throw Error('The pasted text is not valid JSON. Check the listing data and try again.'); }
      }
      const rows = Array.isArray(payload) ? payload : payload?.listings || payload?.properties || payload?.data || [payload];
      if (!Array.isArray(rows) || !rows.length || rows.length > 100 || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw Error('Use one listing or an array of up to 100 listing objects.');
      const source = el('intelligence-source').value.trim() || (manualRow?'Manually entered property':'Supplied listing');
      let incomplete = 0;
      for (const rawRow of rows) {
        const listing = window.JGAPDealIntelligenceAdapter.normalize(rawRow, source);
        const valid = listing.external_id && typeof listing.address === 'string' && listing.address.trim().length >= 2 && listing.address.trim().length <= 150 && safeAmount(listing.asking_price) && safeAmount(listing.rent_monthly) && safeAmount(listing.expenses_monthly);
        if (!valid) incomplete++;
        const card = document.createElement('article'); card.className = 'metric intelligence-review';
        const title = document.createElement('h2'); title.textContent = typeof listing.address === 'string' ? listing.address : 'Address not supplied';
        const sourceLine = document.createElement('p'); sourceLine.className = 'muted'; sourceLine.textContent = source + ' · ' + (listing.external_id || 'Listing ID missing') + ' · Provider-supplied figures; verify before relying on them.';
        const figures = document.createElement('p'); figures.textContent = 'Asking: ' + money(listing.asking_price) + ' · Monthly rent: ' + money(listing.rent_monthly) + ' · Monthly expenses: ' + money(listing.expenses_monthly) + ' · Units: ' + (listing.units ?? 'Not supplied');
        const screening = document.createElement('p');
        const city = String(listing.city || '').trim().toLowerCase(), state = String(listing.state || '').trim().toLowerCase();
        const market = ['bristol', 'kingsport', 'johnson city', 'elizabethton'].includes(city) && ['tn', 'va', 'tennessee', 'virginia'].includes(state);
        const type = /multi|duplex|triplex|fourplex|apartment|residential income/.test(String(listing.property_type || '').toLowerCase());
        screening.textContent = 'Original JGAP buying box: ' + (!city || !state || !listing.property_type || listing.units == null ? 'Market/type/unit information is incomplete.' : market && type && listing.units >= 2 && listing.units <= 20 ? 'Within the listed market/type/2–20 unit screen.' : 'Outside the listed market/type/2–20 unit screen.');
        const metrics = document.createElement('p');
        metrics.textContent = 'Supplied cap rate: ' + (listing.cap_rate == null ? 'Not supplied' : listing.cap_rate + '%') + ' (target 8%) · Supplied DSCR: ' + (listing.dscr ?? 'Not supplied') + ' (target 1.20) · Supplied cash flow: ' + money(listing.cash_flow_monthly) + ' (target $500/month). These are source claims, not calculated or verified results.';
        const missingFigures = [
          ['asking price', listing.asking_price],
          ['expected monthly rent', listing.rent_monthly],
          ['estimated monthly operating expenses', listing.expenses_monthly],
        ].filter(([, value]) => !safeAmount(value)).map(([label]) => label);
        const feedback = document.createElement('p'); feedback.setAttribute('role', 'status');
        const offerLabel = document.createElement('label'); offerLabel.textContent = 'Your planned offer ($)';
        const offer = document.createElement('input'); offer.type = 'number'; offer.min = '0'; offer.step = '0.01'; offer.value = ''; offerLabel.append(offer);
        const save = document.createElement('button'); save.type = 'button'; save.textContent = 'Save as Property';
        save.disabled = !valid || !['owner', 'admin', 'editor'].includes(scope.role);
        offer.disabled = save.disabled;
        feedback.textContent = !valid ? (manualRow?'Before saving, add '+missingFigures.join(', ')+' and review again.':'To save, supply a listing ID, address, nonnegative asking price, monthly rent and expenses. Missing values are not filled with estimates.') : save.disabled ? 'Your company role is read-only.' : 'Enter your planned offer. Saving uses one lifetime Free property slot. Review the address first; Free property identity is locked after saving.';
        save.onclick = async () => {
          const active = window.JGAPIntelligenceContext?.scope();
          if (version !== reviewVersion || !active || active.companyId !== previewCompany || active.companyId !== scope.companyId || save.disabled) return;
          const plannedOffer = Number(offer.value);
          if (!offer.value.trim() || !safeAmount(plannedOffer)) { feedback.textContent = 'Enter a valid planned offer before saving. Asking price and your offer are kept separate.'; offer.setAttribute('aria-invalid', 'true'); offer.focus(); return; }
          offer.removeAttribute('aria-invalid');
          save.disabled = true; feedback.textContent = 'Saving property…';
          try {
            const result = await window.JGAPIntelligenceContext.save({ ...listing, planned_offer: plannedOffer }, scope.companyId);
            if (version !== reviewVersion || result.stale || previewCompany !== scope.companyId) return;
            feedback.textContent = result.duplicate ? 'This address is already saved in your company. Open My properties to edit the existing property.' : result.refreshFailed ? 'Property saved. Reopen My properties to refresh the list; do not save another copy.' : 'Your property has been saved. Open My Properties to analyze it.'; save.textContent = result.duplicate ? 'Already saved' : 'Saved ✓';
          } catch (error) {
            if (version !== reviewVersion || previewCompany !== scope.companyId) return;
            feedback.textContent = /FREE_LIFETIME_PROPERTY_LIMIT_REACHED/.test(String(error.message)) ? 'Five lifetime Free properties have been used. Existing properties remain editable; no payment was taken.' : 'Could not save: ' + error.message;
            save.disabled = false;
          }
        };
        if (manualRow) {
          const typeControl = el('intelligence-type');
          const propertyType = listing.property_type
            ? typeControl.options?.[typeControl.selectedIndex]?.textContent || listing.property_type
            : null;
          const overview = [['Address', listing.address], ['Property type', propertyType], ['Rental units', listing.units]];
          if (el('intelligence-source').value.trim()) overview.push(['Listing source', source]);
          card.append(reviewGroup('Property Overview', overview), reviewGroup('Financial Snapshot', [
            ['Asking price', money(listing.asking_price)], ['Expected monthly rent', money(listing.rent_monthly)],
            ['Estimated monthly operating expenses', money(listing.expenses_monthly)],
          ]));
          const next = document.createElement('h3'); next.textContent = 'Next Actions';
          const actions = document.createElement('div'); actions.className = 'intelligence-actions';
          const edit = document.createElement('button'); edit.type = 'button';
          edit.className = 'intelligence-secondary'; edit.textContent = 'Edit Details';
          edit.onclick = editDetails;
          actions.append(save, edit);
          card.append(next, offerLabel, actions, feedback);
        } else card.append(title, sourceLine, figures, screening, metrics, offerLabel, save, feedback);
        if (typeof listing.source_url === 'string') {
          try { const url = new URL(listing.source_url); if (url.protocol === 'https:') { const link = document.createElement('a'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'View source listing'; card.append(link); } } catch {}
        }
        el('intelligence-results').append(card);
      }
      el('intelligence-status').textContent = manualRow ? (incomplete ? 'Review ready. Complete the missing financial fields before saving.' : 'Review ready.') : rows.length + ' listings reviewed. ' + incomplete + ' need more information before saving.';
    } catch (error) { el('intelligence-results').replaceChildren(); el('intelligence-status').textContent = 'Unable to review listings: ' + error.message; }
    showReview();
  }
  el('review-intelligence').onclick=()=>review();
  el('intelligence-property-form').onsubmit=event=>{
    event.preventDefault();
    const invalid = [];
    const value = field => {
      const input = el('intelligence-'+field);
      input.removeAttribute('aria-invalid');
      return input.value.trim();
    };
    const address = value('address');
    if (address.length < 2 || address.length > 150) invalid.push(['address', 'Enter the full property address to continue.']);
    const amount = (field, label) => {
      const raw = value(field), number = Number(raw);
      if (el('intelligence-'+field).validity?.badInput || (raw && !safeAmount(number))) {
        invalid.push([field, 'Enter a valid '+label+' or leave it blank if unknown.']);
      }
      return raw ? number : null;
    };
    const unitsText = value('units'), units = unitsText ? Number(unitsText) : null;
    if (el('intelligence-units').validity?.badInput || (units !== null && (!Number.isSafeInteger(units) || units < 1))) {
      invalid.push(['units', 'Enter a whole number of rental units or leave it blank.']);
    }
    const asking_price = amount('price', 'asking price');
    const rent_monthly = amount('rent', 'monthly rent');
    const expenses_monthly = amount('expenses', 'monthly operating expense amount');
    if (invalid.length) {
      reviewVersion++;
      el('intelligence-results').replaceChildren();
      el('intelligence-status').textContent = invalid.map(([, message]) => message).join(' ');
      for (const [field] of invalid) el('intelligence-'+field).setAttribute('aria-invalid', 'true');
      el('intelligence-'+invalid[0][0]).focus();
      return;
    }
    review({external_id:'manual:'+address.toLowerCase(), address, asking_price, rent_monthly,
      expenses_monthly, property_type:el('intelligence-type').value||null, units});
  };
})();
