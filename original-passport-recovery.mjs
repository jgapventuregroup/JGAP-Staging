// Original Property Passport compatibility layer.
export const originalPassportTables = Object.freeze(['properties','property_assets','property_asset_services','property_maintenance','property_improvements']);

export function projectOriginalPassportProperty(record,companyId){
 if(!record||!companyId||record.company_id!==companyId||!record.id)throw Error('Property outside active company');
 const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
 const value=num(record.current_value),debt=num(record.mortgage_balance);
 return Object.freeze({id:record.id,companyId,name:record.name||'Untitled property',address:[record.address_line1,record.city,record.state,record.postal_code].filter(Boolean).join(', '),propertyType:record.property_type||null,purchasePrice:num(record.purchase_price),purchaseDate:record.purchase_date||null,currentValue:value,mortgageBalance:debt,equity:value===null?null:value-(debt??0),monthlyRent:num(record.monthly_rent),status:record.status||null});
}
