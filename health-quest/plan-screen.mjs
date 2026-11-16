import {privatePlans} from './private-plans.mjs';
export async function mountPlans(doc,client,{uuid=()=>crypto.randomUUID()}={}){
 const q=id=>doc.getElementById(id),root=q('plan-workspace');
 let epoch=0,busy=false,store,versions=[],approvals=[],requests=[],pending=null,owner=null;
 const message=text=>q('plan-status').textContent=text;
 const lock=value=>{busy=value;root.querySelectorAll('button,input').forEach(el=>el.disabled=value);};
 function clear(){epoch++;store=null;owner=null;versions=[];approvals=[];pending=null;root.hidden=true;q('plan-summary').replaceChildren();q('plan-review-text').textContent='';q('plan-review').hidden=true;q('plan-editor').reset();requests=[];q('plan-request-status').textContent='';lock(false);}
 function describe(row){const p=row.payload,servings=p.days*p.daily,mg=p.ingredients.reduce((sum,item)=>sum+item[1],0);return `${p.days} days × ${p.daily} servings daily = ${servings} servings, ${(servings*mg/1000).toFixed(1)} g total. Per serving: ${p.ingredients.map(([name,amount])=>`${name} ${amount} mg`).join('; ')}.`;}
 function render(){
  const latest=versions.at(-1),approved=approvals.at(-1);
  q('plan-summary').textContent=latest?`Latest proposal: version ${latest.version}. ${approved?`Approved: version ${approved.version}.`:'No approved version.'} ${approved?.version===latest.version?'':'Awaiting your review.'} Purchase unavailable: awaiting John’s separate review and launch checks.`:'No saved sample plan yet.';
  const details=doc.createElement('div');
  if(latest){const proposed=doc.createElement('p');proposed.textContent=`Proposed version ${latest.version}: ${describe(latest)}`;details.append(proposed);}
  const active=approved&&versions.find(v=>v.plan_id===approved.plan_id&&v.version===approved.version);
  if(active){const saved=doc.createElement('p');saved.textContent=`Approved version ${active.version}: ${describe(active)}`;details.append(saved);}
  q('plan-summary').append(details);
  q('plan-approve').hidden=!latest||approved?.version===latest.version;
  const request=latest&&requests.filter(r=>r.plan_id===latest.plan_id&&r.version===latest.version).sort((a,b)=>a.revision-b.revision).at(-1);
  q('plan-request-status').textContent=request?.state==='requested'?`Review request recorded for version ${latest.version}. John’s reviewer portal is not yet connected; this is not clearance.`:request?`Review request withdrawn for version ${latest.version}.`:'No review request recorded for the latest version.';
  q('plan-request').hidden=!latest||approved?.version!==latest.version||request?.state==='requested';
  q('plan-withdraw').hidden=request?.state!=='requested';
 }
 async function load(){if(busy)return;const token=++epoch;lock(true);message('Loading private sample plans…');try{
  const auth=await client.auth.getUser();if(token!==epoch)return;if(auth.error||!auth.data?.user)throw Error('Sign in again.');
  const candidate=privatePlans(client,auth.data.user.id),data=await candidate.list();if(token!==epoch)return;store=candidate;owner=auth.data.user.id;versions=data.versions;approvals=data.approvals;requests=data.requests||[];pending=null;q('plan-review').hidden=true;render();root.hidden=false;message('Sample plans ready. These are fictional test formulas.');
 }catch(e){if(token===epoch){clear();message(e.message);}}finally{if(token===epoch)lock(false);}}
 q('plan-editor').onsubmit=e=>{e.preventDefault();if(busy||!store)return;
  const days=Number(q('plan-days').value),daily=Number(q('plan-daily').value);if(!Number.isInteger(days)||days<1||days>90||!Number.isInteger(daily)||daily<1||daily>3){message('Choose 1–90 days and 1–3 servings daily.');return;}
  const latest=versions.at(-1),payload={days,daily,ingredients:[['Moringa',1400],['Baobab',800],['Jabuticaba',600],['Flax',700],['Chia',700],['Hemp hearts',700],['Pumpkin',700]]};
  pending={kind:'proposal',planId:latest?.plan_id||uuid(),expectedVersion:latest?.version||0,payload,actionId:uuid(),reviewed:true};
  q('plan-review-text').textContent=`Fictional proposal version ${pending.expectedVersion+1}: ${days} days × ${daily} servings = ${days*daily} servings, ${((days*daily*5600)/1000).toFixed(1)} g total. Per serving: ${payload.ingredients.map(([name,mg])=>`${name} ${mg} mg`).join('; ')}. No price or purchase is included.`;
  q('plan-review').hidden=false;q('plan-confirm').textContent='Save this proposal privately';
 };
 q('plan-approve').onclick=()=>{if(busy||!store)return;const latest=versions.at(-1);if(!latest)return;pending={kind:'approval',planId:latest.plan_id,version:latest.version,actionId:uuid(),approved:true};q('plan-review-text').textContent=`Approve saved version ${latest.version} exactly as shown: ${describe(latest)}. This records sample-plan consent only. John’s review, directions, bag quantity, price approval and purchase remain separate.`;q('plan-confirm').textContent=`Approve sample version ${latest.version}`;q('plan-review').hidden=false;};
 function reviewRequest(state){if(busy||!store)return;const latest=versions.at(-1);if(!latest)return;const prior=requests.filter(r=>r.plan_id===latest.plan_id&&r.version===latest.version).sort((a,b)=>a.revision-b.revision).at(-1);pending={kind:'request',planId:latest.plan_id,version:latest.version,expectedRevision:prior?.revision||0,state,actionId:uuid(),confirmed:true};q('plan-review-text').textContent=`${state==='requested'?'Record request for John to review':'Withdraw review request for'} sample version ${latest.version}: ${describe(latest)} Only this exact sample plan is referenced; private notes are excluded. This test records your request privately. The reviewer portal is not yet connected. It sends no email and grants no purchase or production clearance.`;q('plan-confirm').textContent=state==='requested'?'Record this review request':'Withdraw this review request';q('plan-review').hidden=false;}
 q('plan-request').onclick=()=>reviewRequest('requested');q('plan-withdraw').onclick=()=>reviewRequest('withdrawn');
 q('plan-confirm').onclick=async()=>{if(busy||!pending||!store)return;const token=epoch,input=pending,storage=store;lock(true);try{const row=await storage[input.kind==='proposal'?'propose':input.kind==='request'?'requestReview':'approve'](input);if(token!==epoch)return;if(input.kind==='proposal')versions=[...versions.filter(v=>v.version!==row.version),row];else if(input.kind==='request')requests=[...requests.filter(r=>!(r.plan_id===row.plan_id&&r.version===row.version&&r.revision===row.revision)),row];else approvals=[...approvals.filter(v=>v.version!==row.version),row];pending=null;q('plan-review').hidden=true;render();message(input.kind==='request'?(input.state==='requested'?'Review request recorded. Reviewer portal not yet connected.':'Review request withdrawn.'):input.kind==='proposal'?'Proposal saved privately. Existing approval preserved.':'Exact sample version approved. Purchase remains unavailable.');}catch(e){if(token===epoch){if(e.message.startsWith('Account changed'))clear();message(e.message);}}finally{if(token===epoch)lock(false);}};
 q('plan-back').onclick=()=>{pending=null;q('plan-review').hidden=true;};q('plan-refresh').onclick=load;
 const sub=client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(owner&&session?.user?.id!==owner))clear();});
 doc.defaultView?.addEventListener('pagehide',clear);
 const restore=event=>{if(event.persisted)load();};doc.defaultView?.addEventListener('pageshow',restore);
 await load();return {reload:load,destroy(){clear();doc.defaultView?.removeEventListener('pagehide',clear);doc.defaultView?.removeEventListener('pageshow',restore);sub.data?.subscription?.unsubscribe();}};
}
