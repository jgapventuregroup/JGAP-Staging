// The Key Ahead Investor — reusable, read-only Property Passport projection.
// This module does not fetch data, modify the database, or unlock paid access.
// Call only after company membership and paid entitlement have been verified server-side.
const numberOrNull = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const textOrNull = value => typeof value === 'string' && value.trim() ? value.trim() : null;

export function projectPropertyPassport(deal, expectedCompanyId) {
  if (!deal || typeof deal !== 'object' || Array.isArray(deal)) throw new TypeError('A saved deal is required');
  if (!expectedCompanyId || deal.company_id !== expectedCompanyId) throw new Error('Property is not in the active workspace');
  if (!deal.id || typeof deal.id !== 'string') throw new TypeError('A saved deal identifier is required');
  return Object.freeze({
    id: deal.id,
    companyId: deal.company_id,
    name: textOrNull(deal.name) ?? 'Untitled property',
    address: textOrNull(deal.property_address),
    propertyType: textOrNull(deal.property_type),
    status: textOrNull(deal.status),
    units: numberOrNull(deal.units),
    askingPrice: numberOrNull(deal.asking_price),
    purchasePrice: numberOrNull(deal.purchase_price),
    targetOfferPrice: numberOrNull(deal.target_offer_price),
    monthlyRent: numberOrNull(deal.monthly_rent),
    otherMonthlyIncome: numberOrNull(deal.other_monthly_income),
    monthlyOperatingExpenses: numberOrNull(deal.monthly_operating_expenses),
    notes: textOrNull(deal.notes),
    followUpDate: textOrNull(deal.follow_up_date),
    createdAt: textOrNull(deal.created_at)
  });
}
