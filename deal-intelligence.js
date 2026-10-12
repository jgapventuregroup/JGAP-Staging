(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const money = value => value == null ? 'Not supplied' : value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const safeAmount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e12;
  let previewCompany = null;
  function clear() { previewCompany = null; el('intelligence-json').value = ''; el('intelligence-source').value = ''; el('intelligence-results').replaceChildren(); el('intelligence-status').textContent = ''; }
  window.JGAPDealIntelligence = { clear };
  el('clear-intelligence').onclick = clear;
  el('review-intelligence').onclick = () => {
    el('intelligence-results').replaceChildren();
    const scope = window.JGAPIntelligenceContext?.scope();
    if (!scope) { el('intelligence-status').textContent = 'Choose a company workspace before reviewing listings.'; return; }
    previewCompany = scope.companyId;
    try {
      const raw = el('intelligence-json').value.trim();
      if (!raw || raw.length > 250000) throw Error('Paste listing JSON up to 250,000 characters.');
      const payload = JSON.parse(raw);
      const rows = Array.isArray(payload) ? payload : payload?.listings || payload?.properties || payload?.data || [payload];
      if (!Array.isArray(rows) || !rows.length || rows.length > 100 || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw Error('Use one listing or an array of up to 100 listing objects.');
      const source = el('intelligence-source').value.trim() || 'Supplied listing';
      let incomplete = 0;
      for (const rawRow of rows) {
        const listing = window.JGAPDealIntelligenceAdapter.normalize(rawRow, source);
        const valid = listing.external_id && typeof listing.address === 'string' && listing.address.trim().length >= 2 && listing.address.trim().length <= 150 && safeAmount(listing.asking_price) && safeAmount(listing.rent_monthly) && safeAmount(listing.expenses_monthly);
        if (!valid) incomplete++;
        const card = document.createElement('article'); card.className = 'metric';
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
        const feedback = document.createElement('p'); feedback.setAttribute('role', 'status');
        const offerLabel = document.createElement('label'); offerLabel.textContent = 'Your planned offer ($)';
        const offer = document.createElement('input'); offer.type = 'number'; offer.min = '0'; offer.step = '0.01'; offer.value = ''; offerLabel.append(offer);
        const save = document.createElement('button'); save.type = 'button'; save.textContent = 'Save as a property';
        save.disabled = !valid || !['owner', 'admin', 'editor'].includes(scope.role);
        offer.disabled = save.disabled;
        feedback.textContent = !valid ? 'To save, supply a listing ID, address, nonnegative asking price, monthly rent and expenses. Missing values are not filled with estimates.' : save.disabled ? 'Your company role is read-only.' : 'Enter your planned offer. Saving uses one lifetime Free property slot. Review the address first; Free property identity is locked after saving.';
        save.onclick = async () => {
          const active = window.JGAPIntelligenceContext?.scope();
          if (!active || active.companyId !== previewCompany || active.companyId !== scope.companyId || save.disabled) return;
          const plannedOffer = Number(offer.value);
          if (!offer.value.trim() || !safeAmount(plannedOffer)) { feedback.textContent = 'Enter a valid planned offer before saving. Asking price and your offer are kept separate.'; offer.setAttribute('aria-invalid', 'true'); offer.focus(); return; }
          offer.removeAttribute('aria-invalid');
          save.disabled = true; feedback.textContent = 'Saving property…';
          try {
            const result = await window.JGAPIntelligenceContext.save({ ...listing, planned_offer: plannedOffer }, scope.companyId);
            if (result.stale || previewCompany !== scope.companyId) return;
            feedback.textContent = result.duplicate ? 'This address is already saved in your company. Open My properties to edit the existing property.' : result.refreshFailed ? 'Property saved. Reopen My properties to refresh the list; do not save another copy.' : 'Saved to this company. Open My properties to analyze and verify financing inputs.'; save.textContent = result.duplicate ? 'Already saved' : 'Saved ✓';
          } catch (error) {
            if (previewCompany !== scope.companyId) return;
            feedback.textContent = /FREE_LIFETIME_PROPERTY_LIMIT_REACHED/.test(String(error.message)) ? 'Five lifetime Free properties have been used. Existing properties remain editable; no payment was taken.' : 'Could not save: ' + error.message;
            save.disabled = false;
          }
        };
        card.append(title, sourceLine, figures, screening, metrics, offerLabel, save, feedback);
        if (typeof listing.source_url === 'string') {
          try { const url = new URL(listing.source_url); if (url.protocol === 'https:') { const link = document.createElement('a'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'View source listing'; card.append(link); } } catch {}
        }
        el('intelligence-results').append(card);
      }
      el('intelligence-status').textContent = rows.length + ' listings reviewed. ' + incomplete + ' missing or invalid save inputs. Nothing is saved until you select Save as a property.';
    } catch (error) { el('intelligence-results').replaceChildren(); el('intelligence-status').textContent = 'Unable to review listings: ' + error.message; }
  };
})();
