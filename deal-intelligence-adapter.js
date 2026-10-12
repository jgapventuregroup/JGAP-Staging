/* JGAP Deal Intelligence - provider-neutral ingestion adapter
 * Accepts normalized or common MLS/listing payloads and sends them to the
 * staging review panel. Saving uses the current company's existing deal API.
 * Reused from the original JGAP app; no scraping or provider credentials.
 */
(function(global){
  function num(v){ if(v===null||v===undefined||String(v).trim()==='') return null; const n=Number(String(v).replace(/[$,% ,]/g,'')); return Number.isFinite(n)?n:null; }
  function units(v){ const n=num(v); return n!==null&&Number.isInteger(n)&&n>0?n:null; }
  function pick(o, keys){ for(const k of keys){ if(o && o[k]!==undefined && o[k]!==null && o[k]!=='') return o[k]; } return null; }
  function normalize(raw, sourceName){
    const o=raw||{};
    const rawId=pick(o,['external_id','externalId','id','listingId','mlsNumber']);
    const price=num(pick(o,['asking_price','listPrice','list_price','price','askingPrice']));
    const previous=num(pick(o,['previous_price','previousPrice','originalListPrice','prior_price']));
    const monthlyRent=num(pick(o,['rent_monthly','monthlyRent','monthly_rent','rent']));
    const monthlyExpenses=num(pick(o,['expenses_monthly','monthlyExpenses','monthly_expenses','expenses']));
    const explicitPercent=pick(o,['cap_rate_percent']);
    let cap=num(explicitPercent!==null?explicitPercent:pick(o,['cap_rate','capRate']));
    if(explicitPercent===null&&cap!==null&&cap>0&&cap<1) cap*=100;
    const dscr=num(pick(o,['dscr','DSCR']));
    const cash=num(pick(o,['cash_flow_monthly','monthlyCashFlow','monthly_cash_flow','cashFlowMonthly']));
    return {
      external_id:typeof rawId==='string'||typeof rawId==='number'?String(rawId).trim():'',
      address:pick(o,['address','streetAddress','street_address']), city:pick(o,['city']), state:pick(o,['state','stateCode']), zip:pick(o,['zip','postalCode']),
      property_type:pick(o,['property_type','propertyType','type']), units:units(pick(o,['units','unitCount','numberOfUnits'])),
      asking_price:price, previous_price:previous, rent_monthly:monthlyRent, expenses_monthly:monthlyExpenses,
      cap_rate:cap, dscr:dscr, cash_flow_monthly:cash,
      source_url:pick(o,['source_url','sourceUrl','url','listingUrl']), confidence:pick(o,['confidence'])||'provider',
      raw_data:o, source_name:sourceName
    };
  }
  function normalizeMany(payload, sourceName){
    const rows=Array.isArray(payload)?payload:(payload?.listings||payload?.properties||payload?.data||[]);
    return rows.map(x=>normalize(x,sourceName)).filter(x=>x.external_id);
  }
  global.JGAPDealIntelligenceAdapter={normalize,normalizeMany};
})(window);
