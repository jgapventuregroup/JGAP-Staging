// Original Property Passport compatibility layer.
export const originalPassportTables = Object.freeze(['properties','property_assets','property_asset_services','property_maintenance','property_improvements']);

export function projectOriginalPassportProperty(record,companyId){
 if(!record||!companyId||record.company_id!==companyId||!record.id)throw Error('Property outside active company');
 const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
 const value=num(record.current_value),debt=num(record.mortgage_balance);
 return Object.freeze({id:record.id,companyId,name:record.name||'Untitled property',address:[record.address_line1,record.city,record.state,record.postal_code].filter(Boolean).join(', '),propertyType:record.property_type||null,purchasePrice:num(record.purchase_price),purchaseDate:record.purchase_date||null,currentValue:value,mortgageBalance:debt,equity:value===null?null:value-(debt??0),monthlyRent:num(record.monthly_rent),status:record.status||null});
}

export function projectOriginalPassportChild(record,companyId,propertyId,kind){
 if(!['asset','service','maintenance','improvement'].includes(kind))throw Error('Unknown Passport record type');
 if(!record||!companyId||!propertyId||record.company_id!==companyId||record.property_id!==propertyId||!record.id)throw Error('Passport record outside selected property');
 const fields={asset:['id','name','asset_type','installed_date','purchase_cost','expected_life_years','warranty_expiration','condition','next_service_date'],service:['id','asset_id','service_name','frequency_value','frequency_unit','last_service_date','next_service_date','notes'],maintenance:['id','title','maintenance_date','description','cost','status','due_date','performed_by'],improvement:['id','title','improvement_date','description','cost','category']};
 const result={};for(const field of fields[kind])result[field]=record[field]??null;
 return Object.freeze(result);
}
