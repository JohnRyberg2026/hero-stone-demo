import {privatePlans} from './private-plans.mjs';
export async function mountPlans(doc,client,{uuid=()=>crypto.randomUUID()}={}){
 const q=id=>doc.getElementById(id),root=q('plan-workspace');
 let epoch=0,busy=false,store,versions=[],approvals=[],pending=null,owner=null;
 const message=text=>q('plan-status').textContent=text;
 const lock=value=>{busy=value;root.querySelectorAll('button,input').forEach(el=>el.disabled=value);};
 function clear(){epoch++;store=null;owner=null;versions=[];approvals=[];pending=null;root.hidden=true;q('plan-summary').replaceChildren();q('plan-review-text').textContent='';q('plan-review').hidden=true;q('plan-editor').reset();}
 function render(){
  const latest=versions.at(-1),approved=approvals.at(-1);
  q('plan-summary').textContent=latest?`Latest proposal: version ${latest.version}. ${approved?`Approved: version ${approved.version}.`:'No approved version.'} ${approved?.version===latest.version?'':'Awaiting your review.'} Purchase unavailable: awaiting John’s separate review and launch checks.`:'No saved sample plan yet.';
  q('plan-approve').hidden=!latest||approved?.version===latest.version;
 }
 async function load(){if(busy)return;const token=++epoch;lock(true);message('Loading private sample plans…');try{
  const auth=await client.auth.getUser();if(token!==epoch)return;if(auth.error||!auth.data?.user)throw Error('Sign in again.');
  const candidate=privatePlans(client,auth.data.user.id),data=await candidate.list();if(token!==epoch)return;store=candidate;owner=auth.data.user.id;versions=data.versions;approvals=data.approvals;pending=null;q('plan-review').hidden=true;render();root.hidden=false;message('Sample plans ready. These are fictional test formulas.');
 }catch(e){if(token===epoch){clear();message(e.message);}}finally{if(token===epoch)lock(false);}}
 q('plan-editor').onsubmit=e=>{e.preventDefault();if(busy||!store)return;
  const days=Number(q('plan-days').value),daily=Number(q('plan-daily').value);if(!Number.isInteger(days)||days<1||days>90||!Number.isInteger(daily)||daily<1||daily>3){message('Choose 1–90 days and 1–3 servings daily.');return;}
  const latest=versions.at(-1),payload={days,daily,ingredients:[['Moringa',1400],['Baobab',800],['Jabuticaba',600],['Flax',700],['Chia',700],['Hemp hearts',700],['Pumpkin',700]]};
  pending={kind:'proposal',planId:latest?.plan_id||uuid(),expectedVersion:latest?.version||0,payload,actionId:uuid(),reviewed:true};
  q('plan-review-text').textContent=`Fictional proposal version ${pending.expectedVersion+1}: ${days} days × ${daily} servings = ${days*daily} servings, ${((days*daily*5600)/1000).toFixed(1)} g total. Per serving: ${payload.ingredients.map(([name,mg])=>`${name} ${mg} mg`).join('; ')}. No price or purchase is included.`;
  q('plan-review').hidden=false;q('plan-confirm').textContent='Save this proposal privately';
 };
 q('plan-approve').onclick=()=>{if(busy||!store)return;const latest=versions.at(-1);if(!latest)return;pending={kind:'approval',planId:latest.plan_id,version:latest.version,actionId:uuid(),approved:true};q('plan-review-text').textContent=`Approve saved version ${latest.version} exactly as shown: ${JSON.stringify(latest.payload)}. This records sample-plan consent only. John’s review, directions, bag quantity, price approval and purchase remain separate.`;q('plan-confirm').textContent=`Approve sample version ${latest.version}`;q('plan-review').hidden=false;};
 q('plan-confirm').onclick=async()=>{if(busy||!pending||!store)return;const token=epoch,input=pending,storage=store;lock(true);try{const row=await storage[input.kind==='proposal'?'propose':'approve'](input);if(token!==epoch)return;if(input.kind==='proposal')versions=[...versions.filter(v=>v.version!==row.version),row];else approvals=[...approvals.filter(v=>v.version!==row.version),row];pending=null;q('plan-review').hidden=true;render();message(input.kind==='proposal'?'Proposal saved privately. Existing approval preserved.':'Exact sample version approved. Purchase remains unavailable.');}catch(e){if(token===epoch){if(e.message.startsWith('Account changed'))clear();message(e.message);}}finally{if(token===epoch)lock(false);}};
 q('plan-back').onclick=()=>{pending=null;q('plan-review').hidden=true;};q('plan-refresh').onclick=load;
 const sub=client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(owner&&session?.user?.id!==owner))clear();});
 doc.defaultView?.addEventListener('pagehide',clear);
 await load();return {reload:load,destroy(){clear();sub.data?.subscription?.unsubscribe();}};
}
