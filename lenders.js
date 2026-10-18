// Adapted from the original JGAP lenders.js field model and directory workflow.
// All reads/writes use the selected company; records render with textContent.
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const mapping = { l_inst: 'institution_name', l_contact: 'contact_name', l_type: 'lender_type', l_status: 'status', l_phone: 'phone', l_email: 'email', l_web: 'website', l_addr: 'address', l_loans: 'loan_types', l_min: 'minimum_loan_amount', l_max: 'maximum_loan_amount', l_ltv: 'typical_ltv', l_dscr: 'typical_dscr', l_last: 'last_contact_date', l_next: 'next_follow_up_date', l_rates: 'rate_notes', l_terms: 'term_notes', l_notes: 'notes' };
  const numeric = new Set(['l_min', 'l_max', 'l_ltv', 'l_dscr']);
  let rows = [], editing = null, editingCompany = null, loading = 0, saving = false;
  const scope = () => window.JGAPLenderContext?.scope();
  const canEdit = () => ['owner', 'admin', 'editor'].includes(scope()?.role);
  const money = value => value == null ? 'Not supplied' : Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  function showForm(open) { el('lender-form').hidden = !open; el('l_toggle_form').ariaExpanded = String(open); el('l_toggle_form').textContent = open ? 'Hide lender form −' : 'Add lender +'; }
  el('l_toggle_form').onclick = () => { if (!canEdit() || saving) return; const opening = el('lender-form').hidden; if (!opening && editing) clearForm(); showForm(opening); };
  function clearForm() { editing = null; editingCompany = null; for (const id of Object.keys(mapping)) el(id).value = ''; el('l_type').value = 'Bank'; el('l_status').value = 'Prospect'; el('l_form_title').textContent = 'Add lender'; el('l_save_btn').textContent = 'Save lender'; el('l_cancel_btn').hidden = true; }
  function clear() { loading++; rows = []; clearForm(); showForm(false); el('l_toggle_form').hidden = true; el('lenderList').replaceChildren(); el('l_search').value = ''; el('l_show_archived').checked = false; el('l_msg').textContent = ''; for (const id of ['l_count', 'l_active', 'l_due']) el(id).textContent = ''; }
  function payload() {
    const result = {};
    for (const [id, column] of Object.entries(mapping)) {
      const raw = el(id).value.trim();
      if (numeric.has(id)) { const value = raw === '' ? null : Number(raw); if (value !== null && (!Number.isFinite(value) || value < 0 || value > (id === 'l_ltv' || id === 'l_dscr' ? 100 : 1e12))) throw Error('Enter valid nonnegative loan amounts, LTV and DSCR. Leave unknown figures blank.'); result[column] = value; }
      else result[column] = raw || null;
    }
    if (!result.institution_name || result.institution_name.length < 2 || result.institution_name.length > 150) throw Error('Enter an institution name with 2 to 150 characters.');
    if (result.minimum_loan_amount != null && result.maximum_loan_amount != null && result.minimum_loan_amount > result.maximum_loan_amount) throw Error('Minimum loan cannot exceed maximum loan.');
    if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw Error('Enter a valid contact email or leave it blank.');
    if (result.website) { let url; try { url = new URL(result.website); } catch { throw Error('Use a full HTTPS website address.'); } if (url.protocol !== 'https:' || url.username || url.password) throw Error('Use a full HTTPS website address without credentials.'); }
    return result;
  }
  function render() {
    const query = el('l_search').value.trim().toLowerCase(), archived = el('l_show_archived').checked;
    const visible = rows.filter(row => Boolean(row.archived) === archived && [row.institution_name, row.contact_name, row.lender_type, row.loan_types].some(value => String(value || '').toLowerCase().includes(query)));
    const today = new Date(); const date = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    const current = rows.filter(row => !row.archived);
    el('l_count').textContent = String(current.length); el('l_active').textContent = String(current.filter(row => row.status === 'Active Relationship').length); el('l_due').textContent = String(current.filter(row => row.next_follow_up_date && row.next_follow_up_date <= date).length);
    el('lenderList').replaceChildren();
    if (!visible.length) { el('lenderList').textContent = archived ? 'No archived lenders match.' : 'No lenders match. Use Add lender + to create one.'; return; }
    for (const row of visible) {
      const card = document.createElement('article'); card.className = 'metric';
      const heading = document.createElement('h2'); heading.textContent = row.institution_name;
      const details = document.createElement('p'); details.textContent = [row.contact_name, row.phone, row.email, row.address].filter(Boolean).join(' · ');
      const terms = document.createElement('p'); terms.textContent = row.lender_type + ' · ' + row.status + ' · Loan types: ' + (row.loan_types || 'Not supplied') + ' · Minimum: ' + money(row.minimum_loan_amount) + ' · Maximum: ' + money(row.maximum_loan_amount) + ' · LTV: ' + (row.typical_ltv == null ? 'Not supplied' : row.typical_ltv + '%') + ' · DSCR: ' + (row.typical_dscr ?? 'Not supplied');
      const notes = document.createElement('p'); notes.style.whiteSpace = 'pre-wrap'; notes.textContent = [row.rate_notes, row.term_notes, row.notes].filter(Boolean).join('\n');
      const followup = document.createElement('p'); followup.textContent = 'Last contact: ' + (row.last_contact_date || 'Not recorded') + ' · Next follow-up: ' + (row.next_follow_up_date || 'Not scheduled');
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit'; edit.disabled = !canEdit(); edit.onclick = () => { const active = scope(); if (!active || active.companyId !== row.company_id || !canEdit()) return; editing = row.id; editingCompany = active.companyId; for (const [id, key] of Object.entries(mapping)) el(id).value = row[key] ?? ''; el('l_form_title').textContent = 'Edit lender'; showForm(true); el('l_save_btn').textContent = 'Update lender'; el('l_cancel_btn').hidden = false; el('l_form_title').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      const archive = document.createElement('button'); archive.type = 'button'; archive.textContent = archived ? 'Restore' : 'Archive'; archive.disabled = !canEdit(); archive.onclick = async () => { const active = scope(); if (!active || active.companyId !== row.company_id || !canEdit() || archive.disabled) return; archive.disabled = true; try { const result = await window.JGAPLenderContext.archive(row.id, !row.archived, active.companyId); if (result.stale) return; el('l_msg').textContent = row.archived ? 'Lender restored.' : 'Lender archived. Use Show archived lenders to restore it.'; await load(); } catch (error) { if (scope()?.companyId !== active.companyId) return; el('l_msg').textContent = 'Could not update lender: ' + error.message; archive.disabled = false; } };
      card.append(heading, details, terms, followup, notes, edit, archive);
      if (row.website) { try { const url = new URL(row.website); if (url.protocol === 'https:' && !url.username && !url.password) { const link = document.createElement('a'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Institution website'; card.append(link); } } catch {} }
      el('lenderList').append(card);
    }
  }
  async function load() {
    const active = scope(), generation = ++loading;
    el('lenderList').replaceChildren();
    rows = []; for (const id of ['l_count', 'l_active', 'l_due']) el(id).textContent = '';
    el('l_toggle_form').hidden = !canEdit(); showForm(false);
    if (!active) { el('l_msg').textContent = 'Choose a company workspace to view its lenders.'; return; }
    el('lenderList').textContent = 'Loading lender directory…';
    try { const result = await window.JGAPLenderContext.load(active.companyId); if (generation !== loading || result.stale || scope()?.companyId !== active.companyId) return; if (!Array.isArray(result.rows) || result.rows.some(row => row.company_id !== active.companyId)) throw Error('Lender records could not be verified for this company.'); rows = result.rows; render(); }
    catch (error) { if (generation !== loading || scope()?.companyId !== active.companyId) return; rows = []; el('lenderList').textContent = 'Unable to load lenders: ' + error.message; }
  }
  el('lender-form').onsubmit = async event => {
    event.preventDefault(); const active = scope();
    if (saving || !active || !canEdit() || el('lender-form').hidden || (editing && editingCompany !== active.companyId)) return;
    let fields; try { fields = payload(); } catch (error) { el('l_msg').textContent = error.message; return; }
    saving = true; el('l_save_btn').disabled = true;
    for (const id of Object.keys(mapping)) el(id).disabled = true; el('l_cancel_btn').disabled = true;
    try { const result = await window.JGAPLenderContext.save(fields, editing, active.companyId); if (result.stale || scope()?.companyId !== active.companyId) return; clearForm(); el('l_msg').textContent = 'Lender saved.'; await load(); }
    catch (error) { if (scope()?.companyId !== active.companyId) return; el('l_msg').textContent = 'Could not save lender: ' + error.message; }
    finally { saving = false; el('l_save_btn').disabled = !canEdit(); for (const id of Object.keys(mapping)) el(id).disabled = !canEdit(); el('l_cancel_btn').disabled = false; }
  };
  el('l_cancel_btn').onclick = () => { clearForm(); showForm(false); }; el('l_search').oninput = render; el('l_show_archived').onchange = render;
  window.JGAPLenders = { load, clear };
  clear();
})();
