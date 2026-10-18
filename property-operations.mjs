import {summarizeLedger} from './property-ledger.mjs';
export function summarizePropertyOperations({ledger=[],repairs=[],tasks=[],asOfDate=null}={}){
 const cashFlow=summarizeLedger(ledger);
 let openRepairs=0,completedRepairs=0,estimatedRepairCents=0,actualRepairCents=0;
 for(const repair of repairs){
  if(!['open','in_progress','completed'].includes(repair.status))throw Error('Invalid repair status');
  if(repair.status==='completed')completedRepairs++;else openRepairs++;
  for(const [key,add] of [['estimated_cost',v=>estimatedRepairCents+=v],['actual_cost',v=>actualRepairCents+=v]]){
   if(repair[key]===null||repair[key]===undefined||repair[key]==='')continue;
   const value=Number(repair[key]);const cents=Math.round(value*100);
   if(!Number.isFinite(value)||value<0||value>9999999999.99||Math.abs(value*100-cents)>0.00001)throw Error('Invalid repair cost');
   add(cents);
  }
  if(!Number.isSafeInteger(estimatedRepairCents)||!Number.isSafeInteger(actualRepairCents))throw Error('Repair total exceeds safe precision');
 }
 let openTasks=0,doneTasks=0,overdueTasks=0;
 if(asOfDate!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate))throw Error('Invalid reference date');
 for(const task of tasks){
  if(task.status==='open'){openTasks++;if(asOfDate&&task.due_on&&task.due_on<asOfDate)overdueTasks++;}else if(task.status==='done'){doneTasks++;}else throw Error('Invalid task status');
 }
 return {cashFlow,repairs:{open:openRepairs,completed:completedRepairs,estimatedCost:estimatedRepairCents/100,actualCost:actualRepairCents/100},tasks:{open:openTasks,done:doneTasks,...(asOfDate?{overdue:overdueTasks}:{})}};
}
