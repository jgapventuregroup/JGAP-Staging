const validRepairStatuses=new Set(['open','in_progress','completed']);
const validTaskStatuses=new Set(['open','done']);
function text(value,max){const result=String(value??'').trim();return result.length>0&&result.length<=max?result:null;}
function date(value,required=false){const raw=String(value??'').trim();if(!raw)return required?null:'';if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return null;const parsed=new Date(raw+'T00:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===raw?raw:null;}
function money(value){if(value===null||value===undefined||String(value).trim()==='')return null;const raw=String(value).trim();if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(raw)||Number(raw)>9999999999.99)return false;return Number(raw).toFixed(2);}
export function validateRepair(input){
 const errors=[];const title=text(input?.title,150);if(!title)errors.push('Repair title must be 1–150 characters');
 const status=String(input?.status??'open');if(!validRepairStatuses.has(status))errors.push('Invalid repair status');
 const description=String(input?.description??'');if(description.length>2000)errors.push('Repair description is too long');
 const estimated=money(input?.estimatedCost),actual=money(input?.actualCost);
 if(estimated===false||actual===false)errors.push('Costs must be nonnegative, at most two decimals');
 const opened=date(input?.openedOn,true),completed=date(input?.completedOn);
 if(!opened||completed===null)errors.push('Invalid repair date');
 if(status==='completed'&&!completed)errors.push('Completed repairs need a completion date');
 if(completed&&opened&&completed<opened)errors.push('Completion date cannot precede opening date');
 return errors.length?{ok:false,errors}:{ok:true,value:{title,status,description,estimated_cost:estimated,actual_cost:actual,opened_on:opened,completed_on:completed||null}};
}
export function validateTask(input){
 const errors=[];const title=text(input?.title,150);if(!title)errors.push('Task title must be 1–150 characters');
 const status=String(input?.status??'open');if(!validTaskStatuses.has(status))errors.push('Invalid task status');
 const details=String(input?.details??'');if(details.length>2000)errors.push('Task details are too long');
 const due=date(input?.dueOn);if(due===null)errors.push('Invalid due date');
 return errors.length?{ok:false,errors}:{ok:true,value:{title,status,details,due_on:due||null}};
}
