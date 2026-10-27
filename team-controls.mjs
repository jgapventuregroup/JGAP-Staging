const roles=['owner','admin','editor','viewer'];
export function mountTeamControls({root,getContext,request,refreshMemberships,confirm=message=>window.confirm(message)}){
 let generation=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const clear=()=>{generation++;root.replaceChildren();};
 const open=async()=>{
  clear();const ticket=generation,scope=getContext();if(!scope)return;
  const current=()=>ticket===generation&&getContext()?.session===scope.session&&getContext()?.companyId===scope.companyId;
  let mutationPending=false;
  const message=el('p','Loading team access…');message.setAttribute('role','status');root.append(message);
  const action=async(button,operation,company,target,email,role)=>{
   if(button.disabled||!current()||mutationPending)return;mutationPending=true;button.disabled=true;message.textContent='Saving team change…';let saved=false;
   try{await request(operation,company,target,email,role);saved=true;if(!current())return;message.textContent='Change saved. Refreshing team access…';await refreshMemberships();if(current())await open();}
   catch(error){if(current())message.textContent=(saved?'Team change saved, but updated access could not be refreshed. Reopen Team access or sign in again. ':'Could not complete team change: ')+(error?.message||'Unknown error');}
   finally{mutationPending=false;if(current())button.disabled=false;}
  };
  try{
   const inbox=await request('inbox',null);if(!current())return;
   if(!Array.isArray(inbox))throw Error('Invitation response unavailable');
   const inboxSection=el('section');inboxSection.append(el('h2','Invitations for you'));
   if(!inbox.length)inboxSection.append(el('p','No pending workspace invitations.'));
   for(const invite of inbox){
    if(!invite.id||!invite.company_id||!['admin','editor','viewer'].includes(invite.role))throw Error('Invitation response unavailable');
    const item=el('article');item.className='metric';item.append(el('h3',invite.company_name),el('p','Role: '+invite.role+' · Expires: '+new Date(invite.expires_at).toLocaleDateString()));
    const accept=el('button','Accept workspace invitation');accept.type='button';accept.onclick=()=>{if(current()&&!mutationPending&&confirm('Join '+invite.company_name+' as '+invite.role+'?'))return action(accept,'accept',invite.company_id,invite.id);};item.append(accept);inboxSection.append(item);
   }root.append(inboxSection);
   if(!scope.canManage){message.textContent='Workspace management requires an owner role and active Pro access. You can accept invitations above with any account plan.';return;}
   let data;try{data=await request('list',scope.companyId);}catch(error){if(current())message.textContent='Workspace management requires active Pro owner access: '+(error?.message||'Unavailable');return;}if(!current())return;
   if(!Array.isArray(data?.members)||!Array.isArray(data?.invitations))throw Error('Team response unavailable');
   message.textContent='Manage access to the selected workspace. Invitations expire after seven days. No invitation emails are sent; ask the recipient to sign in and open Team access.';
   const seats=data.seats;if(!seats||!['included','additional','total','members','reserved','available'].every(key=>Number.isInteger(seats[key])&&seats[key]>=0)||typeof seats.over_limit!=='boolean')throw Error('Team seat allowance could not be verified');
   const seatSummary=el('section');seatSummary.append(el('h2','Team seats'),el('p',seats.members+' members · '+seats.reserved+' reserved invitations · '+seats.total+' total seats'),el('p','One named user is included. Each additional owner, admin, editor or viewer requires a paid seat. Additional-seat purchasing is not connected in staging.'));
   if(seats.over_limit)seatSummary.append(el('p','This workspace is over its seat allowance. New invitations and acceptances are blocked. Review members and pending invitations before launch.'));root.append(seatSummary);
   const form=el('form');form.append(el('h2','Invite a workspace member'));
   const email=el('input');email.id='team-email';email.type='email';email.required=true;email.maxLength=254;email.autocomplete='off';
   const label=el('label','Recipient email');label.setAttribute('for',email.id);form.append(label,email);
   const role=el('select');role.id='team-invite-role';for(const name of ['viewer','editor','admin']){const option=el('option',name);option.value=name;role.append(option);}role.value='viewer';
   const roleLabel=el('label','Workspace role');roleLabel.setAttribute('for',role.id);form.append(roleLabel,role);
   form.append(el('p','Viewer: read records. Editor: edit property records. Admin: edit records with administrative access. Owner: manage team access; promote an existing member below.'));
   const invite=el('button','Create workspace invitation');invite.type='submit';invite.disabled=seats.available<=0;form.append(invite);if(invite.disabled)form.append(el('p','No seats available. Paid additional seats are required before inviting another member.'));form.onsubmit=event=>{event.preventDefault();return action(invite,'invite',scope.companyId,null,email.value.trim(),role.value);};root.append(form);
   const members=el('section');members.append(el('h2','Workspace members'));
   for(const member of data.members){
    if(!member.user_id||!roles.includes(member.role))throw Error('Member response unavailable');
    const item=el('article');item.className='metric';item.append(el('h3',member.email||'Workspace member'));const select=el('select');select.setAttribute('aria-label','Role for '+(member.email||'workspace member'));
    for(const name of roles){const option=el('option',name);option.value=name;select.append(option);}select.value=member.role;
    const save=el('button','Save member role');save.type='button';save.onclick=()=>{if(!current()||mutationPending||select.value===member.role)return;if(confirm('Change '+(member.email||'this member')+' from '+member.role+' to '+select.value+'? Owners can manage access to this workspace.'))return action(save,'role',scope.companyId,member.user_id,null,select.value);};const remove=el('button','Remove member');remove.type='button';remove.onclick=()=>{if(current()&&!mutationPending&&confirm('Remove workspace access for '+(member.email||'this member')+'? Shared properties and documents will remain in the workspace.'))return action(remove,'remove',scope.companyId,member.user_id);};item.append(select,save);if(scope.canRemove===true)item.append(remove);members.append(item);
   }root.append(members);
   const pending=el('section');pending.append(el('h2','Pending invitations'));
   if(!data.invitations.length)pending.append(el('p','No pending invitations.'));
   for(const invitation of data.invitations){const item=el('article');item.className='metric';item.append(el('p',invitation.email+' · '+invitation.role+' · Expires: '+new Date(invitation.expires_at).toLocaleDateString()));const revoke=el('button','Revoke invitation');revoke.type='button';revoke.onclick=()=>{if(current()&&!mutationPending&&confirm('Revoke the invitation for '+invitation.email+'?'))return action(revoke,'revoke',scope.companyId,invitation.id);};item.append(revoke);pending.append(item);}root.append(pending);
  }catch(error){if(current()){root.replaceChildren(message);message.textContent='Could not load team access: '+(error?.message||'Unknown error');}}
 };
 return {open,clear};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
 const root=document.getElementById('team-view');if(root)window.JGAPTeam=mountTeamControls({root,getContext:()=>window.JGAPTeamContext?.scope(),request:(...args)=>window.JGAPTeamContext.request(...args),refreshMemberships:()=>window.JGAPTeamContext.refreshMemberships()});
}
